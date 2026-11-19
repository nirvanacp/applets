import { memo, useEffect, useRef, useState } from "react";
import { ScrollMemory, useRecord, useRouter } from "@nirvanacp/sdk/react";
import type { BrowseTile, SearchRow, SearchState } from "../model";
import { useAction, usePendingCommand, usePlayerCommand, useReport } from "../components/playback";
import { Artwork, Icon } from "../components/ui";
import { ProgressBar } from "../ui/feedback";
import { PageScroller, RefreshButton, TopBar, useOpenUrl } from "../ui/frame";
import { BrowseSkeleton, ResultsSkeleton } from "../ui/skeletons";
import { EmptyNotice, InlineError, LoadError, Notice, SignInNotice, useSawLoading } from "../ui/states";
import { delivered, failedRead, onScreen, refreshing, usePageStatus, useScreenWatch, viewOf } from "../screen";

const ROWS = "search:searchRows";
const SETTLE_MS = 3000;

/** True once `key` has stayed the same, and not null, for SETTLE_MS. */
function useSettled(key: string | null) {
  const [settled, setSettled] = useState<string | null>(null);
  useEffect(() => {
    if (key === null) return;
    const timer = setTimeout(() => setSettled(key), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [key]);
  return key !== null && settled === key;
}
const BROWSE = "search:browse";
/** How long typing pauses before the query goes to Spotify. */
const TYPING_PAUSE_MS = 350;

/**
 * Search. On `/search` it shows the field and the Browse all tiles; once the field opens it shows
 * recent searches, then results as the user types.
 */
export function SearchScreen() {
  const page = usePageStatus("primary");
  const here = onScreen(page, "search");
  return here && page.routeId === "search" ? <BrowseView /> : <SearchView />;
}

function BrowseView() {
  const page = usePageStatus("primary");
  const tiles = useScreenWatch<unknown, BrowseTile | null>("search", "browse");
  const [opening, openSearch] = useAction<undefined>("openSearch");
  const keys = tiles.order;
  const view = viewOf(page, keys.length > 0, delivered(tiles), failedRead(tiles));
  const fadeIn = useSawLoading(view === "loading");
  const busy = refreshing(page);

  return <>
    <TopBar title="Search" actions={view !== "auth" && <RefreshButton busy={busy} />} />
    <PageScroller busy={busy}>
      {view !== "auth" && <button type="button" className={`search-field${opening ? " opening" : ""}`} aria-busy={opening} disabled={opening}
        onClick={() => void openSearch(undefined)}>
        <Icon name="search" /> What do you want to listen to?
      </button>}
      {view === "auth" ? <SignInNotice />
        : view === "error" ? <LoadError error={page.error ?? tiles.error} title="Couldn't load Search" />
        : view === "empty" ? <EmptyNotice title="Nothing to browse"><p>Spotify shows no categories right now. Search still works.</p></EmptyNotice>
        : view === "loading" ? <BrowseSkeleton />
        : <div className={fadeIn ? "reveal" : undefined}>
          {(page.status === "error" || tiles.status === "error") && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          <h2 className="shelf-title browse-title">Browse all</h2>
          <ul className="browse-grid">{keys.map(key => <li key={key}><Tile id={key} /></li>)}</ul>
        </div>}
    </PageScroller>
  </>;
}

const Tile = memo(function Tile({ id }: { id: string }) {
  const tile = useRecord<BrowseTile>(BROWSE, id);
  const open = useOpenUrl();
  if (!tile) return null;
  return <button type="button" className="browse-tile" style={{ background: tile.color ?? undefined }}
    disabled={!tile.url} onClick={() => tile.url && open(tile.url)}>
    <span>{tile.title}</span>
    {tile.image && <img src={tile.image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
  </button>;
});

function SearchView() {
  const page = usePageStatus("primary");
  const { back } = useRouter();
  const report = useReport();
  const state = useScreenWatch<SearchState | null>("search", "search").value ?? null;
  const rows = useScreenWatch<unknown, SearchRow | null>("search", "searchRows");
  const setQuery = usePlayerCommand<{ query: string }>("setQuery");
  const setFilter = usePlayerCommand<{ label: string; checked: boolean }>("setFilter");
  const [clearing, clearRecents] = useAction<undefined>("clearRecents");
  const pendingFilter = usePendingCommand<{ label: string; checked: boolean }>("setFilter");

  // The field is the applet's; Spotify gets the query once typing pauses.
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? state?.query ?? "";
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (text === null || text.trim() === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = text.trim();
      void setQuery({ query: text }).then(result => report(result));
    }, TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = state?.query ?? "";
  const typing = text !== null && text.trim() !== query;
  const filtered = state?.chips.some(chip => chip.checked) ?? false;
  const keys = rows.order;
  const busy = typing || refreshing(page);
  const failed = page.status === "error" || rows.status === "error";
  // Spotify's search page is ready before its results render, so an empty list means "no
  // results" only once it has stayed empty for a moment on the same query and filters.
  const looksEmpty = !!query && !typing && keys.length === 0 && page.status === "ready" && delivered(rows);
  const settled = useSettled(looksEmpty ? `${query}\n${state?.chips.map(chip => chip.checked ? 1 : 0).join("")}` : null);

  let body;
  if (page.status === "auth") body = <SignInNotice />;
  else if (!query && !typing) body = keys.length > 0
    ? <>
      <h2 className="shelf-title">Recent searches</h2>
      <ul className="results">{keys.map(key => <ResultItem key={key} id={key} />)}</ul>
      {state?.hasRecents && <div className="row-buttons">
        <button type="button" className="button secondary" disabled={clearing} aria-busy={clearing}
          onClick={() => void clearRecents(undefined, { text: "Recent searches cleared" })}>
          {clearing ? "Clearing…" : "Clear recent searches"}
        </button>
      </div>}
    </>
    : failed ? <LoadError error={page.error ?? rows.error} title="Couldn't load Search" />
    : page.status === "ready" && delivered(rows)
      ? <Notice title="Play what you love"><p>Search for artists, songs, podcasts and more.</p></Notice>
      : <ResultsSkeleton label="Loading recent searches" chips={false} />;
  else {
    // The chips stay when a filter finds nothing, so the user can switch or clear it.
    const chips = state && state.chips.length > 0 && <div className="chips" role="group" aria-label="Filters">
      {state.chips.map(chip => {
        const asked = pendingFilter?.label === chip.label;
        const checked = asked ? pendingFilter.checked : chip.checked;
        return <button type="button" key={chip.label} className={`chip${checked ? " on" : ""}`} aria-pressed={checked}
          aria-busy={asked} disabled={pendingFilter !== undefined}
          onClick={() => void setFilter({ label: chip.label, checked: !chip.checked }).then(result => report(result))}>
          {chip.label}
        </button>;
      })}
    </div>;
    let results;
    if (keys.length > 0) results = <ul className="results" aria-busy={typing}>
      {keys.map((key, index) => <ResultItem key={key} id={key} top={index === 0 && !filtered} />)}
    </ul>;
    else if (failed) results = <LoadError error={page.error ?? rows.error} title="Couldn't search" />;
    else if (looksEmpty && settled) results = <Notice title={`No results for "${query}"`}><p>Check the spelling, or try fewer or different words.</p></Notice>;
    else results = <ResultsSkeleton chips={!chips} />;
    body = <>{chips}{keys.length > 0 && failed && <InlineError>Couldn't refresh the results.</InlineError>}{results}</>;
  }

  return <>
    <form className="search-bar" role="search" onSubmit={event => {
      event.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur();
    }}>
      <label className="search-input">
        <Icon name="search" />
        <input type="search" value={shown} placeholder="What do you want to listen to?" aria-label="Search"
          autoFocus={!query} enterKeyHint="search" autoComplete="off" onChange={event => setText(event.target.value)} />
        {shown && <button type="button" className="clear" aria-label="Clear search" onClick={() => setText("")}><Icon name="close" /></button>}
      </label>
      <button type="button" className="cancel" onClick={() => back()}>Cancel</button>
    </form>
    <ProgressBar active={busy} label="Searching" />
    <ScrollMemory className="screen search-screen" aria-busy={busy}>
      {body}
    </ScrollMemory>
  </>;
}

const ResultItem = memo(function ResultItem({ id, top = false }: { id: string; top?: boolean }) {
  const row = useRecord<SearchRow>(ROWS, id);
  const [opening, openResult] = useAction<{ rowId: string }>("openResult");
  const [removing, removeRecent] = useAction<{ rowId: string }>("removeRecent");
  const pending = usePendingCommand<{ rowId: string }>("openResult");
  if (!row) return null;
  const round = row.kind === "artist" || row.kind === "user";
  const busy = opening || pending?.rowId === row.rowId;
  const open = () => void openResult({ rowId: row.rowId });
  const subtitle = [row.type, row.detail].filter(Boolean).join(" · ");

  if (top) return <li>
    <h2 className="shelf-title">Top result</h2>
    <div className="top-result">
      <button type="button" className={`top-open${busy ? " opening" : ""}`} disabled={busy} aria-busy={busy} onClick={open}>
        <Artwork src={row.image} round={round} className="top-art" />
        <strong>{row.title}</strong>
        <span className="muted">{subtitle}</span>
      </button>
      {row.kind === "track" && <button type="button" className={`play-big${busy ? " working" : ""}`} aria-label={`Play ${row.title}`}
        disabled={busy} aria-busy={busy} onClick={open}>
        <Icon name="play" filled />
      </button>}
    </div>
  </li>;

  return <li className={`result${removing ? " removing" : ""}`}>
    <button type="button" className={`track${busy ? " starting" : ""}`} disabled={busy || removing} aria-busy={busy} onClick={open}>
      <span className="track-lead">
        <Artwork src={row.image} round={round} className="track-art" />
        {busy && <span className="spinner over" aria-hidden="true" />}
      </span>
      <span className="track-text">
        <strong>{row.title}</strong>
        <span>{row.explicit && <span className="explicit" aria-label="Explicit">E</span>}{subtitle}</span>
      </span>
    </button>
    {row.dismissible && <button type="button" className="icon-button" aria-label={`Remove ${row.title} from recent searches`}
      disabled={removing} aria-busy={removing}
      onClick={() => void removeRecent({ rowId: row.rowId }, { text: `Removed ${row.title} from recent searches` })}>
      <Icon name="close" />
    </button>}
  </li>;
});
