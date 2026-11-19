/**
 * Reading Gmail's page: the watches every screen shares and the pending commands they show.
 * A watch id names one reader in the primary context, so screens that watch the same reader
 * share one watch.
 */
import { useEffect } from "react";
import { useGenesis, useRouter, useWatch, type PendingInput, type RouteStatus } from "@nirvanacp/sdk/react";
import type { ViewId } from "../adapter/read";

export const CONTEXT = "primary";

export interface VisibleView { view: ViewId | null; hash: string; session: number | null; email: string | null }

/** Watches a page module reader of the primary context. */
export function usePageWatch<V = unknown, R = unknown>(reader: string) {
  return useWatch<V, R>(reader, { reader }, { context: CONTEXT });
}

/** Which Gmail view is visible, with the session index and the signed-in address. */
export function useVisibleView(): VisibleView | null {
  return usePageWatch<VisibleView>("view").value;
}

/** The primary context's page, as the router judges it. */
export function useMailStatus(): RouteStatus {
  return useRouter().status(CONTEXT);
}

/** Whether `input` is a pending `invoke` of `command`. */
export const invoking = (input: PendingInput, command: string) => input.op === "invoke" && input.args.command === command;

/** The args of a pending `invoke` of `command`, or undefined. */
export function invoked<A>(input: PendingInput, command: string): A | undefined {
  return input.op === "invoke" && input.args.command === command ? input.args.args as A : undefined;
}

/** Google's own pages that stand for no Gmail session: its sign-in pages and Gmail's product page. */
const SIGNED_OUT_HOSTS = new Set(["accounts.google.com", "workspace.google.com"]);

/** Gmail's session as the page shows it: signed in with an address, signed out on Google's sign-in, or unknown. */
function sessionOf(url: string | null, email: string | null | undefined): boolean | undefined {
  if (email) return true;
  if (!url) return undefined;
  try { return SIGNED_OUT_HOSTS.has(new URL(url).hostname) ? false : undefined; } catch { return undefined; }
}

const SIGNED_OUT_KEY = "gmail-only.signedOut";

/**
 * Forgets the pages Genesis keeps for this applet when Gmail's session ends, so another person's
 * inbox never shows from a kept copy. Only "signed out" or "signed in" is remembered, so a start
 * that is already signed out does not forget again. Adding an account passes Google's sign-in too;
 * forgetting then costs one fresh read.
 */
export function useForgetOnSignOut() {
  const genesis = useGenesis();
  const page = useMailStatus();
  const email = useVisibleView()?.email;
  const signedIn = sessionOf(page.url, email);
  useEffect(() => {
    if (signedIn === undefined) return;
    let last: string | null = null;
    try { last = localStorage.getItem(SIGNED_OUT_KEY); } catch { /* storage unavailable */ }
    const now = signedIn ? "no" : "yes";
    if (last === now) return;
    try { localStorage.setItem(SIGNED_OUT_KEY, now); } catch { /* storage unavailable */ }
    if (!signedIn) genesis.forgetCached().catch(console.error);
  }, [genesis, signedIn]);
}
