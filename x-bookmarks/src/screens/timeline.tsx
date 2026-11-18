import type { CurrentScreen } from "@let/sdk/react";
import { useRouter } from "@let/sdk/react";
import { useAccount } from "../library";
import { ORIGIN, rememberOwnAvatar, type FeedItem } from "../model";
import { FeedList, ShowMore } from "../components/lists";
import { SavedSegments } from "../components/saved";
import { EmptyNotice, InlineError, SignInNotice } from "../components/states";
import { Avatar, PageScroller, RefreshButton, TopBar, useOpenUrl } from "../ui/frame";
import { Icon } from "../ui/icons";
import { FeedSkeleton, NotificationsSkeleton } from "../ui/skeletons";
import { LoadError, useSawLoading } from "../ui/states";
import { delivered, onScreen, refreshing, useScreenWatch, viewOf } from "../screen";

type Kind = "home" | "notifications" | "bookmarks" | "likes" | "other-likes";

const TITLES: Record<Kind, string> = { home: "Home", notifications: "Notifications", bookmarks: "Saved", likes: "Saved", "other-likes": "Likes" };
const SIGN_IN: Record<Kind, string> = {
  home: "Sign in to see your timeline.",
  notifications: "Sign in to see your notifications.",
  bookmarks: "Sign in to see your bookmarks.",
  likes: "Sign in to see your likes.",
  "other-likes": "Sign in to see these likes.",
};
const EMPTY: Record<Kind, string> = {
  home: "Follow people to fill your timeline.",
  notifications: "Likes, replies and follows show up here.",
  bookmarks: "Bookmark posts to find them here later.",
  likes: "Posts you like show up here.",
  "other-likes": "This account hasn't liked anything yet.",
};

/**
 * Which list a timeline URL shows. Someone else's likes use this screen without the Saved
 * segments; while the account is unknown, a likes page shows as plain "Likes" rather than guess.
 */
function kindOf(path: string, account: string | null): { kind: Kind; handle: string | null } {
  if (path === "/home" || path === "/") return { kind: "home", handle: null };
  if (path === "/notifications") return { kind: "notifications", handle: null };
  if (path === "/i/history/likes") return { kind: "likes", handle: null };
  const likes = /^\/([A-Za-z0-9_]{1,15})\/likes$/.exec(path)?.[1] ?? null;
  if (likes) return account && likes.toLowerCase() === account.toLowerCase() ? { kind: "likes", handle: null } : { kind: "other-likes", handle: account ? likes : null };
  return { kind: "bookmarks", handle: null };
}

/** Home, Notifications, and Bookmarks or Likes under Saved. */
export function TimelineScreen({ screen }: { screen: CurrentScreen }) {
  const page = useRouter().status();
  // Home is the first screen: Genesis keeps it on the phone, so a start shows the last timeline at once.
  const persist = screen.id === "home";
  const timeline = useScreenWatch<unknown, FeedItem | null>(screen.id, "timeline", { persist });
  const empty = useScreenWatch<string | null>(screen.id, "empty", { persist });
  const account = useAccount().account?.handle ?? null;
  const { kind, handle } = kindOf(page.url ? new URL(page.url).pathname : "/home", account);
  const here = onScreen(page, screen.id);
  const shown = here ? timeline.order : [];
  const busy = refreshing(page);
  const partial = here && timeline.status === "error";
  const view = viewOf(page, shown.length > 0, here && delivered(timeline), partial);
  const fadeIn = useSawLoading(view === "loading");
  const saved = kind === "bookmarks" || kind === "likes";
  const title = kind === "other-likes" && handle ? `@${handle}'s likes` : TITLES[kind];

  return <>
    {kind === "home"
      ? <TopBar actions={view !== "auth" && <RefreshButton busy={busy} />}><HomeTitle /></TopBar>
      : <TopBar title={title} back={kind === "other-likes"} actions={view !== "auth" && <RefreshButton busy={busy} />} />}
    {saved && <SavedSegments active={kind === "likes" ? "likes" : "bookmarks"} />}
    {view === "auth" ? <SignInNotice reason={SIGN_IN[kind]} />
      : view === "error" && !partial ? <LoadError error={page.error} site="X" />
      : view === "loading" ? (kind === "notifications" ? <NotificationsSkeleton /> : <FeedSkeleton label={`Loading ${title}`} />)
      : <PageScroller busy={busy}>
        {page.status === "error" && shown.length > 0 && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
        {partial && <InlineError>Some posts couldn't be read.</InlineError>}
        {view === "empty" && <EmptyNotice title={empty.value ?? "Nothing here yet"}><p>{EMPTY[kind]}</p></EmptyNotice>}
        {shown.length > 0 && <div className={fadeIn ? "reveal" : undefined}>
          <FeedList items={timeline} actionable={page.signedIn === true && !page.stale} />
          <ShowMore stale={page.stale} />
        </div>}
      </PageScroller>}
    {kind === "home" && view !== "auth" && <ComposeButton />}
  </>;
}

/**
 * Home's header as X's app draws it: the account's picture, which opens the Profile tab, and the X
 * mark in the middle. X's tabs above the feed (For you, Following) are not drawn yet.
 */
function HomeTitle() {
  const { select } = useRouter();
  const avatar = useScreenWatch<string | null>("home", "selfAvatar", { persist: true });
  rememberOwnAvatar(avatar.value ?? null);
  return <div className="home-title">
    <button type="button" className="home-avatar" aria-label="Your profile" onClick={() => select("account")}>
      <Avatar src={avatar.value ?? null} size={32} name="" />
    </button>
    <h1 className="home-mark"><Icon name="logo" filled /><span className="visually-hidden">Home</span></h1>
  </div>;
}

/** X's floating Post button. The composer is the applet's own, over X's hidden composer page. */
function ComposeButton() {
  const open = useOpenUrl();
  return <button type="button" className="fab" aria-label="New post" onClick={() => open(`${ORIGIN}/compose/post`)}>
    <Icon name="feather" />
  </button>;
}
