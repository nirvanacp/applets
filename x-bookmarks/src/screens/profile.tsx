import { ScrollMemory, useRouter } from "@genesis/sdk/react";
import { ORIGIN, profileUrl, type FeedItem, type ProfileHeader } from "../model";
import { Avatar, LoadError, ModeTabs, Notice, OpenOnX, Skeleton, useOpenUrl, Verified } from "../components/ui";
import { FeedList, MoreButton } from "./feed";
import { delivered, onScreen, signedIn, usePageStatus, useScreenWatch } from "../screen";

const TABS = [{ id: "", label: "Posts" }, { id: "/with_replies", label: "Replies" }, { id: "/media", label: "Media" }];

export function ProfileScreen() {
  const { navigate } = useRouter();
  const page = usePageStatus();
  const header = useScreenWatch<ProfileHeader | null>("profile", "header").value;
  const posts = useScreenWatch<unknown, FeedItem | null>("profile", "posts");
  const empty = useScreenWatch<string | null>("profile", "empty").value;
  const handle = page.params.handle ?? "";
  const path = page.url ? new URL(page.url).pathname : "";
  const section = TABS.find(tab => tab.id && path.endsWith(tab.id))?.id ?? "";
  const here = onScreen(page, "profile");
  const profile = here ? header : null;
  const shown = here ? posts.order : [];
  const actionable = signedIn(page) && !page.stale;
  const partial = here && posts.status === "error";

  let body;
  if (!profile && shown.length === 0) body = page.status === "error" ? <LoadError error={page.error} />
    : partial ? <p className="inline-error" role="alert">Some posts couldn't be read.</p>
    : <Skeleton label="Loading profile" />;
  else body = <>
    {page.status === "error" && <p className="inline-error" role="alert">Couldn't refresh. Showing the last copy.</p>}
    {profile ? <Header profile={profile} /> : <h1 className="screen-title">@{handle}</h1>}
    <ModeTabs label="Profile sections" active={section} options={TABS.map(tab => ({
      ...tab, go: () => navigate({ url: `${profileUrl(handle)}${tab.id}`, mode: "replace" }),
    }))} />
    {shown.length === 0 && partial ? <p className="inline-error" role="alert">Some posts couldn't be read.</p>
      : shown.length === 0 && !delivered(posts) ? <Skeleton label="Loading posts" />
      : shown.length === 0
      ? <Notice title={empty ?? "No posts yet"}><p>{profile ? "Posts show up here." : "X has nothing to show for this account."}</p></Notice>
      : <>
        {partial && <p className="inline-error" role="alert">Some posts couldn't be read.</p>}
        <FeedList items={posts} actionable={actionable} />
        <MoreButton stale={page.stale} />
      </>}
  </>;

  return <ScrollMemory className="screen profile-screen" aria-busy={page.stale || page.status === "loading"}>{body}</ScrollMemory>;
}

function Header({ profile }: { profile: ProfileHeader }) {
  const open = useOpenUrl();
  return <header className="profile">
    <div className="banner">{profile.banner && <img src={profile.banner} alt="" referrerPolicy="no-referrer" />}</div>
    <div className="profile-top">
      <Avatar src={profile.avatar} size={80} />
      {profile.own && <OpenOnX url={`${ORIGIN}/settings/profile`} label="Edit profile" />}
    </div>
    <h1 className="profile-name">{profile.name}{profile.verified && <Verified />}</h1>
    <p className="post-meta">@{profile.handle}</p>
    {profile.description && <p className="post-text" dir="auto">{profile.description}</p>}
    {profile.details && <p className="post-meta">{profile.details}</p>}
    {profile.links.length > 0 && <p className="profile-links">
      {profile.links.map(link => <a key={link.url} href={link.url} onClick={event => { event.preventDefault(); open(link.url); }}>{link.label}</a>)}
    </p>}
  </header>;
}
