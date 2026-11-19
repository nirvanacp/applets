import { useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { useRouter } from "@let/sdk/react";
import { Artwork, Icon } from "./ui";
import { playback, usePlayback, usePosition } from "../playback/use-playback";
import type { Clock } from "../playback/store";
import { reducedMotion } from "../ui/motion";

/**
 * The bar above the tabs on every screen: the current track, a save switch and Play/Pause. A tap
 * on the track opens Now Playing. The controls answer at once from the playback store, which sends
 * Spotify's own buttons the request; the toast reports anything that did not happen. A swipe
 * along the track skips, as in Spotify's app: left to the next track, right to the previous one.
 * The bar keeps its place and height while pages load: the store keeps the last track for 10 s.
 */
export function MiniPlayer() {
  const { navigate } = useRouter();
  const now = usePlayback();
  const text = useRef<HTMLSpanElement>(null);
  const swipe = useSkipSwipe(text);
  if (!now.known) return null;

  return <section className="mini-player" aria-label="Now playing">
    <button type="button" className="mini-track" onClick={() => navigate({ screen: "player" })}
      aria-label={`Open Now Playing: ${now.title}`} {...swipe}>
      <Artwork src={now.image} />
      <span className="mini-text" ref={text}>
        <strong>{now.title}</strong>
        {now.elsewhere ? <span className="device">Playing on another device</span> : <span>{now.artist}</span>}
      </span>
    </button>
    {now.saved !== null && <button type="button" className={`icon-button${now.saved ? " on" : ""}`}
      aria-pressed={now.saved} aria-label={now.saved ? "Remove from Liked Songs" : "Save to Liked Songs"}
      onClick={() => playback.setSaved(!now.saved)}>
      <Icon name={now.saved ? "check" : "plus"} />
    </button>}
    <button type="button" className="icon-button" aria-label={now.playing ? "Pause" : "Play"} onClick={() => playback.setPlaying(!now.playing)}>
      <Icon name={now.playing ? "pause" : "play"} filled />
    </button>
    <MiniProgress clock={now.clock} />
  </section>;
}

/** The thin line along the bar's foot, run from the local clock. */
function MiniProgress({ clock }: { clock: Clock | null }) {
  const position = usePosition(clock);
  if (!clock || clock.duration <= 0) return null;
  return <span className="mini-progress" aria-hidden="true"><span style={{ transform: `scaleX(${position / clock.duration})` }} /></span>;
}

/** A sideways move this far starts a swipe instead of a tap. */
const SLOP = 10;
const SKIP_MIN = 56;
const SLIDE_MS = 140;

/**
 * Swipe to skip on the bar's track button. The text follows the finger; past a quarter of the
 * width, or 56 px, it skips and the text comes back in from the other side. A shorter swipe
 * springs back. Under reduced motion the text does not move. The click a swipe ends with does
 * not open Now Playing.
 */
function useSkipSwipe(text: RefObject<HTMLSpanElement | null>) {
  const drag = useRef<{ id: number; x: number; y: number; dx: number; moving: boolean } | null>(null);
  const swallow = useRef(false);

  const place = (dx: number, width: number) => {
    const el = text.current;
    if (!el || reducedMotion()) return;
    el.style.transform = dx ? `translateX(${dx}px)` : "";
    el.style.opacity = dx ? String(Math.max(.3, 1 - Math.abs(dx) / width)) : "";
  };

  const settle = (dx: number, skipped: boolean) => {
    const el = text.current;
    place(0, 1);
    if (!el || reducedMotion() || typeof el.animate !== "function") return;
    const width = el.offsetWidth || 1;
    const frames = skipped
      ? [{ transform: `translateX(${-Math.sign(dx) * width * .5}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }]
      : [{ transform: `translateX(${dx}px)`, opacity: Math.max(.3, 1 - Math.abs(dx) / width) }, { transform: "translateX(0)", opacity: 1 }];
    el.animate(frames, { duration: SLIDE_MS, easing: "cubic-bezier(.2, 0, 0, 1)" });
  };

  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, moving: false };
      swallow.current = false;
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (!state.moving) {
        if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
        if (Math.abs(dx) < SLOP) return;
        state.moving = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      state.dx = dx;
      place(dx, event.currentTarget.offsetWidth || 1);
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const state = drag.current;
      drag.current = null;
      if (!state || state.id !== event.pointerId || !state.moving) return;
      swallow.current = true;
      const skipped = Math.abs(state.dx) >= Math.max(SKIP_MIN, (event.currentTarget.offsetWidth || 0) / 4);
      if (skipped) playback.skip(state.dx < 0 ? "next" : "previous");
      settle(state.dx, skipped);
    },
    onPointerCancel() {
      const state = drag.current;
      drag.current = null;
      if (state?.moving) settle(state.dx, false);
    },
    onClickCapture(event: MouseEvent<HTMLButtonElement>) {
      if (!swallow.current) return;
      swallow.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
