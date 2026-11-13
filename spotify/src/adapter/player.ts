import { value, type CommandSteps, type Step } from "@genesis/sdk/page";
import { parseClock, SEEK_SECONDS_PER_CALL, type NowPlaying, type Player, type Repeat } from "../model";
import { hrefOf, imageIn, switchState, textOf } from "./read";

/**
 * The web player's two players. The mini-player (`floating-now-playing-bar`) is on every page; the
 * full player (`npv-container`) opens over the page when the mini-player is tapped and has the
 * transport controls. Shuffle, repeat, previous, next and the progress bar exist only there.
 */
export const BAR = "[data-testid=floating-now-playing-bar]";
const PLAY_PAUSE = `${BAR} [data-test-id=play-pause-button]`;
const BAR_SAVE = `${BAR} [data-testid=add-button]`;
export const NPV = "[data-testid=npv-container]";
const NPV_CLOSE = `${NPV} button[aria-label=Close]`;
const NPV_SAVE = `${NPV} [data-testid=npv-metadata-container] [data-testid=add-button]`;
const NPV_BUTTON = {
  shuffle: `${NPV} [data-testid=npv-shuffle-button]`,
  previous: `${NPV} [data-testid=npv-skip-previous-button]`,
  play: `${NPV} [data-testid=npv-play-button]`,
  next: `${NPV} [data-testid=npv-skip-forward-button]`,
  repeat: `${NPV} [data-testid=npv-repeat-button]`,
};

/**
 * Spotify Connect's prompt when another device (often an earlier copy of this page) is the active
 * player: "You are listening on … / Continue / Listen on this phone". It covers the mini-player.
 */
const CONNECT = "[data-testid=client-modal-contents]:not(.closed)";
const LISTEN_HERE_TEXT = "Listen on this phone";
const LISTEN_HERE = { within: { css: CONNECT }, role: "button", name: LISTEN_HERE_TEXT };

/** Whether Spotify Connect asks to move playback here. The modal container stays in the DOM, closed, for other prompts. */
export function playingElsewhere(doc: Document): boolean {
  return [...doc.querySelectorAll(`${CONNECT} button`)].some(button => button.textContent?.trim() === LISTEN_HERE_TEXT);
}

/**
 * Whether the mini-player's button shows Pause. The button has no label; its icon is two bars (two
 * subpaths) while playing and one triangle while paused. Null when there is no button.
 */
export function readPlaying(doc: Document): boolean | null {
  const path = doc.querySelector(`${PLAY_PAUSE} path`)?.getAttribute("d");
  if (!path) return null;
  return (path.match(/m/gi) ?? []).length > 1;
}

/** A slide of the mini-player's carousel: its title span and the artists span after it. */
interface Slide { title: string; artist: string; left: number }

/**
 * The carousel holds the previous, current and next tracks, and slides them sideways; only the
 * current one is inside the bar. The slides carry no state attribute, so the current one is the
 * slide whose left edge is nearest the bar's. Without layout (all zero), the first slide.
 */
function slides(bar: Element): { current: Slide | null; next: Slide | null } {
  // Each slide is a title span followed by an artists span (`data-encore-id=text`).
  const found: Slide[] = [];
  for (const span of bar.querySelectorAll("span")) {
    const last = found[found.length - 1];
    if (span.getAttribute("data-encore-id") === "text") {
      if (last && !last.artist) last.artist = textOf(span, 200);
    } else if (!span.hasAttribute("data-encore-id") && textOf(span)) {
      found.push({ title: textOf(span, 200), artist: "", left: span.getBoundingClientRect().left });
    }
  }
  if (found.length === 0) return { current: null, next: null };
  const barLeft = bar.getBoundingClientRect().left;
  let index = found.findIndex(slide => slide.left >= barLeft - 4);
  if (index < 0) index = 0;
  return { current: found[index] ?? null, next: found[index + 1] ?? null };
}

/** The current track from the mini-player, or null when the page has none. */
function readNowPlaying(doc: Document): NowPlaying | null {
  const bar = doc.querySelector(BAR);
  const playing = readPlaying(doc);
  if (!bar || playing === null) return null;
  const elsewhere = playingElsewhere(doc);
  const { current, next } = slides(bar);
  if (!current) return null;
  return {
    title: current.title,
    // While another device plays, this line names the device instead of the artists.
    artist: elsewhere ? "" : current.artist,
    image: imageIn(bar.querySelector("img")),
    playing,
    saved: switchState(doc.querySelector(BAR_SAVE)),
    elsewhere,
    next: next ? { title: next.title, artist: next.artist } : null,
  };
}

/** The shuffle and repeat buttons say what pressing them does: "Enable shuffle", "Disable repeat". */
function readShuffle(button: Element | null): boolean | null {
  const label = button?.getAttribute("aria-label") ?? "";
  if (/disable shuffle|disable smart shuffle|enable smart shuffle/i.test(label)) return true;
  if (/enable shuffle/i.test(label)) return false;
  return null;
}

