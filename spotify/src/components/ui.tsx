import { useState } from "react";

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
  tick: "M7 12.5l3.5 3.5 6.5-8",
  down: "M6 9l6 6 6-6",
  chevron: "M9 6l6 6-6 6",
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6L6 18",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  heart: "M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  artist: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  album: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M14.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0",
  more: "M12 5.5v.01M12 12v.01M12 18.5v.01",
  share: "M8.6 13.5l6.8 4M15.4 6.5l-6.8 4M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, filled = false, className }: { name: IconName; filled?: boolean; className?: string }) {
  const classes = ["icon", filled ? "filled" : "", className ?? ""].filter(Boolean).join(" ");
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={classes}><path d={ICONS[name]} /></svg>;
}

/**
 * A square of cover art in a box that already has its size: it fades in when it loads and stays a
 * neutral tile with a note when the website gives none or the image fails.
 */
export function Artwork({ src, round = false, className = "" }: { src: string | null; round?: boolean; className?: string }) {
  const classes = `artwork${round ? " round" : ""} ${className}`.trim();
  return <span className={classes} aria-hidden="true">
    {src ? <ArtImage key={src} src={src} /> : <Icon name="music" />}
  </span>;
}

function ArtImage({ src }: { src: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  if (state === "failed") return <Icon name="music" />;
  return <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={state === "loaded" ? "loaded" : undefined}
    onLoad={() => setState("loaded")} onError={() => setState("failed")} />;
}
