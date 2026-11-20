import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ScrollMemory, useRouter } from "@nirvanacp/sdk/react";
import { showNewest } from "../feed-hold";
import { ProgressBar } from "./feedback";
import { PullIndicator, usePullToRefresh } from "./pull";
import { Icon } from "./icons";

/** Website links go through the route table, which picks a screen or shows X's own page. */
export function useOpenUrl() {
  const { navigate } = useRouter();
  return useCallback((url: string) => {
    try { navigate({ url }); } catch (error) { console.error("X could not open", url, error); }
  }, [navigate]);
}

/**
 * A screen's header. A pushed screen gets Back; a tab root gets none. The right side stays clear
 * for the shell's menu button (the kit's `--menu-corner` padding).
 */
export function TopBar({ title, sub, back = false, actions, children }: {
  title?: ReactNode; sub?: ReactNode; back?: boolean; actions?: ReactNode; children?: ReactNode;
}) {
  const router = useRouter();
  return <header className="top-bar">
    {back ? <button type="button" className="icon-button" aria-label="Back" onClick={() => router.back()}><Icon name="back" /></button>
      : <span className="top-bar-start" aria-hidden="true" />}
    {children ?? <div className="top-bar-title">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>}
    {actions}
  </header>;
}

/** The labeled Refresh control for people who do not pull: an icon button whose name says what it does. */
export function RefreshButton({ busy, contextId }: { busy: boolean; contextId?: string }) {
  const { reload } = useRouter();
  return <button type="button" className="icon-button" aria-label={busy ? "Refreshing" : "Refresh"} aria-busy={busy} disabled={busy}
    onClick={() => { showNewest(); reload(contextId); }}>
    <Icon name="refresh" className={busy ? "spinning" : undefined} />
  </button>;
}

/**
 * The scroller of a routed screen: the delayed progress bar above it, `aria-busy`, pull to refresh
 * and the scroll position the router remembers per history entry.
 */
export function PageScroller({ busy, contextId, pull = true, className, children }: {
  busy: boolean; contextId?: string; pull?: boolean; className?: string; children: ReactNode;
}) {
  const state = usePullToRefresh(busy, contextId);
  return <>
    <ProgressBar active={busy} />
    <ScrollMemory className={`screen${className ? ` ${className}` : ""}`} aria-busy={busy} {...(pull ? state.handlers : {})}>
      {pull && <PullIndicator state={state} />}
      {children}
    </ScrollMemory>
  </>;
}

/**
 * A segmented control (content tabs inside a screen). The thumb slides under the chosen segment.
 * Each segment is a URL or a screen, so the route table decides where it goes.
 */
export function Segments({ label, options, active }: {
  label: string; options: { id: string; label: string; go(): void }[]; active: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const node = host.current?.querySelector<HTMLElement>('[aria-current="page"] span');
    setThumb(node ? { left: node.offsetLeft, width: node.offsetWidth } : null);
  }, [active, options.length]);
  return <nav className="segments" aria-label={label} ref={host}>
    {options.map(option => <button type="button" key={option.id} className="segment" aria-current={option.id === active ? "page" : undefined}
      onClick={() => option.id !== active && option.go()}><span>{option.label}</span></button>)}
    {thumb && <i className="segment-thumb" style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }} aria-hidden="true" />}
  </nav>;
}

/** A round avatar of a fixed size that fades in when it loads and keeps a neutral disc when it fails. */
export function Avatar(props: { src: string | null; size?: number; name?: string }) {
  return <AvatarImage key={props.src ?? ""} {...props} />; // a new src starts loading again
}

function AvatarImage({ src, size = 40, name }: { src: string | null; size?: number; name?: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const initial = name?.trim().charAt(0).toUpperCase() ?? "";
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * .42 }} aria-hidden="true">
    {(!src || state === "failed") && initial}
    {src && state !== "failed" && <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer"
      className={state === "loaded" ? "loaded" : undefined} onLoad={() => setState("loaded")} onError={() => setState("failed")} />}
  </span>;
}

/** An image in a box that already has its size: fades in on load, stays a neutral tile on failure. */
export function FadeImage(props: { src: string; alt?: string }) {
  return <FadeImageOnce key={props.src} {...props} />; // a new src fades in again
}

function FadeImageOnce({ src, alt = "" }: { src: string; alt?: string }) {
  const [loaded, setLoaded] = useState(false);
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={loaded ? "fade-image loaded" : "fade-image"}
    onLoad={() => setLoaded(true)} />;
}
