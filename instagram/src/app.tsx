import { useEffect, useRef, type ComponentType } from "react";
import { useGenesis, useRouter, useWatch } from "@genesis/sdk/react";
import { ORIGIN } from "./model";
import { Avatar, Icon, type IconName } from "./components/ui";
import { ActivityScreen } from "./screens/activity";
import { CommentsScreen } from "./screens/comments";
import { ExploreScreen, KeywordScreen, SearchScreen } from "./screens/explore";
import { FollowsScreen } from "./screens/follows";
import { HomeScreen } from "./screens/home";
import { InboxScreen, ThreadScreen } from "./screens/messages";
import { PostScreen } from "./screens/post";
import { ProfileScreen } from "./screens/profile";

const SCREENS: Record<string, ComponentType> = {
  home: HomeScreen, activity: ActivityScreen, explore: ExploreScreen, search: SearchScreen, keyword: KeywordScreen,
  post: PostScreen, comments: CommentsScreen, profile: ProfileScreen, follows: FollowsScreen, inbox: InboxScreen, thread: ThreadScreen,
};

type TabId = "home" | "reels" | "messages" | "search" | "profile";

/**
 * The tabs, as in the wireframes: Home, Reels, Messages in the middle, Search and Profile. Search
 * and Messages are contexts of their own. Home, Reels and Profile share the primary context; Reels
 * is Instagram's own player (decision-0006).
 */
const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "reels", label: "Reels", icon: "reels" },
  { id: "messages", label: "Messages", icon: "messages" },
  { id: "search", label: "Search", icon: "search" },
  { id: "profile", label: "Profile", icon: "person" },
];

type Me = { user: string; avatar: string | null };

export function App() {
  const { screen, active, state, select, navigate, viewWebsite, reload } = useRouter();
  // The account comes from the navigation bar of the primary context's pages.
  const me = useWatch<Me | null>("app:me", { reader: "me" }, { context: "primary" }).value;
  const known = useRef<Me | null>(null);
  if (me) known.current = me;
  const account = known.current;
  // Back from the background, the feed may be old. `useAppResume` would also reload on Done, which
  // cancels Done's own step back, so only the app's resume reloads.
  const genesis = useGenesis();
  useEffect(() => genesis.onResume(() => reload("primary")), [genesis, reload]);

  const path = state.contexts.primary?.url ? new URL(state.contexts.primary.url).pathname : "/";
  const lastPrimary = useRef<TabId>("home");
  const primary: TabId | null = path === "/" ? "home"
    : account && path.toLowerCase().startsWith(`/${account.user.toLowerCase()}/`) ? "profile" : null;
  if (primary) lastPrimary.current = primary;
  const current: TabId = active === "explore" ? "search" : active === "direct" ? "messages" : primary ?? lastPrimary.current;

  // Search and Messages are contexts: selecting one returns to it, and reselecting it returns it to
  // its start page. Home and Profile load their page in the primary context unless it shows it.
  const choose = (tab: TabId) => {
    const own = account ? `/${account.user}/` : null;
    if (tab === "search") select("explore");
    else if (tab === "messages") select("direct");
    else if (tab === "reels") {
      navigate({ url: `${ORIGIN}/reels/`, context: "primary" });
      viewWebsite("primary");
    } else if (tab === "home") {
      if (path === "/" || lastPrimary.current === "home" && active !== "primary") select("primary");
      else navigate({ url: `${ORIGIN}/`, context: "primary" });
    } else if (!own) select("primary");
    else if (active === "primary" && path === own) document.querySelector(".screen")?.scrollTo({ top: 0, behavior: "smooth" });
    else navigate({ url: `${ORIGIN}${own}`, context: "primary" });
  };

  const Screen = screen ? SCREENS[screen.id] : undefined;
  return <div className="app">
    <main className="content">{Screen && <Screen key={screen!.key} />}</main>
    <nav className="tabs" aria-label="Sections">
      {TABS.map(tab => {
        const here = tab.id === current;
        return <button type="button" key={tab.id} className={tab.id === "messages" ? "tab center" : "tab"} aria-label={tab.label}
          aria-current={here ? "page" : undefined} onClick={() => choose(tab.id)}>
          {tab.id === "profile" && account ? <span className={here ? "tab-avatar on" : "tab-avatar"}><Avatar src={account.avatar} size={26} name={account.user} /></span>
            : <Icon name={tab.icon} filled={here} />}
        </button>;
      })}
    </nav>
  </div>;
}
