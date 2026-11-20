import { postIdOf, postSelector, reachPost, type CommandResult } from "./read.ts";

const PLAYER = '[data-testid="videoPlayer"]';
const POST = 'article[data-testid="tweet"]';
const OVERLAY_ID = "genesis-play-video";
/** How long the overlay waits for the trusted tap that starts the player. */
const ARM_MS = 10_000;
/** How long the player has to go full screen after the tap. */
const FULLSCREEN_MS = 8_000;
/** How long a player X dropped during full screen has to come back before full screen ends. */
const LOST_MS = 1_500;
/** Set on the root while the marked player plays full screen, so the command can tell it held. */
const PLAYING = "data-genesis-video-playing";

/** Removes the overlay waiting for the tap, so a second command replaces the first. */
let armed: (() => void) | null = null;

/**
 * Plays the video `index` of the post `id` in X's own player, full screen with sound, without
 * leaving the page. The applet grants fullscreen from the user's tap. This command lays a
 * transparent overlay over X's page, outside X's React root, and taps it with trusted input, so
 * the tap gives the page a user activation without reaching X: X opens no video page, and a
 * layout change between finding the player and the tap cannot send the tap to another post. The
 * overlay's handler finds the player by post id, starts its `<video>` and asks for fullscreen,
 * which the grant lets Genesis show over the applet. When fullscreen ends (Back, or the player's
 * own exit), the video pauses. X's streams are `blob:` sources that only its player can play, so
 * the applet cannot play them itself.
 */
export function playVideo(doc: Document, args: { id?: unknown; at?: unknown; index?: unknown } | undefined): CommandResult {
  const index = typeof args?.index === "number" && Number.isInteger(args.index) && args.index >= 0 ? args.index : 0;
  const { article, steps, wait } = reachPost(doc, args?.id, args?.at);
  const id = args!.id as string;
  if (article && !ownPlayers(article)[index]) throw new Error("X shows no video for this post here");
  arm(doc, id, index);
  return {
    steps: [
      ...steps,
      // After a scroll, X draws the post a moment later.
      ...(wait ? [{ op: "wait" as const, for: { target: { css: `${postSelector(id)} ${PLAYER}` }, state: "attached" as const }, timeoutMs: wait }] : []),
      { op: "click", target: { css: `#${OVERLAY_ID}` }, input: "trusted" },
    ],
    // Full screen alone is not enough: a refused request is shown and ended a moment later.
    until: now => now.documentElement.hasAttribute(PLAYING),
    deadlineMs: (wait ?? 0) + FULLSCREEN_MS,
  };
}

/** The post's own players, not those of a post it quotes. */
function ownPlayers(article: Element): HTMLElement[] {
  return [...article.querySelectorAll<HTMLElement>(PLAYER)].filter(player => !player.closest('div[role="link"]'));
}

function arm(doc: Document, id: string, index: number) {
  armed?.();
  const view = doc.defaultView!;
  const until = Date.now() + ARM_MS;
  const overlay = doc.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:transparent;touch-action:none";
  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    disarm();
    // Timers sleep while the page rests, so a late tap is checked by the clock. A shown page wakes
    // and runs the timer, which takes the overlay away before the user can touch it.
    if (!event.isTrusted || Date.now() > until) return;
    start(doc, () => {
      const article = [...doc.querySelectorAll(POST)].find(element => postIdOf(element) === id);
      return article ? ownPlayers(article)[index] : undefined;
    });
  };
  const timer = view.setTimeout(() => disarm(), ARM_MS);
  const disarm = () => {
    view.clearTimeout(timer);
    overlay.remove();
    if (armed === disarm) armed = null;
  };
  overlay.addEventListener("click", onClick);
  doc.body.append(overlay);
  armed = disarm;
}

/** Marks the player shown full screen, so the stylesheet can find it. */
const MARK = "data-genesis-video";
const STYLE_ID = "genesis-video-style";
/** The user's own input, after which the player's sound and pause are theirs. */
const INPUTS = ["pointerdown", "keydown"] as const;
/** The video's own events, which do not bubble, caught on the way down. */
const MEDIA = ["canplay", "playing"] as const;
/**
 * Shows only the marked player, over the whole screen. X's list moves each row with a transform,
 * which would hold a fixed player inside its row, so the marked player's row drops it. Hidden
 * ancestors with a visible descendant still draw that descendant.
 */
