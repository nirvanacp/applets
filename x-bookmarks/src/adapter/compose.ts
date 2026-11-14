import { clean } from "./read.ts";

/**
 * X's composer at `/compose/post`. The editor is a rich text editor, the file input is hidden
 * behind the media button, and X shows a thumbnail with a remove button for each attached file.
 */

export const EDITOR = '[data-testid="tweetTextarea_0"]';
export const FILE_INPUT = 'input[data-testid="fileInput"]';
export const POST_BUTTON = '[data-testid="tweetButton"]';
const ATTACHMENTS = '[data-testid="attachments"]';
const REMOVE = '[aria-label="Remove media"]';

/** Collapses whitespace, so the editor's line breaks and the applet's text compare equal. */
const flat = (value: string) => value.replace(/\s+/g, " ").trim();

const editor = (doc: Document) => doc.querySelector(EDITOR);

/** The composer is ready once X shows its editor and its file input. */
export const composerReady = (doc: Document) =>
  doc.readyState !== "loading" && editor(doc) !== null && doc.querySelector(FILE_INPUT) !== null;

/** The number of files X shows in the composer: one thumbnail, with its remove button, per file. */
export function attachedCount(doc: Document): number {
  const box = doc.querySelector(ATTACHMENTS);
  if (!box) return 0;
  return Math.max(box.querySelectorAll(REMOVE).length, box.querySelectorAll("img, video").length);
}

/** True when X's editor holds `args.text`. */
export function holdsText(doc: Document, args?: unknown): boolean {
  const text = (args as { text?: unknown } | undefined)?.text;
  const found = editor(doc);
  return typeof text === "string" && found instanceof HTMLElement && flat(found.innerText) === flat(text);
}

/** True when X shows at least `args.count` attached files. */
export function holdsMedia(doc: Document, args?: unknown): boolean {
  const count = (args as { count?: unknown } | undefined)?.count;
  return typeof count === "number" && attachedCount(doc) >= count;
}

/** What the composer shows: its attached file count, whether Post is enabled, and X's message, if any. */
export function composerState(doc: Document) {
  const button = doc.querySelector(POST_BUTTON);
  const disabled = !button || button.getAttribute("aria-disabled") === "true" || (button as HTMLButtonElement).disabled === true;
  const toast = doc.querySelector('[data-testid="toast"]');
  return { media: attachedCount(doc), canPost: !disabled, message: toast ? clean(toast.textContent, 200) || null : null };
}
