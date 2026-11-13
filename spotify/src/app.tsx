import type { ComponentType } from "react";
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

const SCREENS: Record<string, ComponentType> = {
  home: HomeScreen, entity: EntityScreen, search: SearchScreen, hub: HubScreen, player: PlayerScreen, library: LibraryScreen,
};

/**
 * The tabs. Home and Search are pages of the one Spotify context, so the web player keeps one
 * playback session; Your Library is an applet screen opened as the root of the overlay.
 */
const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "search", label: "Search", icon: "search" },
  { id: "library", label: "Your Library", icon: "library" },
];

export function App() {
  const { screen, state, navigate } = useRouter();
  const Screen = screen ? SCREENS[screen.id] : undefined;
  const root = state.overlay[0]?.id;
  const inPlayer = screen?.id === "player";
  const current = root === "library" ? "library" : state.overlay.length > 0 ? null : screen?.id === "home" || screen?.id === "search" ? screen.id : null;
  const choose = (tab: string) => {
    if (tab === "library") navigate({ screen: "library", mode: "root" });
    else navigate({ url: tab === "home" ? `${ORIGIN}/` : `${ORIGIN}/search` });
  };

  return <div className={`app${inPlayer ? " full" : ""}`}>
    <main className="content">{Screen && <Screen key={screen!.key} />}</main>
    {!inPlayer && <MiniPlayer />}
    {!inPlayer && <nav className="tabs" aria-label="Sections">
      {TABS.map(tab => {
        const here = tab.id === current;
        return <button type="button" key={tab.id} className="tab" aria-current={here ? "page" : undefined} onClick={() => choose(tab.id)}>
          <Icon name={tab.icon} filled={here && tab.id === "home"} />
          <span>{tab.label}</span>
        </button>;
      })}
    </nav>}
  </div>;
}