const STYLE = `
html, body { background: #000 !important; }
body * { visibility: hidden !important; }
[${MARK}], [${MARK}] * { visibility: visible !important; }
[data-testid="cellInnerDiv"]:has([${MARK}]) { transform: none !important; }
[${MARK}] { position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; background: #000 !important; }`;

/**
 * Full screen goes to the page's root, not to X's player: X replaces its player while it starts and
 * again when the page resizes for full screen, and a replaced element would leave full screen,
 * with the tap's activation already spent. A stylesheet fills the screen with the marked player,
 * and while full screen lasts, a player X replaces passes its mark to the post's new player. The
 * page keeps its scroll position, so X keeps the post's row and its player.
 */
function start(doc: Document, find: () => HTMLElement | undefined) {
  const view = doc.defaultView!;
  let player = find();
  if (!player) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE;
  let frame = 0;
  const video = () => player?.querySelector("video") ?? null;
  const play = () => {
    const current = video();
    if (!current) return;
    current.muted = false;
    if (current.paused) void current.play().catch(() => undefined);
  };
  // X mutes a feed player once it starts, so the sound comes back, at most once a frame from the
  // observer, until the user touches the player: from then on its sound and pause are theirs. A
  // player X has only just drawn has no stream yet, so it starts once it can play, until it has
  // played. The video's end is left alone: only a new player is started.
  let own = false;
  let played = false;
  const input = (event: Event) => { if (event.isTrusted) own = true; };
  const unmute = () => {
    const current = video();
    if (own || !current) return;
    if (current.muted) current.muted = false;
    if (!played && current.paused) void current.play().catch(() => undefined);
  };
  const media = (event: Event) => {
    if (event.target !== video()) return;
    if (event.type === "playing") played = true;
    else unmute();
  };
  // X's list can drop the post's row while the root is full screen and not draw it again, since the
  // root cannot scroll then. Full screen ends rather than showing black, and the command fails.
  const leave = () => {
    if (doc.fullscreenElement) void doc.exitFullscreen().catch(stop);
    else stop();
  };
  let lost = 0;
  const late = view.setTimeout(() => { if (!doc.documentElement.hasAttribute(PLAYING)) leave(); }, FULLSCREEN_MS);
  const mark = () => {
    frame = 0;
    if (player?.isConnected) { unmute(); return; }
    player = find();
    if (!player) {
      if (!lost) lost = view.setTimeout(leave, LOST_MS);
      return;
    }
    view.clearTimeout(lost);
    lost = 0;
    player.setAttribute(MARK, "");
    play();
  };
  const observer = new MutationObserver(() => { if (!frame) frame = view.requestAnimationFrame(mark); });
  const stop = () => {
    doc.removeEventListener("fullscreenchange", changed);
    for (const name of INPUTS) doc.removeEventListener(name, input, true);
    for (const name of MEDIA) doc.removeEventListener(name, media, true);
    observer.disconnect();
    view.cancelAnimationFrame(frame);
    view.clearTimeout(late);
    view.clearTimeout(lost);
    style.remove();
    doc.documentElement.removeAttribute(PLAYING);
    // X may have replaced the player since the last frame.
    if (!player?.isConnected) player = find();
    const current = video();
    player?.removeAttribute(MARK);
    if (!current) return;
    current.pause();
    current.muted = true;
  };
  // Entering full screen scrolls the root to its top, where X's list would drop the post's row.
  const scroll = view.scrollY;
  const hold = () => { if (Math.abs(view.scrollY - scroll) >= 1) view.scrollTo(0, scroll); };
  const changed = () => {
    hold();
    if (!doc.fullscreenElement) { stop(); return; }
    view.requestAnimationFrame(() => {
      hold();
      if (doc.fullscreenElement && player?.isConnected) doc.documentElement.setAttribute(PLAYING, "");
    });
  };
  doc.getElementById(STYLE_ID)?.remove();
  doc.head.append(style);
  player.setAttribute(MARK, "");
  play();
  observer.observe(doc.body, { childList: true, subtree: true });
  doc.addEventListener("fullscreenchange", changed);
  for (const name of INPUTS) doc.addEventListener(name, input, true);
  for (const name of MEDIA) doc.addEventListener(name, media, true);
  doc.documentElement.requestFullscreen().catch(stop);
}
