import { useRef, type ComponentType } from "react";
import { useRouter, type CurrentScreen } from "@let/sdk/react";
import { ToastProvider, ToastRegion } from "./ui/feedback";
import { Icon, type IconName } from "./ui/icons";
import { GhostLayer, Stage, usePlaceMotion, type Place } from "./ui/motion";
import { CategoriesScreen } from "./screens/categories";
import { FeedScreen, homeFeedOf } from "./screens/feed";
import { InfoScreen } from "./screens/info";
import { ItemScreen } from "./screens/item";
import { MeScreen } from "./screens/me";
import { PostScreen } from "./screens/post";
import { SaveScreen } from "./screens/save";
import { SavedScreen } from "./screens/saved";
import { ResultsScreen, SearchScreen } from "./screens/search";
import { UserScreen } from "./screens/user";

const SCREENS: Record<string, ComponentType> = {
  feed: FeedScreen, item: ItemScreen, user: UserScreen, info: InfoScreen, search: SearchScreen, results: ResultsScreen,
  post: PostScreen, saved: SavedScreen, categories: CategoriesScreen, save: SaveScreen, me: MeScreen,
};

/**
 * The tabs. Home, Post and Me are website contexts, each with its own history; Search and Saved
 * are applet screens opened as the root of the overlay. A tab's id is its context or screen.
 */
const TABS: { id: string; label: string; icon: IconName; context: boolean }[] = [
  { id: "primary", label: "Home", icon: "home", context: true },
  { id: "search", label: "Search", icon: "search", context: false },
  { id: "post", label: "Post", icon: "post", context: true },
  { id: "saved", label: "Saved", icon: "bookmark", context: false },
  { id: "me", label: "Me", icon: "person", context: true },
];

export function App() {
  return <ToastProvider><Shell /></ToastProvider>;
}

/**
 * The tab roots, where the tab bar shows: Home's feeds (Top, New, Past, Comments, Ask, Show,
 * Jobs), search and its results, the Post form, Saved and Me. Pushed screens (a discussion, a
 * profile, a list opened from a profile, Categories, Save) show no tab bar; Back returns.
 */
function isTabRoot(screen: CurrentScreen | null, url: string | null, depth: number): boolean {
  if (!screen) return false;
  switch (screen.id) {
    case "search": case "saved": return depth === 1;
    case "results": return screen.context === "primary" && depth === 0;
    case "feed": return screen.context === "primary" && depth === 0 && homeFeedOf(url) !== null;
    case "post": return screen.context === "post" && depth === 0;
    case "me": return screen.context === "me" && depth === 0;
    default: return false;
  }
}

function Shell() {
  const { screen, active, state, select, navigate } = useRouter();
  const layer = useRef<HTMLDivElement>(null);
  const overlay = state.overlay;
  const depth = overlay.length;

  // Context screen keys end in the history index; overlay screens keep the last index seen.
  const index = useRef(0);
  const match = screen && !screen.overlay ? /:(\d+)$/.exec(screen.key) : null;
  if (match) index.current = Number(match[1]);
  const root = isTabRoot(screen, state.contexts[active]?.url ?? null, depth);
  const place: Place = { id: screen?.key ?? "website", index: index.current, depth, tab: root, drawer: false };
  const motion = usePlaceMotion(place);
  const Screen = screen ? SCREENS[screen.id] : undefined;

  // An overlay opened from a tab (Categories from Saved, say) keeps that tab current. Search
  // results load in the Home context, and the Search tab stays current over them.
  const first = overlay[0]?.id;
  const current = first === "search" || first === "saved" ? first : depth > 0 ? null
    : screen?.id === "results" ? "search" : active;

  const choose = (tab: (typeof TABS)[number]) => {
    // Selecting the current context returns it to its start page, or scrolls to the top there
    // (the router's `select`). An overlay tab scrolls its own screen to the top.
    if (tab.context) return select(tab.id);
    if (tab.id === current && first === tab.id && depth === 1) {
      document.querySelector(".stage .screen")?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate({ screen: tab.id, mode: "root" });
  };

  return <div className={`app${root ? " has-tabs" : ""}`}>
    <main className="content">
      <Stage id={place.id} motion={motion} layer={layer} zIndex={10}>{Screen && <Screen key={screen!.key} />}</Stage>
      <GhostLayer layer={layer} />
    </main>
    {root && <nav className="tabs" aria-label="Sections">
      {TABS.map(tab => {
        const here = tab.id === current;
        return <button type="button" key={tab.id} className="tab" aria-current={here ? "page" : undefined} onClick={() => choose(tab)}>
          <span className="tab-icon"><Icon name={tab.icon} filled={here} /></span>
          <span className="tab-label">{tab.label}</span>
        </button>;
      })}
    </nav>}
    <ToastRegion />
  </div>;
}
