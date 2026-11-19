import { memo, useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { useRecord, VirtualList } from "@let/sdk/react";
import type { Entity, Release, Section, TrackRow } from "../model";
import { useAction, usePendingCommand, usePlayerCommand } from "../components/playback";
import { playback, useStartingRow } from "../playback/use-playback";
import { Shelf } from "../components/shelf";
import { Artwork, Icon } from "../components/ui";
import { PageScroller, RefreshButton, TopBar, useOpenUrl } from "../ui/frame";
import { ArtistSkeleton, EntitySkeleton } from "../ui/skeletons";
import { InlineError, LoadError, SignInNotice, useSawLoading } from "../ui/states";
import { delivered, failedRead, onScreen, refreshing, usePageStatus, useScreenWatch, viewOf } from "../screen";

const TRACKS = "entity:tracks";
const SECTIONS = "entity:sections";
const RELEASES = "entity:releases";
/** How far the page scrolls before the header bar turns solid and shows the title. */
const SOLID_AT = 240;

/** An album, playlist or artist: its header, play and save or follow, its tracks and related shelves. */
export function EntityScreen() {
  const page = usePageStatus("primary");
  const entityWatch = useScreenWatch<Entity | null>("entity", "entity");
  const tracks = useScreenWatch<unknown, TrackRow | null>("entity", "tracks");
  const releases = useScreenWatch<unknown, Release | null>("entity", "releases");
  const sections = useScreenWatch<unknown, Section | null>("entity", "sections");
  const here = onScreen(page, "entity");
  const entity = here ? entityWatch.value ?? null : null;
  // A page whose entity could not be read once it was delivered is an error, not an empty page.
  const unreadable = here && page.status === "ready" && !page.stale && delivered(entityWatch) && !entity;
  const view = viewOf(page, entity !== null, false, failedRead(entityWatch) || unreadable);
  const fadeIn = useSawLoading(view === "loading");
  const busy = refreshing(page);
  const artist = entity ? entity.kind === "artist" : page.routeId === "artist";
  const [solid, setSolid] = useState(false);
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const next = event.currentTarget.scrollTop > SOLID_AT;
    if (next !== solid) setSolid(next);
  };

  return <>
    <TopBar over solid={solid || view !== "content"} back title={solid && entity ? entity.title : undefined}
      actions={view !== "auth" && <RefreshButton busy={busy} />} />
    <PageScroller busy={busy} className={`entity-screen${artist ? " artist" : ""}`} onScroll={onScroll}>
      {view === "auth" ? <SignInNotice />
        : view === "error" ? <LoadError error={page.error ?? entityWatch.error} />
        : view !== "content" || !entity ? (artist ? <ArtistSkeleton /> : <EntitySkeleton />)
        : <div className={fadeIn ? "reveal" : undefined}>
          <Header entity={entity} locked={busy} />
          {(page.status === "error" || entityWatch.status === "error") && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          {artist && tracks.order.length > 0 && <h2 className="shelf-title">Popular</h2>}
          <Tracks keys={tracks.order} numbered={artist} locked={busy} ready={page.status === "ready" && !page.stale} />
          {releases.order.length > 0 && <section className="shelf">
            <h2 className="shelf-title">Popular releases</h2>
            <ul className="rows">{releases.order.map(key => <li key={key}><ReleaseRow id={key} /></li>)}</ul>
          </section>}
          {sections.order.map(key => <Shelf key={key} watch={SECTIONS} id={key} />)}
        </div>}
    </PageScroller>
  </>;
}

/** The header: art or the artist's photo, names, meta, then save or Follow and the green Play. */
function Header({ entity, locked }: { entity: Entity; locked: boolean }) {
  const open = useOpenUrl();
  const saveCommand = usePlayerCommand<{ saved: boolean }>("setEntitySaved");
  const followCommand = usePlayerCommand<{ following: boolean }>("setFollowing");
  const [playBusy, playEntity] = useAction<{ playing: boolean }>("playEntity");
  const [saveBusy, setSaved] = useAction<{ saved: boolean }>("setEntitySaved");
  const [followBusy, setFollowing] = useAction<{ following: boolean }>("setFollowing");
  const pendingPlay = usePendingCommand<{ playing: boolean }>("playEntity");
  const pendingSave = usePendingCommand<{ saved: boolean }>("setEntitySaved");
  const pendingFollow = usePendingCommand<{ following: boolean }>("setFollowing");
  const playing = pendingPlay ? pendingPlay.playing : entity.playing;
  const saved = pendingSave ? pendingSave.saved : entity.saved;
  const following = pendingFollow ? pendingFollow.following : entity.following;
  const artist = entity.kind === "artist";
  const liked = entity.kind === "liked";
  const noun = entity.kind === "liked" ? "playlist" : entity.kind;

  const toggleSaved = () => saved
    ? setSaved({ saved: false }, { text: "Removed from Your Library", undo: () => saveCommand({ saved: true }) })
    : setSaved({ saved: true }, { text: "Added to Your Library" });
  const toggleFollowing = () => following
    ? setFollowing({ following: false }, { text: `Unfollowed ${entity.title}`, undo: () => followCommand({ following: true }) })
    : setFollowing({ following: true });

  return <header className={`entity-head${artist ? " artist" : ""}`}>
    {artist
      ? <div className="artist-hero">
        {entity.image && <Artwork src={entity.image} className="artist-photo" />}
        <h1>{entity.title}</h1>
      </div>
      : <>
        {liked
          ? <span className="artwork entity-art liked-art" aria-hidden="true"><Icon name="heart" filled /></span>
          : <Artwork src={entity.image} className="entity-art" />}
        <h1 className="entity-title">{entity.title}</h1>
      </>}
    <div className="entity-info">
      {entity.description && <p className="muted entity-description">{entity.description}</p>}
      {entity.byline.length > 0 && <p className="entity-byline">
        {entity.byline.map((link, index) => <span key={`${link.name}${index}`}>
          {index > 0 && ", "}
          {link.url ? <a href={link.url} onClick={event => { event.preventDefault(); open(link.url!); }}>{link.name}</a> : link.name}
        </span>)}
      </p>}
      {(artist ? entity.listeners : true) && <p className="muted small entity-meta">
        {artist ? entity.listeners : [noun[0]!.toUpperCase() + noun.slice(1), ...entity.meta].join(" · ")}
      </p>}
      <div className="entity-actions">
        {following !== null && <button type="button" className={`follow${following ? " on" : ""}`} aria-pressed={following}
          aria-busy={followBusy} disabled={locked || followBusy || pendingFollow !== undefined} onClick={toggleFollowing}>
          {following ? "Following" : "Follow"}
        </button>}
        {saved !== null && <button type="button" className={`icon-button save${saved ? " on" : ""}`} aria-pressed={saved} aria-busy={saveBusy}
          disabled={locked || saveBusy || pendingSave !== undefined}
          aria-label={saved ? `Remove ${noun} from Your Library` : `Save ${noun} to Your Library`} onClick={toggleSaved}>
          <Icon name={saved ? "check" : "plus"} />
        </button>}
        <span className="grow" />
        {entity.canPlay && <button type="button" className={`play-big${playBusy ? " working" : ""}`} aria-busy={playBusy}
          disabled={locked || playBusy || pendingPlay !== undefined}
          aria-label={playing ? `Pause ${entity.title}` : `Play ${entity.title}`} onClick={() => playEntity({ playing: !playing })}>
          <Icon name={playing ? "pause" : "play"} filled />
        </button>}
      </div>
    </div>
  </header>;
}

/** Answers that mean the page went away before the call could load anything. */
const CUT_OFF = new Set(["NOT_READY", "CONTEXT_REPLACED", "PRECONDITION_FAILED"]);

/** A track row's height: 48 px art and 6 px padding above and below. */
const TRACK_HEIGHT = 60;

/**
 * The track rows. Spotify loads a long playlist's rows as its page scrolls, so reaching the end of
 * this list scrolls the website once for each new batch, with a spinner while it does. Album and
 * playlist rows draw through a virtual list, since a long playlist grows to hundreds of rows; an
 * artist's few numbered Popular rows stay a plain list.
 */
function Tracks({ keys, numbered, locked, ready }: { keys: readonly string[]; numbered: boolean; locked: boolean; ready: boolean }) {
  const loadMore = usePlayerCommand<undefined>("loadMoreTracks");
  const end = useRef<HTMLDivElement>(null);
  const asked = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const last = keys[keys.length - 1] ?? null;

  useEffect(() => {
    const sentinel = end.current;
    // Only on a page the website has finished loading: a page on its way would replace the call.
    if (!sentinel || !last || numbered || !ready) return;
    let live = true;
    const observer = new IntersectionObserver(entries => {
      // One request per last row: when it brings nothing new, the list is complete.
      if (entries.some(entry => entry.isIntersecting) && asked.current !== last) {
        asked.current = last;
        setLoading(true);
        void loadMore().then(result => {
          // A call the page cut off did not load anything: the next look at the end asks again.
          if (CUT_OFF.has(result.code ?? "") && asked.current === last) asked.current = null;
        }).finally(() => { if (live) setLoading(false); });
      }
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => {
      live = false;
      observer.disconnect();
      setLoading(false);
    };
  }, [last, numbered, loadMore, ready]);

  const indexOf = useMemo(() => new Map(keys.map((key, index) => [key, index])), [keys]);
  const renderItem = useCallback((key: string) =>
    <TrackItem id={key} index={indexOf.get(key) ?? 0} locked={locked} as="div" />, [indexOf, locked]);

  if (keys.length === 0) return null;
  return <>
    {numbered
      ? <ol className="tracks numbered">
        {keys.map((key, index) => <TrackItem key={key} id={key} index={index} locked={locked} />)}
      </ol>
      : <div role="list" aria-label="Songs"><VirtualList className="tracks" keys={keys} estimateHeight={TRACK_HEIGHT} renderItem={renderItem} /></div>}
    <div ref={end} className="list-end" aria-hidden={!loading}>
      {loading && <span className="spinner" role="status" aria-label="Loading more songs" />}
    </div>
  </>;
}

/**
 * One track row. A tap goes to the playback store, which names the track in the mini-player and
 * marks this row at once, and sends Spotify only the newest row tap. The row stays enabled.
 */
const TrackItem = memo(function TrackItem({ id, index, locked, as = "li" }: { id: string; index: number; locked: boolean; as?: "li" | "div" }) {
  const track = useRecord<TrackRow>(TRACKS, id);
  const startingRow = useStartingRow();
  if (!track) return null;
  const starting = startingRow === track.rowId;
  // While another row starts, this one is not the playing row any more.
  const playing = starting || (startingRow === null && track.playing);
  const play = () => playback.playTrack({ rowId: track.rowId, title: track.title, artist: track.detail, image: track.image ?? null });
  const Item = as;
  return <Item role={as === "div" ? "listitem" : undefined}>
    <button type="button" className={`track${playing ? " playing" : ""}`} disabled={locked}
      aria-current={playing ? "true" : undefined} onClick={play}>
      <span className="track-index" aria-hidden="true">{index + 1}</span>
      {track.image && <span className="track-lead">
        <Artwork src={track.image} className="track-art" />
      </span>}
      <span className="track-text">
        <strong>{track.title}</strong>
        <span>{track.explicit && <span className="explicit" aria-label="Explicit">E</span>}{track.detail}</span>
      </span>
    </button>
  </Item>;
});

function ReleaseRow({ id }: { id: string }) {
  const release = useRecord<Release>(RELEASES, id);
  const open = useOpenUrl();
  if (!release) return null;
  return <button type="button" className="track" disabled={!release.url} onClick={() => release.url && open(release.url)}>
    <Artwork src={release.image} className="release-art" />
    <span className="track-text"><strong>{release.title}</strong>{release.subtitle && <span>{release.subtitle}</span>}</span>
  </button>;
}
