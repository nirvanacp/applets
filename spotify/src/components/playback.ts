import { useCommand, usePending, useWatch } from "@genesis/sdk/react";
import type { NowPlaying } from "../model";

/** The web player's current track, read from the mini-player on whatever page is open. */
export function useNowPlaying() {
  return useWatch<NowPlaying | null>("app:nowPlaying", { reader: "nowPlaying" }, { context: "primary" });
}

/** A page module command in the Spotify context. */
export const usePlayerCommand = <A,>(name: string) => useCommand<A>(name, "primary");

/** The arguments of the unsettled call of `command`, for showing its result before Spotify does. */
export function usePendingCommand<A>(command: string): A | undefined {
  const pending = usePending(undefined, "primary")
    .find(input => input.op === "invoke" && input.args.command === command);
  return pending ? (pending.args.args as A) : undefined;
}
