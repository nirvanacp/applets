import { memo, useEffect, useRef, useState, type UIEvent } from "react";
import { useRecord } from "@let/sdk/react";
import type { Entity, Release, Section, TrackRow } from "../model";
import { useAction, usePendingCommand, usePlayerCommand, useReport } from "../components/playback";
import { Shelf } from "../components/shelf";
import { Artwork, Icon } from "../components/ui";
import { PageScroller, RefreshButton, TopBar, useOpenUrl } from "../ui/frame";
import { ArtistSkeleton, EntitySkeleton } from "../ui/skeletons";
import { InlineError, LoadError, SignInNotice, useSawLoading } from "../ui/states";
import { delivered, onScreen, refreshing, usePageStatus, useScreenWatch, viewOf } from "../screen";

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
  const view = viewOf(page, entity !== null, false, entityWatch.status === "error" || unreadable);
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
          <Tracks keys={tracks.order} numbered={artist} locked={busy} />
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
  const noun = entity.kind === "playlist" ? "playlist" : entity.kind;

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
        <Artwork src={entity.image} className="entity-art" />
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

/**
 * The track rows. Spotify loads a long playlist's rows as its page scrolls, so reaching the end of
 * this list scrolls the website once for each new batch, with a spinner while it does.
 */
function Tracks({ keys, numbered, locked }: { keys: readonly string[]; numbered: boolean; locked: boolean }) {
  const loadMore = usePlayerCommand<undefined>("loadMoreTracks");
  const end = useRef<HTMLDivElement>(null);
  const asked = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const last = keys[keys.length - 1] ?? null;

  useEffect(() => {
    const sentinel = end.current;
    if (!sentinel || !last || numbered) return;
    const observer = new IntersectionObserver(entries => {
      // One request per last row: when it brings nothing new, the list is complete.
      if (entries.some(entry => entry.isIntersecting) && asked.current !== last) {
        asked.current = last;
        setLoading(true);
        void loadMore().finally(() => setLoading(false));
      }
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [last, numbered, loadMore]);

  if (keys.length === 0) return null;
  return <>
    <ol className={`tracks${numbered ? " numbered" : ""}`}>
      {keys.map((key, index) => <TrackItem key={key} id={key} index={index} locked={locked} />)}
    </ol>
    <div ref={end} className="list-end" aria-hidden={!loading}>
      {loading && <span className="spinner" role="status" aria-label="Loading more songs" />}
    </div>
  </>;
}

const TrackItem = memo(function TrackItem({ id, index, locked }: { id: string; index: number; locked: boolean }) {
  const track = useRecord<TrackRow>(TRACKS, id);
  const playTrack = usePlayerCommand<{ rowId: string; title: string }>("playTrack");
  const report = useReport();
  const pending = usePendingCommand<{ rowId: string }>("playTrack");
  const [starting, setStarting] = useState(false);
  if (!track) return null;
  const busy = starting || pending?.rowId === track.rowId;
  const play = () => {
    setStarting(true);
    const started = Date.now();
    void playTrack({ rowId: track.rowId, title: track.title }).then(result => {
      report(result);
      // Busy long enough to see, even when Spotify answers at once.
      window.setTimeout(() => setStarting(false), Math.max(0, started + 800 - Date.now()));
    });
  };
  return <li>
    <button type="button" className={`track${track.playing ? " playing" : ""}${busy ? " starting" : ""}`} disabled={locked || busy}
      aria-busy={busy} aria-current={track.playing ? "true" : undefined} onClick={play}>
      <span className="track-index" aria-hidden="true">{busy ? <span className="spinner" /> : index + 1}</span>
      {track.image && <span className="track-lead">
        <Artwork src={track.image} className="track-art" />
        {busy && <span className="spinner over" aria-hidden="true" />}
      </span>}
      <span className="track-text">
        <strong>{track.title}</strong>
        <span>{track.explicit && <span className="explicit" aria-label="Explicit">E</span>}{track.detail}</span>
      </span>
    </button>
  </li>;
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
