import { memo, useEffect, useRef, useState } from "react";
import { ScrollMemory, useRecord } from "@genesis/sdk/react";
import type { Entity, Release, Section, TrackRow } from "../model";
import { usePendingCommand, usePlayerCommand } from "../components/playback";
import { Shelf } from "../components/shelf";
import { Artwork, BackButton, failureText, Icon, LoadError, Skeleton, useOpenUrl } from "../components/ui";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

const TRACKS = "entity:tracks";
const SECTIONS = "entity:sections";
const RELEASES = "entity:releases";

type Run = (action: Promise<{ outcome: string; message?: string | null }>) => Promise<void>;

/** An album, playlist or artist: its header, play and save or follow, its tracks and related shelves. */
export function EntityScreen() {
  const page = usePageStatus("primary");
  const entityWatch = useScreenWatch<Entity | null>("entity", "entity");
  const tracks = useScreenWatch<unknown, TrackRow | null>("entity", "tracks");
  const releases = useScreenWatch<unknown, Release | null>("entity", "releases");
  const sections = useScreenWatch<unknown, Section | null>("entity", "sections");
  const [notice, setNotice] = useState<string | null>(null);
  const here = onScreen(page, "entity");
  const entity = here ? entityWatch.value ?? null : null;
  const run: Run = async action => {
    setNotice(null);
    setNotice(failureText(await action));
  };

  let body;
  if (entity) body = <>
    <Header entity={entity} run={run} />
    {notice && <p className="inline-error" role="alert">{notice}</p>}
    {entity.kind === "artist" && tracks.order.length > 0 && <h2 className="shelf-title">Popular</h2>}
    <Tracks keys={tracks.order} numbered={entity.kind === "artist"} run={run} />
    {releases.order.length > 0 && <section className="shelf">
      <h2 className="shelf-title">Popular releases</h2>
      <div className="list">{releases.order.map(key => <ReleaseRow key={key} id={key} />)}</div>
    </section>}
    {sections.order.map(key => <Shelf key={key} watch={SECTIONS} id={key} />)}
  </>;
  else if (page.status === "error" || entityWatch.status === "error") body = <LoadError error={page.error ?? entityWatch.error} />;
  else if (page.status === "ready" && delivered(entityWatch)) body = <LoadError error={null} />;
  else body = <Skeleton label="Loading" kind="rows" />;

  return <ScrollMemory className={`screen entity-screen${entity?.kind === "artist" ? " artist" : ""}`} aria-busy={page.stale || page.status === "loading"}>
    <BackButton />
    {body}
  </ScrollMemory>;
}

