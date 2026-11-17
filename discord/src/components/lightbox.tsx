import { useEffect, useRef } from "react";
import { useGenesis } from "@let/sdk/react";
import { Icon } from "./ui";

/** An image or video from a message, over everything, until Close, Escape or Back. */
export function Lightbox({ url, video, onClose }: { url: string; video: boolean; onClose(): void }) {
  const close = useRef<HTMLButtonElement>(null);
  const genesis = useGenesis();
  // The newest Back handler runs first, so Back closes the viewer before it leaves the chat.
  useEffect(() => genesis.onBack(() => { onClose(); return true; }), [genesis, onClose]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // The close button is the dialog's only control outside the media, so Tab stays on it.
      if (event.key === "Tab") { event.preventDefault(); close.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [onClose]);
  return <div className="lightbox" role="dialog" aria-modal="true" aria-label={video ? "Video" : "Image"} onClick={onClose}>
    <button ref={close} type="button" className="icon-button lightbox-close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
    {video ? <video src={url} controls autoPlay playsInline onClick={event => event.stopPropagation()} />
      : <img src={url} alt="" referrerPolicy="no-referrer" onClick={event => event.stopPropagation()} />}
  </div>;
}
