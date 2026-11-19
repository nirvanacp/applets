import { useCallback, type ReactNode } from "react";
import { ScrollMemory, useRouter } from "@nirvanacp/sdk/react";
import { ProgressBar } from "./feedback";
import { PullIndicator, usePullToRefresh } from "./pull";
import { Icon } from "./icons";

/**
 * Website links go through the route table: a routed URL opens its screen with its skeleton at
 * once, any other URL shows the website in the same context. `navigate` throws only for a URL it
 * cannot open.
 */
export function useOpenUrl() {
  const { navigate } = useRouter();
  return useCallback((url: string) => {
    try { navigate({ url }); } catch (error) { console.error("Genesis could not open", url, error); }
  }, [navigate]);
}

/**
 * A screen's header row: the title (or other content such as the feed chips) and its actions.
 * There is no Back arrow and no app name (Android Back and the shell cover those), and the right
 * side stays clear for the shell's menu button (`--menu-corner`).
 */
export function ScreenHead({ title, eyebrow, actions, children }: {
  title?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; children?: ReactNode;
}) {
  return <header className="screen-head">
    {children ?? <div className="screen-head-title">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
    </div>}
    {actions}
  </header>;
}

/** The labeled Refresh control for people who do not pull. It turns while the page reloads. */
export function RefreshButton({ busy, onRefresh }: { busy: boolean; onRefresh?: () => void }) {
  const { reload } = useRouter();
  return <button type="button" className="icon-button" aria-label={busy ? "Refreshing" : "Refresh"} aria-busy={busy} disabled={busy}
    onClick={() => (onRefresh ? onRefresh() : reload())}>
    <Icon name="refresh" className={busy ? "spinning" : undefined} />
  </button>;
}

/**
 * The scroller of a screen: the delayed progress bar above it, `aria-busy`, pull to refresh on a
 * routed screen and the scroll position the router remembers per history entry.
 */
export function PageScroller({ busy, pull = true, className, children }: {
  busy: boolean; pull?: boolean; className?: string; children: ReactNode;
}) {
  const state = usePullToRefresh(busy);
  return <>
    <ProgressBar active={busy} />
    <ScrollMemory className={`screen${className ? ` ${className}` : ""}`} aria-busy={busy} {...(pull ? state.handlers : {})}>
      {pull && <PullIndicator state={state} />}
      {children}
    </ScrollMemory>
  </>;
}
