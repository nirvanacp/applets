import { useState, type FormEvent } from "react";
import { useRouter } from "@genesis/sdk/react";
import { searchOf, searchUrl, type MoreLink, type SearchHit, type SearchQuery } from "../model";
import { CommentRow, StoryRow } from "../components/story";
import { InlineError } from "../components/states";
import { PageScroller, RefreshButton, ScreenHead, useOpenUrl } from "../ui/frame";
import { Icon } from "../ui/icons";
import { ResultsSkeleton } from "../ui/skeletons";
import { LoadError, Notice, useSawLoading } from "../ui/states";
import { delivered, onScreen, refreshing, signedIn as isSignedIn, usePageStatus, useScreenWatch, viewOf } from "../screen";

const TYPES: { id: SearchQuery["type"]; label: string }[] = [{ id: "story", label: "Stories" }, { id: "comment", label: "Comments" }];
const SORTS: { id: SearchQuery["sort"]; label: string }[] = [{ id: "byPopularity", label: "Popular" }, { id: "byDate", label: "Newest" }];

/**
 * The search field. Searching opens HN's search site in the Home context, where the manifest
 * shows it as the results screen; each search and filter is a URL, so Back walks them.
 */
function SearchForm({ current, onSearch, autoFocus = false }: {
  current: SearchQuery | null; onSearch: (query: SearchQuery) => void; autoFocus?: boolean;
}) {
  const [text, setText] = useState(current?.query ?? "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSearch({ query: text, type: current?.type ?? "story", sort: current?.sort ?? "byPopularity", page: 0 });
  };
  return <form role="search" className="search-form" onSubmit={submit}>
    <label className="search-field">
      <Icon name="search" />
      <span className="visually-hidden">Search Hacker News</span>
      <input type="search" enterKeyHint="search" inputMode="search" autoCapitalize="none" autoCorrect="off" spellCheck={false}
        autoFocus={autoFocus} placeholder="Search stories and comments" value={text}
        onChange={event => setText(event.target.value)} />
    </label>
  </form>;
}

/** The Search tab: a field, filled with the last search when Home shows its results. */
export function SearchScreen() {
  const { navigate } = useRouter();
  const last = searchOf(usePageStatus("primary").url);
  return <>
    <ScreenHead title="Search" />
    <div className="screen">
      <SearchForm autoFocus={!last} current={last} onSearch={query => navigate({ url: searchUrl(query), context: "primary" })} />
      <Notice title="Search Hacker News"><p>Find stories by title, site or author, or switch to comments after searching.</p></Notice>
    </div>
  </>;
}

/** Results from HN's search site. A story opens like a Home story; a comment opens its thread. */
export function ResultsScreen() {
  const page = usePageStatus();
  const { navigate } = useRouter();
  const results = useScreenWatch<unknown, SearchHit | null>("results", "results");
  const total = useScreenWatch<string>("results", "total").value;
  const next = useScreenWatch<MoreLink>("results", "search.more").value;
  const open = useOpenUrl();
  const current = searchOf(page.url);
  const signedIn = isSignedIn(page);
  const here = onScreen(page, "results");
  const keys = here ? results.order : [];
  const busy = refreshing(page);
  // "No results" only once the results reader has read this search on a settled page.
  const view = viewOf(page, keys.length > 0, here && delivered(results), here && results.status === "error");
  const fadeIn = useSawLoading(view === "loading");
  const change = (patch: Partial<SearchQuery>) => current && navigate({ url: searchUrl({ ...current, ...patch, page: 0 }), mode: "replace" });

  return <>
    <ScreenHead title="Search" actions={<RefreshButton busy={busy} />} />
    <PageScroller busy={busy}>
      <SearchForm key={page.url} current={current} onSearch={query => navigate({ url: searchUrl(query), mode: "replace" })} />
      {current && <nav className="chips" aria-label="Filters">
        {TYPES.map(type => <button type="button" key={type.id} className="chip" aria-pressed={type.id === current.type}
          onClick={() => type.id !== current.type && change({ type: type.id })}>{type.label}</button>)}
        <span className="chip-gap" aria-hidden="true" />
        {SORTS.map(sort => <button type="button" key={sort.id} className="chip" aria-pressed={sort.id === current.sort}
          onClick={() => sort.id !== current.sort && change({ sort: sort.id })}>{sort.label}</button>)}
      </nav>}
      {view === "error" ? <LoadError error={page.error ?? results.error} site="Hacker News search" />
        : view === "loading" ? <ResultsSkeleton />
        : view === "empty" ? <Notice title="No results">
            <p>Nothing on Hacker News matches “{current?.query}”{current?.type === "story" ? " in stories" : " in comments"}.</p>
            {current?.type === "story" && <div className="row-buttons">
              <button type="button" className="button secondary" onClick={() => change({ type: "comment" })}>Search comments</button>
            </div>}
          </Notice>
        : <div className={fadeIn ? "reveal" : undefined}>
          {page.status === "error" && <InlineError>Couldn't refresh. Showing the last results.</InlineError>}
          {total && <p className="meta total">{total}{current && current.page > 0 ? ` · page ${current.page + 1}` : ""}</p>}
          {keys.map(key => {
            const found = results.records[key];
            if (!found) return null;
            return found.kind === "story"
              ? <StoryRow key={key} story={found.story} signedIn={signedIn} rank={false} />
              : <CommentRow key={key} head entry={found.comment} storyId={found.comment.onStory?.id ?? key}
                  signedIn={signedIn} onLink={open} />;
          })}
          {next && <div className="more">
            <button type="button" className="button secondary" disabled={page.stale} onClick={() => navigate({ url: next.url })}>Next page</button>
          </div>}
        </div>}
    </PageScroller>
  </>;
}
