import type { UrlGuard } from "@genesis/sdk/page";
import type { RouterRoute } from "@genesis/sdk/react";

const TIMELINE = { ready: { reader: "ready.timeline" }, requiresAccount: true };
const EXPLORE = { screen: "explore", context: "explore", ready: { reader: "ready.explore" } };
const PROFILE = { screen: "profile", ready: { reader: "ready.profile" } };

/**
 * One-segment X paths that `/:handle` would match but that are not profiles. They show X's own
 * page. Home, Notifications and Explore have routes of their own above.
 */
const NOT_PROFILES = [
  "messages", "settings", "i", "login", "logout", "signup", "tos", "privacy", "about", "download", "compose", "search",
  "jobs", "communities", "premium", "lists", "bookmarks", "account",
];

/**
 * The router's route table, in match order: the first route whose pattern and query keys match a
 * URL renders its screen. `/:handle` matches any one-segment path, so it stays last. A URL
 * without a route shows the website in the same session.
 */
export const ROUTES: RouterRoute[] = [
  { id: "home", pattern: "/home", screen: "home", context: "primary", ...TIMELINE },
  { id: "notifications", pattern: "/notifications", screen: "notifications", context: "primary", ...TIMELINE },
  { id: "bookmarks", pattern: "/i/history", screen: "saved", context: "primary", ...TIMELINE },
  { id: "own-likes", pattern: "/i/history/likes", screen: "saved", context: "primary", ...TIMELINE },
  { id: "bookmarks-alias", pattern: "/i/bookmarks", screen: "saved", context: "primary", ...TIMELINE },
  { id: "explore", pattern: "/explore/*", ...EXPLORE },
  { id: "search", pattern: "/search", query: ["q"], ...EXPLORE },
  { id: "hashtag", pattern: "/hashtag/:tag", ...EXPLORE },
  // A reply keeps X's own composer; a new post uses the applet's.
  { id: "website-reply", pattern: "/compose/post", query: ["in_reply_to"], website: true },
  { id: "compose", pattern: "/compose/post", screen: "compose", context: "primary", ready: { reader: "ready.compose" }, requiresAccount: true },
  { id: "account", pattern: "/settings/account", screen: "account", context: "account", ready: { reader: "ready.account" }, requiresAccount: true },
  { id: "photo", pattern: "/:handle/status/:id/photo/:index", screen: "media", ready: { reader: "ready.media" } },
  { id: "post", pattern: "/:handle/status/:id", screen: "post", ready: { reader: "ready.post" } },
  { id: "likes", pattern: "/:handle/likes", screen: "saved", ...TIMELINE },
  { id: "replies", pattern: "/:handle/with_replies", ...PROFILE },
  { id: "profile-media", pattern: "/:handle/media", ...PROFILE },
  ...NOT_PROFILES.map(path => ({ id: `website-${path}`, pattern: `/${path}`, website: true })),
  { id: "profile", pattern: "/:handle", ...PROFILE },
];

/** Screens with no website page. */
export const OVERLAY_SCREENS = ["categories", "save", "manage"];

/** X's login page. X returns to the page that asked for it afterwards. */
export const signInUrl = () => "/i/flow/login";

const guards = new Map<string, UrlGuard[]>();

/**
 * The URLs a screen's routes match, as watch guards: a screen's watches read only on its own
 * pages. One array per screen, so a watch keeps the same options across renders.
 */
export function whenScreen(screen: string): UrlGuard[] {
  let found = guards.get(screen);
  if (!found) {
    found = ROUTES.filter(route => !route.website && (route.screen ?? route.id) === screen)
      .map(route => (route.query ? { pattern: route.pattern, query: route.query } : { pattern: route.pattern }));
    guards.set(screen, found);
  }
  return found;
}
