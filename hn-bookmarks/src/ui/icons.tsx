/** The applet's icon set: 24px outline paths at a 1.8 stroke, filled for the selected tab and confirmed toggles. */
const PATHS = {
  home: "M3.5 10 12 3.5l8.5 6.5v9.5a1 1 0 0 1-1 1H15v-6.2H9v6.2H4.5a1 1 0 0 1-1-1z",
  search: "M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4zM16 16l4.6 4.6",
  post: "M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zM12 8.5v7M8.5 12h7",
  bookmark: "M6 3.5h12a.5.5 0 0 1 .5.5v16.6L12 16.2l-6.5 4.4V4a.5.5 0 0 1 .5-.5z",
  person: "M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.2 20.5c.7-3.9 3.9-6.3 7.8-6.3s7.1 2.4 7.8 6.3",
  up: "M12 6.5l6.5 10h-13z",
  refresh: "M20 11.5a8 8 0 1 0-2.3 5.7M20 4.5v7h-7",
  chevron: "M9 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 10 17.5 19 7",
  comment: "M4 11.5a7.2 7.2 0 0 1 7.2-7.2h1.6a7.2 7.2 0 0 1 0 14.4H11l-4.8 3v-3.6A7.2 7.2 0 0 1 4 11.5z",
  folder: "M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v9.8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z",
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, filled = false, className }: { name: IconName; filled?: boolean; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`icon${filled ? " filled" : ""}${className ? ` ${className}` : ""}`}>
    <path d={PATHS[name]} />
  </svg>;
}
