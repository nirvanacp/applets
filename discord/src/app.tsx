import { useRef, type ComponentType } from "react";
import { useRouter } from "@let/sdk/react";
import { ORIGIN } from "./components/commands";
import { Icon, type IconName } from "./components/ui";
import { ChannelsScreen } from "./screens/channels";
import { ChatScreen } from "./screens/chat";
import { MessagesScreen } from "./screens/messages";
import { ServersScreen } from "./screens/servers";
import { ToastProvider, ToastRegion } from "./ui/feedback";
import { GhostLayer, reducedMotion, Stage, usePlaceMotion, type Place } from "./ui/motion";

const SCREENS: Record<string, ComponentType> = {
  messages: MessagesScreen, servers: ServersScreen, channels: ChannelsScreen, chat: ChatScreen,
};

type TabId = "messages" | "servers";

/**
 * Two tabs, as Discord's own phone app has: Messages is Discord's Direct Messages page; Servers is
 * an applet screen at the root of the overlay that lists the server rail.
 */
const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "messages", label: "Messages", icon: "chat" },
  { id: "servers", label: "Servers", icon: "servers" },
];

export function App() {
  return <ToastProvider><Shell /></ToastProvider>;
}

function Shell() {
  const { screen, state, navigate } = useRouter();
  const layer = useRef<HTMLDivElement>(null);
  const Screen = screen ? SCREENS[screen.id] : undefined;
  const root = state.overlay[0]?.id;
  const depth = state.overlay.length;
  const current: TabId | null = root === "servers" && depth === 1 ? "servers"
    : depth === 0 && screen?.id === "messages" ? "messages" : null;
  // Tabs show only on their own first screens; a conversation and the channel list take the whole height.
  const tabRoot = current !== null;

  // Context screen keys end in the history index; overlay screens keep the last index seen.
  const index = useRef(0);
  const match = screen && !screen.overlay ? /:(\d+)$/.exec(screen.key) : null;
  if (match) index.current = Number(match[1]);
  const place: Place = { id: screen?.key ?? "website", index: index.current, depth, tab: tabRoot, drawer: screen?.id === "channels" };
  const motion = usePlaceMotion(place);

  const choose = (tab: TabId) => {
    // Reselecting the tab on its own first screen scrolls it to the top.
    if (tab === current) {
      document.querySelector(".stage .screen")?.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
      return;
    }
    if (tab === "servers") navigate({ screen: "servers", mode: "root" });
    else navigate({ url: `${ORIGIN}/channels/@me` });
  };

  return <div className={`app${tabRoot ? " has-tabs" : ""}`}>
    <main className="content">
      <Stage id={place.id} motion={motion} layer={layer} zIndex={10}>
        {Screen && screen && <Screen key={screen.key} />}
      </Stage>
      <GhostLayer layer={layer} />
    </main>
    {tabRoot && <nav className="tabs" aria-label="Sections">
      {TABS.map(tab => {
        const here = tab.id === current;
        return <button type="button" key={tab.id} className="tab" aria-current={here ? "page" : undefined} onClick={() => choose(tab.id)}>
          <span className="tab-icon"><Icon name={tab.icon} filled={here} /></span>
          <span className="tab-label">{tab.label}</span>
        </button>;
      })}
    </nav>}
    <ToastRegion />
  </div>;
}
