import { useRouter, useWatch, type RouteStatus, type WatchValue } from "@genesis/sdk/react";
import { ROUTES, whenScreen } from "./routes";

const SCREEN_OF = new Map(ROUTES.map(route => [route.id, route.screen ?? route.id]));

/** True when the status's route renders `screen`, so the page's data belongs to that screen. */
export const onScreen = (status: RouteStatus, screen: string) =>
  status.routeId !== null && SCREEN_OF.get(status.routeId) === screen;

/** X shows its post controls only to an account. */
export const signedIn = (status: RouteStatus) => status.signedIn === true;

/** The route status of a context, the active one by default. */
export function usePageStatus(context?: string): RouteStatus {
  return useRouter().status(context);
}

/**
 * Watches a page module reader for one screen. The watch reads only on the screen's own pages,
 * and its id names the screen, so two screens can watch the same reader.
 */
/**
 * True once a watch has read the current page: not loading, not a kept copy of an earlier one and
 * not idle. A screen shows an empty state only then, since the route can be ready before the
 * screen's own watch has delivered.
 */
export const delivered = (watch: WatchValue) => watch.status === "ready" && !watch.stale && !watch.idle;

export function useScreenWatch<V = unknown, R = unknown>(screen: string, reader: string) {
  return useWatch<V, R>(`${screen}:${reader}`, { reader }, { when: whenScreen(screen) });
}
