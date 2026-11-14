import { useState } from "react";
import { useCommand, usePending } from "@genesis/sdk/react";
import { invoking } from "./post";
import { InlineError } from "./ui";

/** What the last Show more found: the end of the list, Instagram's rate limit, or another failure. */
type MoreNote = "end" | "limited" | "failed" | null;

/**
 * Asks Instagram for the next posts: the page module scrolls Instagram's page to its end. A page
 * whose last item stays put until the deadline has nothing more right now; a failure says so, and
 * Show more tries again.
 */
export function MoreButton({ stale, grid = false }: { stale: boolean; grid?: boolean }) {
  const loadMore = useCommand<{ grid: boolean }>("loadMore");
  const loading = usePending().some(input => invoking(input, "loadMore"));
  const [note, setNote] = useState<MoreNote>(null);
  const next = () => void loadMore({ grid }).then(result => setNote(
    result.outcome === "observed" || result.outcome === "cancelled" ? null
      : result.exhausted || result.outcome === "unknown" && result.code === "DEADLINE" ? "end"
        : result.code === "RATE_LIMITED" ? "limited" : "failed"));
  return <div className="more">
    {note === "end" && <p className="muted" role="status">No more posts right now.</p>}
    {note === "limited" && <InlineError>Instagram is limiting requests. Try again in a minute.</InlineError>}
    {note === "failed" && <InlineError>Couldn't load more posts. Try again.</InlineError>}
    <button type="button" className="secondary" disabled={loading || stale} onClick={next}>{loading ? "Loading…" : "Show more"}</button>
  </div>;
}
