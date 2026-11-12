import { useState, type FormEvent } from "react";
import { ScrollMemory, useNavigation, usePage, useRecord, useRegion } from "@genesis/sdk/legacy/react";
import { searchOf, searchUrl, type MoreLink, type SearchHit, type SearchQuery } from "../model";
import { CommentRow, StoryRow } from "../components/story";
import { LoadError, Notice, Skeleton, useOpenUrl } from "../components/ui";

const TYPES: { id: SearchQuery["type"]; label: string }[] = [{ id: "story", label: "Stories" }, { id: "comment", label: "Comments" }];
const SORTS: { id: SearchQuery["sort"]; label: string }[] = [{ id: "byPopularity", label: "Popular" }, { id: "byDate", label: "Newest" }];

/**
 * The search field. Searching opens HN's search site in the Home context, where the manifest
 * shows it as the results screen; each search and filter is a URL, so Back walks them.
 */
function SearchForm({ current, onSearch }: { current: SearchQuery | null; onSearch: (query: SearchQuery) => void }) {
  const [text, setText] = useState(current?.query ?? "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSearch({ query: text, type: current?.type ?? "story", sort: current?.sort ?? "byPopularity", page: 0 });
  };
  return <form role="search" onSubmit={submit}>
    <label className="search-field">
      <span className="visually-hidden">Search Hacker News</span>
      <input type="search" enterKeyHint="search" placeholder="Search stories and comments" value={text}
        onChange={event => setText(event.target.value)} />
    </label>
  </form>;
}

/** The Search tab: a field, filled with the last search when Home shows its results. */
export function SearchScreen() {
  const { navigate } = useNavigation();
  const last = searchOf(usePage("primary").url);
  return <div className="screen">
    <h1 className="screen-title">Search</h1>
    <SearchForm current={last} onSearch={query => navigate({ url: searchUrl(query), context: "primary" })} />
    <Notice title="Search Hacker News"><p>Find stories by title, site or author, or switch to comments after searching.</p></Notice>
  </div>;
}

/** Results from HN's search site. A story opens like a Home story; a comment opens its thread. */
export function ResultsScreen() {
  const page = usePage();
  const { navigate } = useNavigation();
  const results = useRegion<SearchHit | null>("results");
  const total = useRecord<string>("total", null);
  const next = useRecord<MoreLink | null>("more", null)?.data;
  const open = useOpenUrl();
  const current = searchOf(page.url);
  const signedIn = page.account !== null;
  const change = (patch: Partial<SearchQuery>) => current && navigate({ url: searchUrl({ ...current, ...patch, page: 0 }), mode: "replace" });

  let body;
  if (results.order.length === 0) {
    if (page.status === "ready" && results.status === "ready") {
      body = <Notice title="No results">
        <p>Nothing on Hacker News matches “{current?.query}”{current?.type === "story" ? " in stories" : " in comments"}.</p>
        {current?.type === "story" && <button type="button" className="secondary" onClick={() => change({ type: "comment" })}>Search comments</button>}
      </Notice>;
    } else if (page.status === "error" || results.status === "error") {
      body = <LoadError error={page.error ?? results.error} />;
    } else body = <Skeleton label="Searching" />;
  } else body = <>
    {page.status === "error" && <p className="inline-error" role="alert">Couldn't refresh. Showing the last results.</p>}
    {total && <p className="meta">{total.data}{current && current.page > 0 ? ` · page ${current.page + 1}` : ""}</p>}
    {results.order.map(key => {
      const found = results.get(key)?.data;
      if (!found) return null;
      return found.kind === "story"
        ? <StoryRow key={key} story={found.story} region="results" signedIn={signedIn} />
        : <CommentRow key={key} head entry={found.comment} region="results" storyId={found.comment.onStory?.id ?? key}
            signedIn={signedIn} onLink={open} />;
    })}
    {next && <button type="button" className="secondary more" disabled={page.stale} onClick={() => navigate({ url: next.url })}>
      Next page
    </button>}
  </>;

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <SearchForm key={page.url} current={current} onSearch={query => navigate({ url: searchUrl(query), mode: "replace" })} />
    {current && <nav className="chips" aria-label="Filters">
      {TYPES.map(type => <button type="button" key={type.id} className="chip" aria-pressed={type.id === current.type}
        onClick={() => type.id !== current.type && change({ type: type.id })}>{type.label}</button>)}
      <span className="chip-gap" aria-hidden="true" />
      {SORTS.map(sort => <button type="button" key={sort.id} className="chip" aria-pressed={sort.id === current.sort}
        onClick={() => sort.id !== current.sort && change({ sort: sort.id })}>{sort.label}</button>)}
    </nav>}
    {body}
  </ScrollMemory>;
}
