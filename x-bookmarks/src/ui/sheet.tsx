import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "@let/sdk/react";
import { Icon } from "./icons";

/** The control that opened the last sheet, so closing it can return focus there. */
let opener: HTMLElement | null = null;

/** Call from the tap that opens a sheet. */
export function rememberOpener() {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

const CLOSE_SHARE = .25;   // drag past a quarter of the height to close
const FLICK = .6;          // px per ms

/**
 * A bottom sheet for an overlay screen. It rises on mount (CSS), sinks with the stage's
 * `sheet-close` when the router closes it, and follows a drag on its handle. The body scrolls; the
 * footer with the confirming action stays reachable with the keyboard open. Back, the backdrop,
 * Close and a drag all leave through `back()`, so Android Back closes it first.
 */
export function Sheet({ title, footer, children }: { title: string; footer?: ReactNode; children: ReactNode }) {
  const { back } = useRouter();
  const sheet = useRef<HTMLElement>(null);
  const heading = useId();
  const drag = useRef<{ y: number; at: number; dy: number } | null>(null);

  useEffect(() => {
    sheet.current?.focus({ preventScroll: true });
    return () => {
      const target = opener;
      opener = null;
      // The screen under the sheet stays mounted, so its control is still there.
      if (target?.isConnected) requestAnimationFrame(() => target.focus({ preventScroll: true }));
    };
  }, []);

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current || !sheet.current) return;
    drag.current.dy = Math.max(0, event.clientY - drag.current.y);
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`;
    sheet.current.classList.toggle("armed", drag.current.dy > sheet.current.offsetHeight * CLOSE_SHARE);
  };
  const release = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    const node = sheet.current;
    drag.current = null;
    if (!state || !node) return;
    node.classList.remove("dragging", "armed");
    const speed = state.dy / Math.max(1, event.timeStamp - state.at);
    // Closing leaves the transform where the drag stopped, so the closing copy sinks from there.
    if (state.dy > node.offsetHeight * CLOSE_SHARE || speed > FLICK) back();
    else node.style.transform = "";
  };

  return <div className="sheet-layer">
    <div className="sheet-backdrop" onClick={() => back()} />
    <section className="sheet" role="dialog" aria-modal="true" aria-labelledby={heading} tabIndex={-1} ref={sheet}>
      <div className="sheet-grip" aria-hidden="true"
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { y: event.clientY, at: event.timeStamp, dy: 0 };
          sheet.current?.classList.add("dragging");
        }}
        onPointerMove={move} onPointerUp={release} onPointerCancel={release}>
        <span />
      </div>
      <header className="sheet-head">
        <h2 id={heading}>{title}</h2>
        <button type="button" className="icon-button" aria-label="Close" onClick={() => back()}><Icon name="close" /></button>
      </header>
      <div className="sheet-body">{children}</div>
      {footer && <footer className="sheet-foot">{footer}</footer>}
    </section>
  </div>;
}

/** A confirmation inside a screen or sheet: the warning sits beside the control it is about. */
export function Confirm({ text, confirm, cancel = "Keep", busy, onConfirm, onCancel, danger = true }: {
  text: string; confirm: string; cancel?: string; busy?: boolean; danger?: boolean; onConfirm(): void; onCancel(): void;
}) {
  return <div className="confirm" role="group" aria-label={text}>
    <p>{text}</p>
    <div className="confirm-buttons">
      <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>{cancel}</button>
      <button type="button" className={`button ${danger ? "danger" : "primary"}`} disabled={busy} aria-busy={busy} onClick={onConfirm}>{confirm}</button>
    </div>
  </div>;
}
