import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useWatch } from "@genesis/sdk/react";
import type { Player, Repeat } from "../model";
import { useNowPlaying, usePendingCommand, usePlayerCommand } from "../components/playback";
import { Artwork, failureText, Icon, Notice, useOpenUrl } from "../components/ui";

const NEXT_REPEAT: Record<Repeat, Repeat> = { off: "all", all: "one", one: "off" };
const REPEAT_LABEL: Record<Repeat, string> = { off: "Repeat is off", all: "Repeating all", one: "Repeating this track" };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Now Playing. Spotify's full player opens on the website while this screen shows and closes when
 * it leaves; shuffle, repeat, skip and the progress bar exist only there.
 */
export function PlayerScreen() {
  const { back } = useRouter();
  const open = useOpenUrl();
  const now = useNowPlaying().value ?? null;
  const watch = useWatch<Player | null>("player:player", { reader: "player" }, { context: "primary" });
  const openPlayer = usePlayerCommand("openPlayer");
  const closePlayer = usePlayerCommand("closePlayer");
  const setPlaying = usePlayerCommand<{ playing: boolean }>("setPlaying");
  const skip = usePlayerCommand<{ direction: "next" | "previous" }>("skip");
  const setShuffle = usePlayerCommand<{ shuffle: boolean }>("setShuffle");
  const setRepeat = usePlayerCommand<{ repeat: Repeat }>("setRepeat");
  const setSaved = usePlayerCommand<{ saved: boolean }>("setTrackSaved");
  const seek = usePlayerCommand<{ seconds: number }>("seek");
  const pendingPlay = usePendingCommand<{ playing: boolean }>("setPlaying");
  const pendingSkip = usePendingCommand<{ direction: string }>("skip");
  const pendingShuffle = usePendingCommand<{ shuffle: boolean }>("setShuffle");
  const pendingRepeat = usePendingCommand<{ repeat: Repeat }>("setRepeat");
  const pendingSave = usePendingCommand<{ saved: boolean }>("setTrackSaved");
  const [scrub, setScrub] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openFailed, setOpenFailed] = useState(false);

  useEffect(() => {
    void openPlayer().then(result => setOpenFailed(result.outcome === "failed"));
    return () => void closePlayer();
  }, [openPlayer, closePlayer]);

  const run = async (action: Promise<{ outcome: string; message?: string | null }>) => {
    setNotice(null);
    setNotice(failureText(await action));
  };

  const player = watch.value ?? null;

  // The range's native `change` fires once when a drag or tap ends, after its last value; React's
  // onChange fires on every move, and a tap's pointerup comes before its value changes.
  const range = useRef<HTMLInputElement>(null);
  const commitScrub = useRef<(seconds: number) => void>(() => {});
  commitScrub.current = seconds => void run(seek({ seconds })).finally(() => setScrub(null));
  const hasPlayer = player !== null;
  useEffect(() => {
    const input = range.current;
    if (!input) return;
    const commit = () => commitScrub.current(Number(input.value));
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, [hasPlayer]);
  if (!player) {
    return <div className="screen player-screen">
      <header className="player-head">
        <button type="button" className="icon-button" aria-label="Close player" onClick={() => back()}><Icon name="down" /></button>
      </header>
      {openFailed || !now
        ? <Notice title="Nothing is playing"><p>Play an album, playlist or song, then open the player again.</p></Notice>
        : <div className="player-loading" role="status" aria-busy="true" aria-label="Opening the player"><Artwork src={now.image} className="player-art" /></div>}
    </div>;
  }

  const playing = pendingPlay ? pendingPlay.playing : player.playing && !now?.elsewhere;
  const shuffle = pendingShuffle ? pendingShuffle.shuffle : player.shuffle;
  const repeat = pendingRepeat ? pendingRepeat.repeat : player.repeat ?? "off";
  const saved = pendingSave ? pendingSave.saved : player.saved;
  const position = scrub ?? player.position ?? 0;
  const duration = player.duration ?? 0;

  return <div className="screen player-screen">
    <header className="player-head">
      <button type="button" className="icon-button" aria-label="Close player" onClick={() => back()}><Icon name="down" /></button>
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
      {saved !== null && <button type="button" className={`icon-button large${saved ? " on" : ""}`} aria-pressed={saved}
        disabled={pendingSave !== undefined} aria-label={saved ? "Remove from Liked Songs" : "Save to Liked Songs"}
        onClick={() => run(setSaved({ saved: !saved }))}>
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
      <button type="button" className={`icon-button${shuffle ? " on" : ""}`} aria-pressed={shuffle ?? false}
        disabled={!player.canShuffle || pendingShuffle !== undefined} aria-label="Shuffle"
        onClick={() => run(setShuffle({ shuffle: !shuffle }))}>
        <Icon name="shuffle" />
      </button>
      <button type="button" className="icon-button large" aria-label="Previous" disabled={!player.canPrevious || pendingSkip !== undefined}
        onClick={() => run(skip({ direction: "previous" }))}><Icon name="previous" filled /></button>
      <button type="button" className="play-button" aria-label={playing ? "Pause" : "Play"} disabled={pendingPlay !== undefined}
        onClick={() => run(setPlaying({ playing: !(player.playing && !now?.elsewhere) }))}>
        <Icon name={playing ? "pause" : "play"} filled />
      </button>
      <button type="button" className="icon-button large" aria-label="Next" disabled={!player.canNext || pendingSkip !== undefined}
        onClick={() => run(skip({ direction: "next" }))}><Icon name="next" filled /></button>
      <button type="button" className={`icon-button repeat${repeat !== "off" ? " on" : ""}${repeat === "one" ? " one" : ""}`}
        disabled={!player.canRepeat || pendingRepeat !== undefined} aria-label={`${REPEAT_LABEL[repeat]}. Change repeat`}
        onClick={() => run(setRepeat({ repeat: NEXT_REPEAT[repeat] }))}>
        <Icon name="repeat" />
      </button>
    </div>
    {notice && <p role="alert" className="inline-error">{notice}</p>}
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
