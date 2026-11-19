import { useRef, type CSSProperties } from "react";
import { useRouter } from "@let/sdk/react";
import { Artwork, Icon } from "./ui";
import { playback, usePlayback } from "../playback/use-playback";
import { positionAt, type Clock } from "../playback/store";
import { useSkipSwipe } from "./skip-swipe";

/**
 * The bar above the tabs on every screen: the current track, a save switch and Play/Pause. A tap
 * on the track opens Now Playing. The controls answer at once from the playback store, which sends
 * Spotify's own buttons the request; the toast reports anything that did not happen. A swipe
 * along the track skips, as in Spotify's app: left to the next track, right to the previous one.
 * The bar keeps its place and height while pages load: the store keeps the last track for 10 s.
 */
export function MiniPlayer() {
  const { navigate } = useRouter();
  const now = usePlayback();
  const text = useRef<HTMLSpanElement>(null);
  const swipe = useSkipSwipe(text);
  if (!now.known) return null;

  return <section className="mini-player" aria-label="Now playing">
    <button type="button" className="mini-track" onClick={() => navigate({ screen: "player" })}
      aria-label={`Open Now Playing: ${now.title}`} {...swipe}>
      <Artwork src={now.image} />
      <span className="mini-text" ref={text}>
        <strong>{now.title}</strong>
        {now.elsewhere ? <span className="device">Playing on another device</span> : <span>{now.artist}</span>}
      </span>
    </button>
    {now.saved !== null && <button type="button" className={`icon-button${now.saved ? " on" : ""}`}
      aria-pressed={now.saved} aria-label={now.saved ? "Remove from Liked Songs" : "Save to Liked Songs"}
      onClick={() => playback.setSaved(!now.saved)}>
      <Icon name={now.saved ? "check" : "plus"} />
    </button>}
    <button type="button" className="icon-button" aria-label={now.playing ? "Pause" : "Play"} onClick={() => playback.setPlaying(!now.playing)}>
      <Icon name={now.playing ? "pause" : "play"} filled />
    </button>
    <MiniProgress clock={now.clock} />
  </section>;
}

/**
 * The thin line along the bar's foot. A CSS animation runs it from the local clock, so the bar
 * renders only when the clock changes, not as the track plays.
 */
function MiniProgress({ clock }: { clock: Clock | null }) {
  if (!clock || clock.duration <= 0) return null;
  const position = positionAt(clock, Date.now());
  // Reduced motion stops the animation; the line then holds the position of its last render.
  const style = {
    transform: `scaleX(${position / clock.duration})`,
    animationDuration: `${clock.duration}s`,
    animationDelay: `${-position}s`,
    animationPlayState: clock.running ? "running" : "paused",
  } as CSSProperties;
  // A new clock starts the animation again from its own position.
  return <span className="mini-progress" aria-hidden="true"><span key={`${clock.at}:${clock.position}`} style={style} /></span>;
}
