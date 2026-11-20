import { list, one } from "@let/sdk/page";
import {
  account, clean, currentAccount, lines, failureText, hash, ITEMS, itemKey, personKey, POST, readItem, readPerson, readPhoto,
  MENU_MS, owned, postIdOf, postSelector, reachPost, readProfileHeader, readPost, readTile, readTrend, TILE, TILE_LINK, tileKey, toggle,
  type CommandResult,
} from "./read.ts";
import { imageUrl, postUrl } from "../model.ts";

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

/** One-segment X paths that `/:handle` matches but that are not profiles, in any case. */
const RESERVED = new Set([
  "home", "explore", "notifications", "messages", "settings", "i", "login", "logout", "signup", "tos", "privacy",
  "about", "download", "compose", "search", "jobs", "communities", "premium", "lists", "bookmarks", "account",
]);

/**
 * A profile, once the header shows; X keeps the previous profile's header until it renders the new
 * one. A first segment that cannot be a handle, such as `/verified-choose` or `/Settings`, is
 * refused at once, so the route shows X's own page instead of waiting.
 */
export function profileReady(doc: Document) {
  const handle = doc.location.pathname.split("/")[1] ?? "";
  if (RESERVED.has(handle.toLowerCase()) || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) throw new Error("This X page isn't a profile");
  return shows(doc, main => readProfileHeader(main) !== null);
}

/** Explore, search results and hashtags. */
export const exploreReady = (doc: Document) => shows(doc, `${POST}, [data-testid="trend"], [data-testid="UserCell"], ${TILE_LINK}`);

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

/** The signed-in account's picture in X's own header, on Home and the other start pages. */
export const selfAvatar = (doc: Document): string | null =>
  imageUrl(doc.querySelector('[data-testid="DashButton_ProfileIcon_Link"] img')?.getAttribute("src"));

// ---- Data readers ---------------------------------------------------------------------------

/** A list of posts and notifications. X drops rows that scroll far away, so the list keeps them. */
const timeline = (items = ITEMS) => list({ root: MAIN, items, key: itemKey, read: readItem, virtualized: true });

export const posts = timeline();
export const thread = timeline(POST);

/**
 * X's empty-state heading, when it shows one: its header element, else the first rendered line.
 * Not the whole text, which runs the heading into the explanation under it.
 */
export const empty = one({
  root: EMPTY,
  read: root => clean(root.querySelector('[data-testid="empty_state_header_text"]')?.textContent, 200) || lines(root)[0] || null,
});

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

/** X's media grid, which search Media and profile Media show instead of posts. */
export const tiles = list({ root: MAIN, items: TILE, key: tileKey, read: readTile, virtualized: true });

/** The photo viewer. Swiping moves the photos, so their size and position are watched. */
export const photos = one({ root: MEDIA, read: readPhoto, measure: true });

/** The signed-in handle. It comes from the whole document, including X's bootstrap script in `<head>`. */
export const handle = one({ root: "html", read: root => currentAccount(root.ownerDocument) });

// ---- Commands -------------------------------------------------------------------------------

/** A post command's arguments: the post, where X's list placed it, and the requested state. */
type PostArgs = { id?: unknown; at?: unknown } & Record<string, unknown>;

export const setLiked = (doc: Document, args: PostArgs | undefined) =>
  toggle(doc, args?.id, args?.at, args?.liked, { on: "like", off: "unlike" });

export const setBookmarked = (doc: Document, args: PostArgs | undefined) =>
  toggle(doc, args?.id, args?.at, args?.bookmarked, { on: "bookmark", off: "removeBookmark" });

/** Repost and Undo repost: X's control opens a menu whose first item confirms. */
export const setReposted = (doc: Document, args: PostArgs | undefined) =>
  toggle(doc, args?.id, args?.at, args?.reposted, { on: "retweet", off: "unretweet", confirm: { on: "retweetConfirm", off: "unretweetConfirm" } });

/**
 * Quote: X's repost menu has a Quote link, which opens X's composer holding the post. The
 * composer's route shows the applet's composer over it, which reads the quote from X's.
 */
export function quote(doc: Document, args: PostArgs | undefined): CommandResult {
  const { article, steps, wait } = reachPost(doc, args?.id, args?.at);
  const control = article ? owned(article, '[data-testid="retweet"], [data-testid="unretweet"]')[0] : null;
  if (article && !control) throw new Error("X shows no control for this here");
  const testId = control?.getAttribute("data-testid");
  const press = testId ? `[data-testid="${testId}"]` : ':is([data-testid="retweet"], [data-testid="unretweet"])';
  return {
    steps: [
      ...steps,
      { op: "click", target: { css: `${postSelector(args!.id as string)} ${press}` }, ...(wait ? { timeoutMs: wait } : {}) },
      { op: "click", target: { css: '[role="menu"] a[role="menuitem"][href="/compose/post"]' }, timeoutMs: MENU_MS },
    ],
    until: now => now.location.pathname === "/compose/post",
  };
}

/** The key of the last item in the main column. */
const lastKey = (doc: Document) => {
  const items = doc.querySelectorAll(`${MAIN} :is(${ITEMS})`);
  if (items.length) return itemKey(items[items.length - 1]);
  const links = doc.querySelectorAll(`${MAIN} ${TILE_LINK}`);
  const tile = links.length ? links[links.length - 1].closest(TILE) : null;
  return tile ? tileKey(tile) : null;
};

/**
 * Scrolls X's page to the end, which makes X load the next rows. A new last row is the evidence;
 * a page whose last row stays put has nothing more to load right now.
 */
export function loadMore(doc: Document): CommandResult {
  const before = lastKey(doc);
  return { steps: [{ op: "scroll", to: "end" }], until: now => lastKey(now) !== before, deadlineMs: 10_000 };
}
