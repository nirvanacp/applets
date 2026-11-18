import { useEffect, useRef, useState } from "react";
import { css, type ActionResult } from "@let/sdk";
import { useCommand, useFilePicker, useGenesis, useRouter, type CurrentScreen } from "@let/sdk/react";
import { actionMessage } from "../actions";
import { EDITOR, FILE_INPUT, POST_BUTTON, type QuotedPost } from "../adapter/compose";
import { SignInNotice } from "../components/states";
import { useToast } from "../ui/feedback";
import { Avatar } from "../ui/frame";
import { Icon } from "../ui/icons";
import { Confirm } from "../ui/sheet";
import { WebsiteCue } from "../ui/states";
import { useAccount } from "../library";
import { onScreen, useScreenWatch } from "../screen";

/** X's own limits: four photos per post, and 280 characters for most accounts. */
const MAX_PHOTOS = 4;
const SOFT_LIMIT = 280;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Status = "idle" | "posting" | "failed" | "unknown";
type ComposerState = { text: string; media: number; quote: QuotedPost | null; canPost: boolean; message: string | null };

/** Collapses whitespace the way the page module reads X's editor. */
const flat = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * A new post, written here over X's own composer, which stays hidden in the primary context. Post
 * runs one sequence on X's composer: type the text, attach the photos, wait for X's thumbnails,
 * press X's Post button. A retry reads X's composer first and skips what it already holds, so
 * nothing is typed or attached twice; a composer holding something else is left for the person to
 * check. Leaving with a draft asks first, in the applet's own dialog.
 */
