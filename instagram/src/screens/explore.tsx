import { useEffect, useRef, useState } from "react";
import { ScrollMemory, useCommand, useRouter } from "@genesis/sdk/react";
import { ORIGIN, tagUrl, type GridItem, type PersonRow } from "../model";
import { Grid } from "../components/grid";
import { MoreButton } from "../components/more";
import { Icon, InlineError, LoadError, Notice, Skeleton, TopBar } from "../components/ui";
import { PeopleList } from "./follows";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

/** Explore: a search field that opens Search, and Instagram's Explore grid. */
export function ExploreScreen() {
  const { navigate } = useRouter();
  const page = usePageStatus();
  const grid = useScreenWatch<unknown, GridItem | null>("explore", "grid");
  const shown = onScreen(page, "explore") ? grid.order : [];
  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <div className="search-bar">
      <button type="button" className="search-field" onClick={() => navigate({ url: `${ORIGIN}/explore/search/`, context: "explore" })}>
        <Icon name="search" /><span>Search</span>
      </button>
    </div>
    {page.status === "error" && shown.length > 0 && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
    {shown.length === 0 ? page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading Explore" kind="grid" />
      : <><Grid items={grid} /><MoreButton stale={page.stale} grid /></>}
  </ScrollMemory>;
}

/**
 * Search: the query goes into Instagram's own search box, and the accounts it suggests show
 * below. Enter searches posts by keyword or hashtag.
 */
export function SearchScreen() {
  const { navigate, back } = useRouter();
  const page = usePageStatus();
  const results = useScreenWatch<unknown, PersonRow | null>("search", "results");
  const search = useCommand<{ q: string }>("search");
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const here = onScreen(page, "search");
  const ready = here && page.status === "ready";

  useEffect(() => { input.current?.focus(); }, []);
  // Instagram suggests accounts as the box changes; the applet types into it after a short pause.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void search({ q: q.trim() }), 350);
    return () => clearTimeout(timer);
  }, [q, ready, search]);

  const people = here && q.trim() ? results.order.map(key => results.records[key]).filter((row): row is PersonRow => !!row) : [];
  const submit = () => {
    const value = q.trim();
    if (!value) return;
    navigate({ url: value.startsWith("#") ? tagUrl(value.slice(1)) : `${ORIGIN}/explore/search/keyword/?q=${encodeURIComponent(value)}`, context: "explore" });
  };
  return <ScrollMemory className="screen">
    <form className="search-bar" onSubmit={event => { event.preventDefault(); submit(); }}>
      <button type="button" className="icon-button" aria-label="Back" onClick={back}><Icon name="left" /></button>
      <label className="search-field">
        <Icon name="search" />
        <input ref={input} type="search" enterKeyHint="search" placeholder="Search" aria-label="Search" value={q} maxLength={100} onChange={event => setQ(event.target.value)} />
      </label>
    </form>
    {q.trim() && <button type="button" className="row search-keyword" onClick={submit}>
      <span className="round-icon"><Icon name="search" /></span><span>Search posts for “{q.trim()}”</span>
    </button>}
    {page.status === "error" && <LoadError error={page.error} />}
    {people.length > 0 && <PeopleList people={people} />}
    {q.trim() && people.length === 0 && ready && delivered(results) && <p className="muted padded">No accounts found.</p>}
  </ScrollMemory>;
}

/** Posts for a keyword or hashtag. */
export function KeywordScreen() {
  const page = usePageStatus();
  const grid = useScreenWatch<unknown, GridItem | null>("keyword", "grid");
  const here = onScreen(page, "keyword");
  const shown = here ? grid.order : [];
  const title = page.params.q ?? (page.params.tag ? `#${page.params.tag}` : "Search");
  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <TopBar title={title} />
    {shown.length === 0
      ? page.status === "ready" && here && delivered(grid) ? <Notice title="No results"><p>Try another word or hashtag.</p></Notice>
        : page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading results" kind="grid" />
      : <><Grid items={grid} /><MoreButton stale={page.stale} grid /></>}
  </ScrollMemory>;
}
