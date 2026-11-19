import { useCallback, useEffect, useRef, useState } from "react";
import { useCommand, usePending, VirtualList, type WatchValue } from "@let/sdk/react";
import { ORIGIN, profileUrl, type FeedItem, type MediaTile, type NoticeView, type Person, type PostView } from "../model";
import { useHeldFeed } from "../feed-hold";
import { MIN_BUSY_MS } from "../ui/feedback";
import { Avatar, FadeImage, useOpenUrl } from "../ui/frame";
import { Icon, Verified } from "../ui/icons";
import { PostRow } from "./post";

/** A list watch with no rows, for a held list whose page X is not showing. */
export const NO_ROWS: WatchValue<unknown, FeedItem | null> = {
  status: "loading", idle: true, stale: false, value: null, order: [], records: {}, error: null,
  truncated: false, complete: undefined, view: null, updatedAt: null,
};

/**
 * Posts and notifications in page order, keyed by the watch's record keys. The list keeps every
 * row X has shown, so it grows with Show more: only the rows near the screen are drawn. A row X's
 * page no longer holds plays its video on the post's own screen.
 */
export function FeedList(props: FeedListProps) {
  // Each list name gets its own held list: a screen that keeps its instance while its URL changes,
  // as Saved does between Bookmarks and Likes, must not carry one list's rows into the other.
  return <HeldList key={props.list} {...props} />;
}

interface FeedListProps {
  items: WatchValue<unknown, FeedItem | null>; actionable: boolean;
  /** Names the list, such as the page's path, so Back, a tab switch and a restart find it as it was. */
  list: string; persist?: boolean;
  /** Shows the New posts pill when newer posts wait above the screen. */
  pill?: boolean;
  /** Drops rows X's page no longer lists, as Saved needs when a post is unbookmarked or unliked. */
  exact?: boolean;
}

function HeldList({ items, actionable, list, persist = false, pill = false, exact = false }: FeedListProps) {
  const id = "feed:" + list;
  const feed = useHeldFeed(id, items, persist, exact);
  const { records } = feed;
  const renderItem = useCallback((key: string) => {
    const item = records.get(key);
    if (!item) return null;
    // A row X's page no longer holds cannot be acted on there: its place on X's page is gone.
    const onPage = items.records[key] != null;
    return item.kind === "post" ? <PostRow post={steady(item.post)} actionable={actionable && onPage} onPage={onPage} /> : <NoticeRow notice={item.notice} />;
  }, [records, actionable, items.records]);
  return <div ref={feed.host}>
    {pill && feed.newer > 0 && <button type="button" className="newer-pill" onClick={feed.toTop}>
      <Icon name="up" /> New posts
    </button>}
    <VirtualList id={id} className="feed virtual" keys={feed.order} estimateHeight={240} renderItem={renderItem} />
    <GoUp host={feed.host} onTop={feed.toTop} hidden={pill && feed.newer > 0} />
  </div>;
}

/** How far down, in screens, scrolling up shows the go-up button. */
const GO_UP_SCREENS = 3;
/** How long after the reader's last touch a scroll still counts as theirs, while a fling runs. */
const FLING_MS = 1500;

/** X's round go-up button: far down a list, scrolling up shows it above the compose button. */
function GoUp({ host, onTop, hidden }: { host: React.RefObject<HTMLDivElement | null>; onTop(): void; hidden: boolean }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const scroller = host.current?.closest<HTMLElement>(".screen");
    if (!scroller) return;
    let last = scroller.scrollTop;
    // Only the reader's own scrolls count: a held list putting its row back also scrolls.
    let touchedAt = -Infinity;
    const touched = () => { touchedAt = performance.now(); };
    const onScroll = () => {
      const top = scroller.scrollTop;
      const far = top > scroller.clientHeight * GO_UP_SCREENS;
      const own = performance.now() - touchedAt < FLING_MS;
      if (!far) setShown(false);
      else if (own && top < last - 4) setShown(true);
      else if (own && top > last + 4) setShown(false);
      last = top;
    };
    const touchEvents = ["touchstart", "touchmove", "touchend"] as const;
    scroller.addEventListener("scroll", onScroll, { passive: true });
    for (const name of touchEvents) scroller.addEventListener(name, touched, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      for (const name of touchEvents) scroller.removeEventListener(name, touched);
    };
  }, [host]);
  if (!shown || hidden) return null;
  return <button type="button" className="go-up" aria-label="Go to top" onClick={() => { setShown(false); onTop(); }}>
    <Icon name="up" />
  </button>;
}

