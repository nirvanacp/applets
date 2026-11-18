import { useCallback, useEffect, useRef, useState } from "react";
import { useAppResume, useCommand, useGenesis, usePending, useRouter, useWatch, type NavigateTarget } from "@let/sdk/react";
import { delivered } from "../screen";
import { useToast } from "../ui/feedback";

export const ORIGIN = "https://discord.com";

/** A page module command in the Discord context. */
export const useDiscordCommand = <A,>(name: string) => useCommand<A>(name, "primary");

/** The arguments of the newest unsettled call of `command`, for showing its result before Discord does. */
export function usePendingCalls<A>(command: string): A[] {
  return usePending(undefined, "primary")
    .filter(input => input.op === "invoke" && input.args.command === command)
    .map(input => input.args.args as A);
}

export interface Result { outcome: string; code?: string | null; message?: string | null }

/** A short message for a command that did not take effect, or null when it did or was cancelled. */
export function failureText(result: Result, unknown = "Discord didn't confirm that. Check again in a moment."): string | null {
  if (result.outcome === "failed") return result.message || "Discord didn't do that. Try again.";
  if (result.outcome === "unknown") return unknown;
  return null;
}

/**
 * Keeps Discord's drawer open on the page while `active`: at phone width the server rail and the
 * conversation and channel lists exist only inside it. Opens it once per page view, and reports
 * a failure instead of trying again in a loop.
 */
export function useDrawer(active: boolean): { open: boolean; failed: string | null } {
  const drawer = useWatch<boolean>("app:drawer", { reader: "drawer" }, { context: "primary" });
  const openDrawer = useDiscordCommand("openDrawer");
  const tried = useRef<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const ready = delivered(drawer);
  const view = JSON.stringify(drawer.view);

  useEffect(() => {
    if (!active || !ready || drawer.value !== false || tried.current === view) return;
    tried.current = view;
    setFailed(null);
    void openDrawer().then(result => setFailed(failureText(result, "Discord didn't open its list.")));
  }, [active, ready, drawer.value, view, openDrawer]);

  return { open: drawer.value === true, failed };
}

/**
 * Opens a link from a message: Discord's own links through the route table, any other https link
 * in the phone's browser, which needs the tap that called it.
 */
export function useOpenLink(openUrl: (url: string) => void) {
  const genesis = useGenesis();
  const { show } = useToast();
  return useCallback((url: string) => {
    let parsed: URL;
    try { parsed = new URL(url); } catch { return; }
    if (parsed.origin === ORIGIN || parsed.hostname === "discord.com") return openUrl(parsed.href);
    genesis.links.openExternal(parsed.href).catch(() => show({ text: "Couldn't open that link." }));
  }, [genesis, openUrl, show]);
}

/** The overlay screen to show again after Done, set while a Discord window the applet opened is on the website. */
let returnTo: NavigateTarget | null = null;

/**
 * Opens a Discord window with `open`, such as Settings, then shows the website so the person
 * uses it there. Showing the website leaves the overlay screens, so the screen it came from is
 * kept to show again after Done. Reports a failure as a toast.
 */
export function useShowOnWebsite() {
  const { viewWebsite, state } = useRouter();
  const { show } = useToast();
  const top = state.overlay.at(-1);
  const from = useRef<NavigateTarget | null>(null);
  from.current = top ? { screen: top.id, params: top.params, ...(state.overlay.length === 1 ? { mode: "root" as const } : {}) } : null;
  return useCallback(async (open: () => Promise<Result>, failed: string) => {
    const result = await open();
    if (result.outcome === "observed") {
      returnTo = from.current;
      viewWebsite("primary");
    } else if (result.outcome !== "cancelled") {
      show({ text: result.message || failed });
    }
  }, [viewWebsite, show]);
}

/**
 * After Done, closes what `useShowOnWebsite` opened on Discord's page and shows the screen it was
 * opened from again.
 */
export function useCloseOnReturn() {
  const { revealed, navigate } = useRouter();
  const dismiss = useDiscordCommand("dismiss");
  const shown = useRef(revealed);
  shown.current = revealed;
  useAppResume(() => {
    if (!returnTo) return;
    // Done's listeners run before the applet renders the website as gone; resuming the app with
    // the website still shown is not Done.
    setTimeout(() => {
      if (shown.current !== null || !returnTo) return;
      const target = returnTo;
      returnTo = null;
      void dismiss();
      navigate(target);
    }, 150);
  });
}
