import { memo, useState } from "react";
import { useCommand, useGenesis, useGrant, usePending, useRouter, type PendingInput } from "@let/sdk/react";
import { actionMessage } from "../actions";
import { snapshotOf } from "../library";
import { ORIGIN, profileUrl, rememberPhotos, type PostView } from "../model";
import { useToast } from "../ui/feedback";
import { Avatar, FadeImage, useOpenUrl } from "../ui/frame";
import { Icon, Verified } from "../ui/icons";
import { rememberOpener } from "../ui/sheet";
import { WebsiteCue } from "../ui/states";
import { RichText } from "./text";
import { InlineVideo } from "./video";

/** The args of a pending `invoke` of `command`, or undefined. */
export function invoked<A>(input: PendingInput, command: string): A | undefined {
  return input.op === "invoke" && input.args.command === command ? input.args.args as A : undefined;
}

type ToggleArgs = { id: string } & Record<string, unknown>;

/**
 * A like or bookmark: the requested state shows at once from the pending input, then X's. The
 * command clicks X's own control in the context whose page shows the post. Every outcome other
 * than observed says so in a toast; removing a bookmark offers Undo through the same command.
 */
function useToggle(post: PostView, name: "setLiked" | "setBookmarked", field: "liked" | "bookmarked", value: boolean) {
  const { shown, busy } = usePendingToggle(post, name, field, value);
  const act = useCommand<ToggleArgs>(name, useRouter().active);
  const { show } = useToast();
  const [popped, setPopped] = useState(0);

  const send = async (next: boolean, undo: boolean) => {
    if (next) setPopped(count => count + 1);
    const result = await act({ id: post.postId, at: post.at, [field]: next });
    const noun = field === "liked" ? "like" : "bookmark";
    if (result.outcome === "failed") show({ text: result.code === "RATE_LIMITED" ? "X is limiting requests. Try again in a minute." : `Couldn't ${next ? "add" : "remove"} the ${noun}. Try again.` });
    else if (result.outcome === "unknown") show({ text: `X didn't confirm the ${noun}. It shows again once the post reloads.` });
    else if (result.outcome === "observed" && field === "bookmarked" && !undo) {
      show(next ? { text: "Added to your Bookmarks" }
        : { text: "Removed from your Bookmarks", action: { label: "Undo", run: () => send(true, true) } });
    }
  };
  return { shown, busy, popped, toggle: () => void send(!shown, false) };
}

/** The state a toggle shows: the last pending `name` command's for this post, else X's. */
function usePendingToggle(post: PostView, name: string, field: string, value: boolean) {
  const pending = usePending(undefined, useRouter().active);
  const call = [...pending].reverse().map(input => invoked<ToggleArgs>(input, name)).find(args => args?.id === post.postId);
  return { shown: call ? call[field] === true : value, busy: call !== undefined };
}

/** Opens the repost sheet, which offers Repost or Undo repost, and Quote. */
function useRepost(post: PostView) {
  const { navigate } = useRouter();
  const state = usePendingToggle(post, "setReposted", "reposted", post.reposted);
  const open = () => {
    rememberOpener();
    navigate({ screen: "repost", params: { post: JSON.stringify({ postId: post.postId, at: post.at, reposted: state.shown }) } });
  };
  return { ...state, open };
}

/**
 * Plays a post's video full screen in X's own player, over the applet, with no page change: the
 * tap grants fullscreen to the hidden page, then `playVideo` taps X's player there. When that
 * fails, a toast offers the post on X instead.
 */
function usePlayVideo(post: PostView, playOnX: () => void) {
  const active = useRouter().active;
  const grant = useGrant(active);
  const play = useCommand<{ id: string; at: number | null; index: number }>("playVideo", active);
  const { show } = useToast();
  return async (index = 0) => {
    try {
      await grant.allow("fullscreen");
    } catch (error) {
      show({ text: actionMessage(error, "Couldn't play the video."), action: { label: "Play on X", run: playOnX } });
      return;
    }
    const result = await play({ id: post.postId, at: post.at, index });
    if (result.outcome !== "observed") show({ text: "Couldn't play the video.", action: { label: "Play on X", run: playOnX } });
  };
}

