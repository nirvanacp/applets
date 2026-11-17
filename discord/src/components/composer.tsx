import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useFilePicker, useGenesis, useRouter } from "@let/sdk/react";
import { MAX_TEXT, type Composer as ComposerState } from "../model";
import { useScreenWatch } from "../screen";
import { MIN_BUSY_MS, useToast } from "../ui/feedback";
import { WebsiteCue } from "../ui/states";
import { failureText, useDiscordCommand } from "./commands";
import { Icon } from "./ui";

/** Discord takes up to 10 files in one message. */
const MAX_FILES = 10;
/** Drafts per page, kept while the applet runs, so going to another channel and back keeps one. */
const drafts = new Map<string, string>();

const sizeOf = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** The message composer: text, files and Send. It writes into Discord's own composer and sends there. */
export function Composer({ placeholder }: { placeholder: string }) {
  const genesis = useGenesis();
  const { status, viewWebsite } = useRouter();
  const url = status("primary").url;
  const state = useScreenWatch<ComposerState | null>("chat", "composer");
  const send = useDiscordCommand<{ text: string; files: string[] }>("send");
  const { files, pick, remove, clear } = useFilePicker();
  const { show } = useToast();
  const [text, setText] = useState(() => drafts.get(url) ?? "");
  const [sending, setSending] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const canAttach = genesis.limits.userActions === true;
  const length = [...text].length;
  const over = length > MAX_TEXT;
  const empty = text.trim() === "" && files.length === 0;
  const writable = state.value?.writable !== false;

  useEffect(() => {
    if (text) drafts.set(url, text);
    else drafts.delete(url);
  }, [url, text]);

  // The field grows with its text up to a third of the screen, then scrolls.
  useLayoutEffect(() => {
    const node = area.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, window.innerHeight / 3)}px`;
  }, [text]);

  if (state.value && !state.value.writable) {
    return <p className="composer-note">You can't send messages here.</p>;
  }

  async function attach() {
    try {
      // `files` is this render's list, from before the pick.
      const room = MAX_FILES - files.length;
      const picked = await pick({ multiple: true });
      for (const extra of picked.slice(Math.max(room, 0))) remove(extra.id);
      if (picked.length > room) show({ text: `You can send up to ${MAX_FILES} files at once.` });
    } catch {
      show({ text: "Couldn't open your files." });
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (sending || empty || over || !writable) return;
    setSending(true);
    const started = Date.now();
    const result = await send({ text: text.trim(), files: files.map(file => file.id) });
    await new Promise(done => setTimeout(done, Math.max(0, MIN_BUSY_MS - (Date.now() - started))));
    setSending(false);
    if (result.outcome === "observed") {
      setText("");
      clear();
      area.current?.focus();
      return;
    }
    if (result.outcome === "cancelled") return;
    if (result.code === "USER_ACTION_REQUIRED") return show({ text: "Tap Send again to add the files." });
    if (result.code === "FILE_UNAVAILABLE") return show({ text: "A file is no longer available. Remove it and add it again." });
    show({ text: result.outcome === "unknown"
      ? "Discord didn't confirm your message. Check the conversation before sending again."
      : `${failureText(result) ?? "Couldn't send."} Your message is still here.` });
  }

  // Enter adds a line, as on a phone keyboard; a hardware keyboard sends with Ctrl or Cmd+Enter.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void submit();
  };

  return <form className="composer" onSubmit={submit} aria-busy={sending}>
    {files.length > 0 && <ul className="composer-files" aria-label="Files to send">
      {files.map(file => <li key={file.id} className="composer-file">
        {file.type.startsWith("image/") ? <img src={file.previewUrl} alt="" /> : <Icon name="file" />}
        <span className="composer-file-text"><strong>{file.name}</strong><span>{sizeOf(file.size)}</span></span>
        <button type="button" className="icon-button small" aria-label={`Remove ${file.name}`} disabled={sending} onClick={() => remove(file.id)}>
          <Icon name="close" />
        </button>
      </li>)}
    </ul>}
    <div className="composer-row">
      {canAttach
        ? <button type="button" className="icon-button" aria-label="Add files" disabled={sending || files.length >= MAX_FILES} onClick={() => void attach()}>
          <Icon name="attach" />
        </button>
        : <button type="button" className="icon-button" aria-label="Add files on Discord, opens website" onClick={() => viewWebsite("primary")}>
          <Icon name="attach" /><WebsiteCue />
        </button>}
      <label className="composer-field">
        <span className="visually-hidden">{placeholder}</span>
        <textarea ref={area} rows={1} value={text} placeholder={placeholder} readOnly={sending} enterKeyHint="enter"
          aria-invalid={over} aria-describedby={over || length > MAX_TEXT - 200 ? "composer-count" : undefined}
          onChange={event => setText(event.target.value)} onKeyDown={onKeyDown} />
      </label>
      <button type="submit" className="send-button" aria-label={sending ? "Sending" : "Send"} disabled={empty || over || sending || !writable}>
        <Icon name="send" className={sending ? "pulsing" : undefined} />
      </button>
    </div>
    {length > MAX_TEXT - 200 && <p id="composer-count" className={`composer-count${over ? " over" : ""}`} aria-live="polite">
      {over ? `${length - MAX_TEXT} characters over Discord's limit` : `${MAX_TEXT - length} characters left`}
    </p>}
  </form>;
}
