import { useState } from "react";
import { useGenesis, useRouter } from "@genesis/sdk/react";
import { actionMessage } from "../actions";
import { imageUrl, ORIGIN, type MediaData } from "../model";
import { Icon } from "../components/ui";
import { onScreen, usePageStatus, useScreenWatch } from "../screen";

/**
 * The original-size copy of an X photo and a file name for it, such as
 * `x-XDevelopers-123-1.jpg`, or null when the URL is not one of X's photos.
 */
export function photoDownload(src: string, handle: string, id: string, position: number) {
  const safe = imageUrl(src);
  if (!safe) return null;
  const url = new URL(safe);
  if (!url.pathname.startsWith("/media/")) return null;
  const format = url.searchParams.get("format") ?? /\.(jpg|jpeg|png|webp|gif)$/i.exec(url.pathname)?.[1] ?? "jpg";
  if (!/^(jpg|jpeg|png|webp|gif)$/i.test(format)) return null;
  url.searchParams.set("name", "orig");
  return { url: url.href, filename: `x-${handle}-${id}-${position}.${format.toLowerCase()}` };
}

/** A full-screen photo. Previous and Next replace this entry, so Back returns to the post. */
export function MediaScreen() {
  const genesis = useGenesis();
  const { navigate, back, viewWebsite, active } = useRouter();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const page = usePageStatus();
  const photo = useScreenWatch<MediaData | null>("media", "photos").value;
  const { handle, id, index } = page.params;
  const position = Number(index) || 1;
  const go = (to: number) => navigate({ url: `${ORIGIN}/${handle}/status/${id}/photo/${to}`, mode: "replace" });
  const data = page.stale || !onScreen(page, "media") ? null : photo;
  const download = data?.image ? photoDownload(data.image, handle, id, position) : null;

  // `save` is the first await of the tap. Android shows the download's progress.
  const save = async () => {
    if (!download) return;
    setSaveMessage(null);
    if (genesis.limits.userActions !== true) return viewWebsite();
    try {
      await genesis.downloads.save({ context: active, url: download.url, filename: download.filename });
      setSaveMessage("Saving to Downloads");
    } catch (error) {
      setSaveMessage(actionMessage(error, "Couldn't save this photo."));
    }
  };

  return <div className="media-viewer">
    <button type="button" className="media-close" aria-label="Close" onClick={back}><Icon name="close" /></button>
    <div className="media-stage">
      {data?.image
        ? <img src={data.image} alt={`Photo ${position}`} referrerPolicy="no-referrer" />
        : page.status === "error"
          ? <div className="media-message">
              <p>This photo couldn't be shown.</p>
              <button type="button" className="secondary" onClick={() => viewWebsite()}>
                Open on X <Icon name="external" />
              </button>
            </div>
          : <p className="media-message" role="status">Loading photo…</p>}
    </div>
    <div className="media-nav">
      <button type="button" className="icon-button" aria-label="Previous photo" disabled={position <= 1} onClick={() => go(position - 1)}><Icon name="left" /></button>
      <span>{position}</span>
      <button type="button" className="icon-button" aria-label="Next photo" disabled={!data?.hasNext} onClick={() => go(position + 1)}><Icon name="right" /></button>
      <button type="button" className="icon-button media-save" aria-label="Save photo" disabled={!download} onClick={() => void save()}>
        <Icon name="download" />
      </button>
    </div>
    {saveMessage && <p className="media-status" role="status">{saveMessage}</p>}
  </div>;
}
