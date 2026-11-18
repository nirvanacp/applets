import { useRouter, type CurrentScreen } from "@let/sdk/react";
import { ORIGIN, type FeedItem, type PostView } from "../model";
import { PostRow } from "../components/post";
import { EmptyNotice, InlineError } from "../components/states";
import { PageScroller, RefreshButton, TopBar, useOpenUrl } from "../ui/frame";
import { PostSkeleton } from "../ui/skeletons";
import { LoadError, useSawLoading, WebsiteCue } from "../ui/states";
import { delivered, onScreen, refreshing, useScreenWatch, useSettled, viewOf } from "../screen";

/**
 * A post in its conversation. X shows one column; the post the URL names splits it into the
 * posts above it (drawn joined by a thread line) and the replies below. As in X's app, a bar
 * pinned under the conversation opens X's reply composer for the post.
 */
export function PostScreen(_: { screen: CurrentScreen }) {
  const page = useRouter().status();
  const open = useOpenUrl();
  const thread = useScreenWatch<unknown, FeedItem | null>("post", "thread");
  const empty = useScreenWatch<string | null>("post", "empty");
  const here = onScreen(page, "post");
  const posts = (here ? thread.order : []).flatMap(key => {
    const item = thread.records[key];
    return item?.kind === "post" ? [{ key, post: item.post }] : [];
  });
  const focus = posts.findIndex(({ post }) => post.postId === page.params.id);
  const partial = here && thread.status === "error";
  const view = viewOf(page, focus >= 0, here && delivered(thread), partial);
  const busy = refreshing(page);
  const fadeIn = useSawLoading(view === "loading");
  const actionable = page.signedIn === true && !page.stale;
  const row = ({ key, post }: { key: string; post: PostView }, extra: { focus?: boolean; threaded?: boolean } = {}) =>
    <PostRow key={key} post={post} actionable={actionable} {...extra} />;
  const replies = focus >= 0 ? posts.slice(focus + 1) : [];
  // X can show the post before its replies, so "No replies yet" waits until the list has stayed empty.
  const noReplies = useSettled(focus >= 0 && delivered(thread) && replies.length === 0 && !page.stale ? page.url ?? "" : null);

  return <>
    <TopBar title="Post" back actions={<RefreshButton busy={busy} />} />
    {view === "error" && !partial ? <LoadError error={page.error} site="X" />
      : view === "loading" ? <PostSkeleton />
      : <PageScroller busy={busy}>
        {view === "error" && <InlineError>This post couldn't be read.</InlineError>}
        {view === "empty" && <EmptyNotice title={empty.value ?? "This post isn't available"}><p>X has nothing to show for it.</p></EmptyNotice>}
        {focus >= 0 && <div className={fadeIn ? "reveal" : undefined}>
          {page.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          {partial && <InlineError>Some replies couldn't be read.</InlineError>}
          <div className="feed thread">
            {posts.slice(0, focus).map(entry => row(entry, { threaded: true }))}
            {row(posts[focus]!, { focus: true })}
          </div>
          {replies.length > 0 && <div className="feed replies">{replies.map(entry => row(entry))}</div>}
          {noReplies && <p className="list-end">No replies yet.</p>}
        </div>}
      </PageScroller>}
    {focus >= 0 && actionable && <footer className="reply-bar">
      <button type="button" className="reply-pill" onClick={() => open(`${ORIGIN}/compose/post?in_reply_to=${posts[focus]!.post.postId}`)}>
        Post your reply <WebsiteCue />
      </button>
    </footer>}
  </>;
}
