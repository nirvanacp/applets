import { useRouter, useWatch, type RouteStatus, type WatchValue } from "@genesis/sdk/react";
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
export function useScreenWatch<V = unknown, R = unknown>(screen: string, reader: string) {
  return useWatch<V, R>(`${screen}:${reader}`, { reader }, { when: whenScreen(screen) });
}

/**
 * True once a watch has read the current page: not loading, not a kept copy of an earlier one and
 * not idle. A screen shows "not found" or an empty state only then, since the route can be ready
 * before the screen's own watch has delivered.
 */
export const delivered = (watch: WatchValue) => watch.status === "ready" && !watch.stale && !watch.idle;

/** What a routed screen draws, in the native-feel order of precedence. */
export type View = "error" | "empty" | "loading" | "content";

/**
 * Picks the state to draw. `has` is whether there is content to show; `confirmedEmpty` whether
 * the page said there is nothing (its watches delivered on a ready page). Content always wins over
 * loading, so a refresh never drops it. Signed out, the router shows HN's sign-in page instead.
 */
export function viewOf(page: RouteStatus, has: boolean, confirmedEmpty: boolean, failed = false): View {
  if (has) return "content";
  if (page.status === "error" || failed) return "error";
  if (page.status === "ready" && !page.stale && confirmedEmpty) return "empty";
  return "loading";
}

/** True while the page reloads or shows a kept copy: the progress bar shows and page actions wait. */
export const refreshing = (page: RouteStatus) => page.status === "loading" || page.stale;
