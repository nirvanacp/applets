import { useRef, type ComponentType } from "react";
import { useRouter } from "@let/sdk/react";
import { MiniPlayer } from "./components/mini-player";
import { usePlaybackFeed } from "./playback/use-playback";
import { Icon, type IconName } from "./components/ui";
import { ORIGIN } from "./model";
import { EntityScreen } from "./screens/entity";
import { HomeScreen } from "./screens/home";
import { HubScreen } from "./screens/hub";
import { LibraryScreen } from "./screens/library";
import { PlayerScreen } from "./screens/player";
import { SearchScreen } from "./screens/search";
import { useForgetOnSignOut } from "./screen";
import { ToastProvider, ToastRegion } from "./ui/feedback";
import { GhostLayer, reducedMotion, Stage, usePlaceMotion, type Place } from "./ui/motion";

const SCREENS: Record<string, ComponentType> = {
  home: HomeScreen, entity: EntityScreen, search: SearchScreen, hub: HubScreen, player: PlayerScreen, library: LibraryScreen,
};

type TabId = "home" | "search" | "library";

/**
 * The tabs. Home, Search and Your Library are pages of the one Spotify context, so the web player
 * keeps one playback session.
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
  usePlaybackFeed();
  useForgetOnSignOut(status("primary").signedIn);
  const Screen = screen ? SCREENS[screen.id] : undefined;
  const depth = state.overlay.length;
  const inPlayer = screen?.id === "player";
  // Your Library is an applet screen over the website's current page, which it leaves in place.
  const inLibrary = screen?.id === "library" && screen.overlay && depth === 1;
  // Liked Songs belongs to Your Library, as in the Android app.
  const current: TabId | null = inLibrary ? "library" : depth > 0 ? null
    : screen?.id === "home" || screen?.id === "search" || screen?.id === "library" ? screen.id
    : status("primary").routeId === "liked" ? "library" : null;

  // Context screen keys end in the history index; overlay screens keep the last index seen.
  const index = useRef(0);
  const match = screen && !screen.overlay ? /:(\d+)$/.exec(screen.key) : null;
  if (match) index.current = Number(match[1]);
  // A tab's own first screen: Home, Search's Browse page, or Your Library.
  const tabRoot = screen?.id === "home" && depth === 0
    || screen?.id === "search" && depth === 0 && status("primary").routeId === "search"
    || screen?.id === "library" && depth === 0 || inLibrary;
  const place: Place = { id: screen?.key ?? "website", index: index.current, depth, tab: tabRoot, drawer: false, full: inPlayer };
  const motion = usePlaceMotion(place);

  const choose = (tab: TabId) => {
    // Reselecting the tab on its own first screen scrolls it to the top, as the Android app does.
    if (tab === current && tabRoot) {
      document.querySelector(".stage .screen")?.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
      return;
    }
    // The website's Your Library page is an upsell that covers its player bar, so the applet's
    // library opens over whatever page the website shows and the playback controls keep working.
    if (tab === "library") {
      navigate({ screen: "library", mode: "root" });
      return;
    }
    navigate({ url: `${ORIGIN}${tab === "home" ? "/" : "/search"}`, sameDocument: true });
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
