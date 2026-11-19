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

const SCROLLERS = ".screen, .sheet-body, .sheet, .shelf-row, .chips";
/** The screen key and the page can change in quick turns; changes closer than this are one change. */
const SETTLE_MS = 90;

interface Copy { node: HTMLElement }

/**
 * A copy of the outgoing screen for its exit. Parts of a scroller that lie outside its view are
 * copied as empty boxes of the same size, so a long screen such as Home costs little to copy and
 * lay out and the next screen's first frame is not held up by it. The copy shows each scroller's
 * position by shifting its parts, not by scrolling it: setting scrollTop on a node just added would
 * force a layout before the next screen can draw.
 */
function copyOf(element: HTMLElement): Copy {
  const scrollers = [...element.querySelectorAll<HTMLElement>(SCROLLERS)];
  const shifts = scrollers.map(node => ({ x: node.scrollLeft, y: node.scrollTop }));
  // Measured on the live screen, whose layout is current, so this forces no new layout.
  const outside = scrollers.map(scroller => {
    const view = scroller.getBoundingClientRect();
    return [...scroller.children].map(child => {
      const box = child.getBoundingClientRect();
      const out = box.bottom < view.top || box.top > view.bottom || box.right < view.left || box.left > view.right;
      return out ? { width: box.width, height: box.height } : null;
    });
  });
  const node = element.cloneNode(false) as HTMLElement;
  node.append(...[...element.childNodes].map(child => copyNode(child, { scrollers, shifts, outside })));
  node.setAttribute("aria-hidden", "true");
  node.inert = true;
  node.classList.add("ghost");
  return { node };
}

interface Scrolls { scrollers: HTMLElement[]; shifts: { x: number; y: number }[]; outside: ({ width: number; height: number } | null)[][] }

/** Copies a node whole, except inside the scrollers, where parts out of view become empty boxes and every part is shifted by the scroll. */
function copyNode(source: Node, scrolls: Scrolls): Node {
  if (!(source instanceof HTMLElement) || !scrolls.scrollers.some(scroller => source.contains(scroller))) return source.cloneNode(true);
  const copy = source.cloneNode(false) as HTMLElement;
  const index = scrolls.scrollers.indexOf(source);
  const elements = [...source.children];
  [...source.childNodes].forEach(child => {
    const place = index < 0 || !(child instanceof HTMLElement) ? -1 : elements.indexOf(child);
    if (place < 0) { copy.append(copyNode(child, scrolls)); return; }
    const size = scrolls.outside[index]![place] ?? null;
    const part = size === null ? copyNode(child, scrolls) as HTMLElement : child.cloneNode(false) as HTMLElement;
    if (size !== null) Object.assign(part.style, { boxSizing: "border-box", flexShrink: "0", width: `${size.width}px`, height: `${size.height}px` });
    const shift = scrolls.shifts[index]!;
    if (shift.x || shift.y) part.style.translate = `${-shift.x}px ${-shift.y}px`;
    copy.append(part);
  });
  return copy;
}

/**
 * A covered page draws no frames, so an animation would never end and would keep the page's
 * engine busy. It ends at once instead, when it starts hidden or the page is hidden mid-way.
 */
const playing = new Set<Animation>();
function play(target: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions): Animation {
  const animation = target.animate(frames, options);
  if (document.hidden) { animation.finish(); return animation; }
  playing.add(animation);
  const done = () => { playing.delete(animation); };
  animation.finished.then(done, done);
  return animation;
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) for (const animation of [...playing]) animation.finish();
});

function playExit(layer: HTMLElement | null, copy: Copy, motion: Motion, zIndex: number) {
  const plays = EXIT[motion];
  if (!layer || !plays) return;
  copy.node.style.zIndex = String(zIndex + (plays.above ? 1 : -1));
  layer.appendChild(copy.node);
  const animations = plays.map(exit => {
    const target = exit.target ? copy.node.querySelector<HTMLElement>(exit.target) : copy.node;
    return target ? play(target, exit.frames, { duration: exit.ms, easing: exit.easing, fill: "forwards" }) : undefined;
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
    if (enter && host.current) play(host.current, enter.frames, { duration: enter.ms, easing: enter.easing });
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
