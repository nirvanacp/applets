import { imageUrl } from "../model.ts";
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

/** The post X's composer quotes: the card in the attachments that names its author. */
const quoteCard = (box: Element | null) => box?.querySelector(QUOTE_AUTHOR)?.closest("button, [role=\"link\"]") ?? null;
const QUOTE_AUTHOR = '[data-testid="User-Name"]';

/**
 * The number of files X shows in the composer: one thumbnail, with its remove button, per file.
 * The pictures and videos of a quoted post are not files: X shows them, with a remove button of
 * their own, beside the quote's card in the box's part that holds the card.
 */
export function attachedCount(doc: Document): number {
  const box = doc.querySelector(ATTACHMENTS);
  if (!box) return 0;
  const card = quoteCard(box);
  const quoted = card ? [...box.children].find(part => part.contains(card)) : undefined;
  const outside = (element: Element) => !quoted?.contains(element);
  return Math.max([...box.querySelectorAll(REMOVE)].filter(outside).length, [...box.querySelectorAll("img, video")].filter(outside).length);
}

export interface QuotedPost { name: string; handle: string | null; text: string; avatar: string | null }

/** The post X's composer quotes, as its card shows it, or null. */
export function quotedPost(doc: Document): QuotedPost | null {
  const card = quoteCard(doc.querySelector(ATTACHMENTS));
  const author = card?.querySelector(QUOTE_AUTHOR);
  if (!card || !(author instanceof HTMLElement)) return null;
  const parts = author.innerText.split("\n").map(part => part.trim()).filter(Boolean);
  const text = card.querySelector('[data-testid="tweetText"]');
  return {
    name: clean(parts[0], 100),
    handle: parts.find(part => /^@[A-Za-z0-9_]{1,15}$/.test(part))?.slice(1) ?? null,
    text: text instanceof HTMLElement ? clean(text.innerText, 400) : "",
    avatar: imageUrl(card.querySelector('[data-testid="Tweet-User-Avatar"] img')?.getAttribute("src")),
  };
}

/** True when X's editor holds `args.text`. */
export function holdsText(doc: Document, args?: unknown): boolean {
  const text = (args as { text?: unknown } | undefined)?.text;
  return typeof text === "string" && editor(doc) !== null && editorText(doc) === flat(text);
}

/** True when X shows exactly `args.count` attached files. */
export function holdsMedia(doc: Document, args?: unknown): boolean {
  const count = (args as { count?: unknown } | undefined)?.count;
  return typeof count === "number" && attachedCount(doc) === count;
}

/**
 * The text X's editor holds, with whitespace collapsed; empty when there is no editor. A new post
 * has a rich text editor; a quote, on X's mobile site, a plain text area.
 */
export function editorText(doc: Document): string {
  const found = editor(doc);
  if (found instanceof HTMLTextAreaElement) return flat(found.value);
  return found instanceof HTMLElement ? flat(found.innerText) : "";
}

/**
 * Leaves X's composer without posting. X's own Back asks "Save post?" when the composer holds
 * something, such as a quote, and Discard answers it; Back through history would leave the
 * question open on the hidden page.
 */
export function discardComposer(doc: Document) {
  const holds = editorText(doc) !== "" || doc.querySelector(ATTACHMENTS) !== null;
  return {
    steps: [
      { op: "click" as const, target: { css: '[data-testid="app-bar-back"]' } },
      ...(holds ? [{ op: "click" as const, target: { css: '[data-testid="confirmationSheetCancel"]' }, timeoutMs: 3_000 }] : []),
    ],
    until: (now: Document) => now.location.pathname !== "/compose/post",
  };
}

/**
 * What the composer shows: its text, its attached file count, the post it quotes, whether Post is
 * enabled, and X's message, if any.
 */
export function composerState(doc: Document) {
  const button = doc.querySelector(POST_BUTTON);
  const disabled = !button || button.getAttribute("aria-disabled") === "true" || (button as HTMLButtonElement).disabled === true;
  const toast = doc.querySelector('[data-testid="toast"]');
  return {
    text: editorText(doc), media: attachedCount(doc), quote: quotedPost(doc), canPost: !disabled,
    message: toast ? clean(toast.textContent, 200) || null : null,
  };
}