type Media = Pick<PostView, "avatar" | "photos" | "videos" | "poster" | "video">;

/** The richest avatar and media seen per post, at most `STEADY_POSTS` posts. */
const seen = new Map<string, Media>();
const STEADY_POSTS = 2000;

/**
 * The post with the avatar and media it had before. While X recycles the cells of posts far from
 * its own scroll position, as it does when the next page loads, a read can find a post without its
 * avatar or media, and a kept record holds that last read. A post never loses them on X, so an
 * empty read keeps what an earlier read found.
 */
function steady(post: PostView): PostView {
  let shown = steadied.get(post);
  if (!shown) steadied.set(post, shown = merge(post));
  return shown;
}

/** The post each read was shown as, so an unchanged read keeps its row's memo. */
const steadied = new WeakMap<PostView, PostView>();

function merge(post: PostView): PostView {
  const known = seen.get(post.postId);
  const bare = post.photos.length === 0 && post.videos === 0 && !post.poster && !post.video;
  const media: Media = {
    avatar: post.avatar ?? known?.avatar ?? null,
    ...(bare && known ? { photos: known.photos, videos: known.videos, poster: known.poster, video: known.video }
      : { photos: post.photos, videos: post.videos, poster: post.poster ?? known?.poster ?? null, video: post.video ?? known?.video ?? null }),
  };
  seen.delete(post.postId);
  seen.set(post.postId, media);
  if (seen.size > STEADY_POSTS) seen.delete(seen.keys().next().value!);
  return known ? { ...post, ...media } : post;
}

/** A notification without a post body, such as "Ana and 3 others liked your post". */
export function NoticeRow({ notice }: { notice: NoticeView }) {
  const open = useOpenUrl();
  const content = <>
    <span className={`notice-glyph ${notice.tone}`} aria-hidden="true">
      {notice.icon ? <svg viewBox="0 0 24 24" className="icon filled"><path d={notice.icon} /></svg> : <Icon name="bell" filled />}
    </span>
    <span className="notice-main">
      {notice.avatars.length > 0 && <span className="notice-avatars">{notice.avatars.slice(0, 6).map(src => <Avatar key={src} src={src} size={32} />)}</span>}
      <span className="notice-text" dir="auto">
        <strong>{notice.title}</strong>
        {(notice.summary || notice.time) && <> {notice.summary}{notice.time && <span className="notice-time"> · {notice.time}</span>}</>}
      </span>
      {notice.body && <span className="notice-body" dir="auto">{notice.body}</span>}
    </span>
  </>;
  return notice.url
    ? <button type="button" className="notification row-press" onClick={() => open(notice.url!)}>{content}</button>
    : <div className="notification">{content}</div>;
}

export function PersonRow({ person }: { person: Person }) {
  const open = useOpenUrl();
  return <button type="button" className="person row-press" onClick={() => open(profileUrl(person.handle))}>
    <Avatar src={person.avatar} name={person.name} />
    <span className="person-main">
      <span className="post-head"><strong>{person.name}</strong>{person.verified && <Verified />}</span>
      <span className="post-meta">@{person.handle}</span>
      {person.description && <span className="person-bio" dir="auto">{person.description}</span>}
    </span>
  </button>;
}

