import { list, value, type CommandSteps, type Step } from "@let/sdk/page";
import { MAX_TEXT, placeOfUrl, type Composer, type Embed, type FileLink, type Media, type Message, type Part, type Place, type Reaction, type Sticker } from "../model";
import { guildName } from "./sidebar";
import { clean, COMPOSER, httpsUrl, imageIn, MESSAGES, SCROLLER, textOf } from "./read";

/**
 * A channel or conversation page: the header, Discord's message list and its composer. Message
 * rows are `li#chat-messages-<channel>-<message>`; the parts of a message carry ids ending in the
 * message id (`message-content-<id>`, `message-accessories-<id>`, `message-reactions-<id>`).
 */

/** Discord's longest message without Nitro, and the most one trusted `type` takes. */


const messageId = (item: Element) => item.id.slice(item.id.lastIndexOf("-") + 1);
/** The channel a message row belongs to: `chat-messages-<channel>-<message>`. */
const rowChannel = (doc: Document) =>
  /^chat-messages-(\d+)-/.exec(doc.querySelector(`${MESSAGES} li[id^="chat-messages-"]`)?.id ?? "")?.[1] ?? null;

/** The skeleton rows Discord draws above the messages while older ones remain to load. */
const PLACEHOLDER = `${MESSAGES} > div [class*=blob_]`;

/** The first message of a continued group: its row names the author and holds the avatar. */
function groupStart(item: Element): Element | null {
  if (item.querySelector("[class*=groupStart], h3")) return item;
  const labelledBy = item.querySelector("[role=article]")?.getAttribute("aria-labelledby") ?? "";
  const start = /message-username-(\d+)/.exec(labelledBy)?.[1];
  if (!start) return null;
  const prefix = item.id.slice(0, item.id.lastIndexOf("-") + 1);
  return item.ownerDocument.getElementById(`${prefix}${start}`);
}

// ---- Message text ----------------------------------------------------------------------------

const BLOCKS = new Set(["DIV", "P", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "UL", "OL"]);
const MAX_PARTS = 400;

/** A message's text as runs, so links, mentions and code keep their kind. Newlines are kept. */
export function partsOf(content: Element | null): Part[] {
  const parts: Part[] = [];
  let length = 0;
  const push = (part: Part) => {
    if (!part.text || parts.length >= MAX_PARTS || length > 4000) return;
    length += part.text.length;
    const last = parts[parts.length - 1];
    if (part.kind === "text" && last?.kind === "text") last.text += part.text;
    else parts.push(part);
  };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) return push({ kind: "text", text: node.textContent ?? "" });
    if (!(node instanceof Element)) return;
    if (node.matches("[class*=hiddenVisually], [class*=timestamp], time, [class*=edited]")) return;
    if (node.matches("img")) {
      const alt = node.getAttribute("alt") ?? "";
      const src = httpsUrl(node.getAttribute("src"), node.ownerDocument);
      const custom = /^:.+:$/.test(alt) && src?.includes("/emojis/");
      return push({ kind: "emoji", text: alt, ...(custom ? { image: src! } : {}) });
    }
    if (node.matches("pre")) return push({ kind: "block", text: (node.textContent ?? "").replace(/\n$/, "") });
    if (node.matches("code")) return push({ kind: "code", text: node.textContent ?? "" });
    if (node.matches("[class*=mention]")) return push({ kind: "mention", text: clean(node.textContent, 120) });
    if (node.matches("a[href]")) {
      const url = httpsUrl(node.getAttribute("href"), node.ownerDocument);
      const text = node.textContent ?? "";
      return push(url ? { kind: "link", text, url } : { kind: "text", text });
    }
    const block = BLOCKS.has(node.tagName) && parts.length > 0;
    if (block && !/\n$/.test(parts[parts.length - 1]!.text)) push({ kind: "text", text: "\n" });
    if (node.tagName === "BLOCKQUOTE") push({ kind: "text", text: "> " });
    if (node.tagName === "LI") push({ kind: "text", text: "• " });
    node.childNodes.forEach(walk);
  };
  content?.childNodes.forEach(walk);
  const last = parts[parts.length - 1];
  if (last?.kind === "text") last.text = last.text.replace(/\s+$/, "");
  return parts.filter(part => part.text);
}

