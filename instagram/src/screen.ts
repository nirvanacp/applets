import { useEffect } from "react";
import { useGenesis, useRouter, useWatch, watchStatus, type RouteStatus, type WatchValue } from "@let/sdk/react";
import { ROUTES, whenScreen } from "./routes";

const SCREEN_OF = new Map(ROUTES.map(route => [route.id, route.screen ?? route.id]));

/** True when the status's route renders `screen`, so the page's data belongs to that screen. */
export const onScreen = (status: RouteStatus, screen: string) =>
  status.routeId !== null && SCREEN_OF.get(status.routeId) === screen;

/** Instagram shows its controls only to an account. */
export const signedIn = (status: RouteStatus) => status.signedIn === true;

/** The route status of a context, the active one by default. */
export function usePageStatus(context?: string): RouteStatus {
  return useRouter().status(context);
}

/**
 * True once a watch has read the current page (`watchStatus` is `fresh` or `empty`): not loading,
 * not a kept copy of an earlier one and not idle. A screen shows an empty state only then, since
 * the route can be ready before the screen's own watch has delivered.
 */
export function delivered(watch: WatchValue): boolean {
  if (watch.idle) return false;
  const status = watchStatus(watch);
  return status === "fresh" || status === "empty";
}

/** True when a watch's read failed and it has nothing to show (`watchStatus` is `failed`). */
export const failedRead = (watch: WatchValue) => watchStatus(watch) === "failed";

/**
 * Watches a page module reader for one screen. The watch reads only on the screen's own pages,
 * and its id names the screen, so two screens can watch the same reader. `persist` keeps the last
 * value on the phone for the next start; never set it on a watch that reads direct messages.
 */
export function useScreenWatch<V = unknown, R = unknown>(screen: string, reader: string, options: { persist?: boolean } = {}) {
  return useWatch<V, R>(`${screen}:${reader}`, { reader }, { when: whenScreen(screen), ...options });
}

const SIGNED_OUT_KEY = "instagram.signedOut";

/**
 * Forgets the pages Genesis keeps for this applet when Instagram shows no account, so the next
 * start never shows an earlier account's feed. Only "signed out" or "signed in" is remembered, so
 * a start that is already signed out does not forget again.
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
