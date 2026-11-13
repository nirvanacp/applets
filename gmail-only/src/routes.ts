import type { RouterRoute } from "@genesis/sdk/react";

/**
 * The route table. Gmail's mobile web app is one page whose hash picks the view, so every Gmail
 * URL is the `mail` screen; the screen reads which view Gmail shows. The page is ready once the
 * view the hash names has its content.
 */
export const ROUTES: RouterRoute[] = [
  { id: "mail", pattern: "/mail/*", screen: "mail", context: "primary", ready: { reader: "ready" } },
  { id: "root", pattern: "/", screen: "mail", context: "primary", ready: { reader: "ready" } },
];

/** Applet screens with no Gmail page. `menu` stands for an open popover menu, so Back closes it. */
export const OVERLAY_SCREENS = ["todo", "item", "add", "bulk", "search", "settings", "accounts", "account-setup", "snoozed", "menu"];
