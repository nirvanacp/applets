import { useRef, type ComponentType } from "react";
import { useRouter } from "@genesis/sdk/react";
import { MiniPlayer } from "./components/mini-player";
import { Icon, type IconName } from "./components/ui";
import { ORIGIN } from "./model";
import { EntityScreen } from "./screens/entity";
import { HomeScreen } from "./screens/home";
import { HubScreen } from "./screens/hub";
import { LibraryScreen } from "./screens/library";
import { PlayerScreen } from "./screens/player";
import { SearchScreen } from "./screens/search";
import { ToastProvider, ToastRegion } from "./ui/feedback";
import { GhostLayer, reducedMotion, Stage, usePlaceMotion, type Place } from "./ui/motion";

const SCREENS: Record<string, ComponentType> = {
  home: HomeScreen, entity: EntityScreen, search: SearchScreen, hub: HubScreen, player: PlayerScreen, library: LibraryScreen,
};

type TabId = "home" | "search" | "library";

/**
 * The tabs. Home and Search are pages of the one Spotify context, so the web player keeps one
 * playback session; Your Library is an applet screen opened as the root of the overlay.
 */
const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "search", label: "Search", icon: "search" },
  { id: "library", label: "Your Library", icon: "library" },
];

export function App() {
  return <ToastProvider><Shell /></ToastProvider>;
}

function Shell() {
  const { screen, state, navigate, status } = useRouter();
  const layer = useRef<HTMLDivElement>(null);
  const Screen = screen ? SCREENS[screen.id] : undefined;
  const root = state.overlay[0]?.id;
  const depth = state.overlay.length;
  const inPlayer = screen?.id === "player";
  const current: TabId | null = root === "library" ? "library"
    : depth > 0 ? null : screen?.id === "home" || screen?.id === "search" ? screen.id : null;

  // Context screen keys end in the history index; overlay screens keep the last index seen.
  const index = useRef(0);
  const match = screen && !screen.overlay ? /:(\d+)$/.exec(screen.key) : null;
  if (match) index.current = Number(match[1]);
  // A tab's own first screen: Home, Search's Browse page, or Your Library at the overlay's root.
  const tabRoot = screen?.id === "home" && depth === 0
    || screen?.id === "search" && depth === 0 && status("primary").routeId === "search"
    || screen?.id === "library" && depth === 1;
  const place: Place = { id: screen?.key ?? "website", index: index.current, depth, tab: tabRoot, drawer: false, full: inPlayer };
  const motion = usePlaceMotion(place);

  const choose = (tab: TabId) => {
    // Reselecting the tab on its own first screen scrolls it to the top, as the Android app does.
    if (tab === current && tabRoot) {
      document.querySelector(".stage .screen")?.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
      return;
    }
    if (tab === "library") navigate({ screen: "library", mode: "root" });
    else navigate({ url: tab === "home" ? `${ORIGIN}/` : `${ORIGIN}/search` });
  };

  return <div className={`app${inPlayer ? " full" : " has-tabs"}`}>
    <main className="content">
      <Stage id={place.id} motion={motion} layer={layer} zIndex={10}>
        {Screen && screen && <Screen key={screen.key} />}
      </Stage>
      <GhostLayer layer={layer} />
    </main>
    {!inPlayer && <MiniPlayer />}
    {!inPlayer && <nav className="tabs" aria-label="Sections">
      {TABS.map(tab => {
        const here = tab.id === current;
        return <button type="button" key={tab.id} className="tab" aria-current={here ? "page" : undefined} onClick={() => choose(tab.id)}>
          <span className="tab-icon"><Icon name={tab.icon} filled={here && tab.id === "home"} /></span>
          <span className="tab-label">{tab.label}</span>
        </button>;
      })}
    </nav>}
    <ToastRegion />
  </div>;
}