/** Opens the Save to categories sheet for a post read from the current page. */
export function useSaveToCategories() {
  const { navigate } = useRouter();
  return (post: PostView) => {
    rememberOpener();
    navigate({ screen: "save", params: { post: JSON.stringify({ postId: post.postId, url: post.url, snapshot: snapshotOf(post) }) } });
  };
}

/**
 * A post in a list, or the focused post of a conversation. `actionable` is false when the page
 * cannot act on it (signed out, or a kept copy while it refreshes); opening things stays enabled.
 * `onPage` is false for a row the list keeps after X's page dropped it: its video plays on the
 * post's own screen, since X's page no longer has a player for it.
 */
export const PostRow = memo(function PostRow({ post, actionable, focus = false, threaded = false, onPage = true }: {
  post: PostView; actionable: boolean; focus?: boolean; threaded?: boolean; onPage?: boolean;
}) {
  const open = useOpenUrl();
  const { viewWebsite } = useRouter();
  const openPost = () => { if (!focus) open(post.url); };
  // Without files from X's player, the video plays on X's own post page, shown as the website until Done.
  const playOnX = () => { if (!focus) open(post.url); viewWebsite(); };
  const play = usePlayVideo(post, playOnX);
  const playVideo = onPage ? play : async () => openPost();
  const profile = profileUrl(post.handle);
  return <article className={`post${focus ? " focus" : ""}${threaded ? " threaded" : ""}`} aria-label={`Post by ${post.name}`}>
    {post.context && <p className="post-context">
      <Icon name={/pinned/i.test(post.context.text) ? "pin" : "repost"} />
      {post.context.url
        ? <a href={post.context.url} onClick={event => { event.preventDefault(); open(post.context!.url!); }}>{post.context.text}</a>
        : <span>{post.context.text}</span>}
    </p>}
    <div className="post-grid">
      <button type="button" className="avatar-button" aria-label={`${post.name}'s profile`} onClick={() => open(profile)}>
        <Avatar src={post.avatar} size={focus ? 48 : 40} name={post.name} />
      </button>
      <div className="post-main">
        <header className="post-head">
          <a className="post-name" href={profile} onClick={event => { event.preventDefault(); open(profile); }}>
            <strong>{post.name}</strong>{post.verified && <Verified />}
          </a>
          <span className="post-meta">
            <span className="post-handle">@{post.handle}</span>
            {!focus && post.time && <> · <a className="post-time" href={post.url} onClick={event => { event.preventDefault(); openPost(); }}>
              <time dateTime={post.dateTime ?? undefined}>{post.time}</time>
            </a></>}
          </span>
        </header>
        {/* The text opens the post; it is not a button, so links inside stay links. */}
        <div className={focus ? "post-content" : "post-content tappable"} onClick={openPost}>
          {post.parts.length > 0 && <RichText parts={post.parts} className={focus ? "post-text large" : "post-text"} />}
          {post.textState === "excerpt" && !focus && <button type="button" className="show-more" onClick={event => { event.stopPropagation(); openPost(); }}>Show more</button>}
          {post.textState === "unavailable" && post.photos.length === 0 && post.videos === 0 && !post.quote
            && <p className="post-meta">X didn't show this post's text.</p>}
        </div>
        {post.photos.length > 0 && <div className={`photos n${post.photos.length}`}>
          {post.photos.map((src, index) => <button type="button" key={src} className="photo" aria-label={`Photo ${index + 1} of ${post.photos.length}`}
            onClick={() => { rememberPhotos(post.postId, post.photos); open(`${post.url}/photo/${index + 1}`); }}>
            <FadeImage src={src} />
          </button>)}
        </div>}
        {post.video ? <InlineVideo video={post.video} poster={post.poster} label={`video from ${post.name}`}
          onOpen={post.video.gif ? openPost : () => void playVideo()} />
          : post.videos > 0 && <button type="button" className="video-tile" onClick={() => void playVideo()}>
          <span className="video-play"><Icon name="play" filled /></span>
          <span>{post.videos > 1 ? `Play the first of ${post.videos} videos` : "Play video"}</span>
        </button>}
        {post.quote && <button type="button" className="quote" disabled={!post.quote.url} onClick={() => post.quote?.url && open(post.quote.url)}>
          <span className="post-head"><strong>{post.quote.name}</strong>{post.quote.handle && <span className="post-meta">@{post.quote.handle}</span>}</span>
          {post.quote.text && <span className="quote-text" dir="auto">{post.quote.text}</span>}
        </button>}
        {focus && (post.time || post.views) && <p className="post-meta focus-time">
          {post.time && <time dateTime={post.dateTime ?? undefined}>{post.time}</time>}
          {post.time && post.views && " · "}
          {post.views && <><strong>{post.views}</strong> Views</>}
        </p>}
        <ActionBar post={post} actionable={actionable} focus={focus} />
      </div>
    </div>
  </article>;
});

