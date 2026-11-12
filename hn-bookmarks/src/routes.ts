import type { UrlGuard } from "@genesis/sdk/page";
import type { RouterRoute } from "@genesis/sdk/react";

const HN = { reader: "ready.hn" };
const FEED = { screen: "feed", ready: HN };
const INFO = { screen: "info", ready: { reader: "ready.info" } };

/**
 * The router's route table, in match order: the first route whose pattern and query keys match a
 * URL renders its screen. A URL without a route shows the website in the same session.
 */
export const ROUTES: RouterRoute[] = [
  { id: "account", pattern: "/news", query: ["account"], screen: "me", context: "me", ready: HN, requiresAccount: true },
  { id: "search", pattern: "/", query: ["query"], screen: "results", context: "primary", ready: { reader: "ready.search" } },
  { id: "home", pattern: "/", context: "primary", ...FEED },
  { id: "news", pattern: "/news", context: "primary", ...FEED },
  ...["newest", "front", "newcomments", "ask", "show", "shownew", "asknew", "jobs", "best", "active", "from"]
    .map(id => ({ id, pattern: `/${id}`, ...FEED })),
  ...["submitted", "threads", "favorites"].map(id => ({ id, pattern: `/${id}`, query: ["id"], ...FEED })),
  // HN shows a signed-out person its login form for these lists.
  ...["hidden", "upvoted"].map(id => ({ id, pattern: `/${id}`, query: ["id"], ...FEED, requiresAccount: true })),
  { id: "item", pattern: "/item", query: ["id"], screen: "item", ready: HN },
  { id: "user", pattern: "/user", query: ["id"], screen: "user", ready: HN },
  { id: "formatdoc", pattern: "/formatdoc", ...INFO },
  { id: "faq", pattern: "/newsfaq.html", ...INFO },
  { id: "guidelines", pattern: "/newsguidelines.html", ...INFO },
  { id: "lists", pattern: "/lists", ...INFO },
  { id: "leaders", pattern: "/leaders", ...INFO },
  { id: "submit", pattern: "/submit", screen: "post", context: "post", ready: { reader: "ready.submit" }, requiresAccount: true },
  { id: "submit-result", pattern: "/r", screen: "post", ready: { reader: "ready.submit" }, requiresAccount: true },
];

/** Screens with no website page. */
export const OVERLAY_SCREENS = ["search", "saved", "categories", "save"];

/** HN's login page for a URL that needs the account; it returns to the URL afterwards. */
export function signInUrl(url: string) {
  const { pathname, search } = new URL(url);
  return `/login?goto=${encodeURIComponent(pathname.slice(1) + search)}`;
}

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
