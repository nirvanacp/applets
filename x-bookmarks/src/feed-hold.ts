import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WatchValue } from "@let/sdk/react";

/** The most rows a held list keeps; the oldest rows at its end go first. */
const MAX_ROWS = 800;
/** Held lists kept in memory, so a tab switch or Back finds the list as it was. */
const MAX_LISTS = 16;
/** A list waits this long after the last scroll or touch before it changes under the reader. */
const IDLE_MS = 220;
/** Within this distance of the top, new rows show at once and nothing is held above. */
const TOP_PX = 8;
/** Frames the anchor is corrected for after a change, while rows above it are measured. */
const ANCHOR_FRAMES = 12;
const ANCHOR_KEY = "x-bookmarks.anchor";

/** The row being read: the first row at least half on screen, and its top below the scroller's top. */
export interface Anchor { key: string; offset: number }

interface Held<R> { order: string[]; records: Map<string, R>; anchor: Anchor | null; above: Set<string> }

const lists = new Map<string, Held<unknown>>();

function heldList<R>(id: string): Held<R> | undefined {
  const held = lists.get(id) as Held<R> | undefined;
  if (held) { lists.delete(id); lists.set(id, held as Held<unknown>); }
  return held;
}

function keepList<R>(id: string, held: Held<R>) {
  lists.delete(id);
  lists.set(id, held as Held<unknown>);
  while (lists.size > MAX_LISTS) lists.delete(lists.keys().next().value!);
}

/**
 * Merges the order X's page shows now into the order the reader has. Rows are never removed, and
 * the reader's order wins for rows both have. Rows before the first shared row join at the front;
 * rows between two shared rows follow the row they follow on X; rows after the last shared row
 * join at the end, because after a reload X ranks its feed again and would otherwise push its own
 * continuation between the rows being read. With no shared row, X's page started again (a reload,
 * a resume or a tab switch), so all of its rows are newer and join at the front.
 */
export function holdOrder(held: readonly string[], next: readonly string[]): { order: string[]; added: string[] } {
  if (held.length === 0) return { order: next.slice(0, MAX_ROWS), added: [] };
  const known = new Set(held);
  let lastShared = -1;
  next.forEach((key, index) => { if (known.has(key)) lastShared = index; });
  const front: string[] = [];
  const after = new Map<string, string[]>();
  const tail: string[] = [];
  let previous: string | null = null;
  next.forEach((key, index) => {
    if (known.has(key)) { previous = key; return; }
    known.add(key);
    if (previous === null) front.push(key);
    else if (index > lastShared) tail.push(key);
    else (after.get(previous) ?? after.set(previous, []).get(previous)!).push(key);
  });
  const order = [...front, ...held.flatMap(key => [key, ...(after.get(key) ?? [])]), ...tail].slice(0, MAX_ROWS);
  return { order, added: front };
}

/** The saved anchor of a list kept on the phone, so a restart opens at the same post. */
function savedAnchor(id: string): Anchor | null {
  try {
    const saved = JSON.parse(localStorage.getItem(ANCHOR_KEY) ?? "null") as { id: string; anchor: Anchor } | null;
    return saved?.id === id ? saved.anchor : null;
  } catch { return null; }
}

function saveAnchor(id: string, anchor: Anchor | null) {
  try {
    if (anchor) localStorage.setItem(ANCHOR_KEY, JSON.stringify({ id, anchor }));
    else localStorage.removeItem(ANCHOR_KEY);
  } catch { /* storage unavailable: the position lasts only while the applet runs */ }
}

/** How many rows the list `id` holds in memory, so a screen can draw it while X loads its page. */
export function heldRows(id: string): number {
  return lists.get(id)?.order.length ?? 0;
}

/** Forgets every held list and the saved anchor, as the sign-out rule forgets kept pages. */
export function forgetHeldLists() {
  lists.clear();
  saveAnchor("", null);
}

const SHOW_NEWEST = "x-bookmarks:show-newest";

