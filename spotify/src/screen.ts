import { useEffect } from "react";
import { useGenesis, useRouter, useWatch, watchStatus, type RouteStatus, type WatchValue } from "@nirvanacp/sdk/react";
import { ROUTES, whenScreen } from "./routes";

const SCREEN_OF = new Map(ROUTES.map(route => [route.id, route.screen ?? route.id]));

/** True when the status's route renders `screen`, so the page's data belongs to that screen. */
export const onScreen = (status: RouteStatus, screen: string) =>
  status.routeId !== null && SCREEN_OF.get(status.routeId) === screen;

/** The route status of a context, the active one by default. */
export function usePageStatus(context?: string): RouteStatus {
  return useRouter().status(context);
}

/**
 * Watches a page module reader for one screen. The watch reads only on the screen's own pages,
 * and its id names the screen, so two screens can watch the same reader. `persist` keeps the last
 * value on the phone for the next start; every watch of one id must agree on it.
 */
export function useScreenWatch<V = unknown, R = unknown>(screen: string, reader: string, options: { persist?: boolean } = {}) {
  return useWatch<V, R>(`${screen}:${reader}`, { reader }, { when: whenScreen(screen), context: "primary", ...options });
}

/**
 * True once a watch has read the current page (`watchStatus` is `fresh` or `empty`): not loading,
 * not a kept copy and not idle.
 */
export function delivered(watch: WatchValue): boolean {
  if (watch.idle) return false;
  const status = watchStatus(watch);
  return status === "fresh" || status === "empty";
}

/** True when a watch's read failed and it has nothing to show (`watchStatus` is `failed`). */
export const failedRead = (watch: WatchValue) => watchStatus(watch) === "failed";

/** What a routed screen draws, in the native-feel order of precedence. */
export type View = "auth" | "error" | "empty" | "loading" | "content";

/**
 * Picks the state to draw. `has` is whether there is content to show; `confirmedEmpty` whether the
 * page said there is nothing. Content always wins over loading, so a refresh never drops it.
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

const SIGNED_OUT_KEY = "spotify.signedOut";

/**
 * Forgets the pages Genesis keeps for this applet when the web player shows no account, so the
 * next start never shows an earlier account's Home. Only "signed out" or "signed in" is
 * remembered, so a start that is already signed out does not forget again.
 */
export function useForgetOnSignOut(signedIn: boolean | undefined) {
  const genesis = useGenesis();
  useEffect(() => {
    if (signedIn === undefined) return;
    let last: string | null = null;
    try { last = localStorage.getItem(SIGNED_OUT_KEY); } catch { /* storage unavailable */ }
    const now = signedIn ? "no" : "yes";
    if (last === now) return;
    try { localStorage.setItem(SIGNED_OUT_KEY, now); } catch { /* storage unavailable */ }
    if (!signedIn) genesis.forgetCached().catch(console.error);
  }, [genesis, signedIn]);
}