// ---- Attachments, embeds, reactions ----------------------------------------------------------

/** "0.751429 / 1" from Discord's loading overlay, as width over height. */
function ratioIn(scope: Element): number | null {
  const style = scope.querySelector<HTMLElement>("[style*=aspect-ratio]")?.style.aspectRatio ?? "";
  const match = /([\d.]+)\s*\/\s*([\d.]+)/.exec(style);
  if (match) return Number(match[1]) / Number(match[2]) || null;
  const img = scope.querySelector("img");
  const width = Number(img?.getAttribute("width")), height = Number(img?.getAttribute("height"));
  return width > 0 && height > 0 ? width / height : null;
}

/** Stickers carry their name in `data-name`; animated ones draw on a canvas and have no picture. */
function stickersIn(accessories: Element): Sticker[] {
  return Array.from(accessories.querySelectorAll("[data-type=sticker]"), (node): Sticker => ({
    name: clean(node.getAttribute("data-name") ?? node.getAttribute("alt")?.replace(/^Sticker,\s*/, ""), 80) || "Sticker",
    url: node.tagName === "IMG" ? imageIn(node) : null,
  })).slice(0, 3);
}

function mediaIn(accessories: Element): Media[] {
  return [...accessories.querySelectorAll("[class*=mosaicItem]")]
    .filter(item => !item.closest("article"))
    .flatMap((item): Media[] => {
      const video = item.querySelector("video");
      const link = item.querySelector("a[class*=originalLink][href]");
      const url = httpsUrl(link?.getAttribute("href") ?? video?.getAttribute("src") ?? imageIn(item), item.ownerDocument);
      return url && !item.querySelector("[class*=fileNameLink], [class*=attachmentName]") ? [{ url, ratio: ratioIn(item), video: video !== null }] : [];
    })
    .slice(0, 10);
}

function filesIn(accessories: Element): FileLink[] {
  return [...accessories.querySelectorAll("[class*=fileNameLink], [class*=attachmentName]")]
    .map(node => {
      const item = node.closest("[class*=attachment], [class*=file_]") ?? node.parentElement!;
      const link = node.closest("a[href]") ?? item.querySelector("a[href]");
      return { name: textOf(node, 200), url: httpsUrl(link?.getAttribute("href"), node.ownerDocument), size: textOf(item.querySelector("[class*=metadata], [class*=size]"), 40) || null };
    })
    .filter(file => file.name)
    .slice(0, 10);
}

function embedsIn(accessories: Element): Embed[] {
  return [...accessories.querySelectorAll("article[class*=embed]")].map(embed => {
    const title = embed.querySelector("[class*=embedTitle]");
    const link = title?.querySelector("a[href]") ?? (title?.matches("a[href]") ? title : null);
    const image = embed.querySelector("[class*=embedImage] a[href], [class*=embedThumbnail] a[href], [class*=embedVideo] img, [class*=embedImage] img, [class*=embedThumbnail] img");
    return {
      title: textOf(title, 200) || null,
      url: httpsUrl(link?.getAttribute("href"), embed.ownerDocument),
      description: textOf(embed.querySelector("[class*=embedDescription]"), 400) || null,
      provider: textOf(embed.querySelector("[class*=embedProvider], [class*=embedAuthorName]"), 80) || null,
      image: image ? httpsUrl(image.getAttribute("href") ?? image.getAttribute("src"), embed.ownerDocument) : null,
    };
  }).filter(embed => embed.title || embed.description || embed.image).slice(0, 4);
}

/** The emoji of a reaction button: a unicode emoji's alt text, or a custom emoji's `:name:`. */
const emojiOf = (button: Element) => clean(button.querySelector("img")?.getAttribute("alt") ?? button.querySelector("[class*=emoji]")?.textContent, 64);

const REACTION = "[role=button][aria-pressed]";

