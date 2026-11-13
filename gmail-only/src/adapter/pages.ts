import { list, one, type CommandSteps, type Step } from "@genesis/sdk/page";
import type { ConversationCommand } from "../model.ts";
import {
  account, clean, CLOSE_CHOICE, commandSelector, EDIT_DRAFT, MORE_COMMANDS, MENU_ITEM, menuEmail, readCompose, readConversation, readList, readMenuEntry, readThread,
  ROW, sessionIndex, threadIdOf, visible, visibleView, type ViewId,
} from "./read.ts";

/**
 * Gmail's mobile web app is one document whose hash names the screen: `#tl/…` a list,
 * `#cv/…/<thread>` a conversation, `#co` compose, `#mn` the menu, `#pr` settings. Every hash is
 * the one route screen `mail`; the `view` reader says which screen is showing and the foreground
 * picks the matching custom screen. `ready` waits until the view the hash names has its content.
 */

const EXPECTED: [string, ViewId][] = [["tl", "tl_"], ["cv", "cv_"], ["co", "co_"], ["mn", "mn_"], ["pr", "pr_"]];

function expectedView(hash: string): ViewId | null {
  const head = hash.replace(/^#/, "").split(/[/?]/)[0];
  if (head === "") return "tl_";
  return EXPECTED.find(([prefix]) => prefix === head)?.[1] ?? null;
}

function hasContent(doc: Document, view: ViewId): boolean {
  const root = doc.getElementById(view)!;
  switch (view) {
    case "tl_": return root.querySelector(ROW) !== null || clean(root.querySelector(".mmDIjd")?.textContent) !== "";
    case "cv_": return root.querySelector(".jzNoVc") !== null && root.querySelector('[id^="cvcmsg_"]') !== null;
    case "co_": return doc.getElementById("composeto") !== null;
    case "mn_": return root.querySelector(MENU_ITEM) !== null;
    case "pr_": return true;
  }
}

export function ready(doc: Document): boolean {
  if (doc.readyState === "loading") return false;
  const shown = visibleView(doc);
  if (!shown || !hasContent(doc, shown)) return false;
  const expected = expectedView(doc.location.hash);
  // Reply and forward open compose without changing the hash; any other mismatch is a view still loading.
  return expected === null || expected === shown || shown === "co_";
}

// ---------------------------------------------------------------------------------------------
// Steps

type Result = CommandSteps | { satisfied: true };

const click = (css: string): Step => ({ op: "click", target: { css } });
const waitFor = (css: string, timeoutMs: number): Step => ({ op: "wait", for: { target: { css }, state: "attached" }, timeoutMs });

/** A thread id as Gmail writes it in a row's id; anything else is refused before it reaches a selector. */
function threadId(args: unknown): string {
  const id = (args as { id?: unknown } | undefined)?.id;
  if (typeof id !== "string" || !/^[\w:-]{1,200}$/.test(id)) throw new Error("Expected a thread id");
  return id;
}

function flag(args: unknown, name: string): boolean {
  const value = (args as Record<string, unknown> | undefined)?.[name];
  if (typeof value !== "boolean") throw new Error(`Expected ${name}: true or false`);
  return value;
}

// ---------------------------------------------------------------------------------------------
// Thread list commands. Each takes the thread's `id`.

const rowSelector = (id: string) => `#th_${CSS.escape(id)}`;
const SELECT = '[data-control-type^="tlatogglecheck"]';
const STAR = '[data-control-type^="tlastar"]';
const BULK = (arg: string) => `.zY6rPd [data-control-type="ca+5"][data-onclick-arg="${arg}"]`;

function rowOf(doc: Document, id: string): Element {
  const row = doc.querySelector(rowSelector(id));
  if (!row) throw new Error("Gmail is not showing this email here");
  return row;
}

function toggleIn(doc: Document, args: unknown, control: string, field: string): Result {
  const id = threadId(args);
  const wanted = flag(args, field);
  const button = rowOf(doc, id).querySelector(control);
  if (!button) throw new Error("Gmail did not show this control");
  if ((button.getAttribute("aria-checked") === "true") === wanted) return { satisfied: true };
  const selector = `${rowSelector(id)} ${control}`;
  return {
    steps: [click(selector)],
    until: now => (now.querySelector(selector)?.getAttribute("aria-checked") === "true") === wanted,
  };
}

export const setStarred = (doc: Document, args: unknown) => toggleIn(doc, args, STAR, "starred");
export const setSelected = (doc: Document, args: unknown) => toggleIn(doc, args, SELECT, "selected");

const selectedRows = (doc: Document) => [...doc.querySelectorAll(`#tl_ ${ROW}`)].filter(row => readThread(row).selected);

const leftList = (id: string) => (doc: Document) => doc.querySelector(rowSelector(id)) === null;
const inInbox = (row: Element) => readThread(row).labels.includes("Inbox");

/**
 * Runs one of Gmail's selection-bar commands on one row: select it and use the bar. Refuses when
 * other rows are selected, so a single-row command never takes the user's selection with it.
 * `done` is the evidence; by default the row leaving the list.
 */
function rowCommand(arg: string, done: (id: string) => (doc: Document) => boolean = leftList) {
  return (doc: Document, args: unknown): Result => {
    const id = threadId(args);
    const row = rowOf(doc, id);
    if (selectedRows(doc).some(other => threadIdOf(other) !== id)) throw new Error("Clear the selection first");
    const steps: Step[] = [];
    if (!readThread(row).selected) steps.push(click(`${rowSelector(id)} ${SELECT}`), waitFor(BULK(arg), 3000));
    steps.push(click(BULK(arg)));
    return { steps, until: done(id), deadlineMs: 12_000 };
  };
}

export const archiveThread = rowCommand("1");
export const trashThread = rowCommand("9");

/**
 * Moves an archived row back to the inbox from a list that keeps it, such as All mail, whose
 * selection bar offers "Move to inbox". The row gaining Gmail's Inbox label is the evidence.
 */
export function moveThreadToInbox(doc: Document, args: unknown): Result {
  if (inInbox(rowOf(doc, threadId(args)))) return { satisfied: true };
  return rowCommand("2", id => now => {
    const row = now.querySelector(rowSelector(id));
    return row !== null && inInbox(row);
  })(doc, args);
}

/** Acts on every selected row with Gmail's selection bar; evidence is that the rows left. */
function bulk(arg: string) {
  return (doc: Document): Result => {
    const ids = selectedRows(doc).map(threadIdOf);
    if (!ids.length) throw new Error("No emails are selected");
    return {
      steps: [click(BULK(arg))],
      until: now => ids.every(id => now.querySelector(rowSelector(id)) === null),
      deadlineMs: 12_000,
    };
  };
}

export const archiveSelected = bulk("1");
export const trashSelected = bulk("9");

export function clearSelection(doc: Document): Result {
  if (!selectedRows(doc).length) return { satisfied: true };
  return { steps: [click('[data-control-type^="banone"]')], until: now => selectedRows(now).length === 0 };
}

const rowCount = (doc: Document) => doc.querySelectorAll(`#tl_ ${ROW}`).length;

/** Scrolls to the end, where Gmail loads the next page of threads. More rows are the evidence. */
export function loadMore(doc: Document): Result {
  const before = rowCount(doc);
  return { steps: [{ op: "scroll", to: "end" }], until: now => rowCount(now) > before, deadlineMs: 10_000 };
}

export function refresh(doc: Document): Result {
  if (!doc.querySelector('[aria-label="Refresh"]')) return { satisfied: true };
  return { steps: [click('[aria-label="Refresh"]')] };
}

// ---------------------------------------------------------------------------------------------
// Conversation commands

const COMMANDS: readonly ConversationCommand[] = ["archive", "trash", "deleteForever", "notSpam", "moveToInbox", "mute", "markUnread", "spam"];

/**
 * Runs one of the open email's toolbar commands, `{ command }`. Each leaves the conversation: Gmail
 * opens the list as a new history entry. A command Gmail's toolbar does not show may sit in its
 * "More options" panel, which Gmail builds when it opens, so the panel opens first and its copy of
 * the command is clicked.
 */
export function conversationCommand(doc: Document, args: unknown): Result {
  const command = (args as { command?: unknown } | undefined)?.command as ConversationCommand;
  if (!COMMANDS.includes(command)) throw new Error("Expected a conversation command");
  const toolbar = commandSelector(command);
  const hash = doc.location.hash;
  const until = (now: Document) => now.location.hash !== hash;
  if (visible(doc.querySelector(toolbar))) return { steps: [click(toolbar)], until, deadlineMs: 10_000 };
  if (!doc.querySelector(MORE_COMMANDS)) throw new Error("Gmail does not offer that for this email");
  const panel = commandSelector(command, "panel");
  return { steps: [click(MORE_COMMANDS), waitFor(panel, 3_000), click(panel)], until, deadlineMs: 10_000 };
}

/** Opens a message Gmail shows collapsed by tapping its header there, `{ id }`. Its body appearing is the evidence. */
export function expandMessage(doc: Document, args: unknown): Result {
  const id = (args as { id?: unknown } | undefined)?.id;
  if (typeof id !== "string" || !/^[\w-]+$/.test(id)) throw new Error("Expected a message id");
  const opened = (now: Document) => {
    const body = now.getElementById(`cvcmsgbod_${id}`);
    return body instanceof HTMLElement && body.getClientRects().length > 0 && (body.textContent ?? "").trim() !== "";
  };
  if (opened(doc)) return { satisfied: true };
  const header = `[data-control-type^="cvasnip"][data-onclick-arg="${id}"]`;
  if (!doc.querySelector(header)) throw new Error("Gmail can't open this message here");
  return { steps: [click(header)], until: opened, deadlineMs: 10_000 };
}

export function setConversationStarred(doc: Document, args: unknown): Result {
  const wanted = flag(args, "starred");
  const isStarred = (now: Document) => {
    const star = now.getElementById("cvcstar");
    return star instanceof HTMLElement && getComputedStyle(star).display !== "none";
  };
  if (isStarred(doc) === wanted) return { satisfied: true };
  return { steps: [click(wanted ? "#cvcstaroff" : "#cvcstar")], until: now => isStarred(now) === wanted };
}

const REPLY = { reply: "cvarplf+29", replyAll: "cvarplallf+30", forward: "cvafwdf+31" } as const;

const composeOpen = (doc: Document) => visibleView(doc) === "co_" && doc.getElementById("composeto") !== null;

/** Reply, reply all or forward, `{ mode }`. */
export function respond(doc: Document, args: unknown): Result {
  const mode = (args as { mode?: unknown } | undefined)?.mode;
  const key = typeof mode === "string" && mode in REPLY ? (mode as keyof typeof REPLY) : "reply";
  const selector = `#cv_ [data-control-type="${REPLY[key]}"]`;
  if (!doc.querySelector(selector)) throw new Error("Gmail did not show a reply button");
  return { steps: [click(selector)], until: composeOpen };
}

/** Opens a draft of the conversation in compose, `{ id }` the draft message's id. */
export function editDraft(doc: Document, args: unknown): Result {
  const id = (args as { id?: unknown } | undefined)?.id;
  const selector = typeof id === "string" && id ? `#cvcmsg_${CSS.escape(id)} ${EDIT_DRAFT}` : "";
  if (!selector || !doc.querySelector(selector)) throw new Error("Gmail did not show this draft");
  return { steps: [click(selector)], until: composeOpen };
}

// ---------------------------------------------------------------------------------------------
// Compose commands. The applet never sends; the user sends from Gmail's own compose.

const text = (args: unknown, name: string) => {
  const value = (args as Record<string, unknown> | undefined)?.[name];
  return typeof value === "string" ? value.slice(0, 2000) : null;
};

/** Copies `{ to, cc, bcc, subject }` into Gmail's fields; a field left out stays as it is. */
export function fillCompose(doc: Document, args: unknown): Result {
  const wanted: { id: string; value: string }[] = [];
  for (const [name, id] of [["to", "composeto"], ["cc", "composecc"], ["bcc", "composebcc"], ["subject", "cmcsubj"]] as const) {
    const value = text(args, name);
    const field = doc.getElementById(id);
    if (value !== null && field instanceof HTMLInputElement && field.value !== value) wanted.push({ id, value });
  }
  if (!wanted.length) return { satisfied: true };
  return {
    steps: wanted.map(({ id, value }) => ({ op: "fill", target: { css: `#${id}` }, value })),
    until: now => wanted.every(({ id, value }) => (now.getElementById(id) as HTMLInputElement | null)?.value === value),
  };
}

const CLOSE = '[data-control-type="cmclose+108"]';

// Close settles when compose is gone or when Gmail asks what to do with the draft; `compose.answerClose` answers.
export function discardCompose(doc: Document): Result {
  if (!doc.querySelector(CLOSE)) return { satisfied: true };
  return {
    steps: [click(CLOSE)],
    until: now => visibleView(now) !== "co_" || now.querySelector(CLOSE_CHOICE.discard) !== null,
  };
}

/** Answers Gmail's question about a closed draft, `{ choice }`: discard, save or cancel. */
export function answerClose(doc: Document, args: unknown): Result {
  const choice = (args as { choice?: unknown } | undefined)?.choice;
  if (choice !== "discard" && choice !== "save" && choice !== "cancel") throw new Error("Expected discard, save or cancel");
  const button = CLOSE_CHOICE[choice];
  if (!doc.querySelector(button)) throw new Error("Gmail is not asking about this draft");
  return {
    steps: [click(button)],
    until: now => (choice === "cancel" ? now.querySelector(button) === null : visibleView(now) !== "co_"),
  };
}

// ---------------------------------------------------------------------------------------------
// Menu

/** Opens a menu entry, `{ arg }` its `data-onclick-arg`; the hash changing is the evidence. */
export function openMenuEntry(doc: Document, args: unknown): Result {
  const arg = (args as { arg?: unknown } | undefined)?.arg;
  if (typeof arg !== "string" || !arg) throw new Error("Expected a menu entry");
  const selector = `#mn_ [role="menuitem"][data-onclick-arg="${CSS.escape(arg)}"]`;
  if (!doc.querySelector(selector)) throw new Error("Gmail's menu does not show this entry");
  const hash = doc.location.hash;
  return { steps: [click(selector)], until: now => now.location.hash !== hash };
}

// ---------------------------------------------------------------------------------------------
// Readers

/**
 * Which Gmail screen is showing, so the foreground can draw its own, with the session index and
 * the signed-in address; `email` is null while the page does not show it.
 */
export const view = one({
  root: "#views",
  read: root => {
    const doc = root.ownerDocument;
    return { view: visibleView(doc), hash: doc.location.hash.slice(0, 600), session: sessionIndex(doc), email: account(doc) ?? null };
  },
});

export const listInfo = one({ root: "#tl_", dependsOn: ["#tltbt"], read: readList });

export const threads = list({ root: "#tl_", items: ROW, key: threadIdOf, read: readThread });

export const conversation = one({ root: "#cv_", read: readConversation });

export const compose = one({ root: "#co_", dependsOn: [CLOSE_CHOICE.discard], fields: true, read: readCompose });

export const menu = list({
  root: "#mn_",
  items: MENU_ITEM,
  key: item => item.getAttribute("data-onclick-arg") || clean(item.textContent, 60),
  read: readMenuEntry,
});

export const menuAccount = one({ root: "#mn_", read: root => ({ email: menuEmail(root) }) });
