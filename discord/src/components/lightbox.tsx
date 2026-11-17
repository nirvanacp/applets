import { useEffect, useRef } from "react";
import { Icon } from "./ui";

/** An image or video from a message, over everything, until Close or Escape. */
export function Lightbox({ url, video, onClose }: { url: string; video: boolean; onClose(): void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [onClose]);
  return <div className="lightbox" role="dialog" aria-modal="true" aria-label={video ? "Video" : "Image"} onClick={onClose}>
    <button ref={close} type="button" className="icon-button lightbox-close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
    {video ? <video src={url} controls autoPlay playsInline onClick={event => event.stopPropagation()} />
      : <img src={url} alt="" referrerPolicy="no-referrer" onClick={event => event.stopPropagation()} />}
  </div>;
}
