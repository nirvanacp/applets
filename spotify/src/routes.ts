import type { UrlGuard } from "@genesis/sdk/page";
import type { RouterRoute } from "@genesis/sdk/react";

/**
 * The router's route table, in match order: the first route whose pattern matches a URL renders
 * its screen. A URL without a route shows the website itself in the same session.
 */
export const ROUTES: RouterRoute[] = [
  { id: "home", pattern: "/", screen: "home", context: "primary", ready: { reader: "ready.home" } },
  { id: "album", pattern: "/album/:id", screen: "entity", context: "primary", ready: { reader: "ready.entity" } },
  { id: "playlist", pattern: "/playlist/:id", screen: "entity", context: "primary", ready: { reader: "ready.entity" } },
  { id: "artist", pattern: "/artist/:id", screen: "entity", context: "primary", ready: { reader: "ready.entity" } },
  { id: "search", pattern: "/search", screen: "search", context: "primary", ready: { reader: "ready.search" } },
  { id: "searchRecent", pattern: "/search/recent", screen: "search", context: "primary", ready: { reader: "ready.search" } },
  { id: "searchResults", pattern: "/search/results/:query", screen: "search", context: "primary", ready: { reader: "ready.search" } },
  { id: "searchFilter", pattern: "/search/:filter/:query", screen: "search", context: "primary", ready: { reader: "ready.search" } },
  { id: "genre", pattern: "/genre/:id", screen: "hub", context: "primary", ready: { reader: "ready.hub" } },
];

/** Screens with no website page: the full player and the library. */
export const OVERLAY_SCREENS = ["player", "library"];

const guards = new Map<string, UrlGuard[]>();

/**
 * The URLs a screen's routes match, as watch guards: a screen's watches read only on its own
 * pages. One array per screen, so a watch keeps the same options across renders.
 */
export function whenScreen(screen: string): UrlGuard[] {
  let found = guards.get(screen);
  if (!found) {
    found = ROUTES.filter(route => (route.screen ?? route.id) === screen)
      .map(route => (route.query ? { pattern: route.pattern, query: route.query } : { pattern: route.pattern }));
    guards.set(screen, found);
  }
  return found;
}
