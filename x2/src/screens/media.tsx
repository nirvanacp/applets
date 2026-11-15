import { useEffect, useRef, useState } from "react";
import { useGenesis, useRouter, type CurrentScreen } from "@genesis/sdk/react";
import { actionMessage } from "../actions";
import { imageUrl, ORIGIN, photosOf, type MediaData } from "../model";
import { useToast } from "../ui/feedback";
import { Icon } from "../ui/icons";
import { PhotoSkeleton } from "../ui/skeletons";
import { WebsiteCue } from "../ui/states";
import { onScreen, useScreenWatch } from "../screen";

/**
 * The original-size copy of an X photo and a file name for it, such as `x-XDevelopers-123-1.jpg`,
 * or null when the URL is not one of X's photos.
 */
function photoDownload(src: string, handle: string, id: string, position: number) {
  const safe = imageUrl(src);
  if (!safe) return null;
  const url = new URL(safe);
  if (!url.pathname.startsWith("/media/")) return null;
  const format = url.searchParams.get("format") ?? /\.(jpg|jpeg|png|webp|gif)$/i.exec(url.pathname)?.[1] ?? "jpg";
  if (!/^(jpg|jpeg|png|webp|gif)$/i.test(format)) return null;
  url.searchParams.set("name", "orig");
  return { url: url.href, filename: `x-${handle}-${id}-${position}.${format.toLowerCase()}` };
}

const SWIPE = 60;

/**
 * A full-screen photo on black, over the tab bar. Previous and Next (buttons or a sideways
 * swipe) move through the post's photos here when the applet opened them, without moving X's
 * page, so Close returns to the list as it was. A photo opened from a link pages through X's
 * viewer instead, replacing this entry. Save and Share are first awaits of their taps, as
 * Android's user actions need.
 */
export function MediaScreen(_: { screen: CurrentScreen }) {
  const genesis = useGenesis();
  const { navigate, back, viewWebsite, active, status } = useRouter();
  const { show } = useToast();
  const page = status();
  const photo = useScreenWatch<MediaData | null>("media", "photos").value;
  const { handle = "", id = "", index } = page.params;
  const opened = Number(index) || 1;
  const known = photosOf(id);
  const [shown, setShown] = useState(opened);
  useEffect(() => setShown(opened), [id, opened]);
  const position = known ? Math.min(shown, known.length) : opened;
  const data = page.stale || !onScreen(page, "media") ? null : photo;
  const image = known ? known[position - 1] : data?.image;
  const hasNext = known ? position < known.length : data?.hasNext === true;
  const download = image ? photoDownload(image, handle, id, position) : null;
  const userActions = genesis.limits.userActions === true;
  const swipe = useRef<number | null>(null);

  const go = (to: number) => known ? setShown(to) : navigate({ url: `${ORIGIN}/${handle}/status/${id}/photo/${to}`, mode: "replace" });
  const count = known && known.length > 1 ? `Photo ${position} of ${known.length}` : position > 1 || hasNext ? `Photo ${position}` : "";
  const save = async () => {
    if (!download) return;
    if (!userActions) return viewWebsite();
    try {
      await genesis.downloads.save({ context: active, url: download.url, filename: download.filename });
      show({ text: "Saving to Downloads" });
    } catch (error) {
      show({ text: actionMessage(error, "Couldn't save this photo.") });
    }
  };
  const share = async () => {
    const url = `${ORIGIN}/${handle}/status/${id}`;
    if (!userActions) return viewWebsite();
    try {
      await genesis.share({ url });
    } catch (error) {
      show({ text: actionMessage(error, "Couldn't share this post.") });
    }
  };

  return <div className="media-viewer" role="dialog" aria-label={`Photo ${position}`}>
    <header className="media-bar">
      <button type="button" className="icon-button" aria-label="Close" onClick={back}><Icon name="close" /></button>
      <span className="media-count" aria-live="polite">{count}</span>
      <button type="button" className="icon-button" aria-label={userActions ? "Share post" : "Share post on X, opens website"} onClick={() => void share()}>
        <Icon name="share" />
      </button>
      <button type="button" className="icon-button" aria-label={userActions ? "Save photo" : "Save photo on X, opens website"} disabled={!download}
        onClick={() => void save()}>
        <Icon name="download" />
      </button>
    </header>
    <div className="media-stage"
      onPointerDown={event => { swipe.current = event.clientX; }}
      onPointerUp={event => {
        const start = swipe.current;
        swipe.current = null;
        if (start === null) return;
        const dx = event.clientX - start;
        if (dx > SWIPE && position > 1) go(position - 1);
        else if (dx < -SWIPE && hasNext) go(position + 1);
      }}
      onPointerCancel={() => { swipe.current = null; }}>
      {image
        ? <img key={image} src={image} alt={`Photo ${position}`} referrerPolicy="no-referrer" draggable={false} />
        : page.status === "error"
          ? <div className="media-message" role="alert">
            <p>This photo couldn't be shown.</p>
            <button type="button" className="button secondary" onClick={() => viewWebsite()}>View on X <WebsiteCue /></button>
          </div>
          : <PhotoSkeleton />}
    </div>
    <nav className="media-nav" aria-label="Photos">
      <button type="button" className="icon-button" aria-label="Previous photo" disabled={position <= 1} onClick={() => go(position - 1)}><Icon name="left" /></button>
      <button type="button" className="icon-button" aria-label="Next photo" disabled={!hasNext} onClick={() => go(position + 1)}><Icon name="right" /></button>
    </nav>
  </div>;
}
