/** Helpers every reader uses. They read only what they are given. */

/** Whitespace-collapsed text, at most `max` characters. */
export function clean(text: string | null | undefined, max = 300): string {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** An element's text, cleaned. */
export const textOf = (element: Element | null | undefined, max = 300) => clean(element?.textContent, max);

/** An absolute `https:` URL, or null. Resolved against the document so relative links work. */
export function httpsUrl(href: string | null | undefined, doc: Document): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, doc.baseURI);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

/** The `https:` URL of a link element. */
export const hrefOf = (link: Element | null | undefined) =>
  link ? httpsUrl(link.getAttribute("href"), link.ownerDocument) : null;

/** The `https:` source of the first image in `scope`. */
export function imageIn(scope: Element | null | undefined): string | null {
  const img = scope?.matches("img") ? scope : scope?.querySelector("img");
  return img ? httpsUrl(img.getAttribute("src"), img.ownerDocument) : null;
}


/** A count in a badge such as "3" or "99+", or 0 without one. */
export function countIn(scope: Element | null | undefined): number {
  const badge = scope?.querySelector("[class*=numberBadge], [class*=mentionsBadge]");
  const match = /\d+/.exec(badge?.textContent ?? "");
  return match ? Number(match[0]) : 0;
}

/** The phone layout's drawer: the server rail and the channel or conversation list. */
export const RAIL = 'nav[aria-label="Servers sidebar"]';
export const PRIVATE = 'nav[aria-label="Private channels"]';
export const HAMBURGER = 'section[aria-label="Channel header"] button[class*=btnHamburger], button[class*=btnHamburger]';
export const MESSAGES = 'ol[data-list-id="chat-messages"]';
/** Discord's message scroller, the one element that scrolls the chat. */
export const SCROLLER = `div[class*=scroller_]:has(> * ${MESSAGES}), div[class*=scroller_]:has(${MESSAGES})`;
/** One compound selector, so that `${COMPOSER} textarea` scopes every alternative to the form. */
export const COMPOSER = "form:has(textarea[placeholder], [role=textbox][data-slate-editor])";
