import type { Section } from "../model";
import { Shelf } from "../components/shelf";
import { PageScroller, RefreshButton, TopBar } from "../ui/frame";
import { ShelvesSkeleton } from "../ui/skeletons";
import { EmptyNotice, InlineError, LoadError, SignInNotice, useSawLoading } from "../ui/states";
import { delivered, failedRead, onScreen, refreshing, usePageStatus, useScreenWatch, viewOf } from "../screen";

const SECTIONS = "hub:sections";

/** A category hub from Browse all, such as Pop or Podcasts: its name and rows of tiles. */
export function HubScreen() {
  const page = usePageStatus("primary");
  const sections = useScreenWatch<unknown, Section | null>("hub", "sections");
  const heading = useScreenWatch<string | null>("hub", "heading").value ?? null;
  const here = onScreen(page, "hub");
  const keys = here ? sections.order : [];
  const failed = page.status === "error" || sections.status === "error";
  const view = viewOf(page, keys.length > 0, here && delivered(sections), failedRead(sections));
  const fadeIn = useSawLoading(view === "loading");
  const busy = refreshing(page);
  // The category's name is unknown until the page draws it; a skeleton line stands in for it.
  const title = here && heading ? heading : view === "loading" || busy ? <span className="sk sk-title top-bar-sk" /> : "Browse";

  return <>
    <TopBar back title={title} actions={view !== "auth" && <RefreshButton busy={busy} />} />
    <PageScroller busy={busy}>
      {view === "auth" ? <SignInNotice />
        : view === "error" ? <LoadError error={page.error ?? sections.error} title="Couldn't load this category" />
        : view === "empty" ? <EmptyNotice title="Nothing here yet"><p>Spotify shows nothing in this category right now.</p></EmptyNotice>
        : view === "loading" ? <ShelvesSkeleton label="Loading category" />
        : <div className={fadeIn ? "reveal" : undefined}>
          {failed && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          {keys.map(key => <Shelf key={key} watch={SECTIONS} id={key} />)}
        </div>}
    </PageScroller>
  </>;
}
