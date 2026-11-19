import { useEffect, useState, useSyncExternalStore } from "react";
import { useGenesis, useHold, useRouter, useWatch, type WatchValue } from "@let/sdk/react";
import type { NowPlaying, Player } from "../model";
import { useToast } from "../ui/feedback";
import { playback, positionAt, type Clock, type PlaybackView, type Result } from "./store";

/** A reading that a navigation left behind counts as none, so the store keeps the last track. */
const fresh = <V,>(watch: WatchValue<V | null>) => (watch.stale ? null : watch.value ?? null);

/**
 * Feeds the store from the page and lets it send commands. Mounted once, by the shell. It also
 * keeps the Spotify page running while it plays here: Genesis rests a covered page the applet is
 * not using, and a resting web player stalls at the end of a track and stops reporting the next one.
 */
export function usePlaybackFeed() {
  const nowWatch = useWatch<NowPlaying | null>("app:nowPlaying", { reader: "nowPlaying" }, { context: "primary" });
  const playerWatch = useWatch<Player | null>("app:player", { reader: "player" }, { context: "primary" });
  const { show } = useToast();
  const genesis = useGenesis();
  const now = fresh(nowWatch);
  const player = fresh(playerWatch);
  const route = useRouter().status("primary");
  const loading = route.status === "loading";
  const signedOut = route.signedIn === false;

  useEffect(() => playback.connect((name, args): Promise<Result> => genesis.context("primary").invoke(name, args), text => show({ text })),
    [genesis, show]);
  useEffect(() => playback.setTruth(now, player, nowWatch.updatedAt ?? null), [now, player, nowWatch.updatedAt]);
  // Requests wait for a loading page instead of failing on it; signing out clears the bar.
  useEffect(() => playback.setNavigating(loading), [loading]);
  useEffect(() => { if (signedOut) playback.reset(); }, [signedOut]);

  const view = usePlayback();
  useHold(view.playing && !view.elsewhere, { context: "primary" });
}

/** What the playback controls show, with every request on its way applied. */
export function usePlayback(): PlaybackView {
  return useSyncExternalStore(playback.subscribe, playback.getView);
}

/** The track row a tap is starting, or null. Only a change of row renders again. */
export function useStartingRow(): string | null {
  return useSyncExternalStore(playback.subscribe, () => playback.getView().startingRow);
}

/** Seconds into the track on the view's clock, updated every animation frame while it runs. */
export function usePosition(clock: Clock | null): number {
  // Worked out on each render, so a new clock, such as a seek's, shows in the same render.
  const [, setFrame] = useState(0);
  useEffect(() => {
    if (!clock?.running) return;
    let frame = 0;
    const tick = () => {
      setFrame(count => count + 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clock]);
  return positionAt(clock, Date.now());
}

export { playback };
