/** The applet's icon set: 24px outline paths at a 1.75 stroke, filled for selected tabs and confirmed toggles. */
const PATHS = {
  home: "M3.5 10 12 3.5l8.5 6.5v9.5a1 1 0 0 1-1 1H15v-6.2H9v6.2H4.5a1 1 0 0 1-1-1z",
  search: "M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4zM16 16l4.6 4.6",
  bell: "M5.5 17V11a6.5 6.5 0 0 1 13 0v6l1.6 1.6H3.9zM9.6 20.8a2.6 2.6 0 0 0 4.8 0",
  bookmark: "M6 3.5h12a.5.5 0 0 1 .5.5v16.6L12 16.2l-6.5 4.4V4a.5.5 0 0 1 .5-.5z",
  person: "M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.2 20.5c.7-3.9 3.9-6.3 7.8-6.3s7.1 2.4 7.8 6.3",
  reply: "M4 11.5a7.2 7.2 0 0 1 7.2-7.2h1.6a7.2 7.2 0 0 1 0 14.4H11l-4.8 3v-3.6A7.2 7.2 0 0 1 4 11.5z",
  repost: "M7 4.5 4 7.5l3 3M4 7.5h11.5a3 3 0 0 1 3 3v2M17 19.5l3-3-3-3M20 16.5H8.5a3 3 0 0 1-3-3v-2",
  heart: "M12 20.2s-8.2-4.7-8.2-10.6a4.6 4.6 0 0 1 8.2-2.9 4.6 4.6 0 0 1 8.2 2.9c0 5.9-8.2 10.6-8.2 10.6z",
  views: "M5 20V13M10 20V7M15 20v-9M20 20V4",
  folder: "M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v9.8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z",
  share: "M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6.5",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14",
  back: "M19.5 12h-15M10.5 5.5 4 12l6.5 6.5",
  close: "M6 6l12 12M18 6 6 18",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  check: "M5 12.5 10 17.5 19 7",
  photo: "M4.5 4.5h15a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1zM3.5 16l5-5 4.2 4.2 2.3-2.3 5.5 5.5M15.5 9h.01",
  feather: "M5 19 15.5 8.5M19.6 4.4C13 4.4 7 8.5 7 15.5V17h1.5c7 0 11.1-6 11.1-12.6zM5 21v-2",
  refresh: "M20 11.5a8 8 0 1 0-2.3 5.7M20 4.5v7h-7",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13",
  play: "M8 5.5v13l10.5-6.5z",
  pin: "M9 4h6l-1 6 3 3H7l3-3zM12 13v7",
  logo: "M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.5z",
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, filled = false, className }: { name: IconName; filled?: boolean; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`icon${filled ? " filled" : ""}${className ? ` ${className}` : ""}`}>
    <path d={PATHS[name]} />
  </svg>;
}

/** X's verified badge. */
export function Verified() {
  return <svg viewBox="0 0 24 24" className="verified" role="img" aria-label="Verified account">
    <path d="M12 2.4l2.5 1.8 3-.1 1 2.9 2.5 1.8-.9 2.9.9 2.9-2.5 1.8-1 2.9-3-.1L12 21.6l-2.5-1.8-3 .1-1-2.9-2.5-1.8.9-2.9-.9-2.9 2.5-1.8 1-2.9 3 .1z" />
    <path d="M8.2 12.2l2.5 2.5 5.1-5.3" className="tick" />
  </svg>;
}
