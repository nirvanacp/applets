import { list, value, type CommandSteps } from "@nirvanacp/sdk/page";
import type { Channel, ChannelKind, Conversation, Guild } from "../model";
import { clean, countIn, HAMBURGER, hrefOf, httpsUrl, imageIn, PRIVATE, RAIL, textOf } from "./read";

/**
 * Discord's drawer. At phone width the server rail and the channel or conversation list exist
 * only while the drawer is open, so the screens that list them open it with `openDrawer` first.
 */

/** Servers have snowflake ids; Home, Add a Server, Discover and the app download do not. */
const isGuild = (id: string) => /^\d+$/.test(id);

/**
 * Discord speaks a row's state in its accessible name: "unread, general (text channel)",
 * "2 mentions, Makrawl HQ". Returns the bare name and the state.
 */
export function parseLabel(label: string): { name: string; unread: boolean; mentions: number } {
  let name = clean(label, 300);
  let unread = false;
  let mentions = 0;
  for (;;) {
    const lead = /^(unread|(\d+)\s+mentions?)\s*,\s*/i.exec(name);
    if (!lead) break;
    if (lead[2]) mentions = Number(lead[2]);
    else unread = true;
    name = name.slice(lead[0].length);
  }
  const trail = /,\s*(\d+)\s+mentions?$/i.exec(name);
  if (trail) {
    mentions = Number(trail[1]);
    name = name.slice(0, trail.index);
  }
  return { name, unread: unread || mentions > 0, mentions };
}

const KIND_OF: Record<string, ChannelKind | "category"> = {
  "text channel": "text",
  "voice channel": "voice",
  "announcement channel": "announcement",
  "forum channel": "forum",
  "media channel": "forum",
  "stage channel": "stage",
  "thread": "thread",
  "category": "category",
};

/** "general (text channel)" to its name and kind. */
function channelLabel(label: string): { name: string; kind: ChannelKind | "category"; unread: boolean; mentions: number } {
  const state = parseLabel(label);
  const kind = /\(([^()]+)\)\s*$/.exec(state.name);
  const name = kind ? state.name.slice(0, kind.index).trim() : state.name;
  return { ...state, name, kind: kind ? (KIND_OF[kind[1]!.toLowerCase()] ?? "other") : "other" };
}

/** True while the drawer is open. */
export const drawer = value(doc => doc.querySelector(RAIL) !== null);

export const guilds = list<Guild>({
  root: RAIL,
  items: '[role=treeitem][data-list-item-id^="guildsnav___"]',
  key: item => item.getAttribute("data-list-item-id")!.slice("guildsnav___".length),
  read: (item): Guild => {
    const id = item.getAttribute("data-list-item-id")!.slice("guildsnav___".length);
    const state = parseLabel(textOf(item.querySelector("[class*=hiddenVisually]"), 300) || item.getAttribute("aria-label") || "");
    const initials = textOf(item.querySelector("[class*=acronym]"), 8);
    return {
      id: isGuild(id) ? id : `-${id}`,
      name: state.name,
      icon: imageIn(item.querySelector("img[class*=icon]")),
      initials: initials || state.name.split(/\s+/).map(word => word[0] ?? "").join("").slice(0, 3),
      mentions: Math.max(state.mentions, countIn(item)),
      unread: state.unread || item.querySelector("[class*=pill] [class*=item]") !== null,
      selected: item.getAttribute("aria-selected") === "true",
    };
  },
});

/** A DM link's id: `/channels/@me/<id>`. */
const dmId = (link: Element) => /\/channels\/@me\/(\d+)/.exec(link.getAttribute("href") ?? "")?.[1] ?? null;

export const conversations = list<Conversation>({
  root: PRIVATE,
  items: 'a[href^="/channels/@me/"]',
  key: link => dmId(link) ?? link.getAttribute("href")!,
  read: (link): Conversation => {
    const label = link.getAttribute("aria-label") ?? "";
    const group = /\(group message\)/i.test(label);
    const state = parseLabel(label.replace(/\s*\((direct|group) message\)\s*/i, " "));
    const row = link.closest("li") ?? link;
    const name = textOf(link.querySelector("[class*=name] [class*=overflow], [class*=name]"), 120) || state.name;
    return {
      id: dmId(link) ?? "",
      name,
      url: hrefOf(link) ?? "",
      avatar: imageIn(link.querySelector("[class*=avatar] img, img")),
      detail: textOf(link.querySelector("[class*=subText], [class*=activity]"), 120) || null,
      unread: state.unread || row.querySelector("[class*=unread]") !== null,
      mentions: Math.max(state.mentions, countIn(row)),
      group,
      selected: row.matches("[class*=selected]") || link.getAttribute("aria-current") === "page",
    };
  },
});

/** The open server's name, from its channel list heading "Better than clubhouse (server)". */
export const guildName = (doc: Document) =>
  clean(doc.querySelector('nav[aria-label$="(server)"]')?.getAttribute("aria-label")?.replace(/\s*\(server\)\s*$/, ""), 120) || null;

export const channels = list<Channel>({
  root: 'nav[aria-label$="(server)"]',
  items: '[data-list-item-id^="channels___"]',
  key: item => item.getAttribute("data-list-item-id")!.slice("channels___".length),
  read: (item): Channel => {
    const id = item.getAttribute("data-list-item-id")!.slice("channels___".length);
    const label = channelLabel(item.getAttribute("aria-label") ?? textOf(item, 120));
    const href = item.getAttribute("href");
    const row = item.closest("li") ?? item;
    return {
      id,
      name: label.name,
      kind: id.startsWith("upcoming-events") ? "other" : label.kind,
      url: href ? httpsUrl(href, item.ownerDocument) : null,
      unread: label.unread,
      mentions: Math.max(label.mentions, countIn(row)),
      selected: row.matches("[class*=selected]"),
    };
  },
  virtualized: true,
});

/** Opens Discord's drawer when it is closed, so the lists in it are drawn. */
export function openDrawer(doc: Document): CommandSteps | { satisfied: true } {
  if (doc.querySelector(RAIL)) return { satisfied: true };
  if (!doc.querySelector(HAMBURGER)) throw new Error("Discord shows no menu button here");
  return {
    steps: [{ op: "click", target: { css: HAMBURGER }, timeoutMs: 5000 }],
    until: d => d.querySelector(RAIL) !== null,
    deadlineMs: 5000,
  };
}
