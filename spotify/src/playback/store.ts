import { progressAt, type NowPlaying, type Player, type Progress, type Repeat, type TrackRef } from "../model";

/**
 * The playback store: one place that knows what is playing and what the user asked for. A tap
 * changes the store at once and the controls show it; the store then sends Spotify one command at
 * a time and lets go of each request when the page shows it, fails it, or 6 s pass. Only the
 * newest request of each kind is kept, so opposite taps cancel before anything is sent, and skips
 * add up to one net count that goes out one skip at a time. While the website loads a page the
 * store holds every request and sends it once the page is ready, so a tap during a navigation is
 * never lost or reported. No React here.
 */

export interface Result { outcome: string; code?: string | null; message?: string | null; completedSteps?: number | null }
export type Send = (command: string, args: unknown) => Promise<Result>;
export type Direction = "next" | "previous";

/** What the page shows, merged from the mini-player and, when it shows the same track, the full player. */
export interface Truth {
  now: NowPlaying;
  /** The full player's reading for this track, or null while it is closed or shows another. */
  player: Player | null;
  /** When the progress was read, for a reading without an origin. */
  readAt: number;
}

/** Where the progress is: `position` seconds at epoch ms `at`, moving while `running`. */
export interface Clock { position: number; at: number; duration: number; running: boolean }

export interface PlaybackView {
  /** False until the page has shown a track, and again once it shows none. */
  known: boolean;
  title: string;
  artist: string;
  /** Null for a track the carousel named before Spotify showed its cover. */
  image: string | null;
  /** Playing on this phone. */
  playing: boolean;
  elsewhere: boolean;
  saved: boolean | null;
  shuffle: boolean | null;
  repeat: Repeat | null;
  clock: Clock | null;
  next: TrackRef | null;
  /** The full player's links and button states for the shown track, or null. */
  player: Player | null;
  /** The full player is open on the website. */
  fullPlayer: boolean;
  /** A request is on its way, or the page has not shown the track for a moment. */
  settling: boolean;
  /** Why the full player did not open, for Now Playing to offer Try again. */
  playerError: string | null;
  /** The track row the user tapped last, until Spotify plays it. */
  startingRow: string | null;
}

/** A track row the user tapped: what the bar shows until Spotify plays it. */
export interface TrackStart { rowId: string; title: string; artist: string; image: string | null }

/** Seconds into the track at `now` on a view's clock. */
export function positionAt(clock: Clock | null, now: number): number {
  if (!clock) return 0;
  const seconds = clock.position + (clock.running ? (now - clock.at) / 1000 : 0);
  return Math.min(clock.duration, Math.max(0, seconds));
}

const EXPIRE_MS = 6000;
const GRACE_MS = 1500;
const KEEP_MS = 10000;
const RETRY_MS = 300;
const TICK_MS = 250;
/** How long the website's full player stays open after Now Playing leaves, with nothing else to send. */
const LINGER_MS = 1500;
/** The longest a navigation holds requests back before they go anyway. */
const NAV_HOLD_MS = 3000;
/** Previous within this many seconds goes to the previous track; later it restarts the track. */
const RESTART_AFTER = 3;
const SEEK_NEAR = 2.5;
/**
 * The page did not take the input, a navigation replaced the page under it, or an earlier input
 * changed the page first: send again once the page is ready.
 */
const RETRYABLE = new Set(["NOT_READY", "CONTEXT_REPLACED", "PRECONDITION_FAILED"]);
const UNCONFIRMED = "Spotify didn't confirm that. Check again in a moment.";

type Field = "playing" | "saved" | "shuffle" | "repeat" | "seek" | "fullPlayer";
type Values = { playing: boolean; saved: boolean; shuffle: boolean; repeat: Repeat; seek: number; fullPlayer: boolean };

interface Intent<V> {
  value: V;
  /** The newest tap. */
  since: number;
  /** The value of the call in flight or last answered. */
  sent?: V;
  inflight: boolean;
  /** When Spotify confirmed the call while the watch had not yet shown it. */
  observedAt?: number;
  retryAt?: number;
  /** The track a seek belongs to. */
  title?: string;
}

/** A row tap on its way: only the newest is kept, so the last tap wins. */
interface StartIntent extends TrackStart { since: number; inflight: boolean; sent: boolean; observedAt?: number; retryAt?: number }

