import { useEffect } from "react";
import { ScrollMemory, useCommand, usePending, useRouter, type WatchValue } from "@genesis/sdk/react";
import { ORIGIN, type PostView, type StoryRing } from "../model";
import { invoked, PostCard } from "../components/post";
import { MoreButton } from "../components/more";
import { Avatar, Icon, InlineError, LoadError, ModeTabs, Notice, SignInPrompt, Skeleton } from "../components/ui";
import { delivered, onScreen, signedIn, usePageStatus, useScreenWatch } from "../screen";

const VARIANTS = [
  { id: "", label: "For you" },
  { id: "following", label: "Following" },
  { id: "favorites", label: "Favorites" },
];

/** Set by "+" on Following or Favorites: open the create menu once Home has loaded. */
let createAfterHome = false;

/** Home: the stories tray and the feed, with Instagram's Following and Favorites feeds as modes. */
export function HomeScreen() {
  const { navigate, viewWebsite } = useRouter();
  const page = usePageStatus();
  const feed = useScreenWatch<unknown, PostView | null>("home", "feed");
  const stories = useScreenWatch<unknown, StoryRing | null>("home", "stories");
  const here = onScreen(page, "home");
  const variant = page.url ? new URL(page.url).searchParams.get("variant") ?? "" : "";
  const shown = here ? feed.order : [];
  const actionable = signedIn(page) && !page.stale;

  let body;
  if (page.status === "auth") body = <SignInPrompt reason="Sign in to see your feed." />;
  else if (shown.length === 0) {
    if (here && feed.status === "error") body = <InlineError>Some posts couldn't be read.</InlineError>;
    else if (page.status === "ready" && here && delivered(feed)) body = variant === "favorites"
      ? <Notice title="No favorites yet"><p>Add accounts to your favorites on Instagram to see their posts here.</p></Notice>
      : <Notice title="No posts yet"><p>Posts from accounts you follow show up here.</p></Notice>;
    else body = page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading feed" kind="posts" />;
  } else body = <>
    {page.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
    <div className="feed">
      {shown.map(key => {
        const post = feed.records[key];
        return post ? <PostCard key={key} post={post} actionable={actionable} /> : null;
      })}
    </div>
    <MoreButton stale={page.stale} />
  </>;

  // instagram.com's mobile pages have no New post page; creating starts from the Post and Story
  // menu of the website's own Home, so "+" opens that menu and shows the page (decision-0010).
  // On Following and Favorites, Home loads first and the menu opens once it is ready. The request
  // lives outside the screen, which mounts again for the new page.
  const openCreate = useCommand("openCreate", "primary");
  const homeReady = here && page.status === "ready" && !page.stale && !variant;
  useEffect(() => {
    if (!createAfterHome || !homeReady) return;
    createAfterHome = false;
    void openCreate();
  }, [homeReady, openCreate]);
  const create = () => {
    if (variant) {
      createAfterHome = true;
      navigate({ url: `${ORIGIN}/`, context: "primary", mode: "replace" });
    } else void openCreate();
    viewWebsite("primary");
  };

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <header className="home-bar">
      <button type="button" className="icon-button" aria-label="Create on Instagram" onClick={create}>
        <Icon name="plus" />
      </button>
      <h1 className="wordmark">Instagram</h1>
      <button type="button" className="icon-button" aria-label="Notifications" onClick={() => navigate({ url: `${ORIGIN}/notifications/`, context: "primary" })}>
        <Icon name="heart" />
      </button>
    </header>
    {here && stories.order.length > 0 && <StoryTray stories={stories} />}
    {page.status !== "auth" && <ModeTabs label="Feed" active={variant} options={VARIANTS.map(option => ({
      ...option, go: () => navigate({ url: option.id ? `${ORIGIN}/?variant=${option.id}` : `${ORIGIN}/`, context: "primary", mode: "replace" }),
    }))} />}
    {body}
  </ScrollMemory>;
}

/** The stories tray. A story plays in Instagram's own viewer (decision-0006). */
function StoryTray({ stories }: { stories: WatchValue<unknown, StoryRing | null> }) {
  const { viewWebsite } = useRouter();
  const openStory = useCommand<{ user: string }>("openStory");
  const pending = usePending().map(input => invoked<{ user: string }>(input, "openStory")?.user).find(Boolean);
  return <nav className="stories" aria-label="Stories">
    {stories.order.map(key => {
      const story = stories.records[key];
      if (!story) return null;
      return <button type="button" key={key} className="story" disabled={pending !== undefined} aria-label={story.label}
        onClick={() => void openStory({ user: story.user }).then(result => { if (result.outcome !== "failed") viewWebsite(); })}>
        <Avatar src={story.avatar} size={62} ring seen={story.seen} name={story.user} />
        <span className="story-name">{story.own ? "Your story" : story.user}</span>
      </button>;
    })}
  </nav>;
}
