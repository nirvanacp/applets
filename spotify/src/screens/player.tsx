import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "@let/sdk/react";
import type { Repeat } from "../model";
import { Artwork, Icon } from "../components/ui";
import { useOpenUrl } from "../ui/frame";
import { Notice } from "../ui/states";
import { playback, usePlayback, usePosition } from "../playback/use-playback";

const NEXT_REPEAT: Record<Repeat, Repeat> = { off: "all", all: "one", one: "off" };
const REPEAT_LABEL: Record<Repeat, string> = { off: "Repeat is off", all: "Repeating all", one: "Repeating this track" };

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Now Playing. It shows the playback store, so it opens with the current track at once and every
 * control answers on the tap. Spotify's full player opens on the website while this screen shows
 * and closes when it leaves; shuffle, repeat and the links come from it. The screen rises over the
 * tabs like the Android app's player and falls away on Back.
 */
export function PlayerScreen() {
  const { back } = useRouter();
  const open = useOpenUrl();
  const now = usePlayback();
  const [scrub, setScrub] = useState<number | null>(null);
  const position = usePosition(now.clock);

  useEffect(() => {
    playback.wantFullPlayer(true);
    return () => playback.wantFullPlayer(false);
  }, []);

  // The range's native `change` fires once when a drag or tap ends, after its last value; React's
  // onChange fires on every move, and a tap's pointerup comes before its value changes.
  const range = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = range.current;
    if (!input) return;
    const commit = () => {
      playback.seek(Number(input.value));
      setScrub(null);
    };
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, [now.known]);

  const close = <button type="button" className="icon-button" aria-label="Close player" onClick={() => back()}><Icon name="down" /></button>;

  if (!now.known) {
    return <div className="screen player-screen">
      <header className="player-head">{close}</header>
      <Notice title="Nothing is playing"><p>Play an album, playlist or song, then open the player again.</p></Notice>
    </div>;
  }

  const player = now.player;
  const repeat = now.repeat ?? "off";
  const duration = now.clock?.duration ?? player?.duration ?? 0;
  const shown = Math.min(scrub ?? position, duration);
  const link = (url: string | null, text: string | null) => url
    ? <a href={url} onClick={event => { event.preventDefault(); open(url); }}>{text}</a>
    : text;

  return <div className="screen player-screen">
    <header className="player-head">
      {close}
      <div className="player-from">
        <span>Playing from</span>
        {player?.fromUrl ? link(player.fromUrl, player.from) : <strong>{player?.from ?? "Spotify"}</strong>}
      </div>
    </header>
    <Artwork src={now.image ?? player?.image ?? null} className="player-art" />
    <div className="player-meta">
      <div className="player-names">
        <h1>{link(player?.trackUrl ?? null, now.title)}</h1>
        {player?.artistUrl ? link(player.artistUrl, now.artist) : <span>{now.artist}</span>}
      </div>
      {now.saved !== null && <button type="button" className={`icon-button large${now.saved ? " on" : ""}`} aria-pressed={now.saved}
        aria-label={now.saved ? "Remove from Liked Songs" : "Save to Liked Songs"} onClick={() => playback.setSaved(!now.saved)}>
        <Icon name={now.saved ? "check" : "plus"} />
      </button>}
    </div>
    <label className="progress">
      <span className="visually-hidden">Position</span>
      <input ref={range} type="range" min={0} max={Math.max(duration, 1)} step={1} value={shown}
        style={{ "--fill": `${duration > 0 ? (shown / duration) * 100 : 0}%` } as CSSProperties}
        aria-valuetext={`${clock(shown)} of ${clock(duration)}`}
        onChange={event => setScrub(Number(event.target.value))} />
    </label>
    <div className="times"><span>{clock(shown)}</span><span>{duration > 0 ? clock(duration) : ""}</span></div>
    <div className="transport">
      <button type="button" className={`icon-button${now.shuffle ? " on" : ""}`} aria-pressed={now.shuffle ?? false}
        disabled={now.shuffle === null || player?.canShuffle === false} aria-label="Shuffle"
        onClick={() => playback.setShuffle(!now.shuffle)}>
        <Icon name="shuffle" />
      </button>
      <button type="button" className="icon-button large" aria-label="Previous" disabled={player?.canPrevious === false}
        onClick={() => playback.skip("previous")}>
        <Icon name="previous" filled />
      </button>
      <button type="button" className="play-button" aria-label={now.playing ? "Pause" : "Play"} onClick={() => playback.setPlaying(!now.playing)}>
        <Icon name={now.playing ? "pause" : "play"} filled />
      </button>
      <button type="button" className="icon-button large" aria-label="Next" disabled={player?.canNext === false}
        onClick={() => playback.skip("next")}>
        <Icon name="next" filled />
      </button>
      <button type="button" className={`icon-button repeat${repeat !== "off" ? " on" : ""}${repeat === "one" ? " one" : ""}`}
        disabled={now.repeat === null || player?.canRepeat === false} aria-label={`${REPEAT_LABEL[repeat]}. Change repeat`}
        onClick={() => playback.setRepeat(NEXT_REPEAT[repeat])}>
        <Icon name="repeat" />
      </button>
    </div>
    {now.elsewhere && <p className="player-note">Spotify is playing on another device. Play moves it to this phone.</p>}
    {now.playerError && <p className="player-note" role="alert">
      {now.playerError} <button type="button" className="button secondary" onClick={() => playback.wantFullPlayer(true)}>Try again</button>
    </p>}
    <section className="up-next" aria-label="Next up">
      <h2>Next up</h2>
      {now.next
        ? <p><strong>{now.next.title}</strong></p>
        : <p className="muted">Spotify shows no next track.</p>}
      <p className="muted small">Spotify's web player shows only the next track, not the full queue.</p>
    </section>
  </div>;
}