function Header({ entity, run }: { entity: Entity; run: Run }) {
  const open = useOpenUrl();
  const playEntity = usePlayerCommand<{ playing: boolean }>("playEntity");
  const setSaved = usePlayerCommand<{ saved: boolean }>("setEntitySaved");
  const setFollowing = usePlayerCommand<{ following: boolean }>("setFollowing");
  const pendingPlay = usePendingCommand<{ playing: boolean }>("playEntity");
  const pendingSave = usePendingCommand<{ saved: boolean }>("setEntitySaved");
  const pendingFollow = usePendingCommand<{ following: boolean }>("setFollowing");
  const playing = pendingPlay ? pendingPlay.playing : entity.playing;
  const saved = pendingSave ? pendingSave.saved : entity.saved;
  const following = pendingFollow ? pendingFollow.following : entity.following;
  const artist = entity.kind === "artist";
  const noun = entity.kind === "playlist" ? "playlist" : entity.kind;

  return <header className="entity-head">
    {artist
      ? <div className="artist-hero">{entity.image && <img src={entity.image} alt="" referrerPolicy="no-referrer" />}<h1>{entity.title}</h1></div>
      : <>
        <Artwork src={entity.image} className="entity-art" />
        <h1 className="entity-title">{entity.title}</h1>
      </>}
    {entity.description && <p className="muted entity-description">{entity.description}</p>}
    {entity.byline.length > 0 && <p className="entity-byline">
      {entity.byline.map((link, index) => <span key={`${link.name}${index}`}>
        {index > 0 && ", "}
        {link.url ? <a href={link.url} onClick={event => { event.preventDefault(); open(link.url!); }}>{link.name}</a> : link.name}
      </span>)}
    </p>}
    <p className="muted small entity-meta">
      {artist ? entity.listeners : [noun[0]!.toUpperCase() + noun.slice(1), ...entity.meta].join(" · ")}
    </p>
    <div className="entity-actions">
      {following !== null && <button type="button" className={`follow${following ? " on" : ""}`} aria-pressed={following}
        disabled={pendingFollow !== undefined} onClick={() => run(setFollowing({ following: !following }))}>
        {following ? "Following" : "Follow"}
      </button>}
      {saved !== null && <button type="button" className={`icon-button${saved ? " on" : ""}`} aria-pressed={saved}
        disabled={pendingSave !== undefined} aria-label={saved ? `Remove ${noun} from Your Library` : `Save ${noun} to Your Library`}
        onClick={() => run(setSaved({ saved: !saved }))}>
        <Icon name={saved ? "check" : "plus"} />
      </button>}
      <span className="spacer" />
      {entity.canPlay && <button type="button" className="play-big" disabled={pendingPlay !== undefined}
        aria-label={playing ? `Pause ${entity.title}` : `Play ${entity.title}`} onClick={() => run(playEntity({ playing: !playing }))}>
        <Icon name={playing ? "pause" : "play"} filled />
      </button>}
    </div>
  </header>;
}

/**
 * The track rows. Spotify loads a long playlist's rows as its page scrolls, so reaching the end of
 * this list scrolls the website once for each new batch.
 */
function Tracks({ keys, numbered, run }: { keys: readonly string[]; numbered: boolean; run: Run }) {
  const loadMore = usePlayerCommand<undefined>("loadMoreTracks");
  const end = useRef<HTMLDivElement>(null);
  const asked = useRef<string | null>(null);
  const last = keys[keys.length - 1] ?? null;

  useEffect(() => {
    const sentinel = end.current;
    if (!sentinel || !last || numbered) return;
    const observer = new IntersectionObserver(entries => {
      // One request per last row: when it brings nothing new, the list is complete.
      if (entries.some(entry => entry.isIntersecting) && asked.current !== last) {
        asked.current = last;
        void loadMore();
      }
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [last, numbered, loadMore]);

  if (keys.length === 0) return null;
  return <>
    <ol className={`tracks${numbered ? " numbered" : ""}`}>
      {keys.map((key, index) => <TrackItem key={key} id={key} index={index} run={run} />)}
    </ol>
    <div ref={end} aria-hidden="true" />
  </>;
}

const TrackItem = memo(function TrackItem({ id, index, run }: { id: string; index: number; run: Run }) {
  const track = useRecord<TrackRow>(TRACKS, id);
  const playTrack = usePlayerCommand<{ rowId: string; title: string }>("playTrack");
  const pending = usePendingCommand<{ rowId: string }>("playTrack");
  if (!track) return null;
  const starting = pending?.rowId === track.rowId;
  return <li>
    <button type="button" className={`track${track.playing ? " playing" : ""}`} disabled={starting} aria-current={track.playing ? "true" : undefined}
      onClick={() => run(playTrack({ rowId: track.rowId, title: track.title }))}>
      <span className="track-index" aria-hidden="true">{index + 1}</span>
      {track.image && <Artwork src={track.image} className="track-art" />}
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
  return <button type="button" disabled={!release.url} onClick={() => release.url && open(release.url)}>
    <span className="list-lead">
      <Artwork src={release.image} className="release-art" />
      <span className="track-text"><strong>{release.title}</strong>{release.subtitle && <span>{release.subtitle}</span>}</span>
    </span>
  </button>;
}
