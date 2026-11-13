import { useState } from "react";
import { useRouter } from "@genesis/sdk/react";
import { failureText, Artwork, Icon } from "./ui";
import { useNowPlaying, usePendingCommand, usePlayerCommand } from "./playback";

/**
 * The bar above the tabs on every screen: the current track, a save switch and Play/Pause. A tap
 * on the track opens the full player. Spotify's own buttons do the work, so the website decides.
 */
export function MiniPlayer() {
  const { navigate } = useRouter();
  const now = useNowPlaying();
  const setPlaying = usePlayerCommand<{ playing: boolean }>("setPlaying");
  const setSaved = usePlayerCommand<{ saved: boolean }>("setTrackSaved");
  const pendingPlay = usePendingCommand<{ playing: boolean }>("setPlaying");
  const pendingSave = usePendingCommand<{ saved: boolean }>("setTrackSaved");
  const [notice, setNotice] = useState<string | null>(null);
  const track = now.value ?? null;
  if (!track) return null;

  // While another device plays, this page only shows it: Play moves playback here.
  const here = track.playing && !track.elsewhere;
  const playing = pendingPlay ? pendingPlay.playing : here;
  const saved = pendingSave ? pendingSave.saved : track.saved;
  const run = async (action: Promise<{ outcome: string; message?: string | null }>) => {
    setNotice(null);
    setNotice(failureText(await action));
  };

  return <section className="mini-player" aria-label="Now playing">
    <button type="button" className="mini-track" onClick={() => navigate({ screen: "player" })}
      aria-label={`Open player: ${track.title}`}>
      <Artwork src={track.image} />
      <span className="mini-text">
        <strong>{track.title}</strong>
        <span>{track.elsewhere ? "Playing on another device" : track.artist}</span>
      </span>
    </button>
    {saved !== null && <button type="button" className={`icon-button${saved ? " on" : ""}`} disabled={pendingSave !== undefined}
      aria-pressed={saved} aria-label={saved ? "Remove from Liked Songs" : "Save to Liked Songs"}
      onClick={() => run(setSaved({ saved: !saved }))}>
      <Icon name={saved ? "check" : "plus"} />
    </button>}
    <button type="button" className="icon-button" disabled={pendingPlay !== undefined} aria-label={playing ? "Pause" : "Play"}
      onClick={() => run(setPlaying({ playing: !here }))}>
      <Icon name={playing ? "pause" : "play"} filled />
    </button>
    {notice && <p role="alert" className="mini-notice">{notice}</p>}
  </section>;
}
