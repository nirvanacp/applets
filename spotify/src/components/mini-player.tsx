import { useRouter } from "@let/sdk/react";
import { Artwork, Icon } from "./ui";
import { playback, usePlayback, usePosition } from "../playback/use-playback";
import type { Clock } from "../playback/store";

/**
 * The bar above the tabs on every screen: the current track, a save switch and Play/Pause. A tap
 * on the track opens Now Playing. The controls answer at once from the playback store, which sends
 * Spotify's own buttons the request; the toast reports anything that did not happen.
 */
export function MiniPlayer() {
  const { navigate } = useRouter();
  const now = usePlayback();
  if (!now.known) return null;

  return <section className="mini-player" aria-label="Now playing">
    <button type="button" className="mini-track" onClick={() => navigate({ screen: "player" })}
      aria-label={`Open Now Playing: ${now.title}`}>
      <Artwork src={now.image} />
      <span className="mini-text">
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

/** The thin line along the bar's foot, run from the local clock. */
function MiniProgress({ clock }: { clock: Clock | null }) {
  const position = usePosition(clock);
  if (!clock || clock.duration <= 0) return null;
  return <span className="mini-progress" aria-hidden="true"><span style={{ transform: `scaleX(${position / clock.duration})` }} /></span>;
}
