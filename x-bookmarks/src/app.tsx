import { useEffect, useRef, useState, type ComponentType } from "react";
import { useAppResume, useRouter, type CurrentScreen } from "@let/sdk/react";
import { stopHolding } from "./feed-hold";
import { ORIGIN } from "./model";
import { SHEETS } from "./routes";
import { useForgetOnSignOut } from "./screen";
import { ToastProvider, ToastRegion } from "./ui/feedback";
import { Icon, type IconName } from "./ui/icons";
import { GhostLayer, reducedMotion, Stage, usePlaceMotion, type Motion, type Place } from "./ui/motion";
import { AccountScreen } from "./screens/account";
import { CategoriesScreen } from "./screens/categories";
import { ComposeScreen } from "./screens/compose";
import { ExploreScreen } from "./screens/explore";
import { ManageScreen } from "./screens/manage";
import { MediaScreen } from "./screens/media";
import { PostScreen } from "./screens/post";
import { ProfileScreen } from "./screens/profile";
import { RepostScreen } from "./screens/repost";
import { SaveScreen } from "./screens/save";
import { TimelineScreen } from "./screens/timeline";

type ScreenProps = { screen: CurrentScreen };

const SCREENS: Record<string, ComponentType<ScreenProps>> = {
  home: TimelineScreen, notifications: TimelineScreen, saved: TimelineScreen, explore: ExploreScreen, post: PostScreen,
  profile: ProfileScreen, media: MediaScreen, account: AccountScreen, compose: ComposeScreen, categories: CategoriesScreen,
};
const SHEET_SCREENS: Record<string, ComponentType<ScreenProps>> = { save: SaveScreen, manage: ManageScreen, repost: RepostScreen };

type TabId = "home" | "explore" | "notifications" | "saved" | "profile";

/**
 * The five tabs. Explore and Profile have contexts of their own. Home, Notifications and Saved
 * share the primary context, whose start page is Home, so Notifications and Saved load their X
 * page in it.
 */
const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "explore", label: "Explore", icon: "search" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "saved", label: "Saved", icon: "bookmark" },
  { id: "profile", label: "Profile", icon: "person" },
];

const PATHS: Record<string, string> = { home: "/home", notifications: "/notifications", saved: "/i/history" };

/** The primary tab a URL is the start of, or null for a page opened from one, such as a post. */
function primaryTab(url: string | null): TabId | null {
  const path = url ? new URL(url).pathname : "/home";
  if (path === "/home" || path === "/") return "home";
  if (path === "/notifications") return "notifications";
  if (path.startsWith("/i/history") || path === "/i/bookmarks") return "saved";
  return null;
}

export function App() {
  return <ToastProvider><Shell /></ToastProvider>;
}

function Shell() {
  const { screen, active, state, select, navigate, reload, status } = useRouter();
  useForgetOnSignOut(status(active).signedIn);
  // The website or time away may have changed the signed-in account. Until the account page
  // loads again, Categories waits instead of using the old account.
  useAppResume(() => reload("account"));
  const baseLayer = useRef<HTMLDivElement>(null);
  const sheetLayer = useRef<HTMLDivElement>(null);

  // A sheet keeps the last screen under it, under that screen's own key, without motion.
  const sheet = screen && SHEETS.has(screen.id) ? screen : null;
  const lastBase = useRef<CurrentScreen | null>(null);
  if (screen && !sheet) lastBase.current = screen;
  const base = sheet ? lastBase.current : screen;

  // Context screen keys end in the history index; overlay screens keep the last index seen.
  const index = useRef(0);
  const match = base && !base.overlay ? /:(\d+)$/.exec(base.key) : null;
  if (match) index.current = Number(match[1]);
  const depth = state.overlay.filter(entry => !SHEETS.has(entry.id)).length;

  const primary = primaryTab(state.contexts.primary?.url ?? null);
  const lastPrimary = useRef<TabId>("home");
  if (active === "primary" && depth === 0 && primary) lastPrimary.current = primary;
  if (base?.id === "categories") lastPrimary.current = "saved";
  const lastSaved = useRef<"x" | "categories">("x");
  if (base?.id === "categories") lastSaved.current = "categories";
  else if (base?.id === "saved" && primary === "saved") lastSaved.current = "x";

  const root = isTabRoot(base, state.contexts);
  const place: Place = { id: base?.key ?? "website", index: index.current, depth, tab: root, drawer: false };
  const baseMotion = usePlaceMotion(place);
  const sheetMotion = useSheetMotion(sheet?.key ?? null);

  const current: TabId = base?.id === "categories" ? "saved"
    : active === "explore" ? "explore" : active === "account" ? "profile" : primary ?? lastPrimary.current;

  const choose = (tab: TabId) => {
    if (tab === "explore") return select("explore");
    if (tab === "profile") return select("account");
    const here = tab === current;
    // A reselect goes to the top: a held list putting its row back must not pull the list down again.
    if (here) stopHolding();
    // Reselecting the tab on its own page scrolls to the top (Home's start page does that on select).
    if (here && tab !== "home" && (primary === tab || base?.id === "categories") && active === "primary") {
      document.querySelector(".stage .screen")?.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
      return;
    }
    if (tab === "saved" && lastSaved.current === "categories") return navigate({ screen: "categories", mode: "root" });
    if (tab === primary || (tab === "home" && active === "primary" && depth === 0)) return select("primary");
    navigate({ url: `${ORIGIN}${PATHS[tab]}`, context: "primary" });
  };

  const Base = base ? SCREENS[base.id] : undefined;
  const Sheet = sheet ? SHEET_SCREENS[sheet.id] : undefined;
  // The tab bar is hidden while a sheet is open, so nothing behind the sheet takes taps.
  const tabs = root && !sheet;
  const barsAway = useBarsAway(place.id) && tabs;
  return <div className={`app${tabs ? " has-tabs" : ""}${barsAway ? " bars-away" : ""}`}>
    <main className="content">
      <Stage id={place.id} motion={sheet ? "none" : baseMotion} layer={baseLayer} zIndex={10} inert={!!sheet}>
        {Base && base && <Base key={base.key} screen={base} />}
      </Stage>
      <GhostLayer layer={baseLayer} />
    </main>
    {tabs && <nav className="tabs" aria-label="Sections">
      {TABS.map(tab => {
        const here = tab.id === current;
        return <button type="button" key={tab.id} className="tab" aria-current={here ? "page" : undefined} aria-label={tab.label} onClick={() => choose(tab.id)}>
          <span className="tab-icon"><Icon name={tab.icon} filled={here} /></span>
        </button>;
      })}
    </nav>}
    <div className="sheet-host">
      <Stage id={sheet?.key ?? null} motion={sheetMotion} layer={sheetLayer} zIndex={30}>
        {Sheet && sheet && <Sheet key={sheet.key} screen={sheet} />}
      </Stage>
      <GhostLayer layer={sheetLayer} />
    </div>
    <ToastRegion />
  </div>;
}

