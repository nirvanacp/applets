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

/** A switch's `aria-checked`, or null without one. */
export function switchState(button: Element | null | undefined): boolean | null {
  const checked = button?.getAttribute("aria-checked");
  return checked === "true" ? true : checked === "false" ? false : null;
}

/** The mobile web player's content column. Spotify draws every page inside it. */
export const MAIN = "#main";
