import { useMemo, useState } from "react";
import type { StoredDocument } from "@genesis/sdk";
import { useRouter } from "@genesis/sdk/react";
import { activeMembership, libraryMessage, useLibrary, type BookmarkV1, type CategorySnapshot } from "../library";
import { userUrl } from "../model";
import { StoryTitle } from "../components/story";
import { InlineError } from "../components/states";
import { Link, Meta } from "../components/ui";
import { RetryButton, useBusy } from "../ui/feedback";
import { PageScroller, RefreshButton, ScreenHead } from "../ui/frame";
import { Icon } from "../ui/icons";
import { SavedSkeleton } from "../ui/skeletons";
import { Notice, useSawLoading } from "../ui/states";

const matches = (bookmark: BookmarkV1, filter: string, categories: CategorySnapshot) => {
  const memberships = activeMembership(bookmark.categoryIds, categories);
  return filter === "all" || (filter === "uncategorized" ? memberships.length === 0 : memberships.includes(filter));
};

/** The article's host as HN shows it, without `www.`. */
function domainOf(url: string | null) {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

/** The Saved tab: the stories saved in the bookmarks service, filtered by category and title. */
export function SavedScreen() {
  const { screen, navigate } = useRouter();
  const library = useLibrary();
  const [query, setQuery] = useState("");
  const [refreshing, runRefresh] = useBusy();
  const categories = library.categories;
  const wanted = screen?.params.filter;
  const filter = categories?.categories.some(record => record.value.id === wanted) || wanted === "uncategorized" ? wanted! : "all";
  const setFilter = (value: string) => navigate({ screen: "saved", params: { filter: value }, mode: "replace" });
  const busy = refreshing || (library.loading && categories !== null);
  const loading = !categories || (library.loading && library.bookmarks.length === 0);
  const fadeIn = useSawLoading(loading && !library.error);
  // The service has no completion signal for a reread, so Refresh shows its turn for the minimum time.
  const refresh = () => void runRefresh(() => library.retry());

  const shown = useMemo(() => {
    if (!categories) return [];
    const needle = query.trim().toLowerCase();
    return library.bookmarks.filter(record => matches(record.value, filter, categories)
      && (!needle || record.value.title.toLowerCase().includes(needle)));
  }, [library.bookmarks, categories, filter, query]);

  const head = <ScreenHead title="Saved" actions={<>
    <button type="button" className="icon-button" aria-label="Manage categories" onClick={() => navigate({ screen: "categories" })}>
      <Icon name="folder" />
    </button>
    <RefreshButton busy={busy} onRefresh={refresh} />
  </>} />;

  // An error with nothing to show is not "No saved stories".
  if (library.error && (!categories || library.bookmarks.length === 0)) return <>
    {head}
    <div className="screen">
      <Notice title="Couldn't load saved stories" role="alert">
        <p>{libraryMessage(library.error)}</p>
        <div className="row-buttons"><RetryButton error={library.error} onRetry={library.retry} /></div>
      </Notice>
    </div>
  </>;
  if (loading || !categories) return <>{head}<SavedSkeleton /></>;

  const empty = library.bookmarks.length === 0;
  return <>
    {head}
    <PageScroller busy={busy}>
      <div className={fadeIn ? "reveal" : undefined}>
        {library.error != null && <InlineError>{libraryMessage(library.error)}</InlineError>}
        {!empty && <>
          <nav className="chips" aria-label="Filter saved stories">
            {[{ id: "all", name: "All" }, { id: "uncategorized", name: "Uncategorized" }, ...categories.categories.map(record => record.value)]
              .map(option => <button type="button" key={option.id} className="chip" aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}>{option.name}</button>)}
          </nav>
          <label className="search-field inset">
            <Icon name="search" />
            <span className="visually-hidden">Filter by title</span>
            <input type="search" enterKeyHint="search" autoCapitalize="none" placeholder="Filter by title" value={query}
              onChange={event => setQuery(event.target.value)} />
          </label>
        </>}
        {shown.length === 0
          ? <Notice title={empty ? "No saved stories" : "No matches"}>
              <p>{empty ? "Use the bookmark button on any story to save it here." : "Try another filter or title."}</p>
              {!empty && (query || filter !== "all") && <div className="row-buttons">
                <button type="button" className="button secondary" onClick={() => { setQuery(""); setFilter("all"); }}>Show all</button>
              </div>}
            </Notice>
          : shown.map(record => <SavedRow key={record.key} record={record} categories={categories} />)}
      </div>
    </PageScroller>
  </>;
}

function SavedRow({ record, categories }: { record: StoredDocument<BookmarkV1>; categories: CategorySnapshot }) {
  const { navigate } = useRouter();
  const story = record.value;
  const names = activeMembership(story.categoryIds, categories)
    .map(id => categories.categories.find(category => category.value.id === id)!.value.name);
  return <article className="story saved">
    <div className="story-body">
      <StoryTitle title={story.title} articleUrl={story.articleUrl} discussionUrl={story.discussionUrl} domain={domainOf(story.articleUrl)} />
      <Meta parts={[
        story.submitter && <Link url={userUrl(story.submitter)}>{story.submitter}</Link>,
        <Link url={story.discussionUrl}>discussion</Link>,
        <span className="categories">{names.length > 0 ? names.join(", ") : "Uncategorized"}</span>,
      ]} />
    </div>
    <button type="button" className="icon-button save-button" aria-label={`Edit saved story: ${story.title}`} onClick={() =>
      navigate({ screen: "save", params: { snapshot: JSON.stringify(story) } })}>
      <Icon name="bookmark" filled />
    </button>
  </article>;
}