function readRepeat(button: Element | null): Repeat | null {
  const label = button?.getAttribute("aria-label") ?? "";
  if (/enable repeat one/i.test(label)) return "all";
  if (/disable repeat/i.test(label)) return "one";
  if (/enable repeat/i.test(label)) return "off";
  return null;
}

const usable = (button: Element | null) => button !== null && !button.hasAttribute("disabled") && button.getAttribute("aria-disabled") !== "true";

/** The full player, or null while it is closed. */
function readPlayer(doc: Document): Player | null {
  const npv = doc.querySelector(NPV);
  if (!npv) return null;
  const meta = npv.querySelector("[data-testid=npv-metadata-container]");
  const track = meta?.querySelector("a[href*='/track/'], a[href*='/episode/']") ?? null;
  const artist = meta?.querySelector("a[href*='/artist/'], a[href*='/show/']") ?? null;
  const header = npv.querySelector("[data-testid=npv-header-title]");
  const from = header?.closest("a") ?? null;
  const [positionLabel, durationLabel] = [...npv.querySelectorAll("[data-testid=npv-progress-bar-time-labels] span")];
  const range = npv.querySelector<HTMLInputElement>("[data-testid=npv-progress-bar-wrapper] input[type=range]");
  const max = Number(range?.max);
  const now = Number(range?.value);
  const positionText = textOf(positionLabel, 12);
  const durationText = textOf(durationLabel, 12);
  const play = npv.querySelector(NPV_BUTTON.play);
  const shuffle = npv.querySelector(NPV_BUTTON.shuffle);
  const repeat = npv.querySelector(NPV_BUTTON.repeat);
  return {
    title: textOf(track ?? meta?.querySelector("div"), 300),
    trackUrl: hrefOf(track),
    artist: textOf(artist, 300),
    artistUrl: hrefOf(artist),
    from: textOf(header, 300) || null,
    fromUrl: hrefOf(from),
    image: imageIn(npv.querySelector("[data-testid=npv-cover-art]")) ?? imageIn(doc.querySelector(`${BAR} img`)),
    saved: switchState(doc.querySelector(NPV_SAVE)),
    playing: /pause/i.test(play?.getAttribute("aria-label") ?? ""),
    position: Number.isFinite(now) && range ? now : parseClock(positionText),
    duration: Number.isFinite(max) && max > 0 ? max : parseClock(durationText),
    positionText,
    durationText,
    shuffle: readShuffle(shuffle),
    repeat: readRepeat(repeat),
    canShuffle: usable(shuffle),
    canRepeat: usable(repeat),
    canPrevious: usable(npv.querySelector(NPV_BUTTON.previous)),
    canNext: usable(npv.querySelector(NPV_BUTTON.next)),
  };
}

export const nowPlaying = value(readNowPlaying, { root: "body", measure: true });
export const player = value(readPlayer, { root: "body" });

/** A real tap: a page only starts sound after a user gesture, and a synthetic click is not one. */
const tap = (css: string, timeoutMs = 5000): Step => ({ op: "click", target: { css }, input: "trusted", timeoutMs });

/** Steps that open the full player when it is closed. A plain click on the mini-player's title opens it. */
function openSteps(doc: Document): Step[] {
  if (doc.querySelector(NPV)) return [];
  if (!doc.querySelector(BAR)) throw new Error("Nothing is playing on Spotify");
  return [
    { op: "click", target: { css: `${BAR} span:not([data-encore-id])` } },
    { op: "wait", for: { target: { css: NPV }, state: "visible" }, timeoutMs: 4000 },
  ];
}

export function openPlayer(doc: Document): CommandSteps | { satisfied: true } {
  const steps = openSteps(doc);
  return steps.length === 0 ? { satisfied: true } : { steps, until: d => d.querySelector(NPV) !== null };
}

export function closePlayer(doc: Document): CommandSteps | { satisfied: true } {
  if (!doc.querySelector(NPV)) return { satisfied: true };
  return { steps: [{ op: "click", target: { css: NPV_CLOSE } }], until: d => d.querySelector(NPV) === null };
}

/** Plays or pauses with the mini-player's button, taking playback over from another device first. */
export function setPlaying(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { playing } = (args ?? {}) as { playing?: unknown };
  if (typeof playing !== "boolean") throw new Error("setPlaying needs { playing: boolean }");
  const now = readPlaying(doc);
  if (now === null) throw new Error("Nothing is playing on Spotify");
  const elsewhere = playingElsewhere(doc);
  if (now === playing && !elsewhere) return { satisfied: true };
  const steps: Step[] = elsewhere
    ? [{ op: "click", target: LISTEN_HERE, input: "trusted", until: { target: LISTEN_HERE, state: "detached" } }]
    : [];
  // Taking playback over leaves this page paused, so after it only Play needs a press.
  if (!elsewhere || playing) steps.push(tap(doc.querySelector(NPV) ? NPV_BUTTON.play : PLAY_PAUSE));
  return { steps, until: d => readPlaying(d) === playing && !playingElsewhere(d) };
}

/** The current track's title in the full player, or the mini-player's when it is closed. */
export function currentTitle(doc: Document): string {
  const bar = doc.querySelector(BAR);
  return readPlayer(doc)?.title || (bar ? slides(bar).current?.title ?? "" : "");
}

