import type { RouterRoute } from "@genesis/sdk/router";

/**
 * Routes in match order. A URL without a route shows the website itself in the same session, and
 * the custom screen comes back when the page becomes one the applet knows.
 */
export const ROUTES: RouterRoute[] = [
  { id: "home", pattern: "/", screen: "home", context: "primary" },
];

/** The watch reads only on the pages its screen shows. */
export const HOME_PAGES = [{ pattern: "/" }];
