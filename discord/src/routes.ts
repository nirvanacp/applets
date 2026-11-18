import type { UrlGuard } from "@let/sdk/page";
import type { RouterRoute } from "@let/sdk/react";

/**
 * The router's route table, in match order: the first route whose pattern matches a URL renders
 * its screen. A URL without a route shows the website itself in the same session.
 */
export const ROUTES: RouterRoute[] = [
  { id: "messages", pattern: "/channels/@me", screen: "messages", context: "primary", requiresAccount: true, ready: { reader: "ready.messages" } },
  { id: "app", pattern: "/app", screen: "messages", context: "primary", requiresAccount: true, ready: { reader: "ready.messages" } },
  { id: "dm", pattern: "/channels/@me/:channel", screen: "chat", context: "primary", requiresAccount: true, ready: { reader: "ready.chat" } },
  // Threads and forum posts stay on the website: their pages hold a second message list beside the channel's.
  { id: "thread", pattern: "/channels/:guild/:channel/threads/:thread", context: "primary", website: true },
  { id: "channel", pattern: "/channels/:guild/:channel", screen: "chat", context: "primary", requiresAccount: true, ready: { reader: "ready.chat" } },
  // Discord moves a server's URL on to its last channel.
  { id: "guild", pattern: "/channels/:guild", screen: "chat", context: "primary", requiresAccount: true, ready: { reader: "ready.chat" } },
];

/**
 * Screens with no website page of their own: the server list, a server's channel list, the You
 * tab, and the editors over Discord's profile and server dialogs.
 */
export const OVERLAY_SCREENS = ["servers", "channels", "you", "profile", "nickname", "server"];

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

/**
 * Discord's sign-in for a page that needs the account. `redirect_to` brings the person back to
 * that page; without it Discord lands on whatever it promotes, such as Quests.
 */
export function signInUrl(url: string) {
  const { pathname, search } = new URL(url);
  return `/login?redirect_to=${encodeURIComponent(pathname + search)}`;
}
