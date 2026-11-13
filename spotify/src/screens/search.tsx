import { memo, useEffect, useRef, useState } from "react";
import { ScrollMemory, useRecord, useRouter } from "@genesis/sdk/react";
import type { BrowseTile, SearchRow, SearchState } from "../model";
import { usePendingCommand, usePlayerCommand } from "../components/playback";
import { Artwork, failureText, Icon, LoadError, Notice, Skeleton, useOpenUrl } from "../components/ui";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

const ROWS = "search:searchRows";
const BROWSE = "search:browse";
/** How long typing pauses before the query goes to Spotify. */
const TYPING_PAUSE_MS = 350;

type Run = (action: Promise<{ outcome: string; message?: string | null }>) => Promise<void>;

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
  const openSearch = usePlayerCommand<undefined>("openSearch");
  const [notice, setNotice] = useState<string | null>(null);

  let body;
  if (tiles.order.length > 0) body = <ul className="browse-grid">
    {tiles.order.map(key => <li key={key}><Tile id={key} /></li>)}
  </ul>;
  else if (page.status === "error" || tiles.status === "error") body = <LoadError error={page.error ?? tiles.error} />;
  else if (page.status === "ready" && delivered(tiles)) body = null;
  else body = <Skeleton label="Loading Search" kind="rows" />;

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <h1 className="screen-title">Search</h1>
    <button type="button" className="search-field" onClick={async () => setNotice(failureText(await openSearch()))}>
      <Icon name="search" /> What do you want to listen to?
    </button>
    {notice && <p className="inline-error" role="alert">{notice}</p>}
    {tiles.order.length > 0 && <h2 className="shelf-title browse-title">Browse all</h2>}
    {body}
  </ScrollMemory>;
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
  const state = useScreenWatch<SearchState | null>("search", "search").value ?? null;
  const rows = useScreenWatch<unknown, SearchRow | null>("search", "searchRows");
  const setQuery = usePlayerCommand<{ query: string }>("setQuery");
  const setFilter = usePlayerCommand<{ label: string; checked: boolean }>("setFilter");
  const clearRecents = usePlayerCommand<undefined>("clearRecents");
  const [notice, setNotice] = useState<string | null>(null);
  const run: Run = async action => {
    setNotice(null);
    setNotice(failureText(await action));
  };

  // The field is the applet's; Spotify gets the query once typing pauses.
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? state?.query ?? "";
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (text === null || text.trim() === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = text.trim();
      void run(setQuery({ query: text }));
    }, TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = state?.query ?? "";
  const typing = text !== null && text.trim() !== query;
  const filtered = state?.chips.some(chip => chip.checked) ?? false;
  const keys = rows.order;

  let body;
  if (!query && !typing) body = keys.length > 0
    ? <>
      <h2 className="shelf-title">Recent searches</h2>
      <ul className="results">{keys.map(key => <ResultItem key={key} id={key} run={run} />)}</ul>
      {state?.hasRecents && <button type="button" className="secondary" onClick={() => run(clearRecents())}>Clear recent searches</button>}
    </>
    : page.status === "ready" && delivered(rows)
      ? <Notice title="Play what you love"><p>Search for artists, songs, podcasts and more.</p></Notice>
      : null;
  else {
    // The chips stay when a filter finds nothing, so the user can switch or clear it.
    const chips = state && state.chips.length > 0 && <div className="chips" role="group" aria-label="Filters">
      {state.chips.map(chip => <button type="button" key={chip.label} className={`chip${chip.checked ? " on" : ""}`}
        aria-pressed={chip.checked} onClick={() => run(setFilter({ label: chip.label, checked: !chip.checked }))}>
        {chip.label}
      </button>)}
    </div>;
    let results;
    if (keys.length > 0) results = <ul className="results" aria-busy={typing}>
      {keys.map((key, index) => <ResultItem key={key} id={key} run={run} top={index === 0 && !filtered} />)}
    </ul>;
    else if (page.status === "error" || rows.status === "error") results = <LoadError error={page.error ?? rows.error} />;
    else if (!typing && page.status === "ready" && delivered(rows)) results = <Notice title={`No results for "${query}"`}><p>Check the spelling, or try fewer or different words.</p></Notice>;
    else results = <Skeleton label="Searching" kind="rows" />;
    body = <>{chips}{results}</>;
  }

  return <ScrollMemory className="screen search-screen" aria-busy={page.stale || page.status === "loading"}>
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
    {notice && <p className="inline-error" role="alert">{notice}</p>}
    {body}
  </ScrollMemory>;
}

const ResultItem = memo(function ResultItem({ id, run, top = false }: { id: string; run: Run; top?: boolean }) {
  const row = useRecord<SearchRow>(ROWS, id);
  const openResult = usePlayerCommand<{ rowId: string }>("openResult");
  const removeRecent = usePlayerCommand<{ rowId: string }>("removeRecent");
  const pending = usePendingCommand<{ rowId: string }>("openResult");
  if (!row) return null;
  const round = row.kind === "artist" || row.kind === "user";
  const open = () => run(openResult({ rowId: row.rowId }));
  const subtitle = [row.type, row.detail].filter(Boolean).join(" · ");

  if (top) return <li>
    <h2 className="shelf-title">Top result</h2>
    <div className="top-result">
      <button type="button" className="top-open" disabled={pending?.rowId === row.rowId} onClick={open}>
        <Artwork src={row.image} round={round} className="top-art" />
        <strong>{row.title}</strong>
        <span className="muted">{subtitle}</span>
      </button>
      {row.kind === "track" && <button type="button" className="play-big" aria-label={`Play ${row.title}`} onClick={open}>
        <Icon name="play" filled />
      </button>}
    </div>
  </li>;

  return <li className="result">
    <button type="button" className="track" disabled={pending?.rowId === row.rowId} onClick={open}>
      <Artwork src={row.image} round={round} className="track-art" />
      <span className="track-text">
        <strong>{row.title}</strong>
        <span>{row.explicit && <span className="explicit" aria-label="Explicit">E</span>}{subtitle}</span>
      </span>
    </button>
    {row.dismissible && <button type="button" className="icon-button" aria-label={`Remove ${row.title} from recent searches`}
      onClick={() => run(removeRecent({ rowId: row.rowId }))}>
      <Icon name="close" />
    </button>}
  </li>;
});
