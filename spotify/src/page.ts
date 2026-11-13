import { definePageModule, list } from "@genesis/sdk/page";

/** One link on the start page. Replace it with the records your applet needs. */
export interface Link {
  text: string;
  url: string;
  /** Text of the list item or paragraph around the link. */
  around: string;
}

/** The list item or paragraph a link sits in: part of what `read` reads, so it is the link's extent. */
const container = (link: Element) => link.closest("li, p");

/** Query parameters that often carry a session or form token. A reader never sends those out of the page. */
const SECRET = /auth|token|csrf|xsrf|sig|session|key|nonce/i;

/** The link's address without its fragment and without token-like query parameters. */
function linkUrl(link: Element): string {
  const url = new URL((link as HTMLAnchorElement).href);
  for (const name of [...url.searchParams.keys()]) if (SECRET.test(name)) url.searchParams.delete(name);
  url.hash = "";
  return url.href;
}

/**
 * A link's key: its URL plus its occurrence among the page's links to that URL, so two links to
 * the same address keep distinct keys.
 */
function linkKey(link: Element): string {
  const url = linkUrl(link);
  const same = [...link.ownerDocument.querySelectorAll("a[href]")].filter(other => linkUrl(other) === url);
  return `${url}#${same.indexOf(link)}`;
}

/**
 * The page module runs inside every website page the applet opens. Its readers turn the page into
 * JSON for the UI's watches; it never sends page HTML, cookies or form tokens anywhere.
 */
export default definePageModule({
  readers: {
    links: list<Link>({
      root: "body",
      items: "a[href]",
      // Keys must be unique in the list. Choose items and keys the website keeps stable.
      key: linkKey,
      read: link => ({
        text: link.textContent?.trim() ?? "",
        url: linkUrl(link),
        around: container(link)?.textContent?.trim().slice(0, 200) ?? "",
      }),
      extent: link => [container(link)],
    }),
  },
});
