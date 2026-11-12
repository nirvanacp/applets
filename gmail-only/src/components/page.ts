/**
 * Reading Gmail's page: the watches every screen shares and the pending commands they show.
 * A watch id names one reader in the primary context, so screens that watch the same reader
 * share one watch.
 */
import { useRouter, useWatch, type PendingInput, type RouteStatus } from "@genesis/sdk/react";
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