/** Refresh asked for the newest posts: the shown list goes to its top, where they arrive. */
export function showNewest() {
  window.dispatchEvent(new Event(SHOW_NEWEST));
}

function scrollerOf(element: HTMLElement | null): HTMLElement | null {
  return element?.closest<HTMLElement>(".screen") ?? null;
}

function readAnchor(scroller: HTMLElement, host: HTMLElement): Anchor | null {
  const top = scroller.getBoundingClientRect().top;
  for (const row of host.querySelectorAll<HTMLElement>("[data-key]")) {
    const box = row.getBoundingClientRect();
    if (box.height === 0 || box.bottom - top < box.height / 2) continue;
    return { key: row.dataset.key!, offset: box.top - top };
  }
  return null;
}

function rowOf(host: HTMLElement, key: string): HTMLElement | null {
  for (const row of host.querySelectorAll<HTMLElement>("[data-key]")) if (row.dataset.key === key) return row;
  return null;
}

export interface HeldFeed<R> {
  /** Ref for an element around the list's rows. */
  host: React.RefObject<HTMLDivElement | null>;
  order: readonly string[];
  records: ReadonlyMap<string, R>;
  /** New rows waiting above the screen that the reader has not reached. */
  newer: number;
  /** Scrolls to the top, where the newer rows are. */
  toTop(): void;
}

/**
 * A list that holds the reader's place. X's page reloads, recycles and starts again, and each
 * change reaches the watch; the list instead merges every change with `holdOrder`, keeps the
 * records of rows X dropped, and keeps the row being read at the same height on screen. Changes
 * wait while a finger is down or the list moves. At the top, new rows show at once; below it, they
 * join above the screen and `newer` counts them. `persist` keeps the anchor on the phone.
 */
