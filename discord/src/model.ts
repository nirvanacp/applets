/** The records the page module reads and the screens draw. Discord owns all of them. */

/** A direct or group conversation in the Direct Messages list. */
export interface Conversation {
  id: string;
  name: string;
  url: string;
  avatar: string | null;
  /** The status or member count line under the name. */
  detail: string | null;
  unread: boolean;
  mentions: number;
  group: boolean;
  selected: boolean;
}

/** A server in the server rail. */
export interface Guild {
  id: string;
  name: string;
  /** The server icon, or null when Discord draws its initials. */
  icon: string | null;
  initials: string;
  mentions: number;
  unread: boolean;
  selected: boolean;
}

export type ChannelKind = "text" | "voice" | "announcement" | "forum" | "stage" | "thread" | "other";

/** A channel in the current server's channel list, or a category heading. */
export interface Channel {
  id: string;
  name: string;
  kind: ChannelKind | "category";
  /** Text channels have a URL; voice channels and categories have none. */
  url: string | null;
  unread: boolean;
  mentions: number;
  selected: boolean;
}

/** The open channel or conversation. */
export interface Place {
  kind: "dm" | "channel";
  name: string;
  guild: string | null;
  guildId: string | null;
  channelId: string;
  /** True once Discord shows the channel's beginning: there is nothing older to load. */
  beginning: boolean;
}

/** One run of a message's text: plain, a link, a mention, inline code or a code block. */
export interface Part {
  text: string;
  kind: "text" | "link" | "mention" | "code" | "block" | "emoji";
  url?: string;
  /** A custom emoji's image. */
  image?: string;
}

/** An attached or linked picture or video. A GIF is a short video that plays muted on a loop. */
export interface Media { url: string; ratio: number | null; video: boolean; gif?: boolean }

/** A sticker: its picture, or only its name when Discord animates it on a canvas. */
export interface Sticker { name: string; url: string | null }
export interface FileLink { name: string; url: string | null; size: string | null }
export interface Embed { title: string | null; url: string | null; description: string | null; provider: string | null; image: string | null }

export interface Reaction {
  /** The emoji's text, or its name for a custom emoji. */
  emoji: string;
  image: string | null;
  count: number;
  mine: boolean;
}

export interface Message {
  id: string;
  /** True for the first message of an author's group; the screen draws its avatar and name. */
  start: boolean;
  author: string;
  authorId: string | null;
  avatar: string | null;
  time: string | null;
  edited: boolean;
  system: boolean;
  parts: Part[];
  reply: { author: string; text: string } | null;
  media: Media[];
  stickers: Sticker[];
  files: FileLink[];
  embeds: Embed[];
  reactions: Reaction[];
}

export interface Composer {
  /** The placeholder, such as "Message #general". */
  label: string;
  /** The text in Discord's own editor, which may be a draft typed on the website. */
  text: string;
  /** False where the user cannot write, such as an announcement channel. */
  writable: boolean;
  /** Files waiting in Discord's upload area. */
  attachments: number;
}

/** Discord's URL kinds, from a path. */
export function placeOfUrl(url: string): { guild: string | null; channel: string | null } {
  try {
    const parts = new URL(url, "https://discord.com").pathname.split("/").filter(Boolean);
    if (parts[0] !== "channels") return { guild: null, channel: null };
    return { guild: parts[1] === "@me" ? null : (parts[1] ?? null), channel: parts[2] ?? null };
  } catch {
    return { guild: null, channel: null };
  }
}

/** Discord takes up to this many characters in a message without Nitro. */
export const MAX_TEXT = 2000;

/** Discord's presence, by the id its status menu uses. */
export type Presence = "online" | "idle" | "dnd" | "invisible";

/** The signed-in account, from Discord's user area. */
export interface Me {
  name: string;
  username: string | null;
  avatar: string | null;
  /** Null when Discord's page does not show it. */
  presence: Presence | null;
  /** A custom status the person set, shown in place of the presence. */
  custom: string | null;
}

/** The fields of Discord's profile editor while it is open. */
export interface ProfileForm {
  displayName: string;
  /** The account's username, which Discord shows when there is no display name. */
  username: string;
  pronouns: string;
  bio: string;
  avatar: string | null;
  /** True while Discord holds changes it has not saved. */
  pending: boolean;
}

/** A server's name and icon from Discord's Server Settings while they are open. */
export interface ServerForm { name: string; icon: string | null; pending: boolean }
