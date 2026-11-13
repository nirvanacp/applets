import { useCallback, type ReactNode } from "react";
import type { ErrorBody } from "@genesis/sdk";
import { useRouter } from "@genesis/sdk/react";

/** Outline icons drawn for this applet on a 24px grid. Filled ones use `filled`. */
const ICONS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  search: "M21 21l-5.2-5.2M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  library: "M5 3v18M10 3v18M15 4l5 16",
  play: "M7 4.5v15l13-7.5z",
  pause: "M7 4h3.5v16H7zM13.5 4H17v16h-3.5z",
  next: "M5 5l10 7-10 7zM18 5v14",
  previous: "M19 5L9 12l10 7zM6 5v14",
  shuffle: "M3 7h4c4 0 6 10 10 10h4M17 14l4 3-4 3M3 17h4c1.6 0 2.8-1.4 4-3.2M13.2 9.4C14.3 8 15.5 7 17 7h4M17 4l4 3-4 3",
  repeat: "M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3",
  plus: "M12 7v10M7 12h10M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  check: "M7.5 12.5l3 3 6-7M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  down: "M6 9l6 6 6-6",
  chevron: "M9 6l6 6-6 6",
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6L6 18",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  heart: "M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z",
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? "filled" : undefined}><path d={ICONS[name]} /></svg>;
}

/**
 * Website links go through the manifest: a routed URL opens its screen, any other URL shows the
 * website in the same context. `navigate` throws only for a URL it cannot open.
 */
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

/** Goes back in the applet's history. */
export function BackButton() {
  const { back } = useRouter();
  return <button type="button" className="icon-button back" aria-label="Back" onClick={() => back()}>
    <Icon name="back" />
  </button>;
}

/** A square of cover art, or a neutral tile with a note when the website gives none. */
export function Artwork({ src, round = false, className = "" }: { src: string | null; round?: boolean; className?: string }) {
  const classes = `artwork${round ? " round" : ""} ${className}`.trim();
  return src
    ? <img className={classes} src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
    : <span className={`${classes} empty`} aria-hidden="true"><Icon name="music" /></span>;
}

export function Skeleton({ label, kind = "shelves" }: { label: string; kind?: "shelves" | "rows" }) {
  return <div role="status" aria-busy="true" aria-label={label} className={`skeleton ${kind}`}>
    {Array.from({ length: 3 }, (_, index) => <div key={index} className="skeleton-block" aria-hidden="true">
      <span className="skeleton-line" />
      <div className="skeleton-tiles">{Array.from({ length: 3 }, (_, tile) => <span key={tile} />)}</div>
    </div>)}
  </div>;
}

/** Error and empty states share this layout; the text says which it is. */
export function Notice({ title, children, role }: { title: string; children?: ReactNode; role?: "alert" | "status" }) {
  return <section className="notice" role={role}><h2>{title}</h2>{children}</section>;
}

/** A page that could not be read, with no earlier copy to show. The website is one tap away. */
export function LoadError({ error }: { error: ErrorBody | null }) {
  const { viewWebsite } = useRouter();
  const message = error?.code === "NOT_READY" || error?.code === "DEADLINE"
    ? "Spotify did not answer in time."
    : error?.message || "This page could not be read.";
  return <Notice title="Couldn't load this page" role="alert">
    <p>{message}</p>
    <button type="button" className="secondary" onClick={() => viewWebsite()}>
      Open on Spotify <Icon name="external" />
    </button>
  </Notice>;
}

/** A short message for a command that did not take effect. */
export function failureText(result: { outcome: string; code?: string | null; message?: string | null }): string | null {
  if (result.outcome === "failed") return result.message || "Spotify didn't do that. Try again.";
  if (result.outcome === "unknown") return "Spotify didn't confirm that. Check again in a moment.";
  return null;
}
