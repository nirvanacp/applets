import { useState } from "react";
import { ScrollMemory, useCommand, usePending, useRouter } from "@genesis/sdk/react";
import { ORIGIN, profileUrl, type GridItem, type ProfileHeader } from "../model";
import { Grid } from "../components/grid";
import { MoreButton } from "../components/more";
import { invoked, invoking } from "../components/post";
import { Avatar, InlineError, LoadError, ModeTabs, Notice, OpenOnWebsite, RichText, Skeleton, TopBar, useOpenUrl, Verified } from "../components/ui";
import { delivered, onScreen, signedIn, usePageStatus, useScreenWatch } from "../screen";

const SECTIONS = [
  { id: "", label: "Posts", icon: "grid" as const },
  { id: "reels/", label: "Reels", icon: "reels" as const },
  { id: "tagged/", label: "Tagged", icon: "tag" as const },
  { id: "saved/", label: "Saved", icon: "save" as const },
];

/** A profile: header, follow and message actions, and the posts, reels, tagged and (own) saved grids. */
export function ProfileScreen() {
  const { navigate } = useRouter();
  const page = usePageStatus();
  const header = useScreenWatch<ProfileHeader | null>("profile", "profile").value;
  const grid = useScreenWatch<unknown, GridItem | null>("profile", "grid");
  const here = onScreen(page, "profile");
  const profile = here ? header : null;
  const user = page.params.user ?? "";
  const path = page.url ? new URL(page.url).pathname : "";
  const section = SECTIONS.find(option => option.id && path.endsWith(`/${option.id}`))?.id ?? "";
  const shown = here ? grid.order : [];
  const sections = SECTIONS.filter(option => option.id !== "saved/" || profile?.own);

  let content;
  if (profile?.private && shown.length === 0) content = <Notice title="This account is private"><p>Follow this account to see their photos and videos.</p></Notice>;
  else if (shown.length === 0) content = here && delivered(grid) && page.status === "ready"
    ? <Notice title={section === "saved/" ? "Nothing saved yet" : "No posts yet"} /> : <Skeleton label="Loading posts" kind="grid" />;
  else content = <><Grid items={grid} /><MoreButton stale={page.stale} grid /></>;

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <TopBar title={<>{profile?.user ?? user}{profile?.verified && <Verified />}</>} />
    {!profile ? (page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading profile" rows={2} />) : <>
      {page.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
      <Header profile={profile} actionable={signedIn(page) && !page.stale} />
      <ModeTabs label="Profile sections" icons active={section} options={sections.map(option => ({
        ...option, go: () => navigate({ url: `${profileUrl(profile.user)}${option.id}`, mode: "replace" }),
      }))} />
      {content}
    </>}
  </ScrollMemory>;
}

function Stat({ value, label, url }: { value: string | null; label: string; url?: string }) {
  const open = useOpenUrl();
  const inner = <><strong>{value ?? "–"}</strong><span>{label}</span></>;
  return url ? <button type="button" className="stat" onClick={() => open(url)}>{inner}</button> : <div className="stat">{inner}</div>;
}

function Header({ profile, actionable }: { profile: ProfileHeader; actionable: boolean }) {
  const open = useOpenUrl();
  const base = profileUrl(profile.user);
  return <header className="profile">
    <div className="profile-top">
      <Avatar src={profile.avatar} size={86} />
      <div className="stats">
        <Stat value={profile.posts} label="posts" />
        <Stat value={profile.followers} label="followers" url={`${base}followers/`} />
        <Stat value={profile.following} label="following" url={`${base}following/`} />
      </div>
    </div>
    {profile.name && <p className="profile-name">{profile.name}</p>}
    {profile.bio.length > 0 && <RichText parts={profile.bio} className="rich bio" />}
    {profile.links.map(link => <a key={link.url} className="profile-link" href={link.url}
      onClick={event => { event.preventDefault(); open(link.url); }}>{link.text}</a>)}
    {profile.followedBy && <button type="button" className="link muted followed-by" onClick={() => open(`${base}followers/mutualOnly`)}>{profile.followedBy}</button>}
    <div className="profile-actions">
      {profile.own ? <>
        <OpenOnWebsite url={`${ORIGIN}/accounts/edit/`} label="Edit profile" />
        <OpenOnWebsite label="Share profile" />
      </> : <>
        {profile.follow && <Follow following={/^(Following|Requested)$/.test(profile.follow)} label={profile.follow} actionable={actionable} />}
        {profile.canMessage && <MessageButton actionable={actionable} />}
      </>}
    </div>
  </header>;
}

function Follow({ following, label, actionable }: { following: boolean; label: string; actionable: boolean }) {
  const set = useCommand<{ following: boolean }>("setFollowing");
  const pending = usePending().map(input => invoked<{ following: boolean }>(input, "setFollowing")).find(Boolean);
  const [failed, setFailed] = useState(false);
  const shown = pending ? pending.following : following;
  return <>
    <button type="button" className={shown ? "secondary" : "primary"} disabled={!actionable || pending !== undefined}
      onClick={() => { setFailed(false); void set({ following: !shown }).then(result => setFailed(result.outcome === "failed")); }}>
      {pending ? (shown ? "Following" : "Follow") : label}
    </button>
    {failed && <InlineError>That didn't go through on Instagram.</InlineError>}
  </>;
}

function MessageButton({ actionable }: { actionable: boolean }) {
  const message = useCommand("message");
  const busy = usePending().some(input => invoking(input, "message"));
  return <button type="button" className="secondary" disabled={!actionable || busy} onClick={() => void message(undefined)}>Message</button>;
}