/** Next or previous track, through the full player. Done when the title changes or the position restarts. */
export function skip(doc: Document, args: unknown): CommandSteps {
  const { direction } = (args ?? {}) as { direction?: unknown };
  if (direction !== "next" && direction !== "previous") throw new Error("skip needs { direction: 'next' | 'previous' }");
  const before = currentTitle(doc);
  const position = readPlayer(doc)?.position ?? null;
  return {
    steps: [...openSteps(doc), tap(NPV_BUTTON[direction])],
    until: d => {
      const title = currentTitle(d);
      // Previous a few seconds into a track restarts it rather than changing it.
      const restarted = direction === "previous" && position !== null && position > 3 && (readPlayer(d)?.position ?? 99) < 3;
      return (title !== "" && title !== before) || restarted;
    },
  };
}

export function setShuffle(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { shuffle } = (args ?? {}) as { shuffle?: unknown };
  if (typeof shuffle !== "boolean") throw new Error("setShuffle needs { shuffle: boolean }");
  if (readPlayer(doc)?.shuffle === shuffle) return { satisfied: true };
  return {
    steps: [...openSteps(doc), tap(NPV_BUTTON.shuffle)],
    until: d => readShuffle(d.querySelector(NPV_BUTTON.shuffle)) === shuffle,
  };
}

/** Repeat cycles off → all → one → off on the website; the command presses until the wanted mode shows. */
export function setRepeat(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { repeat } = (args ?? {}) as { repeat?: unknown };
  if (repeat !== "off" && repeat !== "all" && repeat !== "one") throw new Error("setRepeat needs { repeat: 'off' | 'all' | 'one' }");
  const now = readPlayer(doc)?.repeat ?? "off";
  if (now === repeat) return { satisfied: true };
  const order: Repeat[] = ["off", "all", "one"];
  const presses = (order.indexOf(repeat) - order.indexOf(now) + 3) % 3;
  const steps = openSteps(doc);
  for (let index = 0; index < presses; index += 1) steps.push(tap(NPV_BUTTON.repeat));
  return { steps, until: d => readRepeat(d.querySelector(NPV_BUTTON.repeat)) === repeat };
}

/** Saves the current track to, or removes it from, Liked Songs with the mini-player's switch. */
export function setTrackSaved(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { saved } = (args ?? {}) as { saved?: unknown };
  if (typeof saved !== "boolean") throw new Error("setTrackSaved needs { saved: boolean }");
  const target = doc.querySelector(NPV_SAVE) ? NPV_SAVE : BAR_SAVE;
  const now = switchState(doc.querySelector(target));
  if (now === null) throw new Error("Spotify shows no save button for this track");
  if (now === saved) return { satisfied: true };
  return { steps: [tap(target)], until: d => switchState(d.querySelector(target)) === saved };
}

/**
 * Spotify's progress bar seeks on a real tap at a point, which no step can aim, or on arrow keys
 * in its hidden range input, five seconds a press. Synthetic events and a filled value do not
 * commit. The input is controlled, so a press sent before Spotify redraws the last one steps from
 * the old value: after each press the command waits for the value to move on.
 */
const SEEK_STEP = 5;
const SEEK_MAX_PRESSES = SEEK_SECONDS_PER_CALL / SEEK_STEP;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function seek(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { seconds } = (args ?? {}) as { seconds?: unknown };
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) throw new Error("seek needs { seconds }");
  const range = `${NPV} [data-testid=npv-progress-bar-wrapper] input[type=range]`;
  const input = doc.querySelector<HTMLInputElement>(range);
  const position = input ? Number(input.value) : NaN;
  if (!Number.isFinite(position)) throw new Error("seek needs the full player open");
  const target = Math.round(seconds);
  const presses = Math.min(SEEK_MAX_PRESSES, Math.round(Math.abs(target - position) / SEEK_STEP));
  if (presses === 0) return { satisfied: true };
  const forward = target > position;
  // A long seek moves one call's share now; the caller calls again from the new position.
  const reach = forward ? Math.min(target, position + presses * SEEK_STEP) : Math.max(target, position - presses * SEEK_STEP);
  const steps: Step[] = [];
  let value = position;
  for (let i = 0; i < presses; i += 1) {
    steps.push({ op: "press", key: forward ? "ArrowRight" : "ArrowLeft", target: { css: range }, input: "trusted", force: true });
    // Locators may not test `value`; `aria-valuetext` ("0:45/6:38") carries the same position.
    steps.push({ op: "wait", for: { target: { css: `${range}:not([aria-valuetext^="${clock(value)}/"])` }, state: "attached" }, timeoutMs: 4000 });
    // The browser snaps a stepped value to the input's grid of five.
    value = forward ? Math.floor(value / SEEK_STEP) * SEEK_STEP + SEEK_STEP : Math.ceil(value / SEEK_STEP) * SEEK_STEP - SEEK_STEP;
  }
  return {
    steps,
    until: d => Math.abs((readPlayer(d)?.position ?? -99) - reach) <= SEEK_STEP + 2,
    deadlineMs: 14000,
  };
}
