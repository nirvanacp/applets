/** Data the page module reads from instagram.com and the screens render. Website text stays plain strings. */

export const ORIGIN = "https://www.instagram.com";

/** A run of caption or comment text; mentions, hashtags and links carry an absolute href. */
export interface TextPart {
  text: string;
  href?: string;
}

export interface PostView {
  /** False on a feed post that Instagram has taken off its page; its buttons cannot reach it there. */
  present?: boolean;
  /** The shortcode, Instagram's id in `/p/<code>/` and `/reel/<code>/`. */
  code: string;
  url: string;
  kind: "post" | "reel";
  user: string;
  avatar: string | null;
  verified: boolean;
  /** "Original audio", a place or "Suggested for you" under the username. */
  subtitle: string | null;
  subtitleUrl: string | null;
  suggested: boolean;
  /** Images the website has loaded, in slide order. */
  images: { src: string; alt: string }[];
  /** The number of slides of a carousel, 1 otherwise. */
  slides: number;
  video: boolean;
  /** The poster of a video, when the website shows one. */
  poster: string | null;
  likes: string | null;
  comments: string | null;
  reposts: string | null;
  shares: string | null;
  liked: boolean;
  saved: boolean;
  caption: TextPart[];
  /** True when the website shows only the start of the caption. */
  excerpt: boolean;
  time: string | null;
  dateTime: string | null;
  /** "View all 1,601 comments", linked, when shown. */
  allComments: { text: string; url: string } | null;
}

export interface StoryRing {
  user: string;
  avatar: string | null;
  seen: boolean;
  own: boolean;
  /** The website's label, which the open command looks for. */
  label: string;
}

export interface CommentView {
  id: string;
  user: string;
  avatar: string | null;
  verified: boolean;
  parts: TextPart[];
  time: string | null;
  dateTime: string | null;
  likes: string | null;
  liked: boolean;
  replies: string | null;
}

export interface ProfileHeader {
  user: string;
  avatar: string | null;
  verified: boolean;
  name: string | null;
  bio: TextPart[];
  links: { text: string; url: string }[];
  posts: string | null;
  followers: string | null;
  following: string | null;
  followedBy: string | null;
  /** The website's follow button text: "Follow", "Following", "Follow Back", "Requested", or null on one's own profile. */
  follow: string | null;
  canMessage: boolean;
  own: boolean;
  /** True when the website shows "This account is private". */
  private: boolean;
}

export interface GridItem {
  code: string;
  url: string;
  kind: "post" | "reel";
  src: string | null;
  alt: string;
  carousel: boolean;
  video: boolean;
  /** The view count a reels grid shows. */
  views: string | null;
}

export interface PersonRow {
  user: string;
  url: string;
  avatar: string | null;
  verified: boolean;
  name: string | null;
  /** The website's button on the row ("Follow", "Following", "Remove"), when shown. */
  button: string | null;
}

/** A hashtag the search box suggests. */
export interface TagRow {
  /** Without the `#`. */
  tag: string;
  /** The website's post count, such as "46.1M posts". */
  posts: string | null;
}

export interface ActivityRow {
  id: string;
  /** The period heading the row is under ("Today", "This week"). */
  period: string | null;
  parts: TextPart[];
  user: string | null;
  avatar: string | null;
  /** The thumbnail of the post the activity is about. */
  thumb: string | null;
  url: string | null;
  time: string | null;
  button: string | null;
}

/** A chat in the inbox. Instagram's rows carry no link, so a chat opens by clicking its row by title. */
export interface ThreadRow {
  title: string;
  avatar: string | null;
  verified: boolean;
  preview: string | null;
  time: string | null;
}

export interface MessageView {
  id: string;
  /** True for the account's own messages, which Instagram aligns to the right. */
  mine: boolean;
  text: string | null;
  image: string | null;
}

export interface ThreadHeader {
  title: string;
  /** The profile the chat is with, for a one-to-one chat. */
  user: string | null;
  avatar: string | null;
}

// ---- URLs -----------------------------------------------------------------------------------

/** Paths that `/:user/` matches but that are Instagram pages, not profiles. */
export const RESERVED = [
  "accounts", "explore", "reels", "reel", "p", "tv", "direct", "stories", "notifications", "create", "challenge",
  "about", "legal", "web", "emails", "session", "privacy", "terms", "developer", "api", "graphql", "oauth", "ar",
  "lite", "your_activity", "nametag", "qr", "fragment", "data", "download", "threads", "meta", "help", "press",
];

export const validUser = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9._]{1,30}$/.test(value) && !RESERVED.includes(value.toLowerCase());

export const validCode = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{5,60}$/.test(value);

export const profileUrl = (user: string) => `${ORIGIN}/${user}/`;
export const postUrl = (code: string, kind: "post" | "reel" = "post") => `${ORIGIN}/${kind === "reel" ? "reel" : "p"}/${code}/`;
export const commentsUrl = (code: string) => `${ORIGIN}/p/${code}/comments/`;
export const tagUrl = (tag: string) => `${ORIGIN}/explore/search/keyword/?q=${encodeURIComponent(`#${tag}`)}`;

/** A post or reel link, `/<user>/p/<code>/`, `/p/<code>/` or `/reel/<code>/`. */
export function postRef(href: string | null | undefined): { code: string; kind: "post" | "reel"; user: string | null } | null {
  if (!href) return null;
  let path: string;
  try {
    path = new URL(href, ORIGIN).pathname;
  } catch {
    return null;
  }
  const match = /^\/(?:([A-Za-z0-9._]{1,30})\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,60})\/?$/.exec(path);
  if (!match) return null;
  return { code: match[3], kind: match[2] === "p" ? "post" : "reel", user: match[1] ?? null };
}

/** The username of a profile link `/<user>/`, or null. */
export function userOf(href: string | null | undefined): string | null {
  if (!href) return null;
  const match = /^\/([A-Za-z0-9._]{1,30})\/$/.exec(href.startsWith("http") ? safePath(href) : href);
  return match && validUser(match[1]) ? match[1] : null;
}

function safePath(href: string) {
  try {
    const url = new URL(href);
    return url.origin === ORIGIN ? url.pathname : "";
  } catch {
    return "";
  }
}

/**
 * An https link the screens may follow. Instagram's outbound links go through `l.instagram.com`;
 * the target is kept from its `u` parameter.
 */
export function safeLink(href: string | null | undefined, base = ORIGIN): string | null {
  if (!href) return null;
  try {
    let url = new URL(href, base);
    if (url.hostname === "l.instagram.com") {
      const target = url.searchParams.get("u");
      if (!target) return null;
      url = new URL(target);
    }
    if (url.protocol !== "https:") return null;
    url.hash = "";
    for (const name of [...url.searchParams.keys()]) if (/token|csrf|session|sig|nonce|auth|xmt/i.test(name)) url.searchParams.delete(name);
    return url.href;
  } catch {
    return null;
  }
}

/** A CDN image URL, https only. */
export function imageUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && /(cdninstagram\.com|fbcdn\.net|instagram\.com)$/.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
