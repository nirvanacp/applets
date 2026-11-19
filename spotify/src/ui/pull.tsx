import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { useGenesis, useRouter } from "@let/sdk/react";
import { playback } from "../playback/store";

const PULL_TRIGGER = 72; // px of indicator travel that arms a refresh
const PULL_MAX = 112;

export interface PullState {
  pull: number; active: boolean;
  handlers: { onTouchStart(event: TouchEvent<HTMLElement>): void; onTouchMove(event: TouchEvent<HTMLElement>): void; onTouchEnd(): void; onTouchCancel(): void };
}

/** How long the pull indicator stays after a re-read, which has no load to wait for. */
const RESYNC_MS = 600;

/**
 * Refreshes a screen. Reloading the page stops Spotify's audio, and Genesis cannot reload a page
 * within its document, so while it plays here the refresh re-reads the page as it is instead.
 * Returns "reload" or "resync".
 */
export function useRefresh(contextId = "primary"): () => "reload" | "resync" {
  const { reload } = useRouter();
  const genesis = useGenesis();
  return useCallback(() => {
    const now = playback.getView();
    if (now.playing && !now.elsewhere) {
      genesis.context(contextId).resync();
      return "resync";
    }
    reload(contextId);
    return "reload";
  }, [contextId, genesis, reload]);
}

/** Spread `handlers` on the screen's scroller. `loading` is `status.status === "loading" || status.stale`. */
export function usePullToRefresh(loading: boolean, contextId?: string): PullState {
  const refresh = useRefresh(contextId);
  const [pull, setPull] = useState(0);
  const [active, setActive] = useState(false);
  const origin = useRef<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (loading) started.current = true;
    else if (started.current) { setActive(false); return; }
    const limit = window.setTimeout(() => setActive(false), 10000);
    return () => window.clearTimeout(limit);
  }, [active, loading]);

  const run = () => {
    if (active) return;
    setActive(true);
    started.current = false;
    if (refresh() === "resync") window.setTimeout(() => setActive(false), RESYNC_MS);
  };
  const reset = () => { origin.current = null; setPull(0); };
  return {
    pull, active,
    handlers: {
      onTouchStart: event => { origin.current = event.currentTarget.scrollTop <= 0 && !active ? event.touches[0]!.clientY : null; },
      onTouchMove: event => {
        if (origin.current === null) return;
        const dy = event.touches[0]!.clientY - origin.current;
        if (dy <= 0 || event.currentTarget.scrollTop > 0) { reset(); return; }
        setPull(Math.min(PULL_MAX, dy * 0.5));
      },
      onTouchEnd: () => { if (origin.current !== null && pull >= PULL_TRIGGER) run(); reset(); },
      onTouchCancel: reset,
    },
  };
}

export function PullIndicator({ state }: { state: PullState }) {
  const { pull, active } = state;
  if (!pull && !active) return null;
  const turn = Math.min(1, pull / PULL_TRIGGER);
  return <div className={`pull-indicator${active ? " active" : ""}${pull >= PULL_TRIGGER ? " armed" : ""}`} aria-hidden="true"
    style={{ transform: `translate(-50%, ${active ? 56 : pull}px)`, opacity: active ? 1 : turn }}>
    <span style={active ? undefined : { transform: `rotate(${turn * 270}deg)` }}>
      <svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
    </span>
  </div>;
}
