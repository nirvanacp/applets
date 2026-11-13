import type { UrlGuard } from "@genesis/sdk/page";
import type { RouterRoute } from "@genesis/sdk/react";
import { RESERVED } from "./model";

const ACCOUNT = { requiresAccount: true };
const POST = { screen: "post", ready: { reader: "ready.post" }, ...ACCOUNT };
const PROFILE = { screen: "profile", ready: { reader: "ready.profile" }, ...ACCOUNT };
const FOLLOWS = { screen: "follows", ready: { reader: "ready.follows" }, ...ACCOUNT };
const KEYWORD = { screen: "keyword", context: "explore", ready: { reader: "ready.keyword" }, ...ACCOUNT };

/**
 * Pages that stay the website (decision-0006 for video): Reels, stories, settings, creating a post,
 * Instagram's checks and starting a new chat. Paths that `/:user` would match but that are
 * Instagram pages also stay the website.
 */
const WEBSITE = ["/reels/*", "/stories/*", "/accounts/*", "/create/*", "/challenge/*", "/direct/new", "/direct/requests"];
const NOT_PROFILES = RESERVED.filter(path => !["explore", "p", "reel", "direct", "notifications"].includes(path));

/**
 * The router's route table, in match order: the first route whose pattern and query keys match a
 * URL renders its screen. `/:user` matches any one-segment path, so it stays last. A URL without a
 * route shows the website in the same session.
 */
export const ROUTES: RouterRoute[] = [
  ...WEBSITE.map((pattern, index) => ({ id: `website-${index}`, pattern, website: true })),
  { id: "home", pattern: "/", screen: "home", context: "primary", ready: { reader: "ready.feed" }, ...ACCOUNT },
  { id: "activity", pattern: "/notifications", screen: "activity", context: "primary", ready: { reader: "ready.activity" }, ...ACCOUNT },
  { id: "keyword", pattern: "/explore/search/keyword", query: ["q"], ...KEYWORD },
  { id: "search", pattern: "/explore/search", screen: "search", context: "explore", ready: { reader: "ready.search" }, ...ACCOUNT },
  { id: "tag", pattern: "/explore/tags/:tag", ...KEYWORD },
  { id: "explore", pattern: "/explore", screen: "explore", context: "explore", ready: { reader: "ready.explore" }, ...ACCOUNT },
  { id: "inbox", pattern: "/direct/inbox", screen: "inbox", context: "direct", ready: { reader: "ready.inbox" }, ...ACCOUNT },
  { id: "thread", pattern: "/direct/t/:thread", screen: "thread", ready: { reader: "ready.thread" }, ...ACCOUNT },
  { id: "comments", pattern: "/p/:code/comments", screen: "comments", ready: { reader: "ready.comments" }, ...ACCOUNT },
  { id: "post", pattern: "/p/:code", ...POST },
  { id: "reel", pattern: "/reel/:code", ...POST },
  { id: "user-post", pattern: "/:user/p/:code", ...POST },
  { id: "user-reel", pattern: "/:user/reel/:code", ...POST },
  { id: "followers", pattern: "/:user/followers", ...FOLLOWS },
  { id: "following", pattern: "/:user/following", ...FOLLOWS },
  { id: "profile-reels", pattern: "/:user/reels", ...PROFILE },
  { id: "profile-tagged", pattern: "/:user/tagged", ...PROFILE },
  { id: "profile-saved", pattern: "/:user/saved", ...PROFILE },
  ...NOT_PROFILES.map(path => ({ id: `website-${path}`, pattern: `/${path}/*`, website: true })),
  { id: "profile", pattern: "/:user", ...PROFILE },
];

/** Instagram's sign-in page. Instagram returns to the page that asked for it afterwards. */
export const signInUrl = () => "/accounts/login/";

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
