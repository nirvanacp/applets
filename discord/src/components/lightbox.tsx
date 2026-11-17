import { useEffect, useRef, useState } from "react";
import { useGenesis } from "@let/sdk/react";
import type { Media } from "../model";
import { Icon } from "./ui";

/** A message's images and videos, and the one to show first. */
export interface Gallery { items: readonly Media[]; index: number }

const SWIPE = 48;

/**
 * A message's images and videos over everything, starting at the tapped one, until Close, Escape
 * or Back. With several items, the arrows, the arrow keys and a sideways swipe move between them.
 */
export function Lightbox({ items, index: start, onClose }: Gallery & { onClose(): void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const swipe = useRef<number | null>(null);
  const [index, setIndex] = useState(start);
  const genesis = useGenesis();
  const count = items.length;
  const step = (by: number) => setIndex(current => (current + by + count) % count);
  const { url, video, gif } = items[index] ?? items[0]!;

  // The newest Back handler runs first, so Back closes the viewer before it leaves the chat.
  useEffect(() => genesis.onBack(() => { onClose(); return true; }), [genesis, onClose]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex(current => (current - 1 + count) % count);
      if (event.key === "ArrowRight") setIndex(current => (current + 1) % count);
      if (event.key === "Tab") {
        // Focus stays on the dialog's own buttons.
        const buttons = [...dialog.current?.querySelectorAll<HTMLElement>("button") ?? []];
        const at = buttons.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        buttons[(at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [onClose, count]);

  const keep = (event: { stopPropagation(): void }) => event.stopPropagation();
  return <div ref={dialog} className="lightbox" role="dialog" aria-modal="true" aria-label={video ? "Video" : "Image"} onClick={onClose}
    onTouchStart={event => { swipe.current = event.touches.length === 1 ? event.touches[0]!.clientX : null; }}
    onTouchEnd={event => {
      const from = swipe.current, to = event.changedTouches[0]?.clientX;
      swipe.current = null;
      if (count > 1 && from !== null && to !== undefined && Math.abs(to - from) > SWIPE) step(to < from ? 1 : -1);
    }}>
    <button ref={close} type="button" className="icon-button lightbox-close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
    {count > 1 && <p className="lightbox-count" aria-live="polite">{index + 1} / {count}</p>}
    {gif ? <video key={url} src={url} muted loop autoPlay playsInline onClick={keep} />
      : video ? <video key={url} src={url} controls autoPlay playsInline onClick={keep} />
      : <img key={url} src={url} alt="" referrerPolicy="no-referrer" onClick={keep} />}
    {count > 1 && <>
      <button type="button" className="icon-button lightbox-step previous" aria-label="Previous"
        onClick={event => { keep(event); step(-1); }}><Icon name="back" /></button>
      <button type="button" className="icon-button lightbox-step next" aria-label="Next"
        onClick={event => { keep(event); step(1); }}><Icon name="chevron" /></button>
    </>}
  </div>;
}
