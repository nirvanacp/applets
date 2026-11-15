import { useWatch, type RouteStatus, type WatchValue } from "@genesis/sdk/react";
import { ROUTES, whenScreen } from "./routes";

const SCREEN_OF = new Map(ROUTES.map(route => [route.id, route.screen ?? route.id]));

/** True when the page the status describes renders `screen`, so its data belongs to that screen. */
export const onScreen = (status: RouteStatus, screen: string) =>
  status.routeId !== null && SCREEN_OF.get(status.routeId) === screen;

/**
 * True once a watch has read the current page: ready, not a kept copy and not idle. A screen
 * shows its confirmed empty state only then, since the route can be ready before its watch reads.
 */
export const delivered = (watch: WatchValue) => watch.status === "ready" && !watch.stale && !watch.idle;

/** A page module reader watched for one screen, on that screen's pages only. */
export function useScreenWatch<V = unknown, R = unknown>(screen: string, reader: string) {
  return useWatch<V, R>(`${screen}:${reader}`, { reader }, { when: whenScreen(screen) });
}

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