function reactionsIn(item: Element, id: string): Reaction[] {
  const box = item.querySelector(`#message-reactions-${CSS.escape(id)}`);
  if (!box) return [];
  return [...box.querySelectorAll(REACTION)].map(button => {
    const img = button.querySelector("img");
    const src = httpsUrl(img?.getAttribute("src"), item.ownerDocument);
    return {
      emoji: emojiOf(button),
      image: src?.includes("/emojis/") ? src : null,
      count: Number(/\d+/.exec(textOf(button.querySelector("[class*=reactionCount]") ?? button, 20))?.[0] ?? 0),
      mine: button.getAttribute("aria-pressed") === "true",
    };
  }).filter(reaction => reaction.emoji).slice(0, 20);
}

// ---- Messages --------------------------------------------------------------------------------

function readMessage(item: Element): Message {
  const id = messageId(item);
  const esc = CSS.escape(id);
  const system = item.querySelector("[class*=systemMessage]") !== null;
  const start = groupStart(item);
  const head = start ?? item;
  const startId = messageId(head);
  // The name element also holds the server tag, so prefer the name's own `data-text`.
  const name = head.querySelector(`#message-username-${CSS.escape(startId)}`);
  const author = clean(name?.querySelector("[data-text]")?.getAttribute("data-text"), 80) || textOf(name, 80)
    || textOf(head.querySelector("h3 [class*=username]"), 80);
  const reply = item.querySelector(`#message-reply-context-${esc}`);
  const accessories = item.querySelector(`#message-accessories-${esc}`);
  const content = item.querySelector(`#message-content-${esc}`)
    ?? (system ? item.querySelector("[class*=content]") : null);
  const authorAvatar = head.querySelector("img[class*=avatar]");
  return {
    id,
    start: start === item || system,
    author,
    authorId: /\/avatars\/(\d+)\//.exec(authorAvatar?.getAttribute("src") ?? "")?.[1] ?? null,
    avatar: imageIn(authorAvatar),
    time: item.querySelector(`#message-timestamp-${esc}, time[datetime]`)?.getAttribute("datetime") ?? null,
    edited: content?.querySelector("[class*=edited]") !== null && content !== null,
    system,
    parts: partsOf(content),
    reply: reply ? {
      author: textOf(reply.querySelector("[class*=username]"), 80).replace(/^@/, ""),
      text: textOf(reply.querySelector("[class*=repliedTextContent], [class*=repliedTextPreview]"), 200),
    } : null,
    media: accessories ? mediaIn(accessories) : [],
    stickers: accessories ? stickersIn(accessories) : [],
    files: accessories ? filesIn(accessories) : [],
    embeds: accessories ? embedsIn(accessories) : [],
    reactions: reactionsIn(item, id),
  };
}

export const messages = list<Message>({
  root: MESSAGES,
  items: 'li[id^="chat-messages-"]',
  key: messageId,
  read: readMessage,
  extent: item => [groupStart(item)],
  virtualized: true,
});

/**
 * The URL's channel shows its own messages, or its beginning when it has none. A server URL
 * without a channel (Discord's phone layout keeps `/channels/<server>`) shows its last channel.
 */
function chatDrawn(doc: Document): boolean {
  const { channel } = placeOfUrl(doc.location.href);
  const list = doc.querySelector(MESSAGES);
  if (!list) return false;
  const rows = list.querySelectorAll('li[id^="chat-messages-"]');
  if (rows.length === 0) return doc.querySelector(PLACEHOLDER) === null;
  return channel === null || rows[0]!.id.startsWith(`chat-messages-${channel}-`);
}

export const chatReady = value(chatDrawn);

/** The header's name, without the hidden server prefix ("Better than clubhouse:"). */
function headerName(doc: Document): string {
  const h1 = doc.querySelector('section[aria-label="Channel header"] h1');
  if (!h1) return "";
  const copy = h1.cloneNode(true) as Element;
  copy.querySelectorAll("[class*=hiddenVisually]").forEach(node => node.remove());
  return textOf(copy, 120);
}

