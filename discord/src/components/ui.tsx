import { useState, type CSSProperties } from "react";

/** Outline icons drawn for this applet on a 24px grid. Filled ones use `filled`. */
const ICONS = {
  chat: "M4 5h16v11H9l-5 4z",
  servers: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  hash: "M9 4L7 20M17 4l-2 16M4 9h16M3 15h16",
  voice: "M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  announce: "M4 10v4h3l8 5V5L7 10zM18 9.5a3.5 3.5 0 0 1 0 5",
  forum: "M4 5h12v8H8l-4 3zM20 9v10l-3-2h-6v-3",
  thread: "M5 5h14v10H9l-4 4zM9 9h6M9 12h3",
  back: "M15 5l-7 7 7 7",
  down: "M6 9l6 6 6-6",
  chevron: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  send: "M4 12l16-8-6 16-3-7z",
  attach: "M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1L13 4.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6",
  file: "M6 3h8l5 5v13H6zM14 3v5h5",
  older: "M12 19V6M6 12l6-6 6 6",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
  reply: "M10 8V4L3 11l7 7v-4c5 0 8 1.5 11 5-1-5-4-10-11-11z",
  play: "M8 5v14l11-7z",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  more: "M4.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0zM10.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0zM16.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0z",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  settings: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4",
  invite: "M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M16 11h6",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, filled = false, className }: { name: IconName; filled?: boolean; className?: string }) {
  const classes = ["icon", filled ? "filled" : "", className ?? ""].filter(Boolean).join(" ");
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={classes}><path d={ICONS[name]} /></svg>;
}

/** A stable colour per name for an avatar without a picture. */
function hueOf(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 360;
  return hash;
}

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map(word => [...word][0] ?? "").join("").slice(0, 2).toUpperCase() || "?";

/**
 * A round avatar or a rounded server icon, in a box that already has its size. It fades in when it
 * loads and shows the initials on a colour from the name when there is no image or it fails.
 */
export function Avatar({ src, name, initials, square = false, className = "" }: {
  src: string | null; name: string; initials?: string; square?: boolean; className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const showImage = src !== null && failed !== src;
  return <span className={`avatar${square ? " square" : ""} ${className}`.trim()} aria-hidden="true"
    style={{ "--avatar-hue": hueOf(name) } as CSSProperties}>
    {showImage ? <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
      className={loaded === src ? "loaded" : undefined} onLoad={() => setLoaded(src)} onError={() => setFailed(src)} />
      : <span className="avatar-initials">{initials || initialsOf(name)}</span>}
  </span>;
}

/** A count badge such as a mention count, "99+" past 99. */
export function Badge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return <span className="badge" aria-label={label}>{count > 99 ? "99+" : count}</span>;
}
