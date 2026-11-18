import { useEffect } from "react";
import { useGenesis, useRouter, useWatch, watchStatus, type DataStatus, type RouteStatus, type WatchValue } from "@let/sdk/react";
import { ROUTES, whenScreen } from "./routes";

const SCREEN_OF = new Map(ROUTES.map(route => [route.id, route.screen ?? route.id]));

/** True when the status's route renders `screen`, so the page's data belongs to that screen. */
export const onScreen = (status: RouteStatus, screen: string) =>
  status.routeId !== null && SCREEN_OF.get(status.routeId) === screen;

/** HN shows vote arrows and comment links only to an account; unknown counts as signed in, as HN decides. */
export const signedIn = (status: RouteStatus) => status.signedIn !== false;

/** The route status of a context, the active one by default. */
export function usePageStatus(context?: string): RouteStatus {
  return useRouter().status(context);
}

/**
 * Watches a page module reader for one screen. The watch reads only on the screen's own pages,
 * and its id names the screen, so two screens can watch the same reader.
 */
export function useScreenWatch<V = unknown, R = unknown>(screen: string, reader: string, options: { persist?: boolean } = {}) {
  return useWatch<V, R>(`${screen}:${reader}`, { reader }, { when: whenScreen(screen), ...options });
}

/**
 * True once a watch has read the current page: not loading, not a kept copy of an earlier one and
 * not idle. A screen shows "not found" or an empty state only then, since the route can be ready
 * before the screen's own watch has delivered.
 */
export const delivered = (watch: WatchValue) => {
  const status = dataOf(true, watch);
  return status === "fresh" || status === "empty";
};

/**
 * The data state (`watchStatus`) of a screen's watch: `loading` while the page belongs to another
 * screen, and while the watch is idle with nothing, so "empty" always means the page was read.
 */
export function dataOf(here: boolean, watch: WatchValue): DataStatus {
  if (!here) return "loading";
  const status = watchStatus(watch);
  return status === "empty" && watch.idle ? "loading" : status;
}

/** What a routed screen draws, in the native-feel order of precedence. */
export type View = "error" | "empty" | "loading" | "content";

/**
 * Picks the state to draw from the data states of the screen's watches (`watchStatus`), or
 * `loading` for a watch whose data belongs to another screen. Content, fresh or kept from an
 * earlier visit (`stale`), always wins, so a refresh or a cold start with kept data never shows a
 * skeleton. Empty only once every watch read this page and the page is ready. Signed out, the
 * router shows HN's sign-in page instead.
 */
export function viewOf(page: RouteStatus, data: readonly DataStatus[]): View {
  if (data.some(status => status === "fresh" || status === "stale")) return "content";
  if (page.status === "error" || data.includes("failed")) return "error";
  if (page.status === "ready" && !page.stale && data.every(status => status === "empty")) return "empty";
  return "loading";
}

/** True while the page reloads or shows a kept copy: the progress bar shows and page actions wait. */
export const refreshing = (page: RouteStatus) => page.status === "loading" || page.stale;

const SIGNED_OUT_KEY = "hn-bookmarks.signedOut";

/**
 * Forgets the pages Genesis kept, in memory and on the phone, when HN shows no account and the
 * applet last saw one (or never saw either), so a signed-out start never shows the last account's
 * feed or votes. Only the sign-in state is remembered here, never website data.
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
