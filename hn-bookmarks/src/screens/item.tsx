import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommand, useRouter, type WatchValue } from "@nirvanacp/sdk/react";
import { type CommentEntry, type ItemHead, type MoreLink, type RestOfThread } from "../model";
import { CommentRow, StoryRow } from "../components/story";
import { InlineError } from "../components/states";
import { loginUrl, RichText } from "../components/ui";
import { useBusy, useToast } from "../ui/feedback";
import { PageScroller, RefreshButton, ScreenHead, useOpenUrl } from "../ui/frame";
import { ItemSkeleton } from "../ui/skeletons";
import { LoadError, useSawLoading, WebsiteCue } from "../ui/states";
import { delivered, onScreen, refreshing, signedIn as isSignedIn, usePageStatus, useScreenWatch } from "../screen";

/** For each comment, the ids of its ancestors (from the depths in page order) and how many replies it holds. */
function threadOf(comments: WatchValue<unknown, CommentEntry | null>) {
  const ancestors = new Map<string, string[]>();
  const replies = new Map<string, number>();
  const path: { id: string; depth: number }[] = [];
  for (const key of comments.order) {
    const entry = comments.records[key];
    if (!entry) continue;
    while (path.length > 0 && path[path.length - 1].depth >= entry.depth) path.pop();
    ancestors.set(key, path.map(parent => parent.id));
    for (const parent of path) replies.set(parent.id, (replies.get(parent.id) ?? 0) + 1);
    path.push({ id: key, depth: entry.depth });
  }
  return { ancestors, replies };
}

/**
 * A discussion (`/item?id=`): the story or comment at the top, then the thread. Comment rows
 * are `memo` components keyed by comment id; the callbacks they get keep their identity.
 */
export function ItemScreen() {
  const page = usePageStatus();
  const story = useScreenWatch<ItemHead>("item", "story");
  const head = story.value;
  const comments = useScreenWatch<unknown, CommentEntry | null>("item", "item.comments");
  const more = useScreenWatch<MoreLink>("item", "more").value;
  const rest = useScreenWatch<RestOfThread>("item", "rest").value;
  const showRest = useCommand("showRest");
  const showCommentForm = useCommand("showCommentForm");
  const { viewWebsite } = useRouter();
  const { show } = useToast();
  const open = useOpenUrl();
  const [commenting, runComment] = useBusy();
  const [reading, runRest] = useBusy();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [target, setTarget] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const { ancestors, replies } = useMemo(() => threadOf(comments), [comments]);
  const signedIn = isSignedIn(page);
  const here = onScreen(page, "item");
  const data = here ? head : null;
  const id = data?.story?.id ?? data?.comment?.id ?? page.params.id ?? "";
  const storyId = data?.comment?.onStory?.id ?? id;

  // Callbacks read the latest thread through a ref so memo rows keep the same props.
  const latest = useRef({ ancestors, url: page.url });
  latest.current = { ancestors, url: page.url };

  // Scroll to a comment after its collapsed ancestors have opened.
  useEffect(() => {
    if (!target) return;
    container.current?.querySelector(`[id="comment-${target}"]`)?.scrollIntoView({ block: "start" });
    setTarget(null);
  }, [target]);

  /** A link to a comment on this page reveals it; anything else goes through the manifest. */
  const follow = useCallback((url: string) => {
    const { ancestors, url: pageUrl } = latest.current;
    const link = new URL(url);
    const comment = link.hash.slice(1);
    link.hash = "";
    const here = pageUrl ? new URL(pageUrl) : null;
    if (here) here.hash = "";
    if (comment && here && link.href === here.href && ancestors.has(comment)) {
      setCollapsed(current => new Set([...current].filter(entry => entry !== comment && !ancestors.get(comment)!.includes(entry))));
      setTarget(comment);
    } else open(url);
  }, [open]);

  const toggle = useCallback((key: string) => setCollapsed(current => {
    const next = new Set(current);
    if (!next.delete(key)) next.add(key);
    return next;
  }), []);

  const busy = refreshing(page);
  const failed = page.status === "error" || (here && story.status === "error");
  const fadeIn = useSawLoading(!data && !failed);
  const title = data?.comment && !data.story ? "Comment" : "Discussion";
  const headRow = <ScreenHead title={title} actions={<RefreshButton busy={busy} />} />;

  if (!data) return <>
    {headRow}
    {failed ? <LoadError error={page.error ?? story.error} site="Hacker News" /> : <ItemSkeleton />}
  </>;

  const keys = here ? comments.order : [];
  const visible = keys.filter(key => !ancestors.get(key)?.some(parent => collapsed.has(parent)));
  const goto = `item?id=${id}`;
  // "No comments yet" only once this page's comments have been read; until then the heading waits.
  const heading = keys.length > 0 ? "Comments" : here && delivered(comments) ? "No comments yet" : null;

  // Both actions open HN's own form or thread in this context, so they carry the website cue.
  const comment = () => void runComment(() => showCommentForm().then(result => {
    if (result.outcome === "failed") show({ text: "Couldn't open the comment form. Try again." });
    else viewWebsite();
  }, () => show({ text: "Couldn't open the comment form. Try again." })));
  const readRest = () => void runRest(() => showRest().then(result => {
    if (result.outcome === "failed") show({ text: "Couldn't open the rest of the thread. Try again." });
    else viewWebsite();
  }, () => show({ text: "Couldn't open the rest of the thread. Try again." })));

  return <>
    {headRow}
    <PageScroller busy={busy}>
      <div ref={container} className={fadeIn ? "reveal" : undefined}>
        {page.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
        {data.story && <StoryRow heading story={data.story} signedIn={signedIn} />}
        {data.comment && <CommentRow head entry={data.comment} storyId={storyId} signedIn={signedIn} onLink={follow} />}
        {data.text.length > 0 && <div className="toptext"><RichText parts={data.text} onLink={follow} /></div>}
        <div className="item-actions">
          {signedIn && data.canComment && <button type="button" className="button secondary" disabled={commenting} aria-busy={commenting} onClick={comment}>
            {commenting ? <><span className="spinner" aria-hidden="true" /> Opening…</> : <>Add a comment <WebsiteCue /></>}
          </button>}
          {!signedIn && <button type="button" className="button secondary" onClick={() => open(loginUrl(goto))}>
            Sign in to comment <WebsiteCue />
          </button>}
        </div>
        {heading && <h2 className="section-title">{heading}</h2>}
        {here && comments.status === "error" && <InlineError>Some comments couldn't be read.</InlineError>}
        {visible.map(key => {
          const entry = comments.records[key];
          return entry && <CommentRow key={key} entry={entry} storyId={storyId} signedIn={signedIn}
            collapsed={collapsed.has(key)} hidden={replies.get(key) ?? 0} onToggle={toggle} onLink={follow} />;
        })}
        {more && <div className="more"><button type="button" className="button secondary" disabled={page.stale} onClick={() => open(more.url)}>
          More comments
        </button></div>}
        {rest && here && <div className="more"><button type="button" className="button secondary" disabled={reading} aria-busy={reading} onClick={readRest}>
          {reading ? <><span className="spinner" aria-hidden="true" /> Opening…</>
            : <>Read {rest.count} more {rest.count === 1 ? "comment" : "comments"} on Hacker News <WebsiteCue /></>}
        </button></div>}
      </div>
    </PageScroller>
  </>;
}
