import type { TextPart } from "../model";
import { useOpenUrl } from "../ui/frame";

/** Post text with its links, mentions and hashtags. Website text is never parsed as HTML. */
export function RichText({ parts, className = "post-text" }: { parts: TextPart[]; className?: string }) {
  const open = useOpenUrl();
  return <p className={className} dir="auto">{parts.map((part, index) => part.href
    ? <a key={index} href={part.href} onClick={event => { event.preventDefault(); event.stopPropagation(); open(part.href!); }}>{part.text}</a>
    : <span key={index}>{part.text}</span>)}</p>;
}
