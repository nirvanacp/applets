import { ScrollMemory } from "@genesis/sdk/react";
import type { PostView } from "../model";
import { PostCard } from "../components/post";
import { InlineError, LoadError, Skeleton, TopBar } from "../components/ui";
import { onScreen, signedIn, usePageStatus, useScreenWatch } from "../screen";

/** One post or reel on its own page. */
export function PostScreen() {
  const page = usePageStatus();
  const post = useScreenWatch<PostView | null>("post", "post");
  const here = onScreen(page, "post");
  const shown = here ? post.value : null;
  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <TopBar title={shown?.kind === "reel" ? "Reel" : "Post"} />
    {page.status === "error" && shown && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
    {shown ? <PostCard post={shown} actionable={signedIn(page) && !page.stale} focus />
      : page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading post" kind="posts" rows={1} />}
  </ScrollMemory>;
}
