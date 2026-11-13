import { memo, useState } from "react";
import { record } from "@genesis/sdk";
import { mount, useCommand, useGenesis, usePending, useRecord, useRouter, useWatch, ScrollMemory } from "@genesis/sdk/react";
import type { Link, NowPlaying } from "./page";
import { HOME_PAGES, ROUTES } from "./routes";
import "./theme.css";

const LINKS = "home:links";

/** One row; it re-renders only when its own record or its pending inputs change. */
const LinkRow = memo(function LinkRow({ id }: { id: string }) {
  const genesis = useGenesis();
  const link = useRecord<Link>(LINKS, id);
  const target = record(LINKS, id);
  const pending = usePending(target, "primary").length > 0;
  if (!link) return null;
  // A click on the website's own link; the destination's route decides what shows.
  const open = () => void genesis.context("primary").click(target, { navigates: true });
  return (
    <li>
      <button type="button" disabled={pending} onClick={open}>{link.text || link.url}</button>
    </li>
  );
});

/** The track the web player has loaded, with Play/Pause sent to the hidden website. */
function NowPlayingStrip() {
  const now = useWatch<NowPlaying | null>("home:now-playing", { reader: "nowPlaying" }, { context: "primary" });
  const setPlaying = useCommand<{ playing: boolean }>("setPlaying", "primary");
  const pending = usePending(undefined, "primary").find(input => input.op === "invoke" && input.args.command === "setPlaying");
  const [notice, setNotice] = useState<string | null>(null);
  const track = now.value ?? null;
  if (now.status !== "ready" || !track) {
    return <section className="now-playing" aria-live="polite"><p className="muted">Play something on Spotify to control it here.</p></section>;
  }
  // While another device plays, this page is not the player: Play takes playback over.
  const here = track.playing && !track.elsewhere;
  const playing = pending ? (pending.args.args as { playing: boolean }).playing : here;
  const toggle = async () => {
    setNotice(null);
    const result = await setPlaying({ playing: !here });
    if (result.outcome === "failed") setNotice(`That didn't work (${result.code ?? "error"}): ${result.message ?? "try again"}.`);
    else if (result.outcome === "unknown") setNotice("Spotify didn't confirm it. Check the website.");
  };
  return (
    <section className="now-playing" aria-live="polite">
      <div className="now-playing-text">
        <strong>{track.title}</strong>
        <span className="muted">{track.elsewhere ? "Playing on another device. Play moves it here." : track.artist}</span>
      </div>
      <button type="button" className="play-pause" disabled={pending !== undefined} onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d={playing ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4l13 8-13 8z"} />
        </svg>
      </button>
      {notice && <p role="alert" className="notice">{notice}</p>}
    </section>
  );
}

function Home() {
  const links = useWatch<never, Link>(LINKS, { reader: "links" }, { context: "primary", when: HOME_PAGES });
  if (links.status === "error") return <p role="alert" className="notice">This page couldn't be read. {links.error?.message}</p>;
  if (links.status === "loading") return <p role="status" className="notice">Loading…</p>;
  if (links.order.length === 0) return <p role="status" className="notice">No links on this page.</p>;
  return (
    <ScrollMemory className="screen">
      <h1>Links</h1>
      <NowPlayingStrip />
      <ul className="links">
        {links.order.map(key => <LinkRow key={key} id={key} />)}
      </ul>
    </ScrollMemory>
  );
}

/** A URL without a route shows the website itself, so only routed screens render here. */
function App() {
  const { screen } = useRouter();
  return screen?.id === "home" ? <Home /> : null;
}

void mount(<App />, { router: { routes: ROUTES } });
