import { useMemo } from "react";
import { useCommand, useRouter, type CurrentScreen } from "@let/sdk/react";
import { validId } from "../model";
import { useToast } from "../ui/feedback";
import { Icon } from "../ui/icons";
import { Sheet } from "../ui/sheet";
import { Notice } from "../ui/states";

interface RepostPost { postId: string; at: number | null; reposted: boolean }

function parsePost(value: string | undefined): RepostPost | null {
  try {
    const parsed = JSON.parse(value ?? "") as RepostPost;
    if (!validId(parsed?.postId) || typeof parsed.reposted !== "boolean") return null;
    return { ...parsed, at: typeof parsed.at === "number" ? parsed.at : null };
  } catch {
    return null;
  }
}

/**
 * Repost and Quote, as X's app offers them in a sheet from the repost button. Repost closes the
 * sheet at once: the row shows the requested state from the pending command until X confirms it.
 * Quote opens X's composer holding the post, under the applet's composer, which shows the quote.
 */
export function RepostScreen({ screen }: { screen: CurrentScreen }) {
  const { back, active } = useRouter();
  const { show } = useToast();
  const setReposted = useCommand<{ id: string; at: number | null; reposted: boolean }>("setReposted", active);
  const quote = useCommand<{ id: string; at: number | null }>("quote", active);
  const post = useMemo(() => parsePost(screen.params.post), [screen.params.post]);

  if (!post) return <Sheet title="Repost"><Notice title="Can't repost this post" role="alert"><p>The post details are missing.</p></Notice></Sheet>;

  const repost = async () => {
    back();
    const next = !post.reposted;
    const result = await setReposted({ id: post.postId, at: post.at, reposted: next });
    if (result.outcome === "failed") show({ text: result.code === "RATE_LIMITED" ? "X is limiting requests. Try again in a minute." : `Couldn't ${next ? "repost" : "undo the repost"}. Try again.` });
    else if (result.outcome === "unknown") show({ text: "X didn't confirm the repost. It shows again once the post reloads." });
  };
  const openQuote = async () => {
    back();
    const result = await quote({ id: post.postId, at: post.at });
    if (result.outcome !== "observed" && result.outcome !== "cancelled") show({ text: "Couldn't open the quote. Try again." });
  };

  return <Sheet title="Repost">
    <div className="sheet-actions">
      <button type="button" className="sheet-action row-press" onClick={() => void repost()}>
        <Icon name="repost" /><span>{post.reposted ? "Undo repost" : "Repost"}</span>
      </button>
      <button type="button" className="sheet-action row-press" onClick={() => void openQuote()}>
        <Icon name="edit" /><span>Quote</span>
      </button>
    </div>
  </Sheet>;
}