export function useHeldFeed<R>(id: string | undefined, watch: WatchValue<unknown, R | null>, persist = false): HeldFeed<R> {
  const host = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<Held<R>>(() => {
    const kept = id ? heldList<R>(id) : undefined;
    const fresh: Held<R> = kept ?? { order: [], records: new Map(), anchor: id && persist ? savedAnchor(id) : null, above: new Set() };
    const first = merged(fresh, watch);
    if (id) keepList(id, first);
    return first;
  });
  const restoring = useRef<{ anchor: Anchor; frames: number } | null>(held.anchor ? { anchor: held.anchor, frames: ANCHOR_FRAMES * 4 } : null);
  const busyUntil = useRef(0);
  const touching = useRef(false);
  const latest = useRef(watch);
  latest.current = watch;
  const state = useRef(held);
  state.current = held;

  const keep = useCallback((next: Held<R>) => {
    if (id) keepList(id, next);
    setHeld(next);
  }, [id]);

  // Follows the scroller: the anchor, the newer rows the reader reached, and when it last moved.
  useEffect(() => {
    const scroller = scrollerOf(host.current);
    if (!scroller) return;
    let frame = 0;
    let saveTimer = 0;
    const note = () => {
      frame = 0;
      const box = host.current;
      if (!box || restoring.current) return;
      const anchor = readAnchor(scroller, box);
      const current = state.current;
      current.anchor = anchor;
      if (current.above.size > 0) {
        // A newer row is seen once the reader reaches it, or the top.
        const index = anchor && scroller.scrollTop > TOP_PX ? current.order.indexOf(anchor.key) : 0;
        const above = new Set([...current.above].filter(key => current.order.indexOf(key) < index));
        if (above.size !== current.above.size) keep({ ...current, above });
      }
      if (id && persist) {
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => saveAnchor(id, state.current.anchor), 500);
      }
    };
    const onScroll = () => {
      busyUntil.current = performance.now() + IDLE_MS;
      if (!frame) frame = requestAnimationFrame(note);
    };
    const down = () => { touching.current = true; restoring.current = null; };
    const up = () => { touching.current = false; busyUntil.current = performance.now() + IDLE_MS; };
    const newest = () => { restoring.current = null; scroller.scrollTo({ top: 0, behavior: "smooth" }); };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("touchstart", down, { passive: true });
    scroller.addEventListener("touchend", up, { passive: true });
    scroller.addEventListener("touchcancel", up, { passive: true });
    window.addEventListener(SHOW_NEWEST, newest);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(saveTimer);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("touchstart", down);
      scroller.removeEventListener("touchend", up);
      scroller.removeEventListener("touchcancel", up);
      window.removeEventListener(SHOW_NEWEST, newest);
    };
  }, [id, persist, keep]);

  // Takes X's latest order when the reader is still, with the anchor read just before.
  useEffect(() => {
    let timer = 0;
    const apply = () => {
      const wait = touching.current ? IDLE_MS : busyUntil.current - performance.now();
      if (wait > 0) { timer = window.setTimeout(apply, wait); return; }
      const current = state.current;
      const next = merged(current, latest.current);
      if (next === current) return;
      const scroller = scrollerOf(host.current);
      const atTop = !scroller || scroller.scrollTop <= TOP_PX;
      const anchor = scroller && host.current && !atTop ? readAnchor(scroller, host.current) : null;
      if (anchor) restoring.current = { anchor, frames: ANCHOR_FRAMES };
      keep(atTop ? { ...next, above: new Set() } : next);
    };
    apply();
    return () => window.clearTimeout(timer);
  }, [watch.order, watch.records, keep]);

  // Puts the anchor back where it was: at once, then for a few frames while the rows above it are
  // measured. The first guess counts unmeasured rows above at the list's estimate.
  useLayoutEffect(() => {
    const scroller = scrollerOf(host.current);
    if (!scroller || !restoring.current) return;
    let frame = 0;
    const settle = () => {
      const goal = restoring.current;
      const box = host.current;
      if (!goal || !box || touching.current) { restoring.current = null; return; }
      const row = rowOf(box, goal.anchor.key);
      if (row) {
        const delta = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - goal.anchor.offset;
        if (Math.abs(delta) >= 1) scroller.scrollTop += delta;
      } else if (state.current.order.includes(goal.anchor.key)) {
        const first = box.querySelector<HTMLElement>("[data-key]");
        const index = state.current.order.indexOf(goal.anchor.key);
        const shown = first ? state.current.order.indexOf(first.dataset.key!) : 0;
        scroller.scrollTop += (index - shown) * (first?.offsetHeight || 240);
      } else {
        // Before the first rows arrive, the anchor waits for them; a list without its row lets it go.
        if (state.current.order.length > 0) restoring.current = null;
        return;
      }
      if (--goal.frames <= 0) restoring.current = null;
      else frame = requestAnimationFrame(settle);
    };
    // A mount restore wins over the router's scroll memory, which counts pixels the rows may not have.
    scroller.dispatchEvent(new WheelEvent("wheel"));
    settle();
    return () => cancelAnimationFrame(frame);
  }, [held]);

  const toTop = useCallback(() => {
    restoring.current = null;
    scrollerOf(host.current)?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { host, order: held.order, records: held.records, newer: held.above.size, toTop };
}

/** `held` with the watch's order and records merged in, or `held` itself when nothing changed. */
function merged<R>(held: Held<R>, watch: WatchValue<unknown, R | null>): Held<R> {
  const { order, added } = holdOrder(held.order, watch.order);
  let records = held.records;
  for (const key of watch.order) {
    const record = watch.records[key];
    if (record == null || records.get(key) === record) continue;
    if (records === held.records) records = new Map(records);
    records.set(key, record);
  }
  const sameOrder = order.length === held.order.length && order.every((key, index) => key === held.order[index]);
  if (sameOrder && records === held.records) return held;
  if (records.size > MAX_ROWS * 1.5) {
    const keep = new Set(order);
    records = new Map([...records].filter(([key]) => keep.has(key)));
  }
  const above = added.length > 0 && held.order.length > 0 ? new Set([...held.above, ...added]) : held.above;
  return { ...held, order: sameOrder ? held.order : order, records, above };
}
