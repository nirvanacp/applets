import type { InfoData } from "../model";
import { InlineError } from "../components/states";
import { RichText } from "../components/ui";
import { PageScroller, RefreshButton, ScreenHead } from "../ui/frame";
import { InfoSkeleton } from "../ui/skeletons";
import { LoadError, useSawLoading } from "../ui/states";
import { onScreen, refreshing, usePageStatus, useScreenWatch } from "../screen";

/** HN's information pages (guidelines, FAQ, formatting, lists, leaders) as formatted text. */
export function InfoScreen() {
  const page = usePageStatus();
  const watch = useScreenWatch<InfoData>("info", "sections");
  const here = onScreen(page, "info");
  const data = here ? watch.value : null;
  const busy = refreshing(page);
  const failed = page.status === "error" || (here && watch.status === "error");
  const fadeIn = useSawLoading(!data && !failed);

  return <>
    <ScreenHead title={data?.title ?? "Hacker News"} actions={<RefreshButton busy={busy} />} />
    {!data ? (failed ? <LoadError error={page.error ?? watch.error} site="Hacker News" /> : <InfoSkeleton />)
      : <PageScroller busy={busy}>
        <div className={fadeIn ? "reveal" : undefined}>
          {page.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          <div className="card prose"><RichText parts={data.parts} /></div>
        </div>
      </PageScroller>}
  </>;
}
