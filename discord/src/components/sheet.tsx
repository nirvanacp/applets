import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useGenesis } from "@nirvanacp/sdk/react";
import { WebsiteCue } from "../ui/states";
import { Icon, type IconName } from "./ui";

export interface Choice {
  label: string;
  icon?: IconName;
  /** Content shown before the label in place of an icon, such as a status dot. */
  mark?: ReactNode;
  current?: boolean;
  /** The choice opens Discord's website. */
  website?: boolean;
  run(): void;
}

/**
 * A bottom sheet of choices, drawn over the whole applet, tab bar included. Closes on a choice, a
 * tap outside, Escape or Back.
 */
export function ChoiceSheet({ title, choices, onClose }: { title: string; choices: Choice[]; onClose(): void }) {
  const genesis = useGenesis();
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => genesis.onBack(() => { onClose(); return true; }), [genesis, onClose]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [onClose]);

  return createPortal(<div className="sheet-backdrop" onClick={onClose}>
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={event => event.stopPropagation()}>
      <p className="sheet-preview"><strong>{title}</strong></p>
      {choices.map((choice, index) => <button key={choice.label} ref={index === 0 ? first : undefined} type="button"
        className={`sheet-action${choice.current ? " current" : ""}`} aria-current={choice.current ? "true" : undefined}
        onClick={() => { onClose(); choice.run(); }}>
        {choice.mark ?? (choice.icon && <Icon name={choice.icon} />)}
        <span className="sheet-label">{choice.label}</span>
        {choice.website && <WebsiteCue />}
      </button>)}
    </div>
  </div>, document.body);
}
