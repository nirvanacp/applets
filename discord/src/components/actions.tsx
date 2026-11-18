import { useEffect, useRef } from "react";
import { useGenesis } from "@let/sdk/react";
import type { Message } from "../model";
import { Icon } from "./ui";

/** The reactions the sheet offers; the page module finds each by name in Discord's picker. */
export const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

/** A message's text as one string, for copying. */
export const plainText = (message: Message) => message.parts.map(part => part.text).join("");

/**
 * What a held or tapped message offers: a quick reaction, Reply and Copy text. Closes on a choice,
 * a tap outside, Escape or Back.
 */
export function MessageActions({ message, onReact, onReply, onCopy, onClose }: {
  message: Message; onReact(emoji: string): void; onReply(): void; onCopy(): void; onClose(): void;
}) {
  const genesis = useGenesis();
  const first = useRef<HTMLButtonElement>(null);
  const text = plainText(message);

  useEffect(() => genesis.onBack(() => { onClose(); return true; }), [genesis, onClose]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [onClose]);

  const choose = (run: () => void) => () => { onClose(); run(); };
  return <div className="sheet-backdrop" onClick={onClose}>
    <div className="sheet" role="dialog" aria-modal="true" aria-label={`Message from ${message.author}`} onClick={event => event.stopPropagation()}>
      <p className="sheet-preview"><strong>{message.author}</strong> <span>{text || "Attachment"}</span></p>
      <ul className="sheet-reactions" aria-label="Add a reaction">
        {QUICK.map((emoji, index) => <li key={emoji}>
          <button ref={index === 0 ? first : undefined} type="button" aria-label={`React with ${emoji}`} onClick={choose(() => onReact(emoji))}>{emoji}</button>
        </li>)}
      </ul>
      <button type="button" className="sheet-action" onClick={choose(onReply)}><Icon name="reply" />Reply</button>
      {text && <button type="button" className="sheet-action" onClick={choose(onCopy)}><Icon name="copy" />Copy text</button>}
    </div>
  </div>;
}

/** Copies text with the clipboard API, or a hidden field where the WebView does not offer it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const done = document.execCommand("copy");
    field.remove();
    return done;
  }
}