/**
 * The tab roots, where the tab bar shows: Home, Notifications, Saved (Bookmarks, Likes,
 * Categories), Explore's start page and the Profile tab's own profile.
 */
function isTabRoot(screen: CurrentScreen | null, contexts: Record<string, { url?: string | null; index?: number } | undefined>): boolean {
  if (!screen) return false;
  if (screen.id === "categories") return true;
  const atStart = (contexts[screen.context]?.index ?? 0) === 0;
  switch (screen.id) {
    case "home": case "notifications": return true;
    case "saved": return primaryTab(contexts.primary?.url ?? null) === "saved";
    case "explore": return screen.context === "explore" && atStart;
    case "account": case "profile": return screen.context === "account" && atStart;
    default: return false;
  }
}

/** Scrolling this far in one direction moves the bars; near the top they always show. */
const BAR_SLACK_PX = 12;
const BAR_TOP_PX = 80;
/** How long after the reader's last touch a scroll still counts as theirs, while a fling runs. */
const BAR_FLING_MS = 1500;

/**
 * True while the user scrolls down a screen, as X's app moves its bars out of the way to show more
 * posts. Scrolling up, reaching the top or changing screens brings them back. Only the reader's
 * own scrolls move them: a list putting its row back also scrolls, and moving the bars then would
 * move the row it just put back.
 */
function useBarsAway(placeId: string): boolean {
  const [away, setAway] = useState(false);
  useEffect(() => {
    setAway(false);
    const last = new WeakMap<Element, number>();
    let touchedAt = -Infinity;
    const touched = () => { touchedAt = performance.now(); };
    const onScroll = (event: Event) => {
      const scroller = event.target;
      if (!(scroller instanceof HTMLElement) || !scroller.matches(".stage .screen")) return;
      const top = scroller.scrollTop;
      const delta = top - (last.get(scroller) ?? top);
      const own = performance.now() - touchedAt < BAR_FLING_MS;
      if (top < BAR_TOP_PX) { setAway(false); last.set(scroller, top); }
      else if (!own) last.set(scroller, top);
      else if (Math.abs(delta) >= BAR_SLACK_PX) { setAway(delta > 0); last.set(scroller, top); }
      else if (!last.has(scroller)) last.set(scroller, top);
    };
    const touchEvents = ["touchstart", "touchmove", "touchend"] as const;
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    for (const name of touchEvents) document.addEventListener(name, touched, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      for (const name of touchEvents) document.removeEventListener(name, touched, { capture: true });
    };
  }, [placeId]);
  return away;
}

/** A sheet rises with CSS on mount, sinks when it closes, and swaps when another replaces it. */
function useSheetMotion(key: string | null): Motion {
  const last = useRef<{ key: string | null; motion: Motion }>({ key: null, motion: "none" });
  if (last.current.key !== key) {
    const from = last.current.key;
    last.current = { key, motion: from === null ? "none" : key === null ? "sheet-close" : "sheet-swap" };
  }
  return last.current.motion;
}