/** A skip sent to the page: `before` is the title it skipped from. */
interface SentSkip { direction: Direction; before: string; observedAt?: number }

/** The send order: play first, the full player last. */
const ORDER: Field[] = ["playing", "seek", "saved", "shuffle", "repeat", "fullPlayer"];
const COMMAND: Record<Field, string> = {
  playing: "setPlaying", saved: "setTrackSaved", shuffle: "setShuffle", repeat: "setRepeat", seek: "seek", fullPlayer: "openPlayer",
};

export class PlaybackStore {
  private truth: Truth | null = null;
  private keptSince: number | null = null;
  private fullPlayerOpen = false;
  private intents: { [F in Field]?: Intent<Values[F]> } = {};
  /** Net skips not yet sent: positive for next, negative for previous. */
  private queued = 0;
  private queuedSince = 0;
  private start: StartIntent | null = null;
  private skipsSent: SentSkip[] = [];
  private skipInflight = false;
  /** When the last skip's call ended. */
  private lastSkipAt = 0;
  private busy = false;
  private playerError: string | null = null;
  private send: Send | null = null;
  private fail: (text: string) => void = () => {};
  private lastFailure = { text: "", at: 0 };
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private cached: PlaybackView | null = null;
  /** When the website started loading the page it is loading now, or null. */
  private navigatingSince: number | null = null;
  /** When the last navigation ended; requests do not age while the page loads. */
  private navigatedAt = 0;
  /** When a released full player closes, or null. */
  private closeAt: number | null = null;
  /** The full player's last reading, for Now Playing to show while it opens again. */
  private lastPlayer: Player | null = null;
  private lastShuffle: boolean | null = null;
  private lastRepeat: Repeat | null = null;

