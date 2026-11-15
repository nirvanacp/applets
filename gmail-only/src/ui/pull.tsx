/**
 * Pull to refresh from the UI kit. Pull down at the top of a screen to reload Gmail's page: the
 * indicator follows the finger with resistance, spins while Gmail redraws and stops when the
 * fresh page is ready. `run` starts the same refresh from a button.
 */
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { useRouter } from "@genesis/sdk/react";
import { Icon } from "../components/ui";

/** Distance (px) a pull must reach to refresh, and the most the indicator travels. */
const PULL_TRIGGER = 72;
const PULL_MAX = 112;
/** The longest a refresh shows as running when the page never reports loading. */
const PULL_LIMIT_MS = 10_000;

export interface PullState {
  pull: number; active: boolean; run(): void;
  handlers: { onTouchStart(event: TouchEvent<HTMLElement>): void; onTouchMove(event: TouchEvent<HTMLElement>): void; onTouchEnd(): void; onTouchCancel(): void };
}

export function usePullToRefresh(loading: boolean, contextId: string): PullState {
  const { reload } = useRouter();
  const [pull, setPull] = useState(0);
  const [active, setActive] = useState(false);
  const origin = useRef<number | null>(null);
  const started = useRef(false);

  const run = () => {
    if (active) return;
    setActive(true);
    started.current = false;
    reload(contextId);
  };
  // Done when the reload has shown as loading and then finished, or after a safety limit.
  useEffect(() => {
    if (!active) return;
    if (loading) started.current = true;
    else if (started.current) { setActive(false); return; }
    const limit = window.setTimeout(() => setActive(false), PULL_LIMIT_MS);
    return () => window.clearTimeout(limit);
  }, [active, loading]);

  const handlers = {
    onTouchStart: (event: TouchEvent<HTMLElement>) => { origin.current = event.currentTarget.scrollTop <= 0 && !active ? event.touches[0]!.clientY : null; },
    onTouchMove: (event: TouchEvent<HTMLElement>) => {
      if (origin.current === null) return;
      const dy = event.touches[0]!.clientY - origin.current;
      if (dy <= 0 || event.currentTarget.scrollTop > 0) { origin.current = null; setPull(0); return; }
      setPull(Math.min(PULL_MAX, dy * 0.5));
    },
    onTouchEnd: () => {
      if (origin.current !== null && pull >= PULL_TRIGGER) run();
      origin.current = null;
      setPull(0);
    },
    onTouchCancel: () => { origin.current = null; setPull(0); },
  };
  return { pull, active, run, handlers };
}

export function PullIndicator({ state }: { state: PullState }) {
  const { pull, active } = state;
  if (!pull && !active) return null;
  const y = active ? 56 : pull;
  const turn = Math.min(1, pull / PULL_TRIGGER);
  return <div className={`pull-indicator${active ? " active" : ""}${pull >= PULL_TRIGGER ? " armed" : ""}`} aria-hidden="true"
    style={{ transform: `translate(-50%, ${y}px)`, opacity: active ? 1 : turn }}>
    <span style={active ? undefined : { transform: `rotate(${turn * 270}deg)` }}><Icon name="refresh" /></span>
  </div>;
}

/** The Refresh link under a list: its icon turns while the refresh runs. */
export function RefreshButton({ state, className = "link-button" }: { state: PullState; className?: string }) {
  return <button type="button" className={`${className} refresh-button${state.active ? " active" : ""}`} disabled={state.active} aria-busy={state.active} onClick={state.run}>
    <span className="refresh-icon"><Icon name="refresh" /></span> {state.active ? "Refreshing…" : "Refresh"}
  </button>;
}
