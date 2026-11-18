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
/**
 * The channel a message row belongs to: `chat-messages-<channel>-<message>`. An empty channel's
 * only row is Discord's welcome block, a div that carries the channel id too.
 */
const rowChannel = (doc: Document) =>
  /^chat-messages-(\d+)-/.exec(doc.querySelector(`${MESSAGES} [id^="chat-messages-"]`)?.id ?? "")?.[1] ?? null;

/** The skeleton rows Discord draws above the messages while older ones remain to load. */
const PLACEHOLDER = `${MESSAGES} > div [class*=blob_]`;

/** The first message of a continued group: its row names the author and holds the avatar. */
function groupStart(item: Element): Element | null {
  if (item.querySelector('[class*=groupStart], [id^="message-username-"]')) return item;
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

/** Discord's own media and proxy hosts: the only addresses media tiles load. */
const MEDIA_HOST = /(^|\.)(discordapp\.(net|com)|discord\.com)$/;
const VIDEO_FILE = /\.(mp4|webm|mov)$/i;

function mediaUrl(href: string | null | undefined, doc: Document): string | null {
  const url = httpsUrl(href, doc);
  return url && MEDIA_HOST.test(new URL(url).hostname) ? url : null;
}

/** Uploaded pictures and videos, then linked ones Discord shows inline, such as Tenor GIFs. */
function mediaIn(accessories: Element): Media[] {
  const doc = accessories.ownerDocument;
  const seen = new Set<string>();
  const add = (url: string | null, item: Media) => {
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [item];
  };
  // `mosaicItem_` also matches its own `mosaicItemContent_` child: read the outer one only.
  const uploads = [...accessories.querySelectorAll("[class*=mosaicItem]")]
    .filter(item => !item.closest("article") && !item.parentElement?.closest("[class*=mosaicItem]"))
    .flatMap((item): Media[] => {
      if (item.querySelector("[class*=fileNameLink], [class*=attachmentName]")) return [];
      const video = item.querySelector("video");
      const url = mediaUrl(video?.getAttribute("src") ?? imageIn(item), doc);
      return add(url, { url: url!, ratio: ratioIn(item), video: video !== null });
    });
  // A linked GIF or picture: Discord mounts its player only on screen, but the proxied file is
  // always on the original link's `data-safe-src`.
  const linked = [...accessories.querySelectorAll("[class*=inlineMediaEmbed]")]
    .filter(item => !item.closest("article"))
    .flatMap((item): Media[] => {
      const source = item.querySelector("[data-safe-src]")?.getAttribute("data-safe-src")
        ?? item.querySelector("video")?.getAttribute("src") ?? imageIn(item);
      const url = mediaUrl(source, doc);
      if (!url) return [];
      const video = VIDEO_FILE.test(new URL(url).pathname) || item.querySelector("video") !== null;
      // Discord labels a GIF's player "GIF"; it plays muted on a loop, like Discord's own.
      const gif = video && item.querySelector("[aria-label=GIF]") !== null;
      return add(url, { url, ratio: ratioIn(item), video, gif });
    });
  return [...uploads, ...linked].slice(0, 10);
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
    // The proxied picture, never the link around it, which can point at any host.
    const image = embed.querySelector("[class*=embedVideo] img, [class*=embedImage] img, [class*=embedThumbnail] img");
    return {
      title: textOf(title, 200) || null,
      url: httpsUrl(link?.getAttribute("href"), embed.ownerDocument),
      description: textOf(embed.querySelector("[class*=embedDescription]"), 400) || null,
      provider: textOf(embed.querySelector("[class*=embedProvider], [class*=embedAuthorName]"), 80) || null,
      image: image ? httpsUrl(image.getAttribute("src"), embed.ownerDocument) : null,
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
  // A row Discord draws while sending carries a temporary id that the sent message replaces; kept by
  // the virtualized list, it would stay as a second copy.
  items: 'li[id^="chat-messages-"]:not(:has([class*=isSending]))',
  // `<channel>-<message>`: a virtualized list keeps rows it read once, so the screen drops another channel's.
  key: item => item.id.slice("chat-messages-".length),
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

/** The bar Discord shows above its editor while a reply is being written, and its cancel button. */
const REPLY_BAR = `${COMPOSER} [class*=replyBar]`;
const CANCEL_REPLY = `${COMPOSER} [aria-label="Cancel reply"][role=button]`;
/** A message row, by message id; its `[role=article]` shows the hover toolbar. */
const rowOf = (id: string) => `${MESSAGES} li[id^="chat-messages-"][id$="-${id}"]`;
const ARTICLE = (id: string) => `${rowOf(id)} [role=article]`;
/**
 * Hovering the row first: the toolbar exists only while Discord thinks the pointer is over it. It
 * takes pointer events only under CSS `:hover`, which a synthetic hover does not set, so its
 * button is clicked without the hit test; the click itself reaches it.
 */
const toolbarSteps = (id: string, label: string): Step[] => [
  { op: "hover", target: { css: ARTICLE(id) }, timeoutMs: 5000 },
  { op: "click", target: { css: `[aria-label="${label}"][role=button]`, within: { css: rowOf(id) } }, force: true, timeoutMs: 5000 },
];

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
/** When Discord made a message, from its snowflake id. */
const madeAt = (id: string) => Number(id) / 4194304 + 1420070400000;
/** A sent message counts when it is this recent, which allows for the phone's clock being off. */
const CLOCK_SLACK_MS = 120_000;
/** Rows Discord draws for a message it is still sending or failed to send. */
const PENDING_ROW = "[class*=isSending], [class*=isFailed]";
/** Letters and digits only, lowercased: typed markdown, emoji and spacing differ from what Discord draws. */
const comparable = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Sends `text`, with the files already in Discord's upload area. The phone layout's composer is a
 * textarea, which takes a filled value; a wide layout's Slate editor needs trusted typing. Done
 * when the editor and upload area are empty and a new last message holds the text.
 */
export function send(doc: Document, args: unknown): CommandSteps {
  const { text, files, replyTo } = (args ?? {}) as { text?: unknown; files?: unknown; replyTo?: unknown };
  if (typeof text !== "string") throw new Error("send needs { text }");
  if (replyTo !== undefined && replyTo !== null && (typeof replyTo !== "string" || !/^\d+$/.test(replyTo))) throw new Error("replyTo is a message id");
  const reply = typeof replyTo === "string" ? replyTo : null;
  if (reply && !doc.querySelector(ARTICLE(reply))) throw new Error("That message is no longer loaded. Scroll to it on the website to reply.");
  const ids = Array.isArray(files) ? files.filter((id): id is string => typeof id === "string") : [];
  const body = text.trim();
  if (!body && ids.length === 0) throw new Error("There is nothing to send");
  if ([...body].length > MAX_TEXT) throw new Error(`Discord takes up to ${MAX_TEXT} characters`);
  if (!doc.querySelector(TEXTAREA) && !doc.querySelector(SLATE)) throw new Error("You can't send messages here");
  if (editorText(doc).trim() && editorText(doc).trim() !== body) throw new Error("Discord's editor already holds a draft. Open the website to finish it.");
  if (ids.length && attachmentsOf(doc) > 0) throw new Error("Discord already holds files for this message. Open the website to finish it.");

  // Discord may show an older stretch of the channel; its newest message must be in the list.
  const seen = new Set(rowsOf(doc).map(messageId));
  const since = Date.now() - CLOCK_SLACK_MS;
  const steps: Step[] = [];
  // A reply bar left from the website would turn this message into a reply, or reply to the wrong one.
  if (doc.querySelector(REPLY_BAR)) {
    steps.push(
      { op: "click", target: { css: CANCEL_REPLY }, timeoutMs: 5000 },
      { op: "wait", for: { target: { css: REPLY_BAR }, state: "detached" }, timeoutMs: 5000 },
    );
  }
  if (reply) {
    // The toolbar has Reply only on other people's messages; its More menu has it on every message.
    steps.push(...toolbarSteps(reply, "More"), { op: "unhover" },
      { op: "click", target: { css: "[role=menu] #message-actions-reply" }, timeoutMs: 5000 },
      { op: "wait", for: { target: { css: REPLY_BAR }, state: "attached" }, timeoutMs: 5000 });
  }
  steps.push({ op: "scroll", target: { css: SCROLLER }, to: "end" });
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
  const sample = comparable(body).slice(0, 40);
  return {
    steps,
    until: d => {
      if (editorText(d).trim() || attachmentsOf(d) > 0) return false;
      return rowsOf(d).some(row => {
        const id = messageId(row);
        if (seen.has(id) || madeAt(id) < since || row.querySelector(PENDING_ROW) || row.matches(PENDING_ROW)) return false;
        if (reply && !row.querySelector(`#message-reply-context-${CSS.escape(id)}`)) return false;
        if (!body) return d.querySelector(`#message-accessories-${CSS.escape(id)} *`) !== null;
        if (!sample) return d.querySelector(`#message-content-${CSS.escape(id)}`) !== null;
        const content = partsOf(d.querySelector(`#message-content-${CSS.escape(id)}`)).map(part => part.text).join("");
        return comparable(content).includes(sample);
      });
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
  const { message, emoji, on, index } = (args ?? {}) as { message?: unknown; emoji?: unknown; on?: unknown; index?: unknown };
  if (typeof message !== "string" || !/^\d+$/.test(message) || typeof emoji !== "string" || typeof on !== "boolean"
    || typeof index !== "number" || !Number.isInteger(index) || index < 0) {
    throw new Error("setReaction needs { message, emoji, on, index }");
  }
  const box = `#message-reactions-${CSS.escape(message)}`;
  // Two reactions can share a label, so the chip's position picks the button and the label confirms it.
  const find = (d: Document) => {
    const button = d.querySelectorAll(`${box} ${REACTION}`)[index] ?? null;
    return button && emojiOf(button) === emoji ? button : null;
  };
  const button = find(doc);
  if (!button) throw new Error("That reaction is no longer on the message");
  if ((button.getAttribute("aria-pressed") === "true") === on) return { satisfied: true };
  return {
    steps: [{ op: "click", target: { css: `${box} ${REACTION}`, nth: index }, timeoutMs: 5000 }],
    until: d => {
      const now = find(d);
      return on ? now?.getAttribute("aria-pressed") === "true" : now === null || now.getAttribute("aria-pressed") === "false";
    },
  };
}

/** Discord's names for the reactions the applet offers, as its emoji picker finds them. */
export const QUICK_REACTIONS: Record<string, string> = {
  "👍": "thumbsup", "❤️": "heart", "😂": "joy", "😮": "open_mouth", "😢": "cry", "🔥": "fire",
};
/** Emoji compared without variation selectors: Discord draws "❤️" with the alt text "❤". */
const sameEmoji = (a: string, b: string) => a.replace(/\uFE0F/g, "") === b.replace(/\uFE0F/g, "");
const PICKER_SEARCH = "input[aria-controls=emoji-picker-grid]";

/**
 * Adds the user's reaction to a message. A reaction already on the message is pressed; a new one
 * is found by name in Discord's emoji picker, opened from the message's toolbar.
 */
export function addReaction(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { message, emoji } = (args ?? {}) as { message?: unknown; emoji?: unknown };
  if (typeof message !== "string" || !/^\d+$/.test(message) || typeof emoji !== "string" || !QUICK_REACTIONS[emoji]) {
    throw new Error("addReaction needs { message, emoji } with an offered emoji");
  }
  if (!doc.querySelector(ARTICLE(message))) throw new Error("That message is no longer loaded");
  const box = `#message-reactions-${CSS.escape(message)}`;
  const chip = (d: Document) => [...d.querySelectorAll(`${box} ${REACTION}`)].findIndex(button => sameEmoji(emojiOf(button), emoji));
  const until = (d: Document) => {
    const index = chip(d);
    return index >= 0 && d.querySelectorAll(`${box} ${REACTION}`)[index]!.getAttribute("aria-pressed") === "true";
  };
  if (until(doc)) return { satisfied: true };
  const existing = chip(doc);
  if (existing >= 0) return { steps: [{ op: "click", target: { css: `${box} ${REACTION}`, nth: existing }, timeoutMs: 5000 }], until };
  const name = QUICK_REACTIONS[emoji]!;
  return {
    steps: [
      ...toolbarSteps(message, "Add Reaction"),
      { op: "unhover" },
      { op: "fill", target: { css: PICKER_SEARCH }, value: name, timeoutMs: 5000 },
      { op: "click", target: { css: `#emoji-picker-grid button[data-type=emoji][data-name="${name}"]` }, timeoutMs: 5000 },
    ],
    until,
  };
}
