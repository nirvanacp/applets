import { list, value, type CommandSteps, type Step } from "@genesis/sdk/page";
import { kindOfUrl, type Entity, type EntityKind, type Release, type TrackRow } from "../model";
import { currentTitle } from "./player";
import { hrefOf, imageIn, MAIN, switchState, textOf } from "./read";

/**
 * Album, playlist and artist pages. They share Spotify's entity layout: a header with art, a title
 * and a byline, an action row (save or follow, play), then track rows (`track-row`) and, on album
 * and artist pages, rows of tiles that `sections` reads.
 */
const KINDS: EntityKind[] = ["album", "playlist", "artist"];
const PLAY = `${MAIN} button[data-testid=play-button]`;
const ROW = "[data-testid=track-row]";
/** The entity's own save switch, not a row's or the mini-player's, which is inside `#main` too. */
const SAVE = `${MAIN} [data-testid=add-button][role=switch]:not(${ROW} *, [data-testid=floating-now-playing-bar] *)`;
const FOLLOW = `${MAIN} button[data-testid=follow-button]`;

function kindOf(doc: Document): EntityKind | null {
  const kind = kindOfUrl(doc.location.href);
  return (KINDS as string[]).includes(kind) ? (kind as EntityKind) : null;
}

const followingOf = (button: Element | null) =>
  button ? /^following$/i.test(textOf(button, 40)) || button.getAttribute("aria-pressed") === "true" : null;

/** The play button says what pressing it does: "Play" or "Pause". */
const playingOf = (button: Element | null) => /pause/i.test(button?.getAttribute("aria-label") ?? "");

