import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

export type Motion = "push" | "pop" | "fade" | "drawer-in" | "drawer-out" | "sheet-close" | "sheet-swap" | "rise" | "fall" | "none";

/** Read per change, so a settings change applies without a restart. */
export function reducedMotion(): boolean {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

const EASE_OUT = "cubic-bezier(.2, 0, 0, 1)";
const EASE_IN = "cubic-bezier(.3, 0, .8, .15)";
const SHIFT = "32px";
type Play = { frames: Keyframe[]; ms: number; easing: string; target?: string };

const ENTER: Partial<Record<Motion, Play>> = {
  push: { frames: [{ opacity: 0, transform: `translateX(${SHIFT})` }, { opacity: 1, transform: "none" }], ms: 300, easing: EASE_OUT },
  pop: { frames: [{ opacity: 0, transform: `translateX(-${SHIFT})` }, { opacity: 1, transform: "none" }], ms: 300, easing: EASE_OUT },
  fade: { frames: [{ opacity: 0, transform: "scale(.98)" }, { opacity: 1, transform: "none" }], ms: 220, easing: EASE_OUT },
  "drawer-in": { frames: [{ transform: "translateX(-100%)" }, { transform: "none" }], ms: 280, easing: EASE_OUT },
  // Spotify's Now Playing rises from the mini-player over the screen under it.
  rise: { frames: [{ transform: "translateY(100%)" }, { transform: "none" }], ms: 320, easing: EASE_OUT },
};

/** The outgoing copy's exit, and whether the copy plays above the live screen. */
const EXIT: Partial<Record<Motion, Play[] & { above?: boolean }>> = {
  push: [{ frames: [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(-${SHIFT})` }], ms: 200, easing: EASE_IN }],
  pop: Object.assign([{ frames: [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${SHIFT})` }], ms: 200, easing: EASE_IN }], { above: true }),
  fade: [{ frames: [{ opacity: 1 }, { opacity: 0 }], ms: 120, easing: EASE_IN }],
  "drawer-in": [{ frames: [{ opacity: 1 }, { opacity: .6 }], ms: 280, easing: EASE_OUT }],
  "drawer-out": Object.assign([{ frames: [{ transform: "none" }, { transform: "translateX(-100%)" }], ms: 240, easing: EASE_IN }], { above: true }),
  // The screen under a rising Now Playing stays still behind it; a closing one falls away above the live screen.
  rise: [{ frames: [{ opacity: 1 }, { opacity: 1 }], ms: 320, easing: "linear" }],
  fall: Object.assign([{ frames: [{ transform: "none" }, { transform: "translateY(100%)" }], ms: 240, easing: EASE_IN }], { above: true }),
  "sheet-close": Object.assign([
    { frames: [{ transform: "translateY(100%)" }], ms: 220, easing: EASE_IN, target: ".sheet" },
    { frames: [{ opacity: 1 }, { opacity: 0 }], ms: 220, easing: "linear", target: ".sheet-backdrop" },
  ], { above: true }),
  "sheet-swap": [
    { frames: [{ opacity: 1 }, { opacity: 0, transform: "translateY(24px)" }], ms: 160, easing: EASE_IN, target: ".sheet" },
    { frames: [{ opacity: 1 }, { opacity: 1 }], ms: 260, easing: "linear", target: ".sheet-backdrop" },
  ],
};

const SCROLLERS = ".screen, .sheet-body, .sheet";
/** The screen key and the page can change in quick turns; changes closer than this are one change. */
const SETTLE_MS = 90;

interface Copy { node: HTMLElement; tops: number[] }

function copyOf(element: HTMLElement): Copy {
  const tops = [...element.querySelectorAll<HTMLElement>(SCROLLERS)].map(node => node.scrollTop);
  const node = element.cloneNode(true) as HTMLElement;
  node.setAttribute("aria-hidden", "true");
  node.inert = true;
  node.classList.add("ghost");
  return { node, tops };
}

function playExit(layer: HTMLElement | null, copy: Copy, motion: Motion, zIndex: number) {
  const plays = EXIT[motion];
  if (!layer || !plays) return;
  copy.node.style.zIndex = String(zIndex + (plays.above ? 1 : -1));
  layer.appendChild(copy.node);
  copy.node.querySelectorAll<HTMLElement>(SCROLLERS).forEach((node, index) => { node.scrollTop = copy.tops[index] ?? 0; });
  const animations = plays.map(play => {
    const target = play.target ? copy.node.querySelector<HTMLElement>(play.target) : copy.node;
    return target?.animate(play.frames, { duration: play.ms, easing: play.easing, fill: "forwards" });
  });
  const remove = () => copy.node.remove();
  Promise.all(animations.map(animation => animation?.finished)).then(remove, remove);
  window.setTimeout(remove, Math.max(...plays.map(play => play.ms)) + 200); // never leave a copy behind
}

/** One animated screen slot. A null `id` renders nothing, so a sheet slot can close with motion. */
export function Stage({ id, motion, layer, zIndex, inert, children }: {
  id: string | null; motion: Motion; layer: RefObject<HTMLDivElement | null>; zIndex: number; inert?: boolean; children?: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const shown = useRef<{ id: string | null; at: number }>({ id, at: 0 });
  const change = useRef<{ copy: Copy | null; motion: Motion } | null>(null);

  // During render the outgoing screen is still in the DOM: the last chance to copy it.
  if (shown.current.id !== id) {
    const now = performance.now();
    const settling = now - shown.current.at < SETTLE_MS;
    const still = reducedMotion() || motion === "none" || settling;
    change.current = still ? null : { copy: host.current ? copyOf(host.current) : null, motion };
    shown.current = { id, at: settling ? shown.current.at : now };
  }

  useLayoutEffect(() => {
    const next = change.current;
    change.current = null;
    if (!next) return;
    if (next.copy) playExit(layer.current, next.copy, next.motion, zIndex);
    const enter = ENTER[next.motion];
    if (enter && host.current) host.current.animate(enter.frames, { duration: enter.ms, easing: enter.easing });
  }, [id, layer, zIndex]);

  if (id === null) return null;
  return <div ref={host} className="stage" style={{ zIndex }} inert={inert}>{children}</div>;
}

export function GhostLayer({ layer }: { layer: RefObject<HTMLDivElement | null> }) {
  return <div className="ghosts" ref={layer} aria-hidden="true" />;
}

/** Where a screen sits: its identity, history index, overlay depth, whether it is a tab root or the drawer, and whether it rises over the app (Now Playing). */
export interface Place { id: string; index: number; depth: number; tab: boolean; drawer: boolean; full?: boolean }

/** Forward pushes, Back pops, tab switches fade through, the drawer slides from the start edge, Now Playing rises and falls. */
export function motionBetween(from: Place | null, to: Place): Motion {
  if (!from || from.id === to.id) return "none";
  if (to.drawer && !from.drawer) return "drawer-in";
  if (from.drawer && !to.drawer) return "drawer-out";
  if (to.full && !from.full) return "rise";
  if (from.full && !to.full) return "fall";
  if (from.tab && to.tab) return "fade";
  if (to.index !== from.index) return to.index > from.index ? "push" : "pop";
  if (to.depth !== from.depth) return to.depth > from.depth ? "push" : "pop";
  return "fade";
}

export function usePlaceMotion(place: Place): Motion {
  const last = useRef<{ place: Place | null; motion: Motion }>({ place: null, motion: "none" });
  if (last.current.place?.id !== place.id) last.current = { place, motion: motionBetween(last.current.place, place) };
  return last.current.motion;
}