export const place = value((doc): Place | null => {
  const url = placeOfUrl(doc.location.href);
  const guild = url.guild;
  const channel = url.channel ?? rowChannel(doc);
  if (!channel) return null;
  // "Discord | #general | Better than clubhouse" or "Discord | @friend".
  const title = doc.title.split(" | ").slice(1);
  const name = headerName(doc) || clean(title[0]?.replace(/^[#@]/, ""), 120);
  const list = doc.querySelector(MESSAGES);
  return {
    kind: guild ? "channel" : "dm",
    name,
    guild: guild ? (guildName(doc) ?? (clean(title[1], 120) || null)) : null,
    guildId: guild,
    channelId: channel,
    beginning: list !== null && doc.querySelector(PLACEHOLDER) === null,
  };
});

// ---- Composer --------------------------------------------------------------------------------

const TEXTAREA = `${COMPOSER} textarea`;
const SLATE = `${COMPOSER} [role=textbox][data-slate-editor]`;
const SEND = `${COMPOSER} [aria-label="Send Message"][role=button], ${COMPOSER} button[aria-label="Send Message"]`;
const FILE_INPUT = `${COMPOSER} input[type=file]`;
const UPLOADS = "[class*=channelAttachmentArea] li, [class*=uploadsContainer] li, [class*=channelAttachmentArea] [class*=upload_]";

const attachmentsOf = (doc: Document) => doc.querySelectorAll(UPLOADS).length;

function editorText(doc: Document): string {
  const area = doc.querySelector<HTMLTextAreaElement>(TEXTAREA);
  if (area) return area.value;
  const slate = doc.querySelector(SLATE);
  return slate ? (slate.textContent ?? "").replace(/﻿/g, "") : "";
}

export const composer = value((doc): Composer | null => {
  const area = doc.querySelector<HTMLTextAreaElement>(TEXTAREA);
  const slate = doc.querySelector(SLATE);
  if (!area && !slate) return doc.querySelector(MESSAGES) ? { label: "", text: "", writable: false, attachments: 0 } : null;
  return {
    label: clean(area?.placeholder ?? slate?.getAttribute("aria-label") ?? "", 120),
    text: editorText(doc).slice(0, MAX_TEXT + 1),
    writable: area ? !area.disabled && !area.readOnly : slate?.getAttribute("contenteditable") === "true",
    attachments: attachmentsOf(doc),
  };
});

/** Evidence for `attach`: at least `count` files wait in Discord's upload area. */
export const attached = value((doc, args) => attachmentsOf(doc) >= Number((args as { count?: number } | undefined)?.count ?? 1));

const rowsOf = (doc: Document) => [...doc.querySelectorAll(`${MESSAGES} li[id^="chat-messages-"]`)];
const lastId = (doc: Document) => {
  const rows = rowsOf(doc);
  return rows.length ? messageId(rows[rows.length - 1]!) : null;
};
/** When Discord made a message, from its snowflake id. */
const madeAt = (id: string) => Number(id) / 4194304 + 1420070400000;
/** A sent message counts when it is this recent, which allows for the phone's clock being off. */
const CLOCK_SLACK_MS = 120_000;

/**
 * Sends `text`, with the files already in Discord's upload area. The phone layout's composer is a
 * textarea, which takes a filled value; a wide layout's Slate editor needs trusted typing. Done
 * when the editor and upload area are empty and a new last message holds the text.
 */
export function send(doc: Document, args: unknown): CommandSteps {
  const { text, files } = (args ?? {}) as { text?: unknown; files?: unknown };
  if (typeof text !== "string") throw new Error("send needs { text }");
  const ids = Array.isArray(files) ? files.filter((id): id is string => typeof id === "string") : [];
  const body = text.trim();
  if (!body && ids.length === 0) throw new Error("There is nothing to send");
  if (body.length > MAX_TEXT) throw new Error(`Discord takes up to ${MAX_TEXT} characters`);
  if (!doc.querySelector(TEXTAREA) && !doc.querySelector(SLATE)) throw new Error("You can't send messages here");
  if (editorText(doc).trim() && editorText(doc).trim() !== body) throw new Error("Discord's editor already holds a draft. Open the website to finish it.");

  // Discord may show an older stretch of the channel; its newest message must be in the list.
  const seen = new Set(rowsOf(doc).map(messageId));
  const since = Date.now() - CLOCK_SLACK_MS;
  const steps: Step[] = [{ op: "scroll", target: { css: SCROLLER }, to: "end" }];
  if (ids.length) {
    steps.push(
      { op: "attachFiles", target: { css: FILE_INPUT }, files: ids, via: "input", timeoutMs: 5000 },
      { op: "wait", for: { read: { reader: "attached", args: { count: ids.length } } }, timeoutMs: 15000 },
    );
  }
  if (doc.querySelector(TEXTAREA)) {
    if (body) steps.push({ op: "fill", target: { css: TEXTAREA }, value: body, timeoutMs: 5000 });
    steps.push({ op: "click", target: { css: SEND }, timeoutMs: 5000 });
  } else {
    if (body) {
      const lines = body.split("\n");
      lines.forEach((line, index) => {
        if (index > 0) steps.push({ op: "press", key: "Enter", modifiers: ["Shift"], target: { css: SLATE }, input: "trusted" });
        if (line) steps.push({ op: "type", target: { css: SLATE }, text: line, input: "trusted", timeoutMs: 5000 });
      });
    }
    steps.push({ op: "press", key: "Enter", target: { css: SLATE }, input: "trusted" });
  }
  const sample = body.split("\n")[0]!.slice(0, 60);
  return {
    steps,
    until: d => {
      const id = lastId(d);
      if (!id || seen.has(id) || madeAt(id) < since || editorText(d).trim() || attachmentsOf(d) > 0) return false;
      if (!sample) return d.querySelector(`#message-accessories-${CSS.escape(id)} *`) !== null;
      return (d.querySelector(`#message-content-${CSS.escape(id)}`)?.textContent ?? "").includes(sample);
    },
    deadlineMs: ids.length ? 60000 : 15000,
  };
}

/**
 * Scrolls Discord's message list to its start so it loads older messages. Done when a new first
 * message appears, or when Discord shows the channel's beginning.
 */
export function loadOlder(doc: Document): CommandSteps | { satisfied: true } {
  if (doc.querySelector(MESSAGES) && doc.querySelector(PLACEHOLDER) === null) return { satisfied: true };
  const first = (d: Document) => d.querySelector(`${MESSAGES} li[id^="chat-messages-"]`)?.id ?? null;
  const before = first(doc);
  return {
    steps: [{ op: "scroll", target: { css: SCROLLER }, to: "start" }],
    until: d => first(d) !== before || d.querySelector(PLACEHOLDER) === null,
    deadlineMs: 8000,
  };
}

/** Adds or removes the user's reaction on a message, by pressing the reaction Discord shows. */
export function setReaction(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { message, emoji, on } = (args ?? {}) as { message?: unknown; emoji?: unknown; on?: unknown };
  if (typeof message !== "string" || !/^\d+$/.test(message) || typeof emoji !== "string" || typeof on !== "boolean") {
    throw new Error("setReaction needs { message, emoji, on }");
  }
  const box = `#message-reactions-${CSS.escape(message)}`;
  const find = (d: Document) => [...d.querySelectorAll(`${box} ${REACTION}`)].find(button => emojiOf(button) === emoji) ?? null;
  const button = find(doc);
  if (!button) throw new Error("That reaction is no longer on the message");
  if ((button.getAttribute("aria-pressed") === "true") === on) return { satisfied: true };
  const index = [...doc.querySelectorAll(`${box} ${REACTION}`)].indexOf(button);
  return {
    steps: [{ op: "click", target: { css: `${box} ${REACTION}`, nth: index }, timeoutMs: 5000 }],
    until: d => {
      const now = find(d);
      return on ? now?.getAttribute("aria-pressed") === "true" : now === null || now.getAttribute("aria-pressed") === "false";
    },
  };
}
