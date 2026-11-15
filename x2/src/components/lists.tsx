import { useState } from "react";
import { useCommand, usePending, type WatchValue } from "@genesis/sdk/react";
import { profileUrl, type FeedItem, type NoticeView, type Person } from "../model";
import { MIN_BUSY_MS } from "../ui/feedback";
import { Avatar, useOpenUrl } from "../ui/frame";
import { Icon, Verified } from "../ui/icons";
import { PostRow } from "./post";

/** Posts and notifications in page order, keyed by the watch's record keys. */
export function FeedList({ items, actionable }: { items: WatchValue<unknown, FeedItem | null>; actionable: boolean }) {
  return <div className="feed">
    {items.order.map(key => {
      const item = items.records[key];
      if (!item) return null;
      return item.kind === "post" ? <PostRow key={key} post={item.post} actionable={actionable} /> : <NoticeRow key={key} notice={item.notice} />;
    })}
  </div>;
}

/** A notification without a post body, such as "Ana and 3 others liked your post". */
export function NoticeRow({ notice }: { notice: NoticeView }) {
  const open = useOpenUrl();
  const content = <>
    <span className="notice-glyph" aria-hidden="true"><Icon name="bell" filled /></span>
    <span className="notice-main">
      {notice.avatars.length > 0 && <span className="notice-avatars">{notice.avatars.slice(0, 6).map(src => <Avatar key={src} src={src} size={32} />)}</span>}
      <span className="notice-text" dir="auto">{notice.text}</span>
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

/**
 * Show more at the end of a list: the page module scrolls X's page to its end. The spinner sits
 * inside the control, which stays disabled while it runs and for at least the busy minimum.
 */
export function ShowMore({ stale, contextId }: { stale: boolean; contextId?: string }) {
  const loadMore = useCommand("loadMore", contextId);
  const running = usePending(undefined, contextId).some(input => input.op === "invoke" && input.args.command === "loadMore");
  const [held, setHeld] = useState(false);
  const [note, setNote] = useState<MoreNote>(null);
  const loading = running || held;
  const next = () => {
    const started = Date.now();
    setHeld(true);
    setNote(null);
    void loadMore(undefined).then(result => {
      window.setTimeout(() => setHeld(false), Math.max(0, started + MIN_BUSY_MS - Date.now()));
      setNote(result.outcome === "observed" || result.outcome === "cancelled" ? null
        : result.exhausted || (result.outcome === "unknown" && result.code === "DEADLINE") ? "end"
          : result.code === "RATE_LIMITED" ? "limited" : "failed");
    });
  };
  return <div className="more">
    {note === "end" && <p className="more-note" role="status">You're all caught up for now.</p>}
    {note === "limited" && <p className="more-note" role="alert">X is limiting requests. Try again in a minute.</p>}
    {note === "failed" && <p className="more-note" role="alert">Couldn't load more posts.</p>}
    <button type="button" className="button secondary" disabled={loading || stale} aria-busy={loading} onClick={next}>
      {loading ? <><span className="spinner" aria-hidden="true" /> Loading…</> : note === "failed" ? "Try again" : "Show more"}
    </button>
  </div>;
}
