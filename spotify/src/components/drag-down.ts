import { useEffect, useRef, type RefObject } from "react";
import { reducedMotion } from "../ui/motion";

/** A move this far decides between dragging the screen down and anything else. */
const SLOP = 10;
/** A release faster than this, in px per ms, closes however short the drag. */
const FLICK = 0.5;
const SPRING_MS = 200;

/**
 * Drag down to close, on a screen that rises over the app (Now Playing). From the top of the
 * screen's scroll, a downward move follows the finger; past a quarter of the height, or on a
 * downward flick, the screen closes, and a shorter drag springs back. A move that starts sideways
 * or upwards is left to the screen. Under reduced motion the screen does not follow the finger,
 * but the same drag still closes it. The close button does the same with one tap.
 *
 * Touch events, not pointer events: the screen scrolls, and the browser would take a vertical
 * pointer as a scroll and cancel it.
 */
export function useDragDown(screen: RefObject<HTMLElement | null>, close: () => void) {
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    let drag: { x: number; y: number; dy: number; atTop: boolean; state: "deciding" | "dragging" | "ignored"; at: number; speed: number } | null = null;

    const place = (dy: number) => {
      if (reducedMotion()) return;
      el.style.transform = dy > 0 ? `translateY(${dy}px)` : "";
    };
    const springBack = (dy: number) => {
      place(0);
      if (reducedMotion() || dy <= 0 || typeof el.animate !== "function") return;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: SPRING_MS, easing: "cubic-bezier(.2, 0, 0, 1)" });
    };

    const start = (event: TouchEvent) => {
      const touch = event.touches[0];
      // The progress bar owns its own drags.
      if (event.touches.length !== 1 || !touch || (event.target as Element).closest("input[type=range]")) { drag = null; return; }
      drag = { x: touch.clientX, y: touch.clientY, dy: 0, atTop: el.scrollTop <= 0, state: "deciding", at: event.timeStamp, speed: 0 };
    };
    const move = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!drag || !touch || drag.state === "ignored") return;
      const dx = touch.clientX - drag.x;
      const dy = touch.clientY - drag.y;
      if (drag.state === "deciding") {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        drag.state = drag.atTop && dy > 0 && dy > Math.abs(dx) ? "dragging" : "ignored";
        if (drag.state === "ignored") return;
      }
      event.preventDefault();
      const elapsed = event.timeStamp - drag.at;
      if (elapsed > 0) drag.speed = (dy - drag.dy) / elapsed;
      drag.at = event.timeStamp;
      drag.dy = Math.max(0, dy);
      place(drag.dy);
    };
    const end = () => {
      const state = drag;
      drag = null;
      if (!state || state.state !== "dragging") return;
      const far = state.dy >= el.offsetHeight / 4;
      const flick = state.speed >= FLICK && state.dy >= SLOP * 2;
      // Closing keeps the offset: the screen falls away from where the finger left it.
      if (far || flick) onClose.current();
      else springBack(state.dy);
    };
    const cancel = () => {
      const state = drag;
      drag = null;
      if (state?.state === "dragging") springBack(state.dy);
    };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", cancel);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", cancel);
    };
  }, [screen]);
}
