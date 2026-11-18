import { useCommand, usePending, useRouter } from "@let/sdk/react";
import { ORIGIN, type CommentEntry, type MoreLink, type Story } from "../model";
import { CommentRow, invoking, StoryRow } from "../components/story";
import { EmptyNotice, InlineError } from "../components/states";
import { useBusy } from "../ui/feedback";
import { PageScroller, RefreshButton, ScreenHead, useOpenUrl } from "../ui/frame";
import { CommentListSkeleton, StoryListSkeleton } from "../ui/skeletons";
import { LoadError, useSawLoading } from "../ui/states";
import { whenScreen } from "../routes";
import { dataOf, onScreen, refreshing, signedIn as isSignedIn, usePageStatus, useScreenWatch, viewOf } from "../screen";

/** The Home feed chooser. Each choice is an HN URL, so the route table still decides the screen. */
const HOME_FEEDS = [
  { label: "Top", paths: ["/", "/news"] },
  { label: "New", paths: ["/newest"] },
  { label: "Past", paths: ["/front"] },
  { label: "Comments", paths: ["/newcomments"] },
  { label: "Ask", paths: ["/ask"] },
  { label: "Show", paths: ["/show"] },
  { label: "Jobs", paths: ["/jobs"] },
];

/** The Home feed a URL shows, or null for any other list. */
export function homeFeedOf(url: string | null) {
  const path = url ? new URL(url).pathname : "/";
  return HOME_FEEDS.find(feed => feed.paths.includes(path)) ?? null;
}

/** Titles of the lists outside the chooser, by path. */
const TITLES: Record<string, string> = {
  "/shownew": "New Show", "/asknew": "New Ask", "/best": "Best", "/active": "Active", "/from": "From site",
  "/submitted": "Submissions", "/threads": "Comments", "/favorites": "Favorites", "/hidden": "Hidden", "/upvoted": "Upvoted",
};

/** Lists whose rows are comments rather than stories, so their skeleton is a comment list. */
const COMMENT_LISTS = new Set(["/newcomments", "/threads"]);

/**
 * A list page: stories, or comments on `/newcomments` and `/threads`. Rows are `memo` components
 * keyed by the record key, so a patch that changes one row renders only that row.
 */
export function FeedScreen() {
  const page = usePageStatus();
  const { navigate } = useRouter();
  // Home is the first screen: Genesis keeps these on the phone, so a start shows the last feed at once.
  const stories = useScreenWatch<unknown, Story | null>("feed", "stories", { persist: true });
  const comments = useScreenWatch<unknown, CommentEntry | null>("feed", "feed.comments", { persist: true });
  const more = useScreenWatch<MoreLink>("feed", "more", { persist: true }).value;
  const loadMore = useCommand("loadMore");
  const pendingMore = usePending().some(input => invoking(input, "loadMore"));
  const [busyMore, runMore] = useBusy();
  const open = useOpenUrl();
  const signedIn = isSignedIn(page);
  const list = onScreen(page, "feed");
  const path = page.url ? new URL(page.url).pathname : "/";
  const chosen = homeFeedOf(page.url);
  const storyKeys = list ? stories.order : [];
  const commentKeys = list && storyKeys.length === 0 ? comments.order : [];
  const busy = refreshing(page);
  const partial = list && (stories.status === "error" || comments.status === "error");
  // Empty only once both lists have read this page: a comments page has no stories, and its
  // comments watch can deliver after the stories watch.
  const view = viewOf(page, [dataOf(list, stories), dataOf(list, comments)]);
  const fadeIn = useSawLoading(view === "loading");
  const loadingMore = busyMore || pendingMore;

  const next = () => void runMore(() => loadMore(undefined, { expect: { url: whenScreen("feed") } }).then(result => {
    // The click did not leave the page; the link's URL still opens the next page.
    if (result.outcome === "failed" && more) open(more.url);
  }));

  const head = chosen
    ? <ScreenHead actions={<RefreshButton busy={busy} />}>
        <nav className="chips head-chips" aria-label="Feeds">{HOME_FEEDS.map(feed => <button type="button" key={feed.label} className="chip"
          aria-pressed={feed === chosen}
          onClick={() => feed !== chosen && navigate({ url: ORIGIN + feed.paths[0], mode: "replace" })}>{feed.label}</button>)}</nav>
      </ScreenHead>
    : <ScreenHead title={TITLES[path] ?? "Hacker News"} actions={<RefreshButton busy={busy} />} />;

  return <>
    {head}
    {view === "error" ? <LoadError error={page.error ?? stories.error ?? comments.error} site="Hacker News" />
      : view === "loading" ? (COMMENT_LISTS.has(path) ? <CommentListSkeleton /> : <StoryListSkeleton rank={chosen !== null} />)
      : <PageScroller busy={busy}>
        {page.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
        {partial && view === "content" && <InlineError>Some rows couldn't be read.</InlineError>}
        {view === "empty" && <EmptyNotice title="Nothing here yet"><p>This list is empty on Hacker News.</p></EmptyNotice>}
        {view === "content" && <div className={fadeIn ? "reveal" : undefined}>
          {storyKeys.map(key => {
            const story = stories.records[key];
            return story && <StoryRow key={key} story={story} signedIn={signedIn} />;
          })}
          {commentKeys.map(key => {
            const entry = comments.records[key];
            return entry && <CommentRow key={key} head entry={entry} storyId={entry.onStory?.id ?? key}
              signedIn={signedIn} onLink={open} />;
          })}
          {more && <div className="more">
            <button type="button" className="button secondary" disabled={loadingMore || page.stale} aria-busy={loadingMore} onClick={next}>
              {loadingMore ? <><span className="spinner" aria-hidden="true" /> Loading more</> : "More"}
            </button>
          </div>}
        </div>}
      </PageScroller>}
  </>;
}