export function ComposeScreen(_: { screen: CurrentScreen }) {
  const genesis = useGenesis();
  const { back, active, setLeaveGuard, onConfirmLeave, viewWebsite, status: routeStatus } = useRouter();
  const site = genesis.context(active);
  const page = routeStatus();
  const me = useAccount().account;
  const { show } = useToast();
  const { files, pick, remove } = useFilePicker();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const discardOnX = useCommand("discardComposer", active);
  const attachStarted = useRef(false);
  const photosChanged = useRef(false);
  const canAttach = genesis.limits.userActions === true;
  const busy = status === "posting";
  const ready = onScreen(page, "compose") && page.status === "ready" && !page.stale;
  // A quote, from the repost sheet, is in X's composer; it shows here and goes with the post.
  const quoted = useScreenWatch<ComposerState | null>("compose", "composer").value?.quote ?? null;
  const draft = text.trim() !== "" || files.length > 0 || quoted !== null;
  const length = [...text].length;

  useEffect(() => {
    setLeaveGuard(draft && !busy && !discarding ? "Discard post?" : null);
    return () => setLeaveGuard(null);
  }, [draft, busy, discarding, setLeaveGuard]);
  useEffect(() => onConfirmLeave((_message, leave) => setLeaving(() => leave)), [onConfirmLeave]);

  async function addPhotos() {
    const room = MAX_PHOTOS - files.length;
    try {
      const picked = await pick({ accept: PHOTO_TYPES, multiple: true });
      if (picked.length > 0 && attachStarted.current) photosChanged.current = true;
      for (const extra of picked.slice(room)) remove(extra.id);
      setMessage(picked.length > room ? `You can add up to ${MAX_PHOTOS} photos.` : null);
    } catch (error) {
      setMessage(actionMessage(error, "Couldn't open your photos."));
    }
  }

  const removePhoto = (id: string) => {
    remove(id);
    if (attachStarted.current) photosChanged.current = true;
  };

  const readComposer = () => site.read<ComposerState | null>({ reader: "composer" }).catch(() => null);

  async function settle(result: ActionResult, step: "text" | "photos" | "post") {
    const now = await readComposer();
    setStatus(result.outcome === "unknown" ? "unknown" : "failed");
    const xSays = now?.message ? ` X says: ${now.message}` : "";
    if (result.code === "RATE_LIMITED") setMessage("Too many actions at once. Tap Post again.");
    else if (result.code === "FILE_UNAVAILABLE") setMessage("A photo is no longer available. Remove it and add it again.");
    else if (result.outcome === "unknown") setMessage(`X didn't confirm the post. Check your profile before posting again.${xSays}`);
    else if (step === "photos") setMessage(`X didn't take the photos.${xSays} Your post is still here.`);
    else setMessage(`Couldn't post.${xSays} Your post is still here.`);
  }

  /** X's rich editor ignores the editing command, so typing falls back to trusted input. */
  async function write(): Promise<ActionResult> {
    const until = { read: { reader: "composer.text", args: { text } } };
    const typed = await site.type(css(EDITOR), text, { timeoutMs: 5_000, until });
    if (typed.outcome === "failed" && typed.reason === "editor-needs-trusted-input" && genesis.limits.trustedInput) {
      return site.type(css(EDITOR), text, { input: "trusted", timeoutMs: 5_000, until });
    }
    return typed;
  }

  function refuse(what: string) {
    setStatus("failed");
    setMessage(`X's composer already holds ${what}. Check it on X before posting.`);
  }

  async function post() {
    setStatus("posting");
    setMessage(null);
    const held = await readComposer();
    if (!held) return settle({ outcome: "failed" }, "text");
    if (held.media === 0) attachStarted.current = photosChanged.current = false;
    if (photosChanged.current) return refuse("other photos");
    if (held.text !== flat(text)) {
      if (held.text) return refuse("other text");
      const wrote = await write();
      if (wrote.outcome !== "observed") return settle(wrote, "text");
    }
    if (held.media > files.length) return refuse("other photos");
    if (held.media < files.length) {
      attachStarted.current = true;
      const attached = await site.attachFiles(css(FILE_INPUT), files.slice(held.media), {
        timeoutMs: 15_000, until: { read: { reader: "composer.media", args: { count: files.length } } },
      });
      if (attached.outcome !== "observed") return settle(attached, "photos");
    }
    const posted = await site.click(css(POST_BUTTON), {
      timeoutMs: 15_000, navigates: true, expect: { notUrl: [{ pattern: "/i/flow/*" }] },
    });
    if (posted.outcome !== "observed") return settle(posted, "post");
    attachStarted.current = photosChanged.current = false;
    setStatus("idle");
    // X leaves the composer on its own; the router then shows the page X returns to.
    show({ text: "Your post was sent" });
  }

  /**
   * A quote lives in X's composer, so leaving goes through X's own Back and its Discard; when that
   * fails, the router's leave runs as before.
   */
  function discard(leave: () => void) {
    if (!quoted) return leave();
    setDiscarding(true);
    void discardOnX(undefined).then(result => {
      if (result.outcome === "observed") return;
      setDiscarding(false);
      leave();
    });
  }

  if (page.status === "auth") return <div className="compose-screen">
    <header className="compose-bar">
      <button type="button" className="icon-button" aria-label="Close" onClick={back}><Icon name="close" /></button>
    </header>
    <SignInNotice reason="Sign in to post on X." />
  </div>;

  const remaining = SOFT_LIMIT - length;
  return <form className="compose-screen" onSubmit={event => { event.preventDefault(); if (!busy) void post(); }}>
    <header className="compose-bar">
      <button type="button" className="text-button" onClick={back} disabled={busy}>Cancel</button>
      <button type="submit" className="button primary small" disabled={busy || !ready || !draft} aria-busy={busy}>
        {busy ? <><span className="spinner" aria-hidden="true" /> Posting</> : "Post"}
      </button>
    </header>
    {busy && <div className="progress" role="progressbar" aria-label="Posting" />}
    <div className="compose-body">
      <Avatar src={null} size={40} name={me?.name ?? me?.handle ?? undefined} />
      <div className="compose-main">
        <label className="visually-hidden" htmlFor="compose-text">Post text</label>
        <textarea id="compose-text" className={quoted ? "compose-text short" : "compose-text"} value={text} placeholder={quoted ? "Add a comment" : "What's happening?"} autoFocus
          onChange={event => setText(event.target.value)} disabled={busy} rows={quoted ? 2 : 4} enterKeyHint="enter" />
        {quoted && <div className="compose-quote" aria-label={`Quoting ${quoted.name}`}>
          <span className="post-head"><Avatar src={quoted.avatar} size={20} name={quoted.name} /><strong>{quoted.name}</strong>
            {quoted.handle && <span className="post-meta">@{quoted.handle}</span>}</span>
          {quoted.text && <span className="quote-text" dir="auto">{quoted.text}</span>}
        </div>}
        {files.length > 0 && <ul className={`attachments n${files.length}`} aria-label="Photos to post">
          {files.map((file, index) => <li key={file.id}>
            <img src={file.previewUrl} alt={`Photo ${index + 1}: ${file.name}`} />
            <button type="button" className="remove" onClick={() => removePhoto(file.id)} disabled={busy} aria-label={`Remove photo ${index + 1}`}>
              <Icon name="close" />
            </button>
          </li>)}
        </ul>}
        {!ready && !busy && page.status !== "error" && <p className="post-meta" role="status">Opening X's composer…</p>}
        {page.status === "error" && <p className="inline-error" role="alert">X's composer didn't open. Go back and try again.</p>}
        {message && <p className={status === "idle" ? "post-meta" : "inline-error"} role="alert">{message}</p>}
      </div>
    </div>
    <footer className="compose-tools">
      {canAttach
        ? <button type="button" className="icon-button accent" aria-label={`Add photos, ${files.length} of ${MAX_PHOTOS}`}
          onClick={() => void addPhotos()} disabled={busy || files.length >= MAX_PHOTOS}>
          <Icon name="photo" />
        </button>
        : <button type="button" className="text-button" onClick={() => viewWebsite()}>Add photos on X <WebsiteCue /></button>}
      <span className="post-meta">{files.length > 0 && `${files.length}/${MAX_PHOTOS}`}</span>
      <span className={remaining < 0 ? "char-count over" : remaining <= 20 ? "char-count near" : "char-count"} aria-live="polite">
        {remaining <= 20 ? remaining : ""}
      </span>
    </footer>
    {leaving && <div className="dialog-layer">
      <div className="sheet-backdrop" onClick={() => setLeaving(null)} />
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label="Discard post?">
        <h2>Discard post?</h2>
        <Confirm text="This can't be undone and your draft will be lost." confirm="Discard" cancel="Keep editing"
          onCancel={() => setLeaving(null)} onConfirm={() => { const leave = leaving; setLeaving(null); discard(leave); }} />
      </div>
    </div>}
  </form>;
}
