import { ScrollMemory } from "@genesis/sdk/react";
import type { FeedItem, PostView } from "../model";
import { PostCard } from "../components/post";
import { LoadError, Notice, Skeleton } from "../components/ui";
import { delivered, onScreen, signedIn, usePageStatus, useScreenWatch } from "../screen";

/**
 * A post with the thread above it and its replies. X shows them as one column; the post the URL
 * names splits it into the posts above and the replies below.
 */
export function PostScreen() {
  const page = usePageStatus();
  const thread = useScreenWatch<unknown, FeedItem | null>("post", "thread");
  const empty = useScreenWatch<string | null>("post", "empty").value;
  const here = onScreen(page, "post");
  const keys = here ? thread.order : [];
  const posts = keys.flatMap(key => {
    const item = thread.records[key];
    return item?.kind === "post" ? [{ key, post: item.post }] : [];
  });
  const focus = posts.findIndex(({ post }) => post.postId === page.params.id);
  const actionable = signedIn(page) && !page.stale;
  const card = ({ key, post }: { key: string; post: PostView }, isFocus = false) =>
    <PostCard key={key} post={post} actionable={actionable} focus={isFocus} />;
  const partial = here && thread.status === "error";

  let body;
  if (focus < 0) body = page.status === "error" ? <LoadError error={page.error} />
    : partial ? <p className="inline-error" role="alert">This post couldn't be read.</p>
    : page.status === "ready" && here && delivered(thread) ? <Notice title={empty ?? "This post isn't available"}><p>X has nothing to show for it.</p></Notice>
    : <Skeleton label="Loading post" rows={3} />;
  else {
    const replies = posts.slice(focus + 1);
    body = <>
      {page.status === "error" && <p className="inline-error" role="alert">Couldn't refresh. Showing the last copy.</p>}
      {partial && <p className="inline-error" role="alert">Some replies couldn't be read.</p>}
      <div className="feed thread">
        {posts.slice(0, focus).map(entry => card(entry))}
        {card(posts[focus], true)}
      </div>
      {replies.length > 0 && <h2 className="section-title">Replies</h2>}
      <div className="feed">{replies.map(entry => card(entry))}</div>
    </>;
  }

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <h1 className="screen-title">Post</h1>
    {body}
  </ScrollMemory>;
}
