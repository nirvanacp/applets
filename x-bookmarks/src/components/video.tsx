import { useEffect, useRef, useState } from "react";
import type { VideoView } from "../model";
import { FadeImage } from "../ui/frame";
import { Icon } from "../ui/icons";
import { reducedMotion } from "../ui/motion";

/**
 * GIFs play as X's app plays them: inline, silent, looping, once at least half of one is on
 * screen, and only the one most on screen. One observer watches every inline GIF; the leader
 * plays and every other one pauses. Nothing plays while the applet is hidden or with reduced
 * motion on.
 */
const shown = new Map<HTMLVideoElement, number>();
let observer: IntersectionObserver | null = null;

function lead() {
  let best: HTMLVideoElement | null = null;
  let ratio = .5;
  if (document.visibilityState === "visible" && !reducedMotion()) {
    for (const [video, seen] of shown) if (seen >= ratio) { best = video; ratio = seen; }
  }
  for (const video of shown.keys()) {
    if (video === best) { if (video.paused) void video.play().catch(() => undefined); }
    else if (!video.paused) video.pause();
  }
}

function watch(video: HTMLVideoElement) {
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) shown.set(entry.target as HTMLVideoElement, entry.isIntersecting ? entry.intersectionRatio : 0);
    lead();
  }, { threshold: [0, .25, .5, .75, 1] });
  shown.set(video, 0);
  observer.observe(video);
  return () => { observer?.unobserve(video); shown.delete(video); video.pause(); lead(); };
}

document.addEventListener("visibilitychange", lead);

/**
 * A feed video at its own shape. A GIF plays here; any other video shows its poster with X's play
 * button and length, and a tap opens it in X's own full-screen player with sound.
 */
export function InlineVideo({ video, poster, label, onOpen }: { video: VideoView; poster: string | null; label: string; onOpen(): void }) {
  const element = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { const node = element.current; return node ? watch(node) : undefined; }, []);

  // Tall videos stop at a 4:5 frame, as X's feed crops them.
  const shape = Math.max(video.aspect, .8);
  return <div className="inline-video" style={{ aspectRatio: String(shape) }}>
    {poster && !playing && <FadeImage src={poster} />}
    {video.file && <video ref={element} src={video.file} muted playsInline loop preload="metadata" disableRemotePlayback
      aria-hidden="true" onPlaying={() => setPlaying(true)} />}
    <button type="button" className="video-open" aria-label={video.gif ? `${label}, GIF` : `Play ${label}${video.length ? `, ${video.length}` : ""}, opens X's player`} onClick={onOpen}>
      {!video.gif && <span className="video-play-badge"><Icon name="play" filled /></span>}
    </button>
    {video.gif ? <span className="video-badge">GIF</span> : video.length && <span className="video-badge">{video.length}</span>}
  </div>;
}