type MoreNote = "end" | "limited" | "failed" | null;

/** How far below the screen the end of a list starts the next page, as X's app does before the end shows. */
const AHEAD_PX = 1600;

/**
 * The end of a list. As in X's app, the next page loads by itself when the end comes within
 * `AHEAD_PX` of the screen: the page module scrolls X's page to its end, and a spinner shows while
 * it runs. It loads again while the end stays near, and stops at X's end. After a failure or a
 * rate limit it waits for Try again, so it never loops against X.
 */
export function ShowMore({ stale, busy = false, contextId }: { stale: boolean; busy?: boolean; contextId?: string }) {
  const loadMore = useCommand("loadMore", contextId);
  const running = usePending(undefined, contextId).some(input => input.op === "invoke" && input.args.command === "loadMore");
  const [held, setHeld] = useState(false);
  const [note, setNote] = useState<MoreNote>(null);
  const [near, setNear] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const loading = running || held;

  const next = useCallback(() => {
    const started = Date.now();
    setHeld(true);
    setNote(null);
    void loadMore(undefined).then(result => {
      window.setTimeout(() => setHeld(false), Math.max(0, started + MIN_BUSY_MS - Date.now()));
      setNote(result.outcome === "observed" || result.outcome === "cancelled" ? null
        : result.exhausted || (result.outcome === "unknown" && result.code === "DEADLINE") ? "end"
          : result.code === "RATE_LIMITED" ? "limited" : "failed");
    });
  }, [loadMore]);

  // X's end, or a load that ran out of time, holds only for the page it was found on: a reload
  // starts X's page again, so loading more may find posts again (F-06). Nothing loads while the
  // page reloads, which would fail against a page that is not there yet.
  useEffect(() => { if (stale || busy) setNote(current => current === "end" ? null : current); }, [stale, busy]);

  useEffect(() => {
    const node = end.current;
    if (!node) return;
    const seen = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting),
      { root: node.closest(".screen"), rootMargin: `0px 0px ${AHEAD_PX}px 0px` });
    seen.observe(node);
    return () => seen.disconnect();
  }, []);

  useEffect(() => {
    if (near && !loading && !stale && !busy && note === null && document.visibilityState === "visible") next();
  }, [near, loading, stale, busy, note, next]);

  const stopped = note === "failed" || note === "limited";
  return <div className="more" ref={end}>
    {note === "end" && <p className="more-note" role="status">You're all caught up for now.</p>}
    {note === "limited" && <p className="more-note" role="alert">X is limiting requests. Try again in a minute.</p>}
    {note === "failed" && <p className="more-note" role="alert">Couldn't load more posts.</p>}
    {loading && <span className="spinner more-spinner" role="status" aria-label="Loading more posts" />}
    {stopped && !loading && <button type="button" className="button secondary" disabled={stale} onClick={next}>Try again</button>}
  </div>;
}

/**
 * X's media grid, as search Media and profile Media show it: a photo opens the photo viewer, a
 * video opens its post, where it plays on X.
 */
export function TileGrid({ items }: { items: WatchValue<unknown, MediaTile | null> }) {
  const open = useOpenUrl();
  return <div className="media-grid">
    {items.order.map(key => {
      const tile = items.records[key];
      if (!tile) return null;
      const post = `${ORIGIN}/${tile.handle}/status/${tile.postId}`;
      return <button type="button" key={key} className="media-tile" aria-label={`${tile.kind === "photo" ? "Photo" : "Video"} by @${tile.handle}`}
        onClick={() => open(tile.kind === "photo" ? `${post}/photo/${tile.index}` : post)}>
        {tile.image ? <FadeImage src={tile.image} /> : <span className="media-tile-video"><Icon name="play" filled /></span>}
        {tile.kind === "video" && tile.image && <span className="media-tile-play" aria-hidden="true"><Icon name="play" filled /></span>}
      </button>;
    })}
  </div>;
}
