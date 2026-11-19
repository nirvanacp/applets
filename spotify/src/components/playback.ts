import { useCallback } from "react";
import { useCommand, useHold, usePending, useWatch } from "@nirvanacp/sdk/react";
import type { NowPlaying } from "../model";
import { useBusy, useToast } from "../ui/feedback";

/** The web player's current track, read from the mini-player on whatever page is open. */
export function useNowPlaying() {
  return useWatch<NowPlaying | null>("app:nowPlaying", { reader: "nowPlaying" }, { context: "primary" });
}

/**
 * Keeps the Spotify page running while it plays here. Genesis rests a covered page the applet is
 * not using, and a resting web player stalls at the end of a track and stops reporting the next one.
 */
export function usePlaybackHold() {
  const track = useNowPlaying().value;
  useHold(Boolean(track?.playing && !track.elsewhere), { context: "primary" });
}

/** A page module command in the Spotify context. */
export const usePlayerCommand = <A,>(name: string) => useCommand<A>(name, "primary");

/** The arguments of the newest unsettled call of `command`, for showing its result before Spotify does. */
export function usePendingCommand<A>(command: string): A | undefined {
  const pending = [...usePending(undefined, "primary")].reverse()
    .find(input => input.op === "invoke" && input.args.command === command);
  return pending ? (pending.args.args as A) : undefined;
}

export interface Result { outcome: string; code?: string | null; message?: string | null }

/** What to say once Spotify shows the change: a short line, and Undo for a removal. */
export interface Done { text: string; undo?: () => Promise<unknown> }

/** A short message for a command that did not take effect, or null when it did or was cancelled. */
export function failureText(result: Result): string | null {
  if (result.outcome === "failed") return result.message || "Spotify didn't do that. Try again.";
  if (result.outcome === "unknown") return "Spotify didn't confirm that. Check again in a moment.";
  return null;
}

/**
 * Shows a command's outcome in the toast: the reason on failure, the uncertain message when the
 * page never confirmed it, and `done` (with its Undo) only when Spotify showed the change.
 */
export function useReport() {
  const { show } = useToast();
  return useCallback((result: Result, done?: Done) => {
    const failure = failureText(result);
    if (failure) show({ text: failure });
    else if (result.outcome === "observed" && done) {
      const undo = done.undo;
      show({ text: done.text, action: undo ? { label: "Undo", run: () => undo().then(answer => {
        if ((answer as Result | undefined)?.outcome !== "observed") throw new Error("Undo was not confirmed");
      }) } : undefined });
    }
  }, [show]);
}

/**
 * `[busy, act]` for a tapped command: busy from the tap until Spotify answers (at least the kit's
 * minimum, so a fast failure is still seen), one write per tap, then the outcome in the toast.
 */
export function useAction<A>(name: string): [boolean, (args: A, done?: Done) => Promise<void>] {
  const command = usePlayerCommand<A>(name);
  const report = useReport();
  const [busy, run] = useBusy();
  const act = useCallback((args: A, done?: Done) => run(async () => report(await command(args), done)), [run, command, report]);
  return [busy, act];
}
