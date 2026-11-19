import type { UrlGuard } from "@nirvanacp/sdk/page";
import type { RouterRoute } from "@nirvanacp/sdk/react";

/** Timelines that only an account has: Home, Notifications, Bookmarks and Likes. */
const TIMELINE = { ready: { reader: "ready.timeline" }, requiresAccount: true };
const SEARCH = { screen: "explore", context: "explore", ready: { reader: "ready.explore" } };
const PROFILE = { screen: "profile", ready: { reader: "ready.profile" } };

/**
 * One-segment paths that `/:handle` would match but that are X's own pages, not profiles. They
 * show the website on purpose (see the current spec's coverage list).
 */
const X_PAGES = [
  "messages", "settings", "i", "login", "logout", "signup", "tos", "privacy", "about", "download", "compose", "search",
  "jobs", "communities", "premium", "lists", "bookmarks", "account",
];

/**
 * The route table in match order. Every landing URL of the core journeys has a route here,
 * including x.com's root, which X serves to signed-out people as a landing page. `/:handle`
 * matches any one-segment path, so it stays last.
 */
export const ROUTES: RouterRoute[] = [
  { id: "home", pattern: "/home", screen: "home", context: "primary", ...TIMELINE },
  { id: "root", pattern: "/", screen: "home", context: "primary", ...TIMELINE },
  { id: "notifications", pattern: "/notifications", screen: "notifications", context: "primary", ...TIMELINE },
  { id: "bookmarks", pattern: "/i/history", screen: "saved", context: "primary", ...TIMELINE },
  { id: "own-likes", pattern: "/i/history/likes", screen: "saved", context: "primary", ...TIMELINE },
  { id: "bookmarks-alias", pattern: "/i/bookmarks", screen: "saved", context: "primary", ...TIMELINE },
  { id: "explore", pattern: "/explore/*", ...SEARCH },
  { id: "search", pattern: "/search", query: ["q"], ...SEARCH },
  { id: "hashtag", pattern: "/hashtag/:tag", ...SEARCH },
  // A reply keeps X's own composer, which shows the post it answers; a new post uses the applet's.
  { id: "website-reply", pattern: "/compose/post", query: ["in_reply_to"], website: true },
  { id: "compose", pattern: "/compose/post", screen: "compose", context: "primary", ready: { reader: "ready.compose" }, requiresAccount: true },
  { id: "account", pattern: "/settings/account", screen: "account", context: "account", ready: { reader: "ready.account" }, requiresAccount: true },
  { id: "photo", pattern: "/:handle/status/:id/photo/:index", screen: "media", ready: { reader: "ready.media" } },
  { id: "post", pattern: "/:handle/status/:id", screen: "post", ready: { reader: "ready.post" } },
  { id: "likes", pattern: "/:handle/likes", screen: "saved", ...TIMELINE },
  { id: "replies", pattern: "/:handle/with_replies", ...PROFILE },
  { id: "profile-media", pattern: "/:handle/media", ...PROFILE },
  ...X_PAGES.map(path => ({ id: `website-${path}`, pattern: `/${path}`, website: true })),
  { id: "profile", pattern: "/:handle", ...PROFILE },
];

/** Applet-only screens. Save and Manage draw as sheets over the screen that opened them. */
export const OVERLAY_SCREENS = ["categories", "save", "manage"];
export const SHEETS = new Set(["save", "manage"]);

/** X's sign-in. X returns to the page that asked for it afterwards. */
export const signInUrl = () => "/i/flow/login";

const guards = new Map<string, UrlGuard[]>();

/** The URLs a screen's routes match, so a screen's watches read only on its own pages. Stable per screen. */
export function whenScreen(screen: string): UrlGuard[] {
  let found = guards.get(screen);
  if (!found) {
    found = ROUTES.filter(route => !route.website && (route.screen ?? route.id) === screen)
      .map(route => (route.query ? { pattern: route.pattern, query: route.query } : { pattern: route.pattern }));
    guards.set(screen, found);
  }
  return found;
}
