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
/**
 * How far one seek call moves. Spotify seeks five seconds a key press and the host ends a call
 * after 15 seconds, so a long seek is several calls; Now Playing repeats the call until it lands.
 */
export const SEEK_SECONDS_PER_CALL = 50;

/** The track a seek belongs to: its link, or its title when it has none. */
export const trackKey = (player: Player | null) => player ? player.trackUrl ?? player.title : null;

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

/** The pages the entity screen shows. */
export type EntityKind = "album" | "playlist" | "artist";

/** An album, playlist or artist page's header and actions. */
export interface Entity {
  kind: EntityKind;
  title: string;
  image: string | null;
  description: string | null;
  /** An album's artists or a playlist's owner. */
  byline: { name: string; url: string | null }[];
  /** Year, song count and length, as Spotify words them. */
  meta: string[];
  /** An artist's "… monthly listeners". */
  listeners: string | null;
  /** In Your Library; null where the page has no save switch. */
  saved: boolean | null;
  following: boolean | null;
  canPlay: boolean;
  /** This page's album, playlist or artist is what plays now. */
  playing: boolean;
}

/** A track row on an entity page. */
export interface TrackRow {
  /** The row's `aria-labelledby`; the playTrack command finds the row by it. */
  rowId: string;
  title: string;
  /** Artists, or the play count on an artist page. */
  detail: string;
  image: string | null;
  url: string | null;
  explicit: boolean;
  playing: boolean;
  /** Set by a virtualized list for a row that scrolled out of the website's DOM. */
  present?: boolean;
}

/** One of an artist's popular releases. */
export interface Release {
  title: string;
  subtitle: string | null;
  image: string | null;
  url: string | null;
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

/** A "Browse all" category tile on the Search page. */
export interface BrowseTile {
  title: string;
  /** The tile's CSS background colour, as Spotify sets it. */
  color: string | null;
  image: string | null;
  /** The category hub, when the tile links to one. */
  url: string | null;
}

/** A search result or recent search row. */
export interface SearchRow {
  /** The row's `aria-labelledby`; commands find the row by it. */
  rowId: string;
  title: string;
  /** "Song", "Artist", "Playlist", "Album", "Profile", "Podcast"… as Spotify words it. */
  type: string;
  /** What follows the type, such as a song's artists. */
  detail: string | null;
  image: string | null;
  kind: Kind;
  explicit: boolean;
  verified: boolean;
  /** A recent search Spotify lets the user remove. */
  dismissible: boolean;
}

/** A filter chip above the results. */
export interface SearchChip {
  label: string;
  checked: boolean;
}

/** The search page's state, read from its URL and controls. */
export interface SearchState {
  /** The query in the URL; empty on the recent searches page. */
  query: string;
  chips: SearchChip[];
  /** Spotify shows "Recent searches" with a "Clear recent searches" button. */
  hasRecents: boolean;
}
