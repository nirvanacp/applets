import { useEffect, useMemo, useState } from "react";
import { useRouter, type CurrentScreen } from "@genesis/sdk/react";
import { isUncertain, libraryMessage, useLibrary } from "../library";
import { CATEGORY_LIMIT, MEMBERSHIP_LIMIT, postUrl, validateName, validId, validSnapshot, type Membership, type Snapshot } from "../model";
import { LibraryGate } from "../components/library";
import { InlineError } from "../components/states";
import { useBusy, useToast } from "../ui/feedback";
import { Icon } from "../ui/icons";
import { Confirm, Sheet } from "../ui/sheet";
import { ChoiceSkeleton } from "../ui/skeletons";
import { Notice } from "../ui/states";

interface SavePost { postId: string; url: string; snapshot: Snapshot }

function parsePost(value: string | undefined): SavePost | null {
  try {
    const parsed = JSON.parse(value ?? "") as SavePost;
    return validId(parsed?.postId) && postUrl(parsed.url)?.postId === parsed.postId && validSnapshot(parsed.snapshot) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Save to categories, as a sheet over the screen that opened it. Ticking boxes changes nothing
 * until Save; Back, the backdrop and a drag close without saving. Removing the post from
 * Categories asks beside the control, then offers Undo.
 */
export function SaveScreen({ screen }: { screen: CurrentScreen }) {
  const { back } = useRouter();
  const { show } = useToast();
  const library = useLibrary();
  const post = useMemo(() => parsePost(screen.params.post), [screen.params.post]);
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [reads, setReads] = useState(0);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving, runSave] = useBusy();
  const [creating, runCreate] = useBusy();
  const [removing, runRemove] = useBusy();
  const busy = saving || creating || removing;
  const { service } = library;
  const usable = !!library.library && !library.error && !library.pending;

  useEffect(() => {
    if (!post || !usable) return;
    let active = true;
    service.lookup(post.postId).then(record => {
      if (!active) return;
      setMembership(record);
      setSelected(record?.categoryIds ?? []);
    }, error => { if (active) setMessage(libraryMessage(error)); });
    return () => { active = false; };
  }, [post, usable, service, reads]);

  if (!post) return <Sheet title="Save to categories"><Notice title="Can't file this post" role="alert"><p>The post details are missing.</p></Notice></Sheet>;
  const live = new Set(library.categories.map(category => category.id));
  const choice = (selected ?? []).filter(id => live.has(id));
  const full = choice.length >= MEMBERSHIP_LIMIT;
  const ready = usable && membership !== undefined && selected !== null;

  /** A conflict reads the record again, so the next try starts from what the service has. */
  const failed = (error: unknown) => {
    if (isUncertain(error)) return; // The library gate asks to check it.
    const code = (error as { code?: string }).code;
    setMessage(code === "CONFLICT" ? "This post's categories changed elsewhere. They were reloaded; review them and save again." : libraryMessage(error));
    if (code === "CONFLICT") { setSelected(null); setReads(value => value + 1); }
  };

  const save = () => runSave(async () => {
    setMessage("");
    try {
      await library.operate("bookmark.setCategories", {
        postId: post.postId, expectedRevision: membership?.revision ?? null, categoryIds: choice,
        ...membership ? {} : { url: post.url, snapshot: post.snapshot },
      }, post.postId);
      show({ text: choice.length === 1 ? `Saved to ${library.categories.find(category => category.id === choice[0])?.name ?? "1 category"}` : `Saved to ${choice.length} categories` });
      back();
    } catch (error) {
      failed(error);
    }
  });

  const remove = () => runRemove(async () => {
    if (!membership) return;
    setMessage("");
    const before = membership.categoryIds;
    try {
      await library.operate("bookmark.remove", { postId: post.postId, expectedRevision: membership.revision }, post.postId);
      show({
        text: "Removed from Categories",
        action: {
          label: "Undo",
          run: () => library.operate("bookmark.setCategories", {
            postId: post.postId, expectedRevision: null, categoryIds: before.filter(id => live.has(id)), url: post.url, snapshot: post.snapshot,
          }, post.postId).catch(error => show({ text: libraryMessage(error) })),
        },
      });
      back();
    } catch (error) {
      setConfirmRemove(false);
      failed(error);
    }
  });

  const create = () => runCreate(async () => {
    const problem = validateName(name);
    if (problem) { setMessage(problem); return; }
    setMessage("");
    const id = crypto.randomUUID();
    try {
      await library.operate("category.create", { id, name }, id);
      setName("");
      if (!full) setSelected(ids => [...new Set([...(ids ?? []), id])]);
    } catch (error) {
      if (!isUncertain(error)) setMessage(libraryMessage(error));
    }
  });

  const footer = ready && !confirmRemove ? <>
    {membership && <button type="button" className="text-button danger-text" disabled={busy} onClick={() => setConfirmRemove(true)}>Remove</button>}
    <span className="grow post-meta">{choice.length ? `${choice.length} selected` : membership ? "Choose a category, or remove" : "Choose at least one"}</span>
    <button type="button" className="button primary" disabled={busy || choice.length === 0} aria-busy={saving} onClick={() => void save()}>
      {saving ? <><span className="spinner" aria-hidden="true" /> Saving</> : "Save"}
    </button>
  </> : undefined;

  return <Sheet title={membership ? "Edit categories" : "Save to categories"} footer={footer}>
    <div className="sheet-post">
      <p className="post-head"><strong>{post.snapshot.authorName}</strong> <span className="post-meta">@{post.snapshot.authorHandle}</span></p>
      {post.snapshot.text && <p className="post-text clamp" dir="auto">{post.snapshot.text}</p>}
    </div>
    <LibraryGate library={library} compact>
      {!ready ? <>{message ? <InlineError>{message}</InlineError> : <ChoiceSkeleton />}</> : <>
        <fieldset className="choices" disabled={busy}>
          <legend className="visually-hidden">Categories</legend>
          {library.categories.length === 0 && <p className="post-meta">No categories yet. Create one below.</p>}
          {library.categories.map(category => {
            const checked = choice.includes(category.id);
            return <label key={category.id} className="choice row-press">
              <input type="checkbox" checked={checked} disabled={!checked && full} onChange={event => {
                const id = category.id;
                setSelected(ids => event.target.checked ? [...(ids ?? []), id] : (ids ?? []).filter(entry => entry !== id));
              }} />
              <span className="choice-box" aria-hidden="true"><Icon name="check" /></span>
              <span className="grow">{category.name}</span>
              <span className="post-meta">{category.count}</span>
            </label>;
          })}
        </fieldset>
        {full && <p className="post-meta hint">A post can be in up to {MEMBERSHIP_LIMIT} categories.</p>}
        {library.categories.length < CATEGORY_LIMIT
          ? <form className="field-row" onSubmit={event => { event.preventDefault(); void create(); }}>
            <label className="grow"><span className="visually-hidden">New category name</span>
              <input className="input" placeholder="New category" value={name} maxLength={80} enterKeyHint="done" disabled={busy}
                onChange={event => { setName(event.target.value); setMessage(""); }} />
            </label>
            <button type="submit" className="button secondary" disabled={busy || !name.trim()} aria-busy={creating}>{creating ? "Creating…" : "Create"}</button>
          </form>
          : <p className="post-meta hint">You have {CATEGORY_LIMIT} categories, the most allowed.</p>}
        {message && <InlineError>{message}</InlineError>}
        <p className="post-meta hint">Categories are kept by this app, separate from your X bookmarks.</p>
        {confirmRemove && <Confirm text="Remove this post from Categories? Its X bookmark stays." confirm="Remove" busy={removing}
          onCancel={() => setConfirmRemove(false)} onConfirm={() => void remove()} />}
      </>}
    </LibraryGate>
  </Sheet>;
}
