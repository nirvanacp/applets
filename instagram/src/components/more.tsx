import { useState } from "react";
import { useCommand, usePending } from "@genesis/sdk/react";
import { invoking } from "./post";

/**
 * Asks Instagram for the next posts: the page module scrolls Instagram's page to its end. A page
 * whose last item stays put has nothing more right now.
 */
export function MoreButton({ stale, grid = false }: { stale: boolean; grid?: boolean }) {
  const loadMore = useCommand<{ grid: boolean }>("loadMore");
  const loading = usePending().some(input => invoking(input, "loadMore"));
  const [end, setEnd] = useState(false);
  const next = () => void loadMore({ grid }).then(result => setEnd(result.outcome !== "observed"));
  return <div className="more">
    {end && <p className="muted" role="status">No more posts right now.</p>}
    <button type="button" className="secondary" disabled={loading || stale} onClick={next}>{loading ? "Loading…" : "Show more"}</button>
  </div>;
}
