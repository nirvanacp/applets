import { definePageModule, list, value, type CommandSteps } from "@genesis/sdk/page";

/** One link on the start page. Replace it with the records your applet needs. */
export interface Link {
  text: string;
  url: string;
  /** Text of the list item or paragraph around the link. */
  around: string;
}

/** The list item or paragraph a link sits in: part of what `read` reads, so it is the link's extent. */
const container = (link: Element) => link.closest("li, p");

/** Query parameters that often carry a session or form token. A reader never sends those out of the page. */
const SECRET = /auth|token|csrf|xsrf|sig|session|key|nonce/i;

/** The link's address without its fragment and without token-like query parameters. */
function linkUrl(link: Element): string {
  const url = new URL((link as HTMLAnchorElement).href);
  for (const name of [...url.searchParams.keys()]) if (SECRET.test(name)) url.searchParams.delete(name);
  url.hash = "";
  return url.href;
}

/**
 * A link's key: its URL plus its occurrence among the page's links to that URL, so two links to
 * the same address keep distinct keys.
 */
function linkKey(link: Element): string {
  const url = linkUrl(link);
  const same = [...link.ownerDocument.querySelectorAll("a[href]")].filter(other => linkUrl(other) === url);
  return `${url}#${same.indexOf(link)}`;
}

/** What the web player's mini-player shows. */
export interface NowPlaying {
  title: string;
  artist: string;
  playing: boolean;
  /** Spotify Connect plays on another of the account's devices; this page only shows it. */
  elsewhere: boolean;
}

const BAR = "[data-testid=floating-now-playing-bar]";
const PLAY_PAUSE = `${BAR} [data-test-id=play-pause-button]`;
/**
 * Spotify Connect's prompt when another device (often an earlier copy of this page) is the active
 * player: "You are listening on … / Continue / Listen on this phone". It covers the mini-player.
 */
const CONNECT = "[data-testid=client-modal-contents]:not(.closed)";
const LISTEN_HERE_TEXT = "Listen on this phone";
const LISTEN_HERE = { within: { css: CONNECT }, role: "button", name: LISTEN_HERE_TEXT };

/** Whether Spotify Connect asks to move playback here. The modal container stays in the DOM, closed, for other prompts. */
function playingElsewhere(doc: Document): boolean {
  return [...doc.querySelectorAll(`${CONNECT} button`)].some(button => button.textContent?.trim() === LISTEN_HERE_TEXT);
}

/**
 * Whether the play/pause button shows Pause. The button has no label; its icon is two bars (two
 * subpaths) while playing and one triangle while paused. Null when there is no button.
 */
function readPlaying(doc: Document): boolean | null {
  const path = doc.querySelector(`${PLAY_PAUSE} path`)?.getAttribute("d");
  if (!path) return null;
  return (path.match(/m/gi) ?? []).length > 1;
}

/**
 * The current track from the mini-player, or null when the page has none. The bar holds a
 * carousel of tracks; the first slide is the current one. Its title is a plain span, the artists a
 * text span.
 */
function readNowPlaying(doc: Document): NowPlaying | null {
  const bar = doc.querySelector(BAR);
  const playing = readPlaying(doc);
  if (!bar || playing === null) return null;
  const elsewhere = playingElsewhere(doc);
  const title = bar.querySelector("span:not([data-encore-id])")?.textContent?.trim() ?? "";
  // While another device plays, this line names the device instead of the artists.
  const artist = elsewhere ? "" : bar.querySelector("span[data-encore-id=text]")?.textContent?.trim() ?? "";
  return { title, artist, playing, elsewhere };
}

/**
 * Plays or pauses with the site's own button. A real tap, because a page only starts sound after a
 * user gesture, and a synthetic click is not one.
 */
function setPlaying(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { playing } = (args ?? {}) as { playing?: unknown };
  if (typeof playing !== "boolean") throw new Error("setPlaying needs { playing: boolean }");
  const now = readPlaying(doc);
  if (now === null) throw new Error("Nothing is playing on Spotify");
  const elsewhere = playingElsewhere(doc);
  if (now === playing && !elsewhere) return { satisfied: true };
  const play: CommandSteps["steps"][number] = { op: "click", target: { css: PLAY_PAUSE }, input: "trusted", timeoutMs: 5000 };
  const steps: CommandSteps["steps"] = elsewhere
    ? [{ op: "click", target: LISTEN_HERE, input: "trusted", until: { target: LISTEN_HERE, state: "detached" } }]
    : [];
  // Taking playback over leaves this page paused, so after it only Play needs a press.
  if (!elsewhere || playing) steps.push(play);
  return { steps, until: d => readPlaying(d) === playing && !playingElsewhere(d) };
}

/**
 * The page module runs inside every website page the applet opens. Its readers turn the page into
 * JSON for the UI's watches; it never sends page HTML, cookies or form tokens anywhere.
 */
export default definePageModule({
  readers: {
    links: list<Link>({
      root: "body",
      items: "a[href]",
      // Keys must be unique in the list. Choose items and keys the website keeps stable.
      key: linkKey,
      read: link => ({
        text: link.textContent?.trim() ?? "",
        url: linkUrl(link),
        around: container(link)?.textContent?.trim().slice(0, 200) ?? "",
      }),
      extent: link => [container(link)],
    }),
    nowPlaying: value(readNowPlaying),
  },
  commands: {
    setPlaying: ({ document }, args) => setPlaying(document, args),
  },
});
