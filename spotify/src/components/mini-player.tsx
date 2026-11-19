import { useRouter } from "@nirvanacp/sdk/react";
import { Artwork, Icon } from "./ui";
import { useAction, useNowPlaying, usePendingCommand, usePlayerCommand } from "./playback";

/**
 * The bar above the tabs on every screen: the current track, a save switch and Play/Pause. A tap
 * on the track opens Now Playing. Spotify's own buttons do the work, so the website decides; the
 * toggles show the requested state at once and the toast reports anything that did not happen.
 */
export function MiniPlayer() {
  const { navigate } = useRouter();
  const now = useNowPlaying();
  const saveCommand = usePlayerCommand<{ saved: boolean }>("setTrackSaved");
  const [playBusy, setPlaying] = useAction<{ playing: boolean }>("setPlaying");
  const [saveBusy, setSaved] = useAction<{ saved: boolean }>("setTrackSaved");
  const pendingPlay = usePendingCommand<{ playing: boolean }>("setPlaying");
  const pendingSave = usePendingCommand<{ saved: boolean }>("setTrackSaved");
  const track = now.value ?? null;
  if (!track) return null;

  // While another device plays, this page only shows it: Play moves playback here.
  const here = track.playing && !track.elsewhere;
  const playing = pendingPlay ? pendingPlay.playing : here;
  const saved = pendingSave ? pendingSave.saved : track.saved;
  const toggleSaved = () => saved
    ? setSaved({ saved: false }, { text: "Removed from Liked Songs", undo: () => saveCommand({ saved: true }) })
    : setSaved({ saved: true }, { text: "Added to Liked Songs" });

  return <section className="mini-player" aria-label="Now playing">
    <button type="button" className="mini-track" onClick={() => navigate({ screen: "player" })}
      aria-label={`Open Now Playing: ${track.title}`}>
      <Artwork src={track.image} />
      <span className="mini-text">
        <strong>{track.title}</strong>
        {track.elsewhere ? <span className="device">Playing on another device</span> : <span>{track.artist}</span>}
      </span>
    </button>
    {saved !== null && <button type="button" className={`icon-button${saved ? " on" : ""}`} disabled={saveBusy || pendingSave !== undefined}
      aria-busy={saveBusy} aria-pressed={saved} aria-label={saved ? "Remove from Liked Songs" : "Save to Liked Songs"} onClick={toggleSaved}>
      <Icon name={saved ? "check" : "plus"} />
    </button>}
    <button type="button" className={`icon-button${playBusy ? " working" : ""}`} disabled={playBusy || pendingPlay !== undefined} aria-busy={playBusy}
      aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying({ playing: !here })}>
      <Icon name={playing ? "pause" : "play"} filled />
    </button>
  </section>;
}
