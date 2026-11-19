import { useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { playback } from "../playback/use-playback";
import { reducedMotion } from "../ui/motion";

/** A sideways move this far starts a swipe instead of a tap. */
const SLOP = 10;
const SKIP_MIN = 56;
const SLIDE_MS = 140;

/**
 * Swipe to skip, on the mini-player's track and on Now Playing's art: left to the next track,
 * right to the previous one. The moving element follows the finger; past a quarter of the width,
 * or 56 px, it skips and the element comes back in from the other side. A shorter swipe springs
 * back. Under reduced motion nothing moves. The click a swipe ends with is swallowed. The element
 * needs `touch-action: pan-y`, so a vertical move still scrolls or drags the screen.
 */
export function useSkipSwipe(moving: RefObject<HTMLElement | null>) {
  const drag = useRef<{ id: number; x: number; y: number; dx: number; moving: boolean } | null>(null);
  const swallow = useRef(false);

  const place = (dx: number, width: number) => {
    const el = moving.current;
    if (!el || reducedMotion()) return;
    el.style.transform = dx ? `translateX(${dx}px)` : "";
    el.style.opacity = dx ? String(Math.max(.3, 1 - Math.abs(dx) / width)) : "";
  };

  const settle = (dx: number, skipped: boolean) => {
    const el = moving.current;
    place(0, 1);
    if (!el || reducedMotion() || typeof el.animate !== "function") return;
    const width = el.offsetWidth || 1;
    const frames = skipped
      ? [{ transform: `translateX(${-Math.sign(dx) * width * .5}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }]
      : [{ transform: `translateX(${dx}px)`, opacity: Math.max(.3, 1 - Math.abs(dx) / width) }, { transform: "translateX(0)", opacity: 1 }];
    el.animate(frames, { duration: SLIDE_MS, easing: "cubic-bezier(.2, 0, 0, 1)" });
  };

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, moving: false };
      swallow.current = false;
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
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
    onPointerUp(event: PointerEvent<HTMLElement>) {
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
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!swallow.current) return;
      swallow.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
