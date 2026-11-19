import { useEffect, useMemo, useState } from "react";
import type { StoredDocument } from "@nirvanacp/sdk";
import { useRouter } from "@nirvanacp/sdk/react";
import {
  activeMembership, libraryMessage, selectionChecks, useRepositories,
  type BookmarkV1, type CategorySnapshot, type StorySnapshot,
} from "../library";
import { validItemId } from "../model";
import { InlineError } from "../components/states";
import { useBusy, useToast } from "../ui/feedback";
import { PageScroller, ScreenHead } from "../ui/frame";
import { Icon } from "../ui/icons";
import { ChoicesSkeleton } from "../ui/skeletons";
import { Notice } from "../ui/states";

/** Codes after which a write may or may not have happened; the screen rereads before a retry. */
const UNCERTAIN = ["DEADLINE", "SERVICE_UNREACHABLE", "SERVICE_FAILURE"];

function parseSnapshot(value: string | undefined): StorySnapshot | null {
  try {
    const parsed = JSON.parse(value ?? "") as StorySnapshot;
    return validItemId(parsed?.itemId) && typeof parsed.title === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Saves a story with categories, edits a saved one, or removes it. Back closes it. */
export function SaveScreen() {
  const { screen, back } = useRouter();
  const { storage, bookmarkRepository, categoryRepository } = useRepositories();
  const snapshot = useMemo(() => parseSnapshot(screen?.params.snapshot), [screen?.params.snapshot]);
  const fromPage = screen?.params.fresh === "1";
  const [state, setState] = useState<{ previous: StoredDocument<BookmarkV1> | null; categories: CategorySnapshot } | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [readFailed, setReadFailed] = useState(false);
  const [reads, setReads] = useState(0);
  const [busy, run] = useBusy();
  const [action, setAction] = useState<"save" | "remove" | "create" | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [refresh, setRefresh] = useState(false);
  const { show } = useToast();

  const read = async () => {
    const [previous, categories] = await Promise.all([bookmarkRepository.get(snapshot!.itemId), categoryRepository.read()]);
    setState({ previous, categories });
    setSelected(current => current ?? activeMembership(previous?.value.categoryIds ?? [], categories));
    setReadFailed(false);
    return categories;
  };

  useEffect(() => {
    if (!snapshot) return;
    let active = true;
    Promise.all([bookmarkRepository.get(snapshot.itemId), categoryRepository.read()]).then(([previous, categories]) => {
      if (!active) return;
      setState({ previous, categories });
      setSelected(current => current ?? activeMembership(previous?.value.categoryIds ?? [], categories));
      setReadFailed(false);
    }, error => {
      if (!active) return;
      setMessage(libraryMessage(error));
      setReadFailed(true);
    });
    return () => { active = false; };
  }, [snapshot, bookmarkRepository, categoryRepository, reads]);

  if (!snapshot) return <>
    <ScreenHead eyebrow="Saved stories" title="Save story" />
    <div className="screen"><Notice title="Can't save this story" role="alert"><p>The story details are missing.</p></Notice></div>
  </>;
  const previous = state?.previous ?? null;
  const loading = !state && !readFailed;
  const blocked = busy || loading || readFailed;

  /**
   * Removal is immediate and offers Undo, which saves the story again with its categories that
   * still exist. The restored story counts as newly saved, so it moves to the top of Saved.
   */
  const undoRemove = (removed: BookmarkV1, categories: CategorySnapshot) => {
    const categoryIds = activeMembership(removed.categoryIds, categories);
    const story: StorySnapshot = {
      itemId: removed.itemId, discussionUrl: removed.discussionUrl, articleUrl: removed.articleUrl, title: removed.title,
      submitter: removed.submitter, truncated: removed.truncated, capturedAtMs: removed.capturedAtMs,
    };
    bookmarkRepository.save(story, null, { categoryIds, checks: selectionChecks(categories, categoryIds) }).then(
      () => show({ text: "Story restored" }),
      error => { storage.refresh(); show({ text: `Couldn't restore the story. ${libraryMessage(error)}` }); },
    );
  };

  const perform = (remove: boolean) => void run(async () => {
    if (!state || !selected) return;
    setAction(remove ? "remove" : "save");
    setMessage("");
    try {
      if (remove && previous) {
        await bookmarkRepository.remove(previous);
        const categories = state.categories;
        show({ text: "Removed from Saved", action: { label: "Undo", run: () => undoRemove(previous.value, categories) } });
      } else {
        const categoryIds = activeMembership(selected, state.categories);
        await bookmarkRepository.save(snapshot, previous, {
          refresh: refresh && fromPage, categoryIds, checks: selectionChecks(state.categories, categoryIds),
        });
        show({ text: previous ? "Changes saved" : "Saved" });
      }
      back();
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      setMessage(libraryMessage(error));
      if (code === "CONFLICT" || UNCERTAIN.includes(code)) {
        try {
          await read();
          setMessage(code === "CONFLICT"
            ? "This story or its categories changed. Review the current record and your selections, then try again."
            : "The result of the save was uncertain. The current record was reloaded. Review it before retrying.");
        } catch {
          setReadFailed(true);
          setMessage("The current record could not be reloaded. Reload it before retrying.");
        }
      }
    } finally {
      setAction(null);
    }
  });

  const createCategory = () => void run(async () => {
    setAction("create");
    setMessage("");
    try {
      const id = await categoryRepository.create(name);
      await read();
      setSelected(ids => [...new Set([...(ids ?? []), id])]);
      setName("");
      setMessage("Category created. Save to apply your selection.");
    } catch (error) {
      try {
        await read();
        setMessage(`${libraryMessage(error)} Categories were reloaded; review them before retrying.`);
      } catch {
        setReadFailed(true);
        setMessage("The new category could not be confirmed. Reload before retrying.");
      }
    } finally {
      setAction(null);
      storage.refresh();
    }
  });

  const spinner = <span className="spinner" aria-hidden="true" />;
  // No pull to refresh: the screen holds a selection that a reread must not replace.
  return <>
    <ScreenHead eyebrow="Saved stories" title={previous ? "Edit saved story" : "Save story"} />
    <PageScroller busy={false} pull={false}>
      <section className="card save-story">
        <p className="story-title">{previous?.value.title ?? snapshot.title}</p>
        <p className="meta">{snapshot.submitter ? `By ${snapshot.submitter} · ` : ""}HN item {snapshot.itemId}</p>
        <p className="meta">Saved in Genesis, separate from your HN favorites.</p>
      </section>
      {loading && <ChoicesSkeleton />}
      {state && selected && <fieldset className="choices" disabled={blocked}>
        <legend>Categories</legend>
        {state.categories.categories.length === 0 && <p className="meta">No categories yet. Saving without one files the story under Uncategorized.</p>}
        {state.categories.categories.map(record => <label key={record.value.id} className="choice">
          <input type="checkbox" checked={selected.includes(record.value.id)} onChange={event => {
            const id = record.value.id;
            setSelected(ids => event.target.checked ? [...(ids ?? []), id] : (ids ?? []).filter(entry => entry !== id));
          }} />
          <span className="box" aria-hidden="true"><Icon name="check" /></span>
          <span className="choice-label">{record.value.name}</span>
        </label>)}
        <form className="field-row" onSubmit={event => { event.preventDefault(); if (name.trim()) createCategory(); }}>
          <label className="grow"><span className="visually-hidden">New category name</span>
            <input placeholder="New category" value={name} enterKeyHint="done" autoCapitalize="sentences" onChange={event => setName(event.target.value)} />
          </label>
          <button type="submit" className="button secondary" disabled={!name.trim()} aria-busy={action === "create"}>
            {action === "create" ? <>{spinner} Creating…</> : "Create"}
          </button>
        </form>
        <p className="meta">A new category is kept even if you leave without saving.</p>
      </fieldset>}
      {previous && fromPage && <label className="choice">
        <input type="checkbox" checked={refresh} disabled={busy} onChange={event => setRefresh(event.target.checked)} />
        <span className="box" aria-hidden="true"><Icon name="check" /></span>
        <span className="choice-label">Update the title and link from Hacker News</span>
      </label>}
      {message && (readFailed ? <InlineError>{message}</InlineError> : <p role="status" className="status">{message}</p>)}
      {readFailed && <div className="row-buttons">
        <button type="button" className="button secondary" disabled={busy} onClick={() => { setMessage(""); setReads(value => value + 1); }}>Reload saved state</button>
      </div>}
      <div className="actions">
        <button type="button" className="button" disabled={blocked} aria-busy={action === "save"} onClick={() => perform(false)}>
          {action === "save" ? <>{spinner} Saving…</> : previous ? "Save changes" : "Save"}
        </button>
        <button type="button" className="button secondary" disabled={busy} onClick={back}>Cancel</button>
        {previous && <button type="button" className="text-button danger-text" disabled={blocked} aria-busy={action === "remove"} onClick={() => perform(true)}>
          {action === "remove" ? <>{spinner} Removing…</> : "Remove from Saved"}
        </button>}
      </div>
    </PageScroller>
  </>;
}
