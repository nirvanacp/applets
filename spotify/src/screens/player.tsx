import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useWatch } from "@nirvanacp/sdk/react";
import { SEEK_SECONDS_PER_CALL, trackKey, type Player, type Repeat } from "../model";
import { failureText, useAction, useNowPlaying, usePendingCommand, usePlayerCommand, useReport } from "../components/playback";
import { Artwork, Icon } from "../components/ui";
import { useBusy } from "../ui/feedback";
import { useOpenUrl } from "../ui/frame";
import { PlayerSkeleton } from "../ui/skeletons";
import { Notice } from "../ui/states";
import { delivered } from "../screen";

const NEXT_REPEAT: Record<Repeat, Repeat> = { off: "all", all: "one", one: "off" };
const REPEAT_LABEL: Record<Repeat, string> = { off: "Repeat is off", all: "Repeating all", one: "Repeating this track" };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Now Playing. Spotify's full player opens on the website while this screen shows and closes when
 * it leaves; shuffle, repeat, skip and the progress bar exist only there. The screen rises over the
 * tabs like the Android app's player and falls away on Back.
 */
export function PlayerScreen() {
  const { back } = useRouter();
  const open = useOpenUrl();
  const report = useReport();
  const nowWatch = useNowPlaying();
  const now = nowWatch.value ?? null;
  const watch = useWatch<Player | null>("player:player", { reader: "player" }, { context: "primary" });
  const openPlayer = usePlayerCommand("openPlayer");
  const closePlayer = usePlayerCommand("closePlayer");
  const saveCommand = usePlayerCommand<{ saved: boolean }>("setTrackSaved");
  const seek = usePlayerCommand<{ seconds: number; track?: string }>("seek");
  const [playBusy, setPlaying] = useAction<{ playing: boolean }>("setPlaying");
  const [skipBusy, skip] = useAction<{ direction: "next" | "previous" }>("skip");
  const [shuffleBusy, setShuffle] = useAction<{ shuffle: boolean }>("setShuffle");
  const [repeatBusy, setRepeat] = useAction<{ repeat: Repeat }>("setRepeat");
  const [saveBusy, setSaved] = useAction<{ saved: boolean }>("setTrackSaved");
  const pendingPlay = usePendingCommand<{ playing: boolean }>("setPlaying");
  const pendingSkip = usePendingCommand<{ direction: string }>("skip");
  const pendingShuffle = usePendingCommand<{ shuffle: boolean }>("setShuffle");
  const pendingRepeat = usePendingCommand<{ repeat: Repeat }>("setRepeat");
  const pendingSave = usePendingCommand<{ saved: boolean }>("setTrackSaved");
  const [scrub, setScrub] = useState<number | null>(null);
  const [skipping, setSkipping] = useState<"next" | "previous" | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [retrying, retry] = useBusy();
  const tryOpen = useCallback(async () => {
    setOpenError(null);
    const result = await openPlayer();
    setOpenError(result.outcome === "observed" ? null : failureText(result) ?? "Spotify didn't open the player.");
  }, [openPlayer]);

  useEffect(() => {
    void tryOpen();
    return () => void closePlayer();
  }, [tryOpen, closePlayer]);

  const player = watch.value ?? null;

  // The range's native `change` fires once when a drag or tap ends, after its last value; React's
  // onChange fires on every move, and a tap's pointerup comes before its value changes.
  const range = useRef<HTMLInputElement>(null);
  const commitScrub = useRef<(seconds: number) => void>(() => {});
  // The track the latest render shows, and the scrub that may keep seeking. A new scrub or closing
  // the screen raises `scrubRun`, so an older loop stops before its next call.
  const track = useRef<string | null>(null);
  track.current = trackKey(player);
  const scrubRun = useRef(0);
  useEffect(() => () => void (scrubRun.current += 1), []);
  // One seek call moves at most SEEK_SECONDS_PER_CALL; each next call starts where the last ended.
  // The loop stops when the track changes, and each call names the track, so a call queued behind a
  // skip fails instead of moving the new song.
  commitScrub.current = seconds => void (async () => {
    const run = ++scrubRun.current;
    const scrubbed = track.current;
    const calls = Math.ceil(Math.abs(seconds - (player?.position ?? 0)) / SEEK_SECONDS_PER_CALL) + 1;
    for (let call = 0; call < calls; call += 1) {
      if (run !== scrubRun.current || track.current !== scrubbed) break;
      const result = await seek({ seconds, track: scrubbed ?? undefined });
      if (result.outcome !== "observed") { report(result); break; }
    }
  })().finally(() => setScrub(null));
  const hasPlayer = player !== null;
  useEffect(() => {
    const input = range.current;
    if (!input) return;
    const commit = () => commitScrub.current(Number(input.value));
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, [hasPlayer]);

  const close = <button type="button" className="icon-button" aria-label="Close player" onClick={() => back()}><Icon name="down" /></button>;

  if (!player) {
    return <div className="screen player-screen">
      <header className="player-head">{close}</header>
      {!now && !delivered(nowWatch)
        ? <PlayerSkeleton />
        : !now
        ? <Notice title="Nothing is playing"><p>Play an album, playlist or song, then open the player again.</p></Notice>
        : openError
          ? <Notice title="The player didn't open" role="alert">
            <p>{openError}</p>
            <div className="row-buttons">
              <button type="button" className="button secondary" disabled={retrying} aria-busy={retrying} onClick={() => void retry(tryOpen)}>
                {retrying ? "Trying again…" : "Try again"}
              </button>
            </div>
          </Notice>
          : <PlayerSkeleton art={<Artwork src={now.image} className="player-art" />} />}
    </div>;
  }

  const playing = pendingPlay ? pendingPlay.playing : player.playing && !now?.elsewhere;
  const shuffle = pendingShuffle ? pendingShuffle.shuffle : player.shuffle;
  const repeat = pendingRepeat ? pendingRepeat.repeat : player.repeat ?? "off";
  const saved = pendingSave ? pendingSave.saved : player.saved;
  const position = scrub ?? player.position ?? 0;
  const duration = player.duration ?? 0;
  const skipLocked = skipBusy || pendingSkip !== undefined;
  const skipTo = (direction: "next" | "previous") => {
    setSkipping(direction);
    void skip({ direction }).finally(() => setSkipping(null));
  };
  const toggleSaved = () => saved
    ? setSaved({ saved: false }, { text: "Removed from Liked Songs", undo: () => saveCommand({ saved: true }) })
    : setSaved({ saved: true }, { text: "Added to Liked Songs" });

  return <div className="screen player-screen">
    <header className="player-head">
      {close}
      <div className="player-from">
        <span>Playing from</span>
        {player.fromUrl
          ? <a href={player.fromUrl} onClick={event => { event.preventDefault(); open(player.fromUrl!); }}>{player.from}</a>
          : <strong>{player.from ?? "Spotify"}</strong>}
      </div>
    </header>
    <Artwork src={player.image} className="player-art" />
    <div className="player-meta">
      <div className="player-names">
        <h1>{player.trackUrl
          ? <a href={player.trackUrl} onClick={event => { event.preventDefault(); open(player.trackUrl!); }}>{player.title}</a>
          : player.title}</h1>
        {player.artistUrl
          ? <a href={player.artistUrl} onClick={event => { event.preventDefault(); open(player.artistUrl!); }}>{player.artist}</a>
          : <span>{player.artist}</span>}
      </div>
      {saved !== null && <button type="button" className={`icon-button large${saved ? " on" : ""}`} aria-pressed={saved} aria-busy={saveBusy}
        disabled={saveBusy || pendingSave !== undefined} aria-label={saved ? "Remove from Liked Songs" : "Save to Liked Songs"}
        onClick={toggleSaved}>
        <Icon name={saved ? "check" : "plus"} />
      </button>}
    </div>
    <label className="progress">
      <span className="visually-hidden">Position</span>
      <input ref={range} type="range" min={0} max={Math.max(duration, 1)} step={1} value={Math.min(position, duration)}
        style={{ "--fill": `${duration > 0 ? (position / duration) * 100 : 0}%` } as CSSProperties}
        aria-valuetext={`${clock(position)} of ${clock(duration)}`}
        onChange={event => setScrub(Number(event.target.value))} />
    </label>
    <div className="times"><span>{scrub !== null ? clock(scrub) : player.positionText}</span><span>{player.durationText}</span></div>
    <div className="transport">
      <button type="button" className={`icon-button${shuffle ? " on" : ""}`} aria-pressed={shuffle ?? false} aria-busy={shuffleBusy}
        disabled={!player.canShuffle || shuffleBusy || pendingShuffle !== undefined} aria-label="Shuffle"
        onClick={() => setShuffle({ shuffle: !shuffle })}>
        <Icon name="shuffle" />
      </button>
      <button type="button" className={`icon-button large${skipping === "previous" ? " working" : ""}`} aria-label="Previous"
        aria-busy={skipping === "previous"} disabled={!player.canPrevious || skipLocked} onClick={() => skipTo("previous")}>
        <Icon name="previous" filled />
      </button>
      <button type="button" className={`play-button${playBusy ? " working" : ""}`} aria-label={playing ? "Pause" : "Play"} aria-busy={playBusy}
        disabled={playBusy || pendingPlay !== undefined} onClick={() => setPlaying({ playing: !(player.playing && !now?.elsewhere) })}>
        <Icon name={playing ? "pause" : "play"} filled />
      </button>
      <button type="button" className={`icon-button large${skipping === "next" ? " working" : ""}`} aria-label="Next"
        aria-busy={skipping === "next"} disabled={!player.canNext || skipLocked} onClick={() => skipTo("next")}>
        <Icon name="next" filled />
      </button>
      <button type="button" className={`icon-button repeat${repeat !== "off" ? " on" : ""}${repeat === "one" ? " one" : ""}`} aria-busy={repeatBusy}
        disabled={!player.canRepeat || repeatBusy || pendingRepeat !== undefined} aria-label={`${REPEAT_LABEL[repeat]}. Change repeat`}
        onClick={() => setRepeat({ repeat: NEXT_REPEAT[repeat] })}>
        <Icon name="repeat" />
      </button>
    </div>
    {now?.elsewhere && <p className="player-note">Spotify is playing on another device. Play moves it to this phone.</p>}
    <section className="up-next" aria-label="Next up">
      <h2>Next up</h2>
      {now?.next
        ? <p><strong>{now.next.title}</strong><span>{now.next.artist}</span></p>
        : <p className="muted">Spotify shows no next track.</p>}
      <p className="muted small">Spotify's web player shows only the next track, not the full queue.</p>
    </section>
  </div>;
}