  connect(send: Send, fail: (text: string) => void): () => void {
    this.send = send;
    this.fail = fail;
    this.pump();
    return () => {
      if (this.send === send) this.send = null;
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getView = (): PlaybackView => (this.cached ??= this.computeView(Date.now()));

  /**
   * The page's readings. `now` is null while the page shows no track, including the moment a
   * navigation replaces the page, so the last track stays for a few seconds before it goes.
   */
  setTruth(now: NowPlaying | null, player: Player | null, updatedAt: number | null) {
    const time = Date.now();
    this.fullPlayerOpen = player !== null;
    if (player) {
      this.lastPlayer = player;
      this.lastShuffle = player.shuffle ?? this.lastShuffle;
      this.lastRepeat = player.repeat ?? this.lastRepeat;
    }
    if (!now) {
      if (this.truth && this.keptSince === null) this.keptSince = time;
      this.changed();
      return;
    }
    const before = this.truth;
    this.keptSince = null;
    const sameProgress = before !== null && sameReading(before.now.progress, now.progress);
    this.truth = {
      now,
      player: player && player.title === now.title ? player : null,
      readAt: sameProgress ? before!.readAt : updatedAt ?? time,
    };
    if (before && before.now.title !== now.title) this.trackChanged();
    this.changed();
  }

  /** The website is loading a page: hold requests until it is ready. */
  setNavigating(loading: boolean) {
    const time = Date.now();
    if (loading && this.navigatingSince === null) {
      this.navigatingSince = time;
      // A new page may show as the website: a released full player must not cover it.
      if (this.closeAt !== null) this.closeAt = time;
    } else if (!loading && this.navigatingSince !== null) {
      this.navigatingSince = null;
      this.navigatedAt = time;
    } else return;
    this.changed();
  }

  /** Signed out: forget the track and every request, so the bar goes at once. */
  reset() {
    this.truth = null;
    this.keptSince = null;
    this.intents = {};
    this.queued = 0;
    this.skipsSent = [];
    this.start = null;
    this.playerError = null;
    this.closeAt = null;
    this.lastPlayer = null;
    this.lastShuffle = null;
    this.lastRepeat = null;
    this.changed();
  }

  setPlaying(playing: boolean) { this.want("playing", playing); }
  setSaved(saved: boolean) { this.want("saved", saved); }
  setShuffle(shuffle: boolean) { this.want("shuffle", shuffle); }
  setRepeat(repeat: Repeat) { this.want("repeat", repeat); }
  /** Opens or closes the website's full player, after every other request. */
  wantFullPlayer(open: boolean) {
    this.playerError = null;
    this.closeAt = null;
    this.want("fullPlayer", open);
  }

  /**
   * Now Playing left: close the website's full player once nothing else has been asked for a
   * moment. Opening Now Playing again in that time keeps it open, so neither side waits for a
   * close and an open, and a tap right after leaving never queues behind the close (C6).
   */
  releaseFullPlayer() {
    if (!this.fullPlayerOpen && this.intents.fullPlayer?.value !== true) {
      delete this.intents.fullPlayer;
      this.changed();
      return;
    }
    this.closeAt = Date.now() + LINGER_MS;
    this.changed();
  }

  /** Closes the website's full player now; resolves when it has, or after `waitMs`. */
  closeFullPlayer(waitMs: number): Promise<void> {
    this.wantFullPlayer(false);
    return new Promise(resolve => {
      if (!this.fullPlayerOpen) return resolve();
      let stop = () => {};
      const timer = setTimeout(() => { stop(); resolve(); }, waitMs);
      stop = this.subscribe(() => {
        if (this.fullPlayerOpen) return;
        clearTimeout(timer);
        stop();
        resolve();
      });
    });
  }

  seek(seconds: number) {
    const title = this.truth?.now.title;
    if (!title) return;
    this.want("seek", Math.max(0, seconds), title);
  }

  /**
   * Plays a track row. The bar names it at once; a later row tap replaces this one, and only the
   * newest goes to Spotify. It takes any pending play, pause, seek or skip with it.
   */
  playTrack(track: TrackStart) {
    this.start = { ...track, since: Date.now(), inflight: false, sent: false };
    delete this.intents.playing;
    delete this.intents.seek;
    this.queued = 0;
    this.changed();
  }

  skip(direction: Direction) {
    if (!this.truth) return;
    if (this.queued === 0) this.queuedSince = Date.now();
    this.queued += direction === "next" ? 1 : -1;
    // A skip takes any seek with it.
    delete this.intents.seek;
    this.changed();
  }

  // ---- Requests ---------------------------------------------------------------------------------

  private want<F extends Field>(field: F, value: Values[F], title?: string) {
    const current = this.intents[field] as Intent<Values[F]> | undefined;
    const time = Date.now();
    if (current) {
      current.value = value;
      current.since = time;
      current.observedAt = undefined;
      if (title !== undefined) current.title = title;
    } else {
      (this.intents as Record<Field, Intent<Values[F]>>)[field] = { value, since: time, inflight: false, title };
    }
    this.changed();
  }

  /** The page's value for a field, or undefined when it does not show one. */
  private shown(field: Field): unknown {
    const truth = this.truth;
    switch (field) {
      case "playing": return truth ? truth.now.playing && !truth.now.elsewhere : undefined;
      case "saved": return truth?.now.saved ?? undefined;
      case "shuffle": return truth?.player?.shuffle ?? undefined;
      case "repeat": return truth?.player?.repeat ?? undefined;
      case "fullPlayer": return this.fullPlayerOpen;
      case "seek": return undefined;
    }
  }

  /** Whether the page shows what the request asks for. */
  private met(field: Field, intent: Intent<unknown>, time: number): boolean {
    if (field !== "seek") return this.shown(field) === intent.value;
    const progress = this.truth?.now.progress;
    return Boolean(progress && Math.abs(progressAt(progress, this.truth!.readAt, time) - (intent.value as number)) <= SEEK_NEAR);
  }

  /**
   * The track changed: the oldest skip on its way has landed. With no skip on its way or just
   * landed, a track that ended by itself counts as the first Next still waiting, so a Next tapped
   * as the track ends moves one track, not two. The page also drops a Next whose track has already
   * ended (`from`).
   */
  private trackChanged() {
    if (this.skipsSent.length > 0) this.skipsSent.shift();
    else if (this.queued > 0 && !this.skipInflight && Date.now() - this.lastSkipAt > GRACE_MS) this.queued -= 1;
    delete this.intents.seek;
  }

  /** Lets go of requests the page now shows, that waited too long, or that Spotify confirmed a while ago. */
  private settle(time: number) {
    // A request does not age while the page loads, nor in the moment after.
    const age = (since: number) => this.navigatingSince !== null ? 0 : time - Math.max(since, this.navigatedAt);
    for (const field of ORDER) {
      const intent = this.intents[field] as Intent<unknown> | undefined;
      if (!intent) continue;
      const met = this.met(field, intent, time);
      if (met && !intent.inflight) delete this.intents[field];
      else if (intent.observedAt !== undefined && !intent.inflight && intent.sent === intent.value && time - intent.observedAt > GRACE_MS) delete this.intents[field];
      else if (age(intent.since) > EXPIRE_MS) {
        delete this.intents[field];
        if (field === "fullPlayer") this.playerError = "Spotify didn't open the player.";
        else this.report(UNCONFIRMED, time);
      }
    }
    const start = this.start;
    if (start && !start.inflight) {
      const shown = this.truth?.now.title === start.title && this.keptSince === null;
      if (shown && start.sent) this.start = null;
      else if (start.observedAt !== undefined && time - start.observedAt > GRACE_MS) this.start = null;
      else if (age(start.since) > EXPIRE_MS) {
        this.start = null;
        this.report(UNCONFIRMED, time);
      }
    }
    // Skips Spotify confirmed but the watch has not shown, such as a restart, count as landed.
    this.skipsSent = this.skipsSent.filter(sent => sent.observedAt === undefined || time - sent.observedAt <= GRACE_MS || this.skipInflight);
    if (this.queued !== 0 && age(this.queuedSince) > EXPIRE_MS && !this.skipInflight) {
      this.queued = 0;
      this.report(UNCONFIRMED, time);
    }
    if (this.keptSince !== null && time - this.keptSince > KEEP_MS) {
      this.truth = null;
      this.keptSince = null;
      this.intents = {};
      this.queued = 0;
      this.skipsSent = [];
      this.start = null;
    }
  }

  private report(text: string, time: number) {
    // One toast for a burst of taps that fail the same way.
    if (this.lastFailure.text === text && time - this.lastFailure.at < 3000) return;
    this.lastFailure = { text, at: time };
    this.fail(text);
  }

  /** Sends the next request when nothing is on its way. */
  private pump() {
    if (this.busy || !this.send) return;
    const time = Date.now();
    if (this.navigatingSince !== null && time - this.navigatingSince < NAV_HOLD_MS) return;
    const start = this.start;
    if (start && !start.sent && !start.inflight && (start.retryAt ?? 0) <= time) {
      this.runStart(start);
      return;
    }
    if (this.queued !== 0 && this.truth && this.keptSince === null) {
      // Previous after the first seconds restarts the track first, as on Spotify.
      const direction: Direction = this.queued > 0 ? "next" : "previous";
      this.queued += direction === "next" ? -1 : 1;
      if (this.queued !== 0) this.queuedSince = time;
      this.runSkip(direction);
      return;
    }
    for (const field of ORDER) {
      const intent = this.intents[field] as Intent<unknown> | undefined;
      if (!intent || intent.inflight || (intent.retryAt ?? 0) > time) continue;
      if (intent.sent === intent.value || this.met(field, intent, time)) continue;
      if (field !== "fullPlayer" && (!this.truth || this.keptSince !== null)) continue;
      // Shuffle and repeat count presses from the full player's buttons: open it first.
      if ((field === "shuffle" || field === "repeat") && !this.truth?.player) {
        this.openForControl(time);
        continue;
      }
      this.runField(field, intent);
      return;
    }
  }

  /** Asks for the full player ahead of a control that needs it, unless it is already on its way. */
  private openForControl(time: number) {
    this.closeAt = null;
    const open = this.intents.fullPlayer;
    if (open?.value === true) return;
    if (open?.inflight) {
      open.value = true;
      open.since = time;
      return;
    }
    this.intents.fullPlayer = { value: true, since: time, inflight: false };
  }

  private runSkip(direction: Direction) {
    // The watch's title is current only when no earlier skip or row tap may still be on its way to it.
    const current = this.skipsSent.length === 0 && this.start === null && Date.now() - this.lastSkipAt > GRACE_MS;
    const sent: SentSkip = { direction, before: this.truth!.now.title };
    this.skipsSent.push(sent);
    this.skipInflight = true;
    this.run("skip", direction === "next" && current ? { direction, from: sent.before } : { direction }, result => {
      this.skipInflight = false;
      this.lastSkipAt = Date.now();
      if (result.outcome === "observed") {
        // The track may have changed in the watch already, which landed this skip.
        sent.observedAt = Date.now();
        if (this.truth && this.truth.now.title !== sent.before) this.skipsSent = this.skipsSent.filter(entry => entry !== sent);
        return;
      }
      this.skipsSent = this.skipsSent.filter(entry => entry !== sent);
      if (result.outcome === "cancelled") return;
      // Nothing reached Spotify's button: send the skip again once the page is ready.
      const untouched = result.code === "NOT_READY" || result.code === "PRECONDITION_FAILED"
        || (result.code === "CONTEXT_REPLACED" && !result.completedSteps);
      if (untouched) {
        this.queued += direction === "next" ? 1 : -1;
        return;
      }
      // The page went away after the click: the skip may have landed, so neither send it again nor report it.
      if (result.code === "CONTEXT_REPLACED") return;
      this.queued = 0;
      this.report(failureText(result), Date.now());
    });
  }

  private runStart(start: StartIntent) {
    start.inflight = true;
    start.sent = true;
    this.run("playTrack", { rowId: start.rowId, title: start.title }, result => {
      start.inflight = false;
      if (this.start !== start) return;
      if (result.outcome === "observed") {
        start.observedAt = Date.now();
        return;
      }
      if (result.code && RETRYABLE.has(result.code) && !result.completedSteps) {
        start.sent = false;
        start.retryAt = Date.now() + RETRY_MS;
        return;
      }
      this.start = null;
      // A navigation cut it off after the tap: Spotify may play it, so say nothing.
      if (result.outcome === "cancelled" || result.code === "CONTEXT_REPLACED") return;
      this.report(failureText(result), Date.now());
    });
  }

  private runField(field: Field, intent: Intent<unknown>) {
    intent.inflight = true;
    intent.sent = intent.value;
    intent.observedAt = undefined;
    const value = intent.value;
    const command = field === "fullPlayer" && value === false ? "closePlayer" : COMMAND[field];
    const args = field === "playing" ? { playing: value } : field === "saved" ? { saved: value }
      : field === "shuffle" ? { shuffle: value } : field === "repeat" ? { repeat: value }
      : field === "seek" ? { seconds: value, title: intent.title } : undefined;
    this.run(command, args, result => {
      intent.inflight = false;
      if (this.intents[field] !== intent) return;
      if (result.outcome === "observed") {
        intent.observedAt = Date.now();
        return;
      }
      if (result.code && RETRYABLE.has(result.code) && field !== "seek") {
        intent.sent = undefined;
        intent.retryAt = Date.now() + RETRY_MS;
        return;
      }
      // A later tap asks for another value: send that instead of reporting this one.
      if (intent.value !== value) {
        intent.sent = undefined;
        return;
      }
      delete this.intents[field];
      if (result.outcome === "cancelled") return;
      if (field === "fullPlayer") this.playerError = failureText(result);
      else this.report(failureText(result), Date.now());
    });
  }

  private run(command: string, args: unknown, done: (result: Result) => void) {
    const send = this.send!;
    this.busy = true;
    send(command, args)
      .catch((error: unknown): Result => ({ outcome: "failed", message: error instanceof Error ? error.message : null }))
      .then(result => {
        this.busy = false;
        done(result);
        this.changed();
      });
  }

  // ---- View -------------------------------------------------------------------------------------

  private pending(): boolean {
    return Object.keys(this.intents).some(field => field !== "fullPlayer") || this.queued !== 0 || this.skipsSent.length > 0 || this.start !== null;
  }

  private changed() {
    const time = Date.now();
    // A released full player closes once its time is up and nothing else waits to go.
    if (this.closeAt !== null && time >= this.closeAt && !this.pending()) {
      this.closeAt = null;
      if (this.fullPlayerOpen || this.intents.fullPlayer) this.intents.fullPlayer = { value: false, since: time, inflight: false };
    }
    this.settle(time);
    this.pump();
    this.cached = null;
    const ticking = this.pending() || this.intents.fullPlayer !== undefined || this.keptSince !== null || this.navigatingSince !== null
      || this.closeAt !== null;
    if (ticking && !this.timer) this.timer = setInterval(() => this.changed(), TICK_MS);
    if (!ticking && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const listener of this.listeners) listener();
  }

  private computeView(time: number): PlaybackView {
    const shown = view(this.truth, {
      intents: Object.fromEntries(Object.entries(this.intents).map(([field, intent]) => [field, intent!.value])) as Partial<Values>,
      seekSince: this.intents.seek?.since ?? null,
      playingSince: this.intents.playing?.since ?? null,
      skips: this.queued + this.skipsSent.reduce((sum, sent) => sum + (sent.direction === "next" ? 1 : -1), 0),
      skipSince: this.queuedSince,
      kept: this.keptSince !== null,
      pending: this.pending(),
      fullPlayer: this.fullPlayerOpen,
      playerError: this.playerError,
      lastPlayer: this.lastPlayer,
      lastShuffle: this.lastShuffle,
      lastRepeat: this.lastRepeat,
    }, time);
    const start = this.start;
    if (!start) return shown;
    // A row tap on its way names its track in the bar at once, playing from the start.
    return {
      ...shown,
      known: true, title: start.title, artist: start.artist, image: start.image, playing: true, elsewhere: false,
      saved: null, clock: null, next: null, player: null, settling: true, startingRow: start.rowId,
    };
  }
}

interface Wants {
  intents: Partial<Values>;
  seekSince: number | null;
  playingSince: number | null;
  skips: number;
  skipSince: number;
  kept: boolean;
  pending: boolean;
  fullPlayer: boolean;
  playerError: string | null;
  /** The full player's last reading, shown for the same track while it is closed. */
  lastPlayer: Player | null;
  lastShuffle: boolean | null;
  lastRepeat: Repeat | null;
}

/** What the controls show: the page's reading with every request on its way already applied. */
export function view(truth: Truth | null, wants: Wants, time: number): PlaybackView {
  if (!truth) {
    return {
      known: false, title: "", artist: "", image: null, playing: false, elsewhere: false, saved: null, shuffle: null, repeat: null,
      clock: null, next: null, player: null, fullPlayer: wants.fullPlayer, settling: false, playerError: wants.playerError, startingRow: null,
    };
  }
  const { now, player } = truth;
  const { intents } = wants;
  const playing = intents.playing ?? (now.playing && !now.elsewhere);
  let clock = clockOf(now.progress, truth.readAt);
  let title = now.title;
  let artist = now.artist;
  let image = now.image;
  let next = now.next;
  // While the full player is closed, its last reading of this track stands in for it.
  let shownPlayer = player ?? (wants.lastPlayer?.title === now.title ? wants.lastPlayer : null);
  let saved = intents.saved ?? now.saved;
  // A skip on its way shows the track it goes to when the carousel names it.
  const position = positionAt(clock, time);
  const target = wants.skips > 0 ? now.next : wants.skips < 0 && position <= RESTART_AFTER ? now.previous : null;
  if (target) {
    title = target.title;
    artist = "";
    image = null;
    next = null;
    shownPlayer = null;
    saved = null;
    clock = clock && { position: 0, at: wants.skipSince, duration: clock.duration, running: playing };
  } else if (wants.skips < 0) {
    clock = clock && { position: 0, at: wants.skipSince, duration: clock.duration, running: playing };
  }
  if (intents.seek !== undefined && clock) clock = { ...clock, position: intents.seek, at: wants.seekSince ?? time };
  // A play or pause on its way holds or starts the clock from the tap.
  if (clock && clock.running !== playing) {
    const since = wants.playingSince ?? time;
    clock = { ...clock, position: positionAt(clock, since), at: since, running: playing };
  }
  return {
    known: true,
    title,
    artist,
    image,
    playing,
    elsewhere: now.elsewhere && intents.playing !== true,
    saved,
    shuffle: intents.shuffle ?? player?.shuffle ?? wants.lastShuffle,
    repeat: intents.repeat ?? player?.repeat ?? wants.lastRepeat,
    clock,
    next,
    player: shownPlayer,
    fullPlayer: wants.fullPlayer,
    settling: wants.pending || wants.kept,
    playerError: wants.playerError,
    startingRow: null,
  };
}

/** A page clock from the bar's progress reading. */
function clockOf(progress: Progress | null, readAt: number): Clock | null {
  if (!progress) return null;
  return progress.origin !== null
    ? { position: 0, at: progress.origin, duration: progress.duration, running: progress.running }
    : { position: progress.position, at: readAt, duration: progress.duration, running: progress.running };
}

function sameReading(a: Progress | null, b: Progress | null): boolean {
  return a === b || (a !== null && b !== null && a.position === b.position && a.duration === b.duration && a.running === b.running && a.origin === b.origin);
}

export function failureText(result: Result): string {
  if (result.outcome === "failed") return result.message || "Spotify didn't do that. Try again.";
  return UNCONFIRMED;
}

export const playback = new PlaybackStore();
