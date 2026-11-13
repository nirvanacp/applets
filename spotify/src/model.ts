/**
 * Types shared by the page module and the UI. This file has no side effects, so both bundles may
 * import it.
 */

export const ORIGIN = "https://open.spotify.com";

/** The Spotify object kinds the web player links to. */
export type Kind = "track" | "album" | "artist" | "playlist" | "show" | "episode" | "audiobook" | "user" | "genre" | "other";

const KINDS: Kind[] = ["track", "album", "artist", "playlist", "show", "episode", "audiobook", "user", "genre"];

/** The kind of a web player path such as `/album/<id>`, or "other". */
export function kindOfUrl(url: string | null): Kind {
  if (!url) return "other";
  try {
    const segment = new URL(url).pathname.split("/")[1] ?? "";
    return (KINDS as string[]).includes(segment) ? (segment as Kind) : "other";
  } catch {
    return "other";
  }
}

/** The web player URL of a Spotify object. */
export const urlOf = (kind: Kind, id: string) => `${ORIGIN}/${kind}/${encodeURIComponent(id)}`;

/** A tile in a shelf: a playlist, album, artist, show, episode or category. */
export interface Card {
  key: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  /** The page the card opens, when the website gives one. */
  url: string | null;
  kind: Kind;
  /**
   * When the website gives no URL, the `aria-labelledby` of the card element: the UI opens the card
   * by clicking its title through the record locator.
   */
  clickId: string | null;
}

/** A titled row of cards. */
export interface Section {
  title: string;
  cards: Card[];
}

/** What the website's mini-player shows. */
export interface NowPlaying {
  title: string;
  artist: string;
  image: string | null;
  playing: boolean;
  /** The current track is in the account's Liked Songs. */
  saved: boolean | null;
  /** Spotify Connect plays on another of the account's devices; this page only shows it. */
  elsewhere: boolean;
  /** The next track in the mini-player's carousel, when it shows one. */
  next: { title: string; artist: string } | null;
}

export type Repeat = "off" | "all" | "one";

/** The website's full player, read while it is open. */
export interface Player {
  title: string;
  trackUrl: string | null;
  artist: string;
  artistUrl: string | null;
  /** What the track plays from, such as its album. */
  from: string | null;
  fromUrl: string | null;
  image: string | null;
  saved: boolean | null;
  playing: boolean;
  /** Seconds. */
  position: number | null;
  duration: number | null;
  positionText: string;
  durationText: string;
  shuffle: boolean | null;
  repeat: Repeat | null;
  canShuffle: boolean;
  canRepeat: boolean;
  canPrevious: boolean;
  canNext: boolean;
}

/** "3:43" or "1:02:03" in seconds, or null. */
export function parseClock(text: string | null | undefined): number | null {
  const match = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(text?.trim() ?? "");
  if (!match) return null;
  const [, a, b, c] = match;
  return c === undefined ? Number(a) * 60 + Number(b) : Number(a) * 3600 + Number(b) * 60 + Number(c);
}
