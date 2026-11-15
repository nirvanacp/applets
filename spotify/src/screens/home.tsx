import type { Section } from "../model";
import { Shelf } from "../components/shelf";
import { PageScroller, RefreshButton, TopBar } from "../ui/frame";
import { ShelvesSkeleton } from "../ui/skeletons";
import { EmptyNotice, InlineError, LoadError, SignInNotice, useSawLoading } from "../ui/states";
import { delivered, onScreen, refreshing, usePageStatus, useScreenWatch, viewOf } from "../screen";

const SECTIONS = "home:sections";

/** Home: the greeting and Spotify's rows of recommendations, as horizontal shelves. */
export function HomeScreen() {
  const page = usePageStatus("primary");
  const sections = useScreenWatch<unknown, Section | null>("home", "sections");
  const heading = useScreenWatch<string | null>("home", "heading").value ?? null;
  const here = onScreen(page, "home");
  const keys = here ? sections.order : [];
  const failed = page.status === "error" || sections.status === "error";
  const view = viewOf(page, keys.length > 0, here && delivered(sections), sections.status === "error");
  const fadeIn = useSawLoading(view === "loading");
  const busy = refreshing(page);
  // The greeting is unknown until the page draws it; a fallback name shows only once it is ready.
  const title = here && heading ? heading : page.status === "ready" && !page.stale ? "Home" : <span className="sk sk-title top-bar-sk" />;

  return <>
    <TopBar title={title} actions={view !== "auth" && <RefreshButton busy={busy} />} />
    <PageScroller busy={busy}>
      {view === "auth" ? <SignInNotice />
        : view === "error" ? <LoadError error={page.error ?? sections.error} title="Couldn't load Home" />
        : view === "empty" ? <EmptyNotice title="Nothing to show yet"><p>Spotify has no recommendations here right now.</p></EmptyNotice>
        : view === "loading" ? <ShelvesSkeleton label="Loading Home" />
        : <div className={fadeIn ? "reveal" : undefined}>
          {failed && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          {keys.map(key => <Shelf key={key} watch={SECTIONS} id={key} />)}
        </div>}
    </PageScroller>
  </>;
}
