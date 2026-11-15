import type { ReactNode } from "react";
import { ORIGIN, type TextPart } from "../model";
import { useOpenUrl } from "../ui/frame";

/** HN's formatted text. Links open through the route table; text is never parsed as HTML. */
export function RichText({ parts, onLink }: { parts: TextPart[]; onLink?: (url: string) => void }) {
  const open = useOpenUrl();
  const follow = onLink ?? open;
  return <div className="rich">{parts.map((part, index) => {
    let node: ReactNode = part.text;
    if (part.code) node = <code>{node}</code>;
    if (part.em) node = <em>{node}</em>;
    if (part.strong) node = <strong>{node}</strong>;
    if (part.href) {
      const href = part.href;
      node = <a href={href} onClick={event => { event.preventDefault(); follow(href); }}>{node}</a>;
    }
    return <span key={index}>{node}</span>;
  })}</div>;
}

/** HN's login page, which returns to `goto` (a path relative to the site root) after sign-in. */
export const loginUrl = (goto: string) => `${ORIGIN}/login?goto=${encodeURIComponent(goto)}`;

/** "3 hours ago" style metadata joined with separators, skipping unknown parts. */
export function Meta({ parts }: { parts: (ReactNode | null | false)[] }) {
  const shown = parts.filter(Boolean);
  return <p className="meta">{shown.map((part, index) => <span key={index}>{index > 0 && " · "}{part}</span>)}</p>;
}

/** A link inside metadata or text that opens through the route table. */
export function Link({ url, className, children }: { url: string; className?: string; children: ReactNode }) {
  const open = useOpenUrl();
  return <a href={url} className={className} onClick={event => { event.preventDefault(); open(url); }}>{children}</a>;
}
