import { useEffect, useRef, useState } from "react";
import { useRouter, type CurrentScreen, type WatchValue } from "@nirvanacp/sdk/react";
import { searchUrl, type MediaTile, type Person, type PostView, type Trend } from "../model";
import { PersonRow, ShowMore, TileGrid } from "../components/lists";
import { PostRow } from "../components/post";
import { EmptyNotice, InlineError } from "../components/states";
import { PageScroller, RefreshButton, Segments, TopBar, useOpenUrl } from "../ui/frame";
import { Icon } from "../ui/icons";
import { FeedSkeleton, GridSkeleton, PeopleSkeleton, TrendsSkeleton } from "../ui/skeletons";
import { LoadError, useSawLoading } from "../ui/states";
import { delivered, onScreen, refreshing, useScreenWatch, viewOf } from "../screen";

const SEARCH_TABS = [{ id: "", label: "Top" }, { id: "live", label: "Latest" }, { id: "user", label: "People" }, { id: "media", label: "Media" }];

/** Explore's trends, and search and hashtag results, in the `explore` context. */
export function ExploreScreen(_: { screen: CurrentScreen }) {
  const { navigate, status } = useRouter();
  const page = status();
  const trends = useScreenWatch<unknown, Trend | null>("explore", "trends");
  const people = useScreenWatch<unknown, Person | null>("explore", "people");
  const results = useScreenWatch<unknown, PostView | null>("explore", "results");
  const tiles = useScreenWatch<unknown, MediaTile | null>("explore", "tiles");
  const empty = useScreenWatch<string | null>("explore", "empty");
  const url = new URL(page.url ?? "https://x.com/explore");
  const query = url.pathname === "/search" ? page.params.q ?? "" : url.pathname.startsWith("/hashtag/") ? `#${page.params.tag}` : "";
  const tab = url.searchParams.get("f") ?? "";
  const [draft, setDraft] = useState(query);
  const field = useRef<HTMLInputElement>(null);
  // A search opened elsewhere, or Back to another one, shows its words unless the person is typing.
  useEffect(() => {
    if (document.activeElement !== field.current) setDraft(query);
  }, [query]);
  const here = onScreen(page, "explore");
  const lists = [trends, people, results, tiles] as WatchValue[];
  const shown = {
    trends: here ? trends.order : [], people: here ? people.order : [], results: here ? results.order : [], tiles: here ? tiles.order : [],
  };
  const has = shown.trends.length + shown.people.length + shown.results.length + shown.tiles.length > 0;
  const partial = here && lists.some(list => list.status === "error");
  const view = viewOf(page, has, here && lists.every(delivered), partial);
  const busy = refreshing(page);
  const fadeIn = useSawLoading(view === "loading");
  const actionable = page.signedIn === true && !page.stale;

  const search = (value: string) => {
    const text = value.trim();
    if (text) navigate({ url: searchUrl(text, tab || undefined), mode: query ? "replace" : "push" });
  };

  return <>
    <TopBar back={!!query} actions={<RefreshButton busy={busy} />}>
      <form role="search" className="search-form" onSubmit={event => { event.preventDefault(); search(draft); }}>
        <label className="search-field">
          <Icon name="search" />
          <span className="visually-hidden">Search X</span>
          <input type="search" inputMode="search" enterKeyHint="search" autoCapitalize="off" autoComplete="off" autoCorrect="off"
            ref={field} placeholder="Search" value={draft} onChange={event => setDraft(event.target.value)} />
        </label>
      </form>
    </TopBar>
    {query && <Segments label="Result type" active={tab} options={SEARCH_TABS.map(option => ({
      ...option, go: () => navigate({ url: searchUrl(query, option.id || undefined), mode: "replace" }),
    }))} />}
    {view === "error" && !partial ? <LoadError error={page.error} site="X" />
      : view === "loading" ? (!query ? <TrendsSkeleton /> : tab === "user" ? <PeopleSkeleton /> : tab === "media" ? <GridSkeleton /> : <FeedSkeleton label="Searching" />)
      : <PageScroller busy={busy}>
        {page.status === "error" && has && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
        {partial && <InlineError>Some results couldn't be read.</InlineError>}
        {view === "empty" && <EmptyNotice title={empty.value ?? (query ? `No results for “${query}”` : "Nothing to explore")}>
          <p>{query ? "Try searching for something else." : "Trends show up here."}</p>
        </EmptyNotice>}
        {has && <div className={fadeIn ? "reveal" : undefined}>
          {shown.trends.length > 0 && <section aria-label="Trends">
            {!query && <h2 className="section-title">Trends for you</h2>}
            {shown.trends.map(key => trends.records[key] && <TrendRow key={key} trend={trends.records[key]!} />)}
          </section>}
          {shown.people.length > 0 && <section aria-label="People">
            {tab !== "user" && <h2 className="section-title">People</h2>}
            {shown.people.map(key => people.records[key] && <PersonRow key={key} person={people.records[key]!} />)}
          </section>}
          {shown.results.length > 0 && <div className="feed">
            {shown.results.map(key => results.records[key] && <PostRow key={key} post={results.records[key]!} actionable={actionable} />)}
          </div>}
          {shown.tiles.length > 0 && <TileGrid items={tiles} />}
          {query && <ShowMore stale={page.stale} />}
        </div>}
      </PageScroller>}
  </>;
}

function TrendRow({ trend }: { trend: Trend }) {
  const open = useOpenUrl();
  return <button type="button" className="trend row-press" onClick={() => open(searchUrl(trend.name))}>
    {trend.context && <span className="post-meta">{trend.context}</span>}
    <strong dir="auto">{trend.name}</strong>
    {trend.meta && <span className="post-meta">{trend.meta}</span>}
  </button>;
}