function readEntity(doc: Document): Entity | null {
  const kind = kindOf(doc);
  const main = doc.querySelector(MAIN);
  const title = textOf(main?.querySelector("h1"), 300);
  if (!kind || !main || !title) return null;
  const header = main.querySelector("[data-testid=playlist-entity-view], [data-testid=artist-entity-view]") ?? main;
  // The byline: an album's artists or a playlist's owner, before the first track row.
  const firstRow = main.querySelector(ROW);
  const before = (node: Element) => !firstRow || (node.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  const byline = kind === "playlist"
    ? [...main.querySelectorAll("[data-testid=entity-owner] a[href]")]
    : kind === "album" ? [...main.querySelectorAll("a[href^='/artist/']")].filter(before) : [];
  // "2006" and "7 songs, 33 min 6 sec" are the container's spans; the second nests the length.
  const meta = [...main.querySelectorAll("[data-testid=time-and-duration] > span, [data-testid=playlist-metadata] > span")]
    .flatMap(span => textOf(span, 120).split(/,\s+/))
    .filter(Boolean);
  const description = kind === "playlist"
    ? textOf(header.querySelector("h1 ~ span, h1 + div span, [data-testid=description]"), 400) || null
    : null;
  return {
    kind,
    title,
    image: imageIn(main.querySelector("[data-testid=entity-image], [data-testid=artist-entity-image]")),
    description,
    byline: byline.map(link => ({ name: textOf(link, 120), url: hrefOf(link) })).filter(link => link.name),
    meta,
    listeners: textOf(main.querySelector("[data-testid=monthly-listeners-label]"), 80) || null,
    saved: switchState(doc.querySelector(SAVE)),
    following: followingOf(doc.querySelector(FOLLOW)),
    canPlay: doc.querySelector(PLAY) !== null,
    playing: playingOf(doc.querySelector(PLAY)),
  };
}

/** `listrow-title-track-spotify:track:<id>-<n>` names the row's track and its place. */
const ROW_URI = /spotify:(track|episode):([A-Za-z0-9]+)/;

function readTrack(row: Element): TrackRow {
  const labelledBy = row.getAttribute("aria-labelledby") ?? "";
  const titleElement = row.querySelector("[data-encore-id=listRowTitle]") ?? row.ownerDocument.getElementById(labelledBy);
  const details = row.querySelector("[data-encore-id=listRowDetails]");
  // Each artist link sits in an `internal-artist-link` span that also holds the ", " before it.
  const artists = [...(details ?? row).querySelectorAll("a[href^='/artist/']")]
    .map(node => textOf(node, 120)).filter(Boolean);
  // Artist pages show a play count instead of artists.
  const plays = details ? "" : textOf(row.querySelector("span[data-encore-id=text]"), 40);
  const uri = ROW_URI.exec(labelledBy);
  return {
    rowId: labelledBy,
    title: row.getAttribute("aria-label") || textOf(titleElement, 300),
    detail: [...new Set(artists)].join(", ") || plays || textOf(details, 200),
    image: imageIn(row.querySelector("img[data-encore-id=image]")),
    url: hrefOf(row.querySelector("a[href^='/track/'], a[href^='/episode/']")) ?? (uri ? `${row.ownerDocument.location.origin}/${uri[1]}/${uri[2]}` : null),
    explicit: row.querySelector("[aria-label=Explicit], [title=Explicit]") !== null,
    // Spotify colours the playing row's title with its accent.
    playing: row.querySelector("[class*=bright-accent]") !== null,
  };
}

/** The page's track rows. Long playlists add rows as the page scrolls. */
export const tracks = list({
  root: MAIN,
  items: ROW,
  key: row => row.getAttribute("aria-labelledby") ?? textOf(row, 80),
  read: readTrack,
  virtualized: true,
});

/** An artist's "Popular releases": plain album links after the heading. */
export const releases = list({
  root: MAIN,
  items: "div:has(> [data-testid=popular-releases-text]) ~ a[href]",
  key: link => link.getAttribute("href") ?? textOf(link, 80),
  read: (link): Release => {
    const [title, subtitle] = [...link.querySelectorAll("span[data-encore-id=text]")].map(span => textOf(span, 200));
    return { title: title ?? textOf(link, 200), subtitle: subtitle || null, image: imageIn(link), url: hrefOf(link) };
  },
});

export const entity = value(readEntity, { root: MAIN });

/** The entity screen is ready once the page's heading and play button are drawn. */
export const entityReady = value(doc => kindOf(doc) !== null && doc.querySelector(`${MAIN} h1`) !== null && doc.querySelector(PLAY) !== null);

const tap = (css: string): Step => ({ op: "click", target: { css }, input: "trusted", timeoutMs: 5000 });

/** Plays or pauses the whole album, playlist or artist with the page's play button. */
export function playEntity(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { playing } = (args ?? {}) as { playing?: unknown };
  if (typeof playing !== "boolean") throw new Error("playEntity needs { playing: boolean }");
  const button = doc.querySelector(PLAY);
  if (!button) throw new Error("This page has no play button");
  if (playingOf(button) === playing) return { satisfied: true };
  return { steps: [tap(PLAY)], until: d => playingOf(d.querySelector(PLAY)) === playing };
}

/** Plays one row. A real tap on the row plays it in the page's context without leaving the page. */
export function playTrack(doc: Document, args: unknown): CommandSteps {
  const { rowId } = (args ?? {}) as { rowId?: unknown };
  if (typeof rowId !== "string" || !rowId) throw new Error("playTrack needs { rowId }");
  const css = `${MAIN} ${ROW}[aria-labelledby="${CSS.escape(rowId)}"]`;
  const row = doc.querySelector(css);
  if (!row) throw new Error("That track is not on the page any more");
  const title = row.getAttribute("aria-label") ?? "";
  return {
    steps: [{ op: "click", target: { css }, input: "trusted", timeoutMs: 5000 }],
    until: d => currentTitle(d) === title || d.querySelector(`${css} [class*=bright-accent]`) !== null,
  };
}

/** Saves an album or playlist to Your Library, or removes it. */
export function setEntitySaved(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { saved } = (args ?? {}) as { saved?: unknown };
  if (typeof saved !== "boolean") throw new Error("setEntitySaved needs { saved: boolean }");
  const now = switchState(doc.querySelector(SAVE));
  if (now === null) throw new Error("Spotify shows no save button here");
  if (now === saved) return { satisfied: true };
  return { steps: [tap(SAVE)], until: d => switchState(d.querySelector(SAVE)) === saved };
}

export function setFollowing(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { following } = (args ?? {}) as { following?: unknown };
  if (typeof following !== "boolean") throw new Error("setFollowing needs { following: boolean }");
  const now = followingOf(doc.querySelector(FOLLOW));
  if (now === null) throw new Error("Spotify shows no follow button here");
  if (now === following) return { satisfied: true };
  return { steps: [tap(FOLLOW)], until: d => followingOf(d.querySelector(FOLLOW)) === following };
}

/**
 * Scrolls the website so Spotify loads the next rows. A jump to the page's end does not load them;
 * Spotify loads when its last row scrolls into view, so the command brings that row in, then
 * scrolls on. Done when the last row changes.
 */
export function loadMoreTracks(doc: Document): CommandSteps | { satisfied: true } {
  // Spotify may drop rows that scroll far away, so the last row, not the count, shows new ones.
  const last = (d: Document) => [...d.querySelectorAll(`${MAIN} ${ROW}`)].pop()?.getAttribute("aria-labelledby") ?? null;
  const before = last(doc);
  if (!before) return { satisfied: true };
  const lastRow = { css: `${MAIN} ${ROW}[aria-labelledby="${CSS.escape(before)}"]` };
  return {
    steps: [{ op: "scroll", to: { by: { y: -600 } } }, { op: "scroll", target: lastRow, to: "intoView" }, { op: "scroll", to: "end" }],
    until: d => last(d) !== before,
    deadlineMs: 6000,
  };
}
