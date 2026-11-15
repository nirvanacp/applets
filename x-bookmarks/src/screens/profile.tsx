import { useRef } from "react";
import { useRouter, type CurrentScreen, type WatchValue } from "@let/sdk/react";
import { ORIGIN, profileUrl, rememberPhotos, type FeedItem, type MediaTile, type PostView, type ProfileHeader } from "../model";
import { FeedList, ShowMore, TileGrid } from "../components/lists";
import { EmptyNotice, InlineError } from "../components/states";
import { RichText } from "../components/text";
import { Avatar, FadeImage, PageScroller, RefreshButton, Segments, TopBar, useOpenUrl } from "../ui/frame";
import { Icon, Verified } from "../ui/icons";
import { FeedSkeleton, GridSkeleton, ProfileSkeleton } from "../ui/skeletons";
import { LoadError, useSawLoading, WebsiteCue } from "../ui/states";
import { delivered, onScreen, refreshing, useScreenWatch, useSettled, viewOf } from "../screen";

const SECTIONS = [{ id: "", label: "Posts" }, { id: "/with_replies", label: "Replies" }, { id: "/media", label: "Media" }];

/** A profile: its header, then Posts, Replies or Media. Each section is X's own page for it. */
export function ProfileScreen(_: { screen: CurrentScreen }) {
  const { navigate, status, state } = useRouter();
  const page = status();
  const header = useScreenWatch<ProfileHeader | null>("profile", "header");
  const posts = useScreenWatch<unknown, FeedItem | null>("profile", "posts");
  const tiles = useScreenWatch<unknown, MediaTile | null>("profile", "tiles");
  const empty = useScreenWatch<string | null>("profile", "empty");
  const handle = page.params.handle ?? "";
  const path = page.url ? new URL(page.url).pathname : "";
  const section = SECTIONS.find(item => item.id && path.endsWith(item.id))?.id ?? "";
  const here = onScreen(page, "profile");
  // Switching sections loads X's page for it; keep this profile's header meanwhile so only the list waits.
  const kept = useRef<ProfileHeader | null>(null);
  if (here && header.value) kept.current = header.value;
  const last = kept.current?.handle.toLowerCase() === handle.toLowerCase() ? kept.current : null;
  const profile = here ? header.value ?? last : null;
  const grid = here && section === "/media" ? tiles.order : [];
  const shown = here ? (posts.order.length ? posts.order : grid) : [];
  const partial = here && posts.status === "error";
  // A missing or suspended account: the page is ready with X's empty state and no header.
  const missing = here && delivered(header) && !header.value && !!empty.value;
  const view = viewOf(page, !!profile || shown.length > 0, missing, partial);
  const busy = refreshing(page);
  const fadeIn = useSawLoading(view === "loading");
  // The Profile tab's own profile is its root: no Back there.
  const root = state.active === "account" && (state.contexts.account?.index ?? 0) === 0;
  const actionable = page.signedIn === true && !page.stale;

  // The page is ready once the header shows, which can be before X renders the section's list.
  // So a section reads as empty only when X says so, or after it has stayed empty for a while.
  const listed = delivered(posts) && (section !== "/media" || delivered(tiles));
  const settled = useSettled(here && listed && shown.length === 0 && !page.stale ? page.url ?? "" : null);
  let list;
  if (shown.length === 0) list = partial ? <InlineError>Some posts couldn't be read.</InlineError>
    : !listed || (!empty.value && !settled) ? (section === "/media" ? <GridSkeleton /> : <FeedSkeleton label="Loading posts" rows={3} />)
    : <EmptyNotice title={empty.value ?? (section === "/media" ? "No photos or videos yet" : "No posts yet")}>
      <p>{section === "/with_replies" ? "Replies show up here." : section === "/media" ? "Photos and videos show up here." : "Posts show up here."}</p>
    </EmptyNotice>;
  else list = <>
    {partial && <InlineError>Some posts couldn't be read.</InlineError>}
    {posts.order.length === 0 ? <TileGrid items={tiles} />
      : section === "/media" ? <MediaGrid items={posts} /> : <FeedList items={posts} actionable={actionable} />}
    <ShowMore stale={page.stale} />
  </>;

  return <>
    <TopBar title={profile?.name ?? `@${handle}`} sub={profile ? `@${profile.handle}` : undefined} back={!root}
      actions={<RefreshButton busy={busy} />} />
    {view === "error" && !partial ? <LoadError error={page.error} site="X" />
      : view === "loading" ? <ProfileSkeleton />
      : view === "empty" ? <EmptyNotice title={empty.value ?? "This account doesn't exist"} website>
        <p>X has nothing to show for @{handle}.</p>
      </EmptyNotice>
      : <PageScroller busy={busy} className="profile-screen">
        <div className={fadeIn ? "reveal" : undefined}>
          {page.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          {profile ? <Header profile={profile} /> : <h2 className="profile-fallback">@{handle}</h2>}
          <Segments label="Profile sections" active={section} options={SECTIONS.map(item => ({
            ...item, go: () => navigate({ url: `${profileUrl(handle)}${item.id}`, mode: "replace" }),
          }))} />
          {list}
        </div>
      </PageScroller>}
  </>;
}

function Header({ profile }: { profile: ProfileHeader }) {
  const open = useOpenUrl();
  return <header className="profile">
    <div className="banner">{profile.banner && <FadeImage src={profile.banner} />}</div>
    <div className="profile-top">
      <Avatar src={profile.avatar} size={80} name={profile.name} />
      {profile.own && <button type="button" className="button secondary small" onClick={() => open(`${ORIGIN}/settings/profile`)}>
        Edit profile <WebsiteCue />
      </button>}
    </div>
    <h2 className="profile-name" dir="auto">{profile.name}{profile.verified && <Verified />}</h2>
    <p className="post-meta">@{profile.handle}</p>
    {profile.description && <RichText parts={[{ text: profile.description }]} className="post-text" />}
    {profile.details && <p className="post-meta profile-details">{profile.details}</p>}
    {profile.links.length > 0 && <p className="profile-links">
      {/* Following and Followers are X's own lists: the website, with the cue. */}
      {profile.links.map(link => <a key={link.url} href={link.url} onClick={event => { event.preventDefault(); open(link.url); }}>
        {link.label} <WebsiteCue />
      </a>)}
    </p>}
  </header>;
}

/** The Media section as a grid of each post's first photo; a video-only post shows its preview with a play badge. */
function MediaGrid({ items }: { items: WatchValue<unknown, FeedItem | null> }) {
  const open = useOpenUrl();
  const posts = items.order.flatMap(key => {
    const item = items.records[key];
    return item?.kind === "post" && (item.post.photos.length > 0 || item.post.videos > 0) ? [{ key, post: item.post }] : [];
  });
  const label = (post: PostView) => `${post.photos.length ? `Photo` : "Video"} by ${post.name}${post.photos.length > 1 ? `, 1 of ${post.photos.length}` : ""}`;
  return <div className="media-grid">
    {posts.map(({ key, post }) => <button type="button" key={key} className="media-tile" aria-label={label(post)}
      onClick={() => {
        if (post.photos.length) rememberPhotos(post.postId, post.photos);
        open(post.photos.length ? `${post.url}/photo/1` : post.url);
      }}>
      {post.photos[0] ? <FadeImage src={post.photos[0]} />
        : post.poster ? <><FadeImage src={post.poster} /><span className="media-tile-play" aria-hidden="true"><Icon name="play" filled /></span></>
        : <span className="media-tile-video"><Icon name="play" filled /></span>}
      {post.photos.length > 1 && <span className="media-tile-count" aria-hidden="true">{post.photos.length}</span>}
    </button>)}
  </div>;
}
