import { list, value, type CommandSteps, type Step } from "@genesis/sdk/page";
import type { BrowseTile, Kind, SearchRow, SearchState } from "../model";
import { currentTitle } from "./player";
import { hrefOf, imageIn, MAIN, textOf } from "./read";

/**
 * The Search page and its results. `/search` shows "Browse all" category tiles. Its search button
 * opens `/search/recent`, where typing in `search-input` replaces the URL with
 * `/search/results/<query>`; a filter chip turns that into `/search/<type>/<query>`. Result and
 * recent search rows are `role=group` rows with no link: a tap opens or plays them.
 */
const PAGE = `${MAIN} [data-testid=search-page]`;
const INPUT = `${PAGE} input[data-testid=search-input]`;
const OPEN_SEARCH = `${MAIN} button[data-testid=search]`;
const ROW = "[role=group][aria-labelledby^='listrow-title-']";
const CHIP = `${PAGE} [data-testid=filter-chips-container] button[role=checkbox]`;
const CLEAR_RECENTS = { within: { css: PAGE }, role: "button", name: "Clear recent searches" } as const;

/** The query in a search URL, or "" on `/search` and `/search/recent`. */
export function queryOf(href: string): string {
  const parts = new URL(href).pathname.split("/").filter(Boolean);
  if (parts[0] !== "search" || parts.length < 3) return "";
  try {
    return decodeURIComponent(parts.slice(2).join("/"));
  } catch {
    return parts.slice(2).join("/");
  }
}

const KIND_OF_TYPE: Record<string, Kind> = {
  song: "track", artist: "artist", playlist: "playlist", album: "album", profile: "user",
  podcast: "show", episode: "episode", audiobook: "audiobook", genre: "genre",
};

function readRow(row: Element): SearchRow {
  // "Song • Coldplay": the type, then the details.
  const [type = "", ...rest] = textOf(row.querySelector("span[data-encore-id=text]"), 300).split(" • ");
  return {
    rowId: row.getAttribute("aria-labelledby") ?? "",
    title: row.getAttribute("aria-label") || textOf(row.querySelector("[data-encore-id=listRowTitle]"), 300),
    type,
    detail: rest.join(" • ") || null,
    image: imageIn(row.querySelector("img[data-encore-id=image]")),
    kind: KIND_OF_TYPE[type.toLowerCase()] ?? "other",
    explicit: row.querySelector("[aria-label=Explicit], [title=Explicit]") !== null,
    verified: row.querySelector("[data-testid=verified-icon]") !== null,
    dismissible: row.querySelector("button[aria-label=Dismiss]") !== null,
  };
}

/** The result rows, or the recent searches when the query is empty. */
export const searchRows = list({
  root: MAIN,
  items: `[data-testid=search-page] ${ROW}`,
  key: row => row.getAttribute("aria-labelledby") ?? textOf(row, 80),
  read: readRow,
});

/** The "Browse all" tiles. A tile without a link (such as Live Events) has a null URL. */
export const browse = list({
  root: MAIN,
  items: "[data-testid^=browse-cards-section-container] > *",
  key: tile => tile.getAttribute("href") ?? textOf(tile, 80),
  read: (tile): BrowseTile => {
    const box = tile.querySelector("[data-encore-id=box]") as HTMLElement | null;
    return {
      title: textOf(tile.querySelector("[data-testid^=browse-card-]") ?? tile, 120),
      color: box?.style.backgroundColor || null,
      image: imageIn(tile),
      url: hrefOf(tile.matches("a[href]") ? tile : tile.querySelector("a[href]")),
    };
  },
});

export const search = value((doc): SearchState => ({
  query: queryOf(doc.location.href),
  chips: [...doc.querySelectorAll(CHIP)].map(chip => ({ label: textOf(chip, 60), checked: chip.getAttribute("aria-checked") === "true" })),
  hasRecents: [...doc.querySelectorAll(`${PAGE} button`)].some(button => textOf(button, 60) === "Clear recent searches"),
}), { root: MAIN });

/** Browse is ready with its tiles; the search page with its input. */
export const searchReady = value(doc =>
  doc.querySelector("[data-testid^=browse-cards-section-container] > *") !== null || doc.querySelector(INPUT) !== null);