/**
 * Shares the post's address through Android's share sheet: `share` is the first await of the tap.
 * Without user actions in this Genesis, X's own Share button works on the post's page.
 */
function useShare(post: PostView, focus: boolean) {
  const genesis = useGenesis();
  const { viewWebsite } = useRouter();
  const open = useOpenUrl();
  const { show } = useToast();
  return async () => {
    if (genesis.limits.userActions !== true) {
      if (!focus) open(post.url);
      viewWebsite();
      return;
    }
    try {
      await genesis.share({ url: post.url });
    } catch (error) {
      show({ text: actionMessage(error, "Couldn't share this post.") });
    }
  };
}

function Count({ value }: { value: string }) {
  // X hides zero counts; an unknown count stays hidden, never 0. Keyed so a change pops.
  return value ? <span key={value} className="count">{value}</span> : null;
}

function ActionBar({ post, actionable, focus }: { post: PostView; actionable: boolean; focus: boolean }) {
  const open = useOpenUrl();
  const genesis = useGenesis();
  const share = useShare(post, focus);
  const save = useSaveToCategories();
  const repost = useRepost(post);
  const like = useToggle(post, "setLiked", "liked", post.liked);
  const bookmark = useToggle(post, "setBookmarked", "bookmarked", post.bookmarked);
  return <div className={focus ? "action-bar focus" : "action-bar"}>
    {/* Replies use X's own composer, which shows the post being answered: the website, so it has the cue. */}
    <button type="button" className="action reply" aria-label={`Reply on X${post.replies ? `, ${post.replies} replies` : ""}, opens website`}
      onClick={() => open(`${ORIGIN}/compose/post?in_reply_to=${post.postId}`)}>
      <Icon name="reply" /><Count value={post.replies} /><WebsiteCue />
    </button>
    <button type="button" className={repost.shown ? "action repost on" : "action repost"} aria-pressed={repost.shown}
      disabled={!actionable || !post.canRepost || repost.busy} aria-label={`Repost${post.reposts ? `, ${post.reposts} reposts` : ""}`} onClick={repost.open}>
      <Icon name="repost" /><Count value={post.reposts} />
    </button>
    <button type="button" className={like.shown ? "action like on" : "action like"} aria-pressed={like.shown}
      disabled={!actionable || !post.canLike || like.busy} aria-label={`Like${post.likes ? `, ${post.likes} likes` : ""}`} onClick={like.toggle}>
      <Icon name="heart" filled={like.shown} key={like.shown ? `on${like.popped}` : "off"} className={like.shown ? "pop" : undefined} />
      {/* X's burst: a pink ring that opens around the heart, only when the person likes it here. */}
      {like.shown && like.popped > 0 && <span key={`burst${like.popped}`} className="burst" aria-hidden="true" />}
      <Count value={post.likes} />
    </button>
    <button type="button" className={bookmark.shown ? "action mark on" : "action mark"} aria-pressed={bookmark.shown}
      disabled={!actionable || !post.canBookmark || bookmark.busy} aria-label="Bookmark" onClick={bookmark.toggle}>
      <Icon name="bookmark" filled={bookmark.shown} key={bookmark.shown ? `on${bookmark.popped}` : "off"} className={bookmark.shown ? "pop" : undefined} />
    </button>
    <button type="button" className="action" aria-label="Save to categories" onClick={() => save(post)}>
      <Icon name="folder" />
    </button>
    <button type="button" className="action" aria-label={genesis.limits.userActions === true ? "Share post" : "Share post on X, opens website"} onClick={() => void share()}>
      <Icon name="share" />
    </button>
  </div>;
}
