import { useEffect, useState } from "react";
import { useGenesis, useWatch, watchStatus, type RouteStatus, type WatchValue } from "@let/sdk/react";
import { ROUTES, whenScreen } from "./routes";

const SCREEN_OF = new Map(ROUTES.map(route => [route.id, route.screen ?? route.id]));

/** True when the page the status describes renders `screen`, so its data belongs to that screen. */
export const onScreen = (status: RouteStatus, screen: string) =>
  status.routeId !== null && SCREEN_OF.get(status.routeId) === screen;

/**
 * True once a watch has read the current page: ready, not a kept copy and not idle. A screen
 * shows its confirmed empty state only then, since the route can be ready before its watch reads.
 */
export const delivered = (watch: WatchValue) => {
  if (watch.idle) return false;
  const status = watchStatus(watch);
  return status === "fresh" || status === "empty";
};

/**
 * A page module reader watched for one screen, on that screen's pages only. With `persist`,
 * Genesis keeps its last value on the phone to show on the next start.
 */
export function useScreenWatch<V = unknown, R = unknown>(screen: string, reader: string, options: { persist?: boolean } = {}) {
  return useWatch<V, R>(`${screen}:${reader}`, { reader }, { when: whenScreen(screen), ...options });
}

/** What a routed screen draws, in the native-feel order of precedence. */
export type View = "auth" | "error" | "empty" | "loading" | "content";

/**
 * Picks the state to draw. `has` is whether there is content to show, fresh or kept from an
 * earlier visit (`watchStatus` `stale`); `confirmedEmpty` whether the page said there is nothing.
 * Content always wins over loading, so a refresh or a start with kept data never shows a skeleton.
 */
export function viewOf(page: RouteStatus, has: boolean, confirmedEmpty: boolean, failed = false): View {
  if (page.status === "auth") return "auth";
  if (has) return "content";
  if (page.status === "error" || failed) return "error";
  if (page.status === "ready" && !page.stale && confirmedEmpty) return "empty";
  return "loading";
}

/** True while the page reloads or shows a kept copy: the progress bar shows and page actions wait. */
export const refreshing = (page: RouteStatus) => page.status === "loading" || page.stale;

const SETTLE_MS = 5000;

/**
 * True once `key` has stayed the same, and not null, for SETTLE_MS. A list the page can fill after
 * it reads as ready shows its empty state only then, unless the page itself says it is empty.
 */
export function useSettled(key: string | null) {
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    if (key === null) return;
    const timer = setTimeout(() => setSettled(key), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [key]);
  return key !== null && settled === key;
}

const SIGNED_OUT_KEY = "x-bookmarks.signedOut";

/**
 * Forgets the pages Genesis kept, in memory and on the phone, when X shows no account and the
 * applet last saw one (or never saw either), so a signed-out start never shows the last account's
 * timeline. Only the sign-in state is remembered here, never website data.
 */
export function useForgetOnSignOut(signedIn: boolean | undefined) {
  const genesis = useGenesis();
  useEffect(() => {
    if (signedIn === undefined) return;
    const now = signedIn ? "no" : "yes";
    let last: string | null = null;
    try { last = localStorage.getItem(SIGNED_OUT_KEY); } catch { /* storage unavailable */ }
    if (last === now) return;
    try { localStorage.setItem(SIGNED_OUT_KEY, now); } catch { /* storage unavailable */ }
    if (!signedIn) genesis.forgetCached().catch(error => console.error("Genesis could not forget kept pages", error));
  }, [genesis, signedIn]);
}
