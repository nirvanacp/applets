import { list, one } from "@genesis/sdk/page";
import {
  account, clean, currentAccount, failureText, hash, ITEMS, itemKey, personKey, POST, readItem, readPerson, readPhoto,
  postIdOf, readProfileHeader, readPost, readTrend, toggle, type CommandResult,
} from "./read.ts";
import { postUrl } from "../model.ts";

/**
 * X's pages. X is a single-page app: a page is ready once the main column shows its content,
 * X's empty state, or its error message, which becomes the route's error. Right after a
 * navigation the column can still hold the previous page, so pages whose URL names their subject
 * (a post, a profile) wait for that subject rather than for any content.
 */

const MAIN = "main";
const EMPTY = '[data-testid="emptyState"]';
const MEDIA = '[data-testid="swipe-to-dismiss"]';

function shows(doc: Document, content: string | ((main: Element) => boolean)): boolean {
  if (doc.readyState === "loading") return false;
  const main = doc.querySelector(MAIN);
  if (!main) return false;
  const failure = failureText(main);
  if (failure) throw new Error(failure);
  if (main.querySelector(EMPTY)) return true;
  return typeof content === "string" ? main.querySelector(content) !== null : content(main);
}

// ---- Ready readers --------------------------------------------------------------------------

/** Home, Notifications, Bookmarks and Likes. */
export const timelineReady = (doc: Document) => shows(doc, ITEMS);

/** A post, once the column shows the post the URL names. */
export function postReady(doc: Document) {
  const postId = postUrl(doc.location.href)?.postId;
  return shows(doc, main => [...main.querySelectorAll(POST)].some(article => postIdOf(article) === postId));
}

/** A profile, once the header shows; X keeps the previous profile's header until it renders the new one. */
export const profileReady = (doc: Document) => shows(doc, main => readProfileHeader(main) !== null);

/** Explore, search results and hashtags. */
export const exploreReady = (doc: Document) => shows(doc, `${POST}, [data-testid="trend"], [data-testid="UserCell"]`);

/** The photo viewer X opens over the post. */
export const mediaReady = (doc: Document) => doc.readyState !== "loading" && doc.querySelector(MEDIA) !== null;

/** `/settings/account`, once it shows the account or the login button. */
export const accountReady = (doc: Document) => account(doc) !== undefined;

/**
 * What the page shows about the account: the handle while signed in, `false` while X shows its
 * login button and `null` while the page shows neither.
 */
export function accountEvidence(doc: Document): string | false | null {
  const found = account(doc);
  return found === undefined ? null : found ?? false;
}

// ---- Data readers ---------------------------------------------------------------------------

/** A list of posts and notifications. X drops rows that scroll far away, so the list keeps them. */
const timeline = (items = ITEMS) => list({ root: MAIN, items, key: itemKey, read: readItem, virtualized: true });

export const posts = timeline();
export const thread = timeline(POST);

/** X's empty-state heading, when it shows one. */
export const empty = one({ root: EMPTY, read: root => clean(root.textContent, 200) || null });

export const header = one({ root: MAIN, read: readProfileHeader });

/**
 * A trend's key: its link when it has one, else its name. Not its whole text, which includes the
 * post count X updates in place.
 */
function trendKey(element: Element): string {
  const link = element.querySelector("a[href]")?.getAttribute("href") ?? element.closest("a[href]")?.getAttribute("href");
  const name = readTrend(element)?.name ?? clean(element.textContent, 300);
  return `t:${hash(link ?? name)}`;
}

export const trends = list({ root: MAIN, items: '[data-testid="trend"]', key: trendKey, read: readTrend });
export const people = list({ root: MAIN, items: '[data-testid="UserCell"]', key: personKey, read: readPerson });
export const results = list({ root: MAIN, items: POST, key: itemKey, read: element => readPost(element), virtualized: true });

/** The photo viewer. Swiping moves the photos, so their size and position are watched. */
export const photos = one({ root: MEDIA, read: readPhoto, measure: true });

/** The signed-in handle. It comes from the whole document, including X's bootstrap script in `<head>`. */
export const handle = one({ root: "html", read: root => currentAccount(root.ownerDocument) });

// ---- Commands -------------------------------------------------------------------------------

export const setLiked = (doc: Document, args: { id?: unknown; liked?: unknown } | undefined) =>
  toggle(doc, args?.id, args?.liked, { on: "like", off: "unlike" });

export const setBookmarked = (doc: Document, args: { id?: unknown; bookmarked?: unknown } | undefined) =>
  toggle(doc, args?.id, args?.bookmarked, { on: "bookmark", off: "removeBookmark" });

/** The key of the last item in the main column. */
const lastKey = (doc: Document) => {
  const items = doc.querySelectorAll(`${MAIN} :is(${ITEMS})`);
  return items.length ? itemKey(items[items.length - 1]) : null;
};

/**
 * Scrolls X's page to the end, which makes X load the next rows. A new last row is the evidence;
 * a page whose last row stays put has nothing more to load right now.
 */
export function loadMore(doc: Document): CommandResult {
  const before = lastKey(doc);
  return { steps: [{ op: "scroll", to: "end" }], until: now => lastKey(now) !== before, deadlineMs: 10_000 };
}