/** A genre hub is ready once its heading and first row are drawn. */
export const hubReady = value(doc =>
  doc.querySelector(`${MAIN} h1`) !== null && doc.querySelector(`${MAIN} [data-testid=carousel-mwp]`) !== null);

const path = (doc: Document) => doc.location.pathname;
type Target = Extract<Step, { op: "click" }>["target"];
const tap = (target: Target): Step =>
  ({ op: "click", target, input: "trusted", timeoutMs: 5000 });

/** Opens the search field with the page's own search button, as a tap on it does. */
export function openSearch(doc: Document): CommandSteps | { satisfied: true } {
  if (doc.querySelector(INPUT)) return { satisfied: true };
  if (!doc.querySelector(OPEN_SEARCH)) throw new Error("This page has no search button");
  return { steps: [tap({ css: OPEN_SEARCH })], until: d => d.querySelector(INPUT) !== null };
}

/**
 * Types the query into Spotify's search field. Spotify searches as the field changes and replaces
 * the URL, so the results page follows without a page load. An empty query shows recent searches.
 */
export function setQuery(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { query } = (args ?? {}) as { query?: unknown };
  if (typeof query !== "string") throw new Error("setQuery needs { query: string }");
  const wanted = query.trim();
  const shows = (d: Document) => queryOf(d.location.href) === wanted || (wanted === "" && /^\/search\/recent/.test(path(d)));
  if (shows(doc)) return { satisfied: true };
  if (!doc.querySelector(INPUT)) throw new Error("Spotify's search field is not open");
  return { steps: [{ op: "fill", target: { css: INPUT }, value: wanted, timeoutMs: 3000 }], until: shows, deadlineMs: 8000 };
}

/** Turns a filter chip on or off. */
export function setFilter(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { label, checked } = (args ?? {}) as { label?: unknown; checked?: unknown };
  if (typeof label !== "string" || typeof checked !== "boolean") throw new Error("setFilter needs { label, checked }");
  const chip = (d: Document) => [...d.querySelectorAll(CHIP)].find(node => textOf(node, 60) === label);
  const now = chip(doc);
  if (!now) throw new Error(`Spotify shows no ${label} filter`);
  if ((now.getAttribute("aria-checked") === "true") === checked) return { satisfied: true };
  return {
    steps: [{ op: "click", target: { css: CHIP, text: label, exact: true }, timeoutMs: 5000 }],
    until: d => (chip(d)?.getAttribute("aria-checked") === "true") === checked,
  };
}

const rowCss = (rowId: string) => `${PAGE} ${ROW}[aria-labelledby="${CSS.escape(rowId)}"]`;

/**
 * Opens a result or recent search with a real tap, which also adds it to recent searches. A song
 * plays where it is; anything else opens its page.
 */
export function openResult(doc: Document, args: unknown): CommandSteps {
  const { rowId } = (args ?? {}) as { rowId?: unknown };
  if (typeof rowId !== "string" || !rowId) throw new Error("openResult needs { rowId }");
  const css = rowCss(rowId);
  const row = doc.querySelector(css);
  if (!row) throw new Error("That result is not on the page any more");
  const { title, kind } = readRow(row);
  const from = doc.location.href;
  return {
    steps: [{ op: "click", target: { css }, input: "trusted", timeoutMs: 5000 }],
    until: d => (kind === "track" ? currentTitle(d) === title : d.location.href !== from),
  };
}

/** Removes one recent search with its Dismiss button. */
export function removeRecent(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { rowId } = (args ?? {}) as { rowId?: unknown };
  if (typeof rowId !== "string" || !rowId) throw new Error("removeRecent needs { rowId }");
  const css = rowCss(rowId);
  if (!doc.querySelector(css)) return { satisfied: true };
  return { steps: [tap({ css: `${css} button[aria-label=Dismiss]` })], until: d => d.querySelector(css) === null };
}

export function clearRecents(doc: Document): CommandSteps | { satisfied: true } {
  if (!doc.querySelector(`${PAGE} ${ROW}`)) return { satisfied: true };
  return { steps: [tap(CLEAR_RECENTS)], until: d => d.querySelector(`${PAGE} ${ROW}`) === null };
}
