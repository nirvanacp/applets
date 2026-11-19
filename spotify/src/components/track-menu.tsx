import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGenesis, usePending } from "@let/sdk/react";
import type { EntityKind, TrackRow } from "../model";
import { useToast } from "../ui/feedback";
import { useDragDown } from "./drag-down";
import { Artwork, Icon, type IconName } from "./ui";
import { failureText, usePlayerCommand, useReport } from "./playback";

interface Like { rowId: string; liked: boolean }
interface View { rowId: string; page: "artist" | "album" }

/** Liked states the screen shows before Spotify does: each row's newest unsettled Like, by row. */
export function usePendingLikes(): ReadonlyMap<string, boolean> {
  const pending = usePending(undefined, "primary");
  return useMemo(() => {
    const likes = new Map<string, boolean>();
    for (const input of pending) {
      if (input.op !== "invoke" || input.args.command !== "setRowLiked") continue;
      const like = input.args.args as Like;
      likes.set(like.rowId, like.liked);
    }
    return likes;
  }, [pending]);
}

/**
 * A track row's menu, drawn as a sheet from the bottom like the Android app's: Like or Remove from
 * Liked Songs, Share, and the track's artist and album pages. These are the items of the Free web
 * player's own row menu; Add to queue and Add to playlist are not there (decision-0018).
 *
 * Like answers at once: the sheet closes, the row shows the new state and the toast says what
 * Spotify did. A page link waits on the website, so its item shows busy until the page opens or
 * the toast says why not. Back, a tap outside and a drag down close the sheet.
 */
export function TrackMenu({ track, liked, kind, onClose }: {
  track: TrackRow;
  liked: boolean;
  /** The page the row is on: it has no link to itself. */
  kind: EntityKind;
  onClose(): void;
}) {
  const genesis = useGenesis();
  const { show } = useToast();
  const report = useReport();
  const like = usePlayerCommand<Like>("setRowLiked");
  const view = usePlayerCommand<View>("openRowPage");
  const [opening, setOpening] = useState<View["page"] | null>(null);
  const sheet = useRef<HTMLElement>(null);
  useDragDown(sheet, onClose);

  useEffect(() => genesis.onBack(() => { onClose(); return true; }), [genesis, onClose]);

  const toggleLike = () => {
    const rowId = track.rowId;
    onClose();
    // The website keeps an unliked row on Liked Songs until the page reloads, so Undo works there too.
    const undo = liked ? () => like({ rowId, liked: true }) : undefined;
    void like({ rowId, liked: !liked }).then(result =>
      report(result, { text: liked ? "Removed from Liked Songs" : "Added to Liked Songs", undo }));
  };

  const share = () => {
    if (!track.url) return;
    // Android's share sheet needs the call within moments of the tap, so it comes first.
    const sharing = genesis.share({ title: `${track.title} by ${track.detail}`, url: track.url });
    onClose();
    sharing.catch(() => show({ text: "Couldn't share this song." }));
  };

  const open = (page: View["page"]) => {
    if (opening) return;
    setOpening(page);
    void view({ rowId: track.rowId, page }).then(result => {
      // On success the website's page replaces this screen, and the sheet with it.
      const failure = failureText(result);
      if (failure === null && result.outcome === "observed") return;
      setOpening(null);
      onClose();
      if (failure) show({ text: failure });
    });
  };

  const items: { key: string; icon: IconName; label: string; on?: boolean; run(): void; hidden?: boolean; disabled?: boolean }[] = [
    { key: "like", icon: liked ? "check" : "plus", on: liked, label: liked ? "Remove from Liked Songs" : "Add to Liked Songs", run: toggleLike },
    { key: "share", icon: "share", label: "Share", run: share, disabled: !track.url },
    { key: "artist", icon: "artist", label: "View artist", run: () => open("artist"), hidden: kind === "artist" },
    { key: "album", icon: "album", label: "View album", run: () => open("album"), hidden: kind === "album" },
  ];

  return createPortal(<div className="sheet-layer">
    <div className="sheet-backdrop" onClick={onClose} />
    <section ref={sheet} className="sheet track-sheet" role="dialog" aria-modal="true" aria-label={`${track.title} options`}>
      <span className="sheet-handle" aria-hidden="true" />
      <header className="sheet-head">
        <Artwork src={track.image} className="track-art" />
        <span className="track-text">
          <strong>{track.title}</strong>
          <span>{track.detail}</span>
        </span>
      </header>
      <ul className="sheet-body">
        {items.filter(item => !item.hidden).map(item => <li key={item.key}>
          <button type="button" className={`row sheet-item${item.on ? " on" : ""}`} disabled={item.disabled || opening !== null}
            aria-busy={opening === item.key} onClick={item.run}>
            {opening === item.key ? <span className="spinner" aria-hidden="true" /> : <Icon name={item.icon} />}
            <span>{item.label}</span>
          </button>
        </li>)}
      </ul>
    </section>
  </div>, document.body);
}
