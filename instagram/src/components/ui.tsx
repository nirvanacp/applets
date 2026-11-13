import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "@genesis/sdk/react";
import type { ErrorBody } from "@genesis/sdk";
import { ORIGIN, type TextPart } from "../model";

const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  reels: "M3 4h18v16H3zM3 8.5h18M8 4l3 4.5M14 4l3 4.5M10 12v5l4.5-2.5z",
  messages: "M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zM7.5 13.5 10.5 10l2.5 2 3.5-2.5-3 3.5-2.5-2z",
  search: "M21 21l-5.2-5.2M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  plus: "M12 5v14M5 12h14",
  heart: "M12 20s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.1-8 11-8 11z",
  comment: "M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.4A8.5 8.5 0 1 1 20.5 11.5z",
  share: "M21 3 10 14M21 3l-7 18-4-7-7-4z",
  save: "M6 3h12v18l-6-5-6 5z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  play: "M8 5v14l11-7z",
  carousel: "M8 3h13v13H8zM4 7v14h13",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  close: "M6 6l12 12M18 6 6 18",
  left: "M15 5l-7 7 7 7",
  down: "M6 9l6 6 6-6",
  grid: "M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16",
  tag: "M4 4h7l9 9-7 7-9-9zM8 8h.01",
  send: "M4 12 21 4l-4 17-5-7z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  camera: "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? "icon filled" : "icon"}><path d={ICONS[name]} /></svg>;
}

/** Website links go through the route table, which picks a screen or shows Instagram's own page. */
export function useOpenUrl() {
  const { navigate } = useRouter();
  return useCallback((url: string) => {
    try {
      navigate({ url });
    } catch (error) {
      console.error("Genesis could not open", url, error);
    }
  }, [navigate]);
}

/** Caption and comment text with its mentions, hashtags and links. Text is never parsed as HTML. */
export function RichText({ parts, className, lead }: { parts: TextPart[]; className?: string; lead?: ReactNode }) {
  const open = useOpenUrl();
  return <p className={className ?? "rich"} dir="auto">{lead}{parts.map((part, index) => part.href
    ? <a key={index} href={part.href} onClick={event => { event.preventDefault(); event.stopPropagation(); open(part.href!); }}>{part.text}</a>
    : <span key={index}>{part.text}</span>)}</p>;
}

/** A profile picture; `ring` draws the story ring, `seen` greys it. */
/**
 * A profile picture. Instagram's CDN serves some profile pictures only to instagram.com pages,
 * so an image that fails to load falls back to a circle with the name's first letter.
 */
export function Avatar({ src, size = 32, ring, seen, name }: { src: string | null; size?: number; ring?: boolean; seen?: boolean; name?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  const image = src && failed !== src
    ? <img className="avatar" src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
    : <span className="avatar letter" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">{name?.[0]?.toUpperCase() ?? ""}</span>;
  return ring ? <span className={seen ? "ring seen" : "ring"}>{image}</span> : image;
}

export function Verified() {
  return <svg viewBox="0 0 24 24" className="verified" role="img" aria-label="Verified account">
    <path d="M12 2.5l2.4 1.8 3-.2.9 2.8 2.5 1.7-1 2.9 1 2.9-2.5 1.7-.9 2.8-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.8-2.5-1.7 1-2.9-1-2.9 2.5-1.7.9-2.8 3 .2z" />
    <path d="M8 12.2l2.6 2.6L16 9.4" className="tick" />
  </svg>;
}

export function Skeleton({ label, rows = 4, kind = "rows" }: { label: string; rows?: number; kind?: "rows" | "posts" | "grid" }) {
  return <div role="status" aria-busy="true" aria-label={label} className={`skeleton ${kind}`}>
    {Array.from({ length: kind === "grid" ? rows * 3 : rows }, (_, index) => <div key={index} className="skeleton-item" aria-hidden="true">
      {kind !== "grid" && <span className="skeleton-avatar" />}
      {kind !== "grid" && <div><span /><span /></div>}
    </div>)}
  </div>;
}

/** Error and empty states share this layout; the text says which it is. */
export function Notice({ title, children, role }: { title: string; children?: ReactNode; role?: "alert" | "status" }) {
  return <section className="notice" role={role}><h2>{title}</h2>{children}</section>;
}

/** Shows the current page as Instagram's website, or opens `url` as the website. */
export function OpenOnWebsite({ url, label = "Open on Instagram", className = "secondary" }: { url?: string; label?: string; className?: string }) {
  const { navigate, viewWebsite } = useRouter();
  return <button type="button" className={className} onClick={() => {
    if (url) navigate({ url });
    viewWebsite();
  }}>
    {label}
  </button>;
}

export function LoadError({ error }: { error: ErrorBody | null }) {
  const message = error?.code === "NOT_READY" || error?.code === "DEADLINE" ? "Instagram did not answer in time."
    : error?.message || "This page could not be read.";
  return <Notice title="Couldn't load this page" role="alert">
    <p>{message}</p>
    <OpenOnWebsite />
  </Notice>;
}

/** Sign-in happens on Instagram's own page. Genesis opens it by itself for pages that need the account. */
export function SignInPrompt({ reason }: { reason: string }) {
  const { navigate } = useRouter();
  return <Notice title="Sign in to Instagram">
    <p>{reason}</p>
    <button type="button" className="primary" onClick={() => navigate({ url: `${ORIGIN}/accounts/login/` })}>Sign in</button>
  </Notice>;
}

/** A row of tabs. Each choice is a URL or a screen, so the route table still decides where it goes. */
export function ModeTabs({ label, options, active, icons }: {
  label: string; options: { id: string; label: string; icon?: IconName; go(): void }[]; active: string; icons?: boolean;
}) {
  return <nav className={icons ? "mode-tabs icons" : "mode-tabs"} aria-label={label}>
    {options.map(option => <button type="button" key={option.id} className="mode-tab" aria-label={icons ? option.label : undefined}
      aria-current={option.id === active ? "page" : undefined} onClick={() => option.id !== active && option.go()}>
      {icons && option.icon ? <Icon name={option.icon} filled={option.id === active} /> : option.label}
    </button>)}
  </nav>;
}

/** A screen's top bar with Back and a title. The top-right corner stays clear for the Genesis menu. */
export function TopBar({ title, children }: { title: ReactNode; children?: ReactNode }) {
  const { back } = useRouter();
  return <header className="top-bar">
    <button type="button" className="icon-button" aria-label="Back" onClick={back}><Icon name="left" /></button>
    <h1>{title}</h1>
    <div className="top-actions">{children}</div>
  </header>;
}

export function InlineError({ children }: { children: ReactNode }) {
  return <p className="inline-error" role="alert">{children}</p>;
}
