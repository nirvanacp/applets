import { value, type CommandSteps, type Step } from "@let/sdk/page";
import { parseClock, progressAt, type NowPlaying, type Player, type Progress, type Repeat } from "../model";
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
 * Spotify has shown it both inside its client modal and as a layer of its own with no test ids, so
 * it is found by its button's text alone.
 */
const LISTEN_HERE_TEXT = "Listen on this phone";
const LISTEN_HERE = { role: "button", name: LISTEN_HERE_TEXT };

/** Whether Spotify Connect asks to move playback here. Its client modal stays in the DOM, closed, for other prompts. */
export function playingElsewhere(doc: Document): boolean {
  return [...doc.querySelectorAll("button")].some(button => button.textContent?.trim() === LISTEN_HERE_TEXT
    && !button.closest("[data-testid=client-modal-contents].closed"));
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

/** The mini-player's scroll-snap carousel of the previous, current and next tracks. */
const CAROUSEL = `${BAR} > img + div`;

/** A slot of the carousel: the title span and the artists span (`data-encore-id=text`) in it. */
interface Slot { title: string; artist: string; left: number; child: number }

interface Carousel {
  element: HTMLElement;
  slots: Slot[];
  /** The slot nearest the carousel's left edge: the track the bar shows. */
  current: number;
  /** The current slot sits on the carousel's edge, so no scroll is under way. */
  centred: boolean;
}

/**
 * Reads the carousel. Slots carry no state attribute, and after a skip their order and text can
 * lag, so the current track is the slot whose box sits at the carousel's left edge, not a fixed
 * index. Without layout (all boxes zero), the middle of three slots or the first of fewer.
 */
function readCarousel(doc: Document): Carousel | null {
  const element = doc.querySelector<HTMLElement>(CAROUSEL);
  if (!element) return null;
  const slots: Slot[] = [];
  for (const [index, child] of [...element.children].entries()) {
    const title = [...child.querySelectorAll("span:not([data-encore-id])")].map(span => textOf(span, 200)).find(Boolean) ?? "";
    if (!title) continue;
    slots.push({ title, artist: textOf(child.querySelector("[data-encore-id=text]"), 200), left: child.getBoundingClientRect().left, child: index + 1 });
  }
  if (slots.length === 0) return null;
  const box = element.getBoundingClientRect();
  if (box.width === 0) return { element, slots, current: slots.length === 3 ? 1 : 0, centred: true };
  let current = 0;
  slots.forEach((slot, index) => {
    if (Math.abs(slot.left - box.left) < Math.abs(slots[current]!.left - box.left)) current = index;
  });
  return { element, slots, current, centred: Math.abs(slots[current]!.left - box.left) < 4 };
}

const ref = (slot: Slot | undefined) => slot ? { title: slot.title } : null;

/** A CSS time such as "-242017ms" or "1.5s" in seconds, or null. */
function cssSeconds(text: string): number | null {
  const match = /^(-?[\d.]+)(ms|s)$/.exec(text.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? (match[2] === "ms" ? amount / 1000 : amount) : null;
}

/** The bar's progress line: Spotify animates it from style variables, so it is found by them, not by its generated class. */
const progressLine = (bar: Element) => bar.querySelector<HTMLElement>("[style*='--animationDelay']");

/**
 * The bar's progress. Spotify sets the variables only when the position jumps or the play state
 * changes: the duration, minus the position as a delay, and the play state. While the animation
 * runs, its start time gives the moment the track was at 0, which stays the same as it plays.
 */
function readProgress(bar: Element): Progress | null {
  const line = progressLine(bar);
  if (!line) return null;
  const delay = cssSeconds(line.style.getPropertyValue("--animationDelay"));
  const duration = cssSeconds(line.style.getPropertyValue("--finalAnimationDuration"));
  if (delay === null || duration === null || duration <= 0) return null;
  const running = line.style.getPropertyValue("--animationPlayState").trim() === "running";
  const animation = line.getAnimations?.()[0];
  const startTime = typeof animation?.startTime === "number" ? animation.startTime : null;
  const time = typeof animation?.currentTime === "number" ? animation.currentTime : null;
  const origin = running && startTime !== null ? Math.round(performance.timeOrigin + startTime + delay * 1000) : null;
  // A paused animation's current time is how far it played since the variables were set.
  const position = time !== null ? time / 1000 - delay : -delay;
  return {
    position: origin !== null ? 0 : Math.max(0, Math.round(position * 10) / 10),
    duration: Math.round(duration * 10) / 10,
    running,
    origin,
  };
}

/** The current track from the mini-player, or null when the page has none. */
function readNowPlaying(doc: Document): NowPlaying | null {
  const bar = doc.querySelector(BAR);
  const playing = readPlaying(doc);
  if (!bar || playing === null) return null;
  const elsewhere = playingElsewhere(doc);
  const carousel = readCarousel(doc);
  const current = carousel?.slots[carousel.current];
  if (!carousel || !current) return null;
  return {
    title: current.title,
    // While another device plays, this line names the device instead of the artists.
    artist: elsewhere ? "" : current.artist,
    image: imageIn(bar.querySelector("img")),
    playing,
    saved: switchState(doc.querySelector(BAR_SAVE)),
    elsewhere,
    next: ref(carousel.slots[carousel.current + 1]),
    previous: ref(carousel.slots[carousel.current - 1]),
    progress: readProgress(bar),
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
  const durationLabel = [...npv.querySelectorAll("[data-testid=npv-progress-bar-time-labels] span")][1];
  const range = npv.querySelector<HTMLInputElement>("[data-testid=npv-progress-bar-wrapper] input[type=range]");
  const max = Number(range?.max);
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
    duration: Number.isFinite(max) && max > 0 ? max : parseClock(textOf(durationLabel, 12)),
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

/**
 * Steps that open the full player when it is closed. A plain click on the mini-player's title
 * opens it. The click goes to the current slot's title: the first title in the bar belongs to
 * the previous track's slot, and a click there plays the previous track.
 */
function openSteps(doc: Document): Step[] {
  if (doc.querySelector(NPV)) return [];
  if (!doc.querySelector(BAR)) throw new Error("Nothing is playing on Spotify");
  const carousel = readCarousel(doc);
  const slot = carousel?.slots[carousel.current];
  const title = slot ? `${CAROUSEL} > :nth-child(${slot.child}) span:not([data-encore-id])` : `${BAR} span:not([data-encore-id])`;
  return [
    { op: "click", target: { css: title } },
    { op: "wait", for: { target: { css: NPV }, state: "visible" }, timeoutMs: 4000 },
  ];
}

/**
 * Steps that close the full player when it is open. A command that taps a point on the page runs
 * these first, so its tap lands on the page and not on the player that lingers over it.
 */
export function closedSteps(doc: Document): Step[] {
  if (!doc.querySelector(NPV)) return [];
  return [
    { op: "click", target: { css: NPV_CLOSE } },
    { op: "wait", for: { target: { css: NPV }, state: "detached" }, timeoutMs: 2000 },
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

/** The current track's title: the carousel's current slot, else the full player's. */
export function currentTitle(doc: Document): string {
  const carousel = readCarousel(doc);
  return carousel?.slots[carousel.current]?.title || readPlayer(doc)?.title || "";
}

/** The position in seconds now, from the bar's progress line, or null. */
function positionNow(doc: Document): number | null {
  const bar = doc.querySelector(BAR);
  const progress = bar && readProgress(bar);
  return progress ? progressAt(progress, Date.now(), Date.now()) : null;
}

const ELSEWHERE = "Spotify is playing on another device. Tap Play to play here.";

/** Previous within this many seconds goes back a track; later it restarts the track, as on Spotify. */
const RESTART_AFTER = 3;

/**
 * Next or previous track. The mini-player's carousel scrolled to its end plays the next track and
 * to its start the previous one, without opening the full player (decision-0015). A scroll only
 * counts while the row is centred, so the command runs one skip at a time and is done when the
 * title changes and Spotify has rebuilt the row around the new track. Previous after the first seconds restarts the track
 * through the full player's button, as does any skip when the carousel cannot take it.
 */
export function skip(doc: Document, args: unknown): CommandSteps {
  const { direction } = (args ?? {}) as { direction?: unknown };
  if (direction !== "next" && direction !== "previous") throw new Error("skip needs { direction: 'next' | 'previous' }");
  if (playingElsewhere(doc)) throw new Error(ELSEWHERE);
  const before = currentTitle(doc);
  const position = positionNow(doc);
  const carousel = readCarousel(doc);
  const neighbour = carousel?.slots[carousel.current + (direction === "next" ? 1 : -1)];
  const restart = direction === "previous" && (position === null || position > RESTART_AFTER);
  const moved = (d: Document) => {
    const now = readCarousel(d);
    const title = now?.slots[now.current]?.title || readPlayer(d)?.title || "";
    return title !== "" && title !== before && (now?.centred ?? true);
  };
  if (carousel?.centred && neighbour && !restart) {
    const { element } = carousel;
    const width = element.scrollWidth;
    const edge = direction === "next" ? width - element.clientWidth : 0;
    // The scroll itself brings the neighbour to the edge at once, before Spotify has switched
    // tracks. Spotify then rebuilds the row around the new track, which moves the row off the
    // edge or changes its width; only then can the next skip in a burst scroll again.
    const rebuilt = (d: Document) => {
      const row = d.querySelector<HTMLElement>(CAROUSEL);
      return row !== null && (row !== element || row.scrollWidth !== width || Math.abs(row.scrollLeft - edge) > 4);
    };
    return {
      steps: [{ op: "scroll", target: { css: CAROUSEL }, to: { x: direction === "next" ? width : 0 } }],
      until: d => moved(d) && rebuilt(d),
      deadlineMs: 5000,
    };
  }
  return {
    steps: [...openSteps(doc), tap(NPV_BUTTON[direction], 3000)],
    // Previous a few seconds into a track restarts it rather than changing it.
    until: d => moved(d) || (restart && (positionNow(d) ?? 99) < RESTART_AFTER),
    deadlineMs: 8000,
  };
}

export function setShuffle(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { shuffle } = (args ?? {}) as { shuffle?: unknown };
  if (typeof shuffle !== "boolean") throw new Error("setShuffle needs { shuffle: boolean }");
  const now = readPlayer(doc)?.shuffle;
  if (now == null) throw new Error("Open the full player to change shuffle");
  if (now === shuffle) return { satisfied: true };
  // With Smart Shuffle the button cycles off → shuffle → smart shuffle → off, so plain shuffle takes two presses to turn off.
  const label = doc.querySelector(NPV_BUTTON.shuffle)?.getAttribute("aria-label") ?? "";
  const presses = !shuffle && /enable smart shuffle/i.test(label) ? 2 : 1;
  return {
    steps: Array.from({ length: presses }, () => tap(NPV_BUTTON.shuffle)),
    until: d => readShuffle(d.querySelector(NPV_BUTTON.shuffle)) === shuffle,
  };
}

/** Repeat cycles off → all → one → off on the website; the command presses until the wanted mode shows. */
export function setRepeat(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { repeat } = (args ?? {}) as { repeat?: unknown };
  if (repeat !== "off" && repeat !== "all" && repeat !== "one") throw new Error("setRepeat needs { repeat: 'off' | 'all' | 'one' }");
  const now = readPlayer(doc)?.repeat;
  // The presses count from the shown mode, so an unknown mode cannot be counted from.
  if (now == null) throw new Error("Open the full player to change repeat");
  if (now === repeat) return { satisfied: true };
  const order: Repeat[] = ["off", "all", "one"];
  const presses = (order.indexOf(repeat) - order.indexOf(now) + 3) % 3;
  const steps: Step[] = [];
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
 * Seeks with one tap on the full player's progress bar at the target's fraction of its width
 * (decision-0014). Spotify seeks to the point of a touch and checks no trust flag. The full player
 * opens first when it is closed. Done when the bar's position is near the target.
 */
export function seek(doc: Document, args: unknown): CommandSteps | { satisfied: true } {
  const { seconds, title } = (args ?? {}) as { seconds?: unknown; title?: unknown };
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) throw new Error("seek needs { seconds }");
  if (playingElsewhere(doc)) throw new Error(ELSEWHERE);
  // A call queued behind a skip runs on the next song; `title` names the song the user scrubbed.
  if (typeof title === "string" && title && currentTitle(doc) !== title) throw new Error("The song changed, so the seek stopped.");
  const bar = doc.querySelector(BAR);
  const duration = (bar && readProgress(bar)?.duration) || readPlayer(doc)?.duration;
  if (!duration) throw new Error("Spotify shows no position for this track");
  const target = Math.min(seconds, duration);
  const position = positionNow(doc);
  if (position !== null && Math.abs(position - target) < 1) return { satisfied: true };
  // A fraction of 1 lands just outside the bar.
  const x = Math.min(0.995, Math.max(0, target / duration));
  return {
    steps: [...openSteps(doc), { op: "click", target: { css: `${NPV} [data-testid=progress-bar]` }, gesture: "tap", at: { x }, timeoutMs: 3000 }],
    until: d => Math.abs((positionNow(d) ?? -99) - target) <= 2.5,
    deadlineMs: 8000,
  };
}
