import { useCallback, type ReactNode, type UIEvent } from "react";
import { ScrollMemory, useRouter } from "@let/sdk/react";
import { Icon } from "../components/ui";
import { ProgressBar } from "./feedback";
import { PullIndicator, usePullToRefresh } from "./pull";

/**
 * Website links go through the route table: a routed URL opens its screen with its skeleton at
 * once, any other URL shows the website in the same context.
 */
export function useOpenUrl() {
  const { navigate } = useRouter();
  return useCallback((url: string) => {
    try { navigate({ url }); } catch (error) { console.error("Spotify could not open", url, error); }
  }, [navigate]);
}

/**
 * A screen's header. A pushed screen gets Back; a tab root gets none. The right side stays clear
 * for the shell's menu button (`--menu-corner`). `over` lays it over the screen's art, clear until
 * `solid`, as Spotify's album and artist pages do.
 */
export function TopBar({ title, back = false, actions, over = false, solid = true }: {
  title?: ReactNode; back?: boolean; actions?: ReactNode; over?: boolean; solid?: boolean;
}) {
  const router = useRouter();
  return <header className={`top-bar${over ? " over" : ""}${solid ? " solid" : ""}`}>
    {back ? <button type="button" className="icon-button" aria-label="Back" onClick={() => router.back()}><Icon name="back" /></button>
      : <span className="top-bar-start" aria-hidden="true" />}
    <h1 className="top-bar-title">{title}</h1>
    {actions}
  </header>;
}

/** The labeled Refresh control for people who do not pull. */
export function RefreshButton({ busy }: { busy: boolean }) {
  const { reload } = useRouter();
  return <button type="button" className="icon-button" aria-label={busy ? "Refreshing" : "Refresh"} aria-busy={busy} disabled={busy}
    onClick={() => reload("primary")}>
    <Icon name="refresh" className={busy ? "spinning" : undefined} />
  </button>;
}

/**
 * The scroller of a routed screen: the delayed progress bar above it, `aria-busy`, pull to refresh
 * and the scroll position the router remembers per history entry.
 */
export function PageScroller({ busy, pull = true, className, onScroll, children }: {
  busy: boolean; pull?: boolean; className?: string; onScroll?: (event: UIEvent<HTMLDivElement>) => void; children: ReactNode;
}) {
  const state = usePullToRefresh(busy, "primary");
  return <>
    <ProgressBar active={busy} />
    <ScrollMemory className={`screen${className ? ` ${className}` : ""}`} aria-busy={busy} onScroll={onScroll} {...(pull ? state.handlers : {})}>
      {pull && <PullIndicator state={state} />}
      {children}
    </ScrollMemory>
  </>;
}
