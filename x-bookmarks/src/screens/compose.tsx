import { useEffect, useState } from "react";
import { css, type ActionResult } from "@genesis/sdk";
import { useFilePicker, useGenesis, useRouter } from "@genesis/sdk/react";
import { actionMessage } from "../actions";
import { EDITOR, FILE_INPUT, POST_BUTTON } from "../adapter/compose";
import { Icon, SignInPrompt } from "../components/ui";
import { onScreen, usePageStatus, useScreenWatch } from "../screen";

/** X's own limits: four photos per post, and 280 characters for most accounts. */
const MAX_PHOTOS = 4;
const SOFT_LIMIT = 280;
/** The photo types X's file input accepts. */
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Status = "idle" | "posting" | "failed" | "unknown";
type ComposerState = { media: number; canPost: boolean; message: string | null };

/**
 * A new post. The person writes and picks photos here, and sees each photo before posting. Post
 * is one tap that runs one sequence on X's own composer, hidden in the primary context: type the
 * text, attach the photos, wait for X's thumbnails, then press X's Post button. X then leaves the
 * composer, and the router shows the page it returns to.
 */
export function ComposeScreen() {
  const genesis = useGenesis();
  const { back, active, setLeaveGuard, viewWebsite } = useRouter();
  const site = genesis.context(active);
  const page = usePageStatus();
  const { files, pick, remove } = useFilePicker();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const composer = useScreenWatch<ComposerState | null>("compose", "composer").value;
  const canAttach = genesis.limits.userActions === true;
  const busy = status === "posting";
  const draft = text.trim() !== "" || files.length > 0;
  const ready = onScreen(page, "compose") && page.status === "ready" && !page.stale;

  // Leaving with a draft asks first; posting and an empty composer leave at once.
  useEffect(() => {
    setLeaveGuard(draft && !busy ? "Discard this post?" : null);
    return () => setLeaveGuard(null);
  }, [draft, busy, setLeaveGuard]);

  async function addPhotos() {
    const room = MAX_PHOTOS - files.length;
    try {
      const picked = await pick({ accept: PHOTO_TYPES, multiple: true });
      for (const extra of picked.slice(room)) remove(extra.id);
      setMessage(picked.length > room ? `You can add up to ${MAX_PHOTOS} photos.` : null);
    } catch (error) {
      setMessage(actionMessage(error, "Couldn't open your photos."));
    }
  }

  function settle(result: ActionResult, step: "text" | "photos" | "post") {
    setStatus(result.outcome === "unknown" ? "unknown" : "failed");
    const xSays = composer?.message ? ` X says: ${composer.message}` : "";
    if (result.code === "RATE_LIMITED") setMessage("Too many actions at once. Tap Post again.");
    else if (result.code === "FILE_UNAVAILABLE") setMessage("A photo is no longer available. Remove it and add it again.");
    else if (result.outcome === "unknown") setMessage(`X didn't confirm the post. Check your profile before posting again.${xSays}`);
    else if (step === "photos") setMessage(`X didn't take the photos.${xSays} Your text and photos are still here.`);
    else setMessage(`Couldn't post.${xSays} Your text and photos are still here.`);
  }

  /** Types into X's editor; X's rich editor ignores the editing command, so it falls back to real typing. */
  async function write(): Promise<ActionResult> {
    const until = { read: { reader: "composer.text", args: { text } } };
    const typed = await site.type(css(EDITOR), text, { timeoutMs: 5_000, until });
    if (typed.outcome === "failed" && typed.reason === "editor-needs-trusted-input" && genesis.limits.trustedInput) {
      return site.type(css(EDITOR), text, { input: "trusted", timeoutMs: 5_000, until });
    }
    return typed;
  }

  async function post() {
    setStatus("posting");
    setMessage(null);
    if (text.trim()) {
      const wrote = await write();
      if (wrote.outcome !== "observed") return settle(wrote, "text");
    }
    if (files.length) {
      const attached = await site.attachFiles(css(FILE_INPUT), files, {
        timeoutMs: 15_000, until: { read: { reader: "composer.media", args: { count: files.length } } },
      });
      if (attached.outcome !== "observed") return settle(attached, "photos");
    }
    // X keeps Post disabled while it uploads; the click waits for it to enable. X then leaves the
    // composer for the page it came from; a sign-in flow instead means X refused.
    const posted = await site.click(css(POST_BUTTON), {
      timeoutMs: 15_000, navigates: true, expect: { notUrl: [{ pattern: "/i/flow/*" }] },
    });
    if (posted.outcome !== "observed") return settle(posted, "post");
    setStatus("idle");
  }

  if (page.status === "auth") return <div className="screen">
    <h1 className="screen-title">New post</h1>
    <SignInPrompt reason="Sign in to post on X." />
  </div>;

  const length = [...text].length;
  return <form className="screen compose" onSubmit={event => { event.preventDefault(); if (!busy) void post(); }}>
    <header className="compose-bar">
      <button type="button" className="text-button" onClick={back} disabled={busy}>Cancel</button>
      <button type="submit" className="primary accent" disabled={busy || !ready || !draft || length > 25_000}>
        {busy ? "Posting…" : "Post"}
      </button>
    </header>
    {busy && <div className="progress" role="progressbar" aria-label="Posting" />}
    <label className="visually-hidden" htmlFor="compose-text">Post text</label>
    <textarea id="compose-text" className="compose-text" value={text} placeholder="What's happening?" autoFocus
      onChange={event => setText(event.target.value)} disabled={busy} rows={5} />
    {files.length > 0 && <ul className={`attachments n${files.length}`} aria-label="Photos to post">
      {files.map((file, index) => <li key={file.id}>
        <img src={file.previewUrl} alt={`Photo ${index + 1}: ${file.name}`} />
        <button type="button" className="remove" onClick={() => remove(file.id)} disabled={busy} aria-label={`Remove ${file.name}`}>
          <Icon name="close" />
        </button>
      </li>)}
    </ul>}
    <div className="compose-tools">
      {canAttach
        ? <button type="button" className="text-button photo-button" onClick={() => void addPhotos()} disabled={busy || files.length >= MAX_PHOTOS}>
            <Icon name="photo" /> Add photos
          </button>
        : <button type="button" className="text-button photo-button" onClick={() => viewWebsite()}>
            Add photos on X <Icon name="external" />
          </button>}
      <span className="post-meta">{files.length} of {MAX_PHOTOS} photos</span>
      <span className={length > SOFT_LIMIT ? "post-meta over" : "post-meta"} aria-live="polite">
        {length > SOFT_LIMIT - 20 ? `${SOFT_LIMIT - length}` : ""}
      </span>
    </div>
    {!ready && !busy && page.status !== "error" && <p className="post-meta" role="status">Opening X's composer…</p>}
    {page.status === "error" && <p className="inline-error" role="alert">X's composer didn't open. Go back and try again.</p>}
    {message && <p className={status === "idle" ? "post-meta" : "inline-error"} role="alert">{message}</p>}
  </form>;
}
