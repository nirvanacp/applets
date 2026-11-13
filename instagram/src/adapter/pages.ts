import { list, one, value, type CommandSteps } from "@genesis/sdk/page";
import { ORIGIN, postRef, validCode, validUser } from "../model.ts";
import {
  accountOf, activityKey, buttonLabel, activityRow, AVATAR, clean, commentKey, commentRow, failureText, GRID, gridKey, MESSAGE, messageKey, navOf,
  ownProfile, permalinkOf, personKey, personRow, postKey, readActivity, readComment, readGridItem, readMessage, readPerson, readPost, readProfile,
  readStory, readTag, readThread, readThreadHeader, storyKey, THREAD, threadKey,
} from "./read.ts";

/**
 * instagram.com's pages. Instagram is a single-page app: right after a navigation the page can still
 * show the previous page, so pages whose URL names their subject (a post, a profile) wait for that
 * subject. Instagram's own failure text becomes the route's error.
 */

export type CommandResult = CommandSteps | { satisfied: true };

function check(doc: Document) {
  if (doc.readyState === "loading") return false;
  const failure = failureText(doc);
  if (failure) throw new Error(failure);
  return true;
}

const path = (doc: Document) => doc.location.pathname;

// ---- Ready readers ----------------------------------------------------------------------------

/** Home: once the feed shows a post, or a Following or Favorites feed shows its empty-state heading. */
export const feedReady = (doc: Document) => check(doc) && (doc.querySelector("main article") !== null
  || (new URLSearchParams(doc.location.search).has("variant") && doc.querySelector("main h3") !== null));

/** A post, once the page shows the post its URL names. */
export function postReady(doc: Document) {
  if (!check(doc)) return false;
  const code = postRef(path(doc))?.code;
  return [...doc.querySelectorAll("article")].some(article => permalinkOf(article)?.code === code)
    || (doc.querySelector("main article") !== null && doc.querySelectorAll("main article").length === 1 && doc.querySelector(`main a[href*="/${code}/"]`) !== null);
}

/** Comments, once the page shows the comment box or a comment. */
export const commentsReady = (doc: Document) =>
  check(doc) && (doc.querySelector("main time") !== null || doc.querySelector('textarea[aria-label^="Add a comment"]') !== null);

/** A profile, once the header names the profile in the URL. */
export function profileReady(doc: Document) {
  if (!check(doc)) return false;
  const user = path(doc).split("/")[1]?.toLowerCase();
  const name = clean(doc.querySelector("main header h2")?.textContent ?? doc.querySelector("main header h1")?.textContent, 40).toLowerCase();
  return (name !== "" && name === user) || (user !== undefined && ownProfile(doc.querySelector("main"), user) !== null);
}

/** Followers and following, once a row or the empty text shows. */
export const followsReady = (doc: Document) =>
  check(doc) && (doc.querySelector(`main ${AVATAR}`) !== null || /No (followers|users)|isn't following anyone/i.test(doc.querySelector("main")?.textContent ?? ""));

/** Explore, once the grid shows. */
export const exploreReady = (doc: Document) => check(doc) && doc.querySelector(`main :is(${GRID})`) !== null;

/** Search, once the search box shows. */
export const searchReady = (doc: Document) => check(doc) && doc.querySelector('input[placeholder="Search"]') !== null;

/** Keyword and hashtag results, once the grid or the "No results" text shows. */
export const keywordReady = (doc: Document) =>
  check(doc) && (doc.querySelector(`main :is(${GRID})`) !== null || /No results|No posts/i.test(doc.querySelector("main")?.textContent ?? ""));

/** Notifications, once a row or the empty text shows. */
export const activityReady = (doc: Document) =>
  check(doc) && (doc.querySelector("abbr[aria-label]") !== null || /Activity on your posts|No notifications/i.test(doc.body?.textContent ?? "")
    || doc.querySelector("h4") !== null);

/** The inbox, once it shows a chat or Instagram's empty text. */
export const inboxReady = (doc: Document) =>
  check(doc) && (doc.querySelector(THREAD) !== null || /Chats will appear here|No messages/i.test(doc.body?.textContent ?? ""));

/** A chat, once its message box shows. */
export const threadReady = (doc: Document) => check(doc) && doc.querySelector(BOX) !== null && doc.querySelector("h2") !== null;

/** The account evidence, as the router wants it: the username, `false` signed out, `null` unknown. */
export function accountEvidence(doc: Document): string | false | null {
  const found = accountOf(doc);
  return found === null ? null : found === false ? false : found.user;
}

// ---- Data readers -----------------------------------------------------------------------------

/** Posts of the feed. Instagram removes posts far from the screen, so the list keeps them. */
export const feed = list({ root: "main", items: "article", key: postKey, read: readPost, virtualized: true });

/** The post of a post page. */
export const post = one({ root: "main", read: main => {
  const code = postRef(main.ownerDocument.location.pathname)?.code;
  const articles = [...main.querySelectorAll("article")];
  const article = articles.find(element => permalinkOf(element)?.code === code) ?? articles[0];
  return article ? readPost(article) : null;
} });

export const stories = list({ root: "main", items: 'div[role="button"][aria-label^="Story by "]', key: storyKey, read: readStory });

export const comments = list({ root: "main", items: "time", key: commentKey, read: readComment, extent: time => [commentRow(time)] });

/** A profile's header. One's own profile can have none on Instagram's mobile website; see `ownProfile`. */
export const profile = one({ root: "main", read: main => {
  const header = main.querySelector("header");
  return header ? readProfile(header) : ownProfile(main, path(main.ownerDocument).split("/")[1] ?? "");
} });

/** A profile's grid, Explore and keyword results. Grids load more as the page scrolls. */
export const grid = list({ root: "main", items: GRID, key: gridKey, read: readGridItem, virtualized: true });

/** Rows of people: followers, following and search results. */
export const people = list({ root: "main", items: AVATAR, key: personKey, read: readPerson, extent: avatar => [personRow(avatar)] });

/** Search results: account rows under the search box. Instagram lists them inside a `nav`, so only the tab bar is left out. */
export const results = list({ root: "body", items: `a[href] > img${AVATAR.slice(3)}, a[href] ${AVATAR}`, key: personKey, read: (avatar: Element) => {
  if (navOf(avatar.ownerDocument)?.contains(avatar)) return null;
  return readPerson(avatar);
}, extent: avatar => [personRow(avatar)] });

/** Hashtag results under the search box. */
export const tags = list({ root: "body", items: 'a[href^="/explore/tags/"]', key: link => link.getAttribute("href") ?? "", read: readTag });

export const activity = list({ root: "body", items: "abbr[aria-label]", key: activityKey, read: readActivity, extent: time => [activityRow(time)] });

/** The page title (`h1`), such as a hashtag on a keyword page. */
export const title = value(doc => clean(doc.querySelector("main h1")?.textContent, 80) || null, { root: "main" });

/** The search box's text, so the screen can show what the website searched for. */
export const query = one({ root: "body", fields: true, read: body => {
  const input = body.querySelector<HTMLInputElement>('input[placeholder="Search"]');
  return input ? input.value : null;
} });

export const threads = list({ root: "body", items: THREAD, key: threadKey, read: readThread });

/** A chat's messages. Whose message it is comes from its place on the screen, so size changes read again. */
export const messages = list({ root: "body", items: MESSAGE, key: messageKey, read: readMessage, measure: true });

export const thread = value(readThreadHeader, { root: "body" });

export const me = value(doc => accountOf(doc) || null, { root: "body" });

// ---- Commands ---------------------------------------------------------------------------------

/** The innermost button around an icon with this label. */
const buttonOf = (scope: string, label: string) =>
  `${scope} [role=button]:has(svg[aria-label="${label}"]):not(:has([role=button] svg[aria-label="${label}"]))`;

const articleOf = (code: string) => `article:has(a[href*="/${code}/"] time)`;

const findArticle = (doc: Document, code: string) => [...doc.querySelectorAll("article")].find(article => permalinkOf(article)?.code === code);

/**
 * A desired-state toggle of a post's like or save. Nothing happens when the post already shows the
 * state; otherwise the website's own button is clicked until its icon changes.
 */
function togglePost(doc: Document, args: Record<string, unknown> | undefined, field: string, labels: { on: string; off: string }): CommandResult {
  const code = args?.code;
  const want = args?.[field];
  if (!validCode(code)) throw new Error("Not a post");
  if (typeof want !== "boolean") throw new Error("Needs a boolean");
  const article = findArticle(doc, code);
  if (!article) throw new Error("This post isn't on the page");
  // The post's action bar is its first section, as `readPost` reads it; comments have like buttons too.
  const shows = (element: Element) => element.querySelector("section")?.querySelector(`svg[aria-label="${labels.off}"]`) != null;
  if (shows(article) === want) return { satisfied: true };
  return {
    steps: [{ op: "click", target: { css: buttonOf(`${articleOf(code)} section`, want ? labels.on : labels.off) } }],
    until: now => {
      const found = findArticle(now, code);
      return found !== undefined && shows(found) === want;
    },
  };
}

export const setLiked = (doc: Document, args?: Record<string, unknown>) => togglePost(doc, args, "liked", { on: "Like", off: "Unlike" });
export const setSaved = (doc: Document, args?: Record<string, unknown>) => togglePost(doc, args, "saved", { on: "Save", off: "Remove" });

/** The key of the last item a list shows. */
const lastOf = (doc: Document, selector: string) => {
  const items = doc.querySelectorAll(selector);
  const last = items[items.length - 1];
  return last ? `${items.length}:${last.getAttribute("href") ?? postKey(last)}` : null;
};

/**
 * Scrolls the page to its end, which makes Instagram load the next posts. A new last item is the
 * evidence; a page whose last item stays put has nothing more right now.
 */
export function loadMore(doc: Document, args?: Record<string, unknown>): CommandResult {
  const selector = args?.grid ? `main :is(${GRID})` : "main article";
  const before = lastOf(doc, selector);
  return { steps: [{ op: "scroll", to: "end" }], until: now => lastOf(now, selector) !== before, deadlineMs: 10_000 };
}

/** Opens a story from the tray; the story viewer is the website's (decision-0006). */
export function openStory(doc: Document, args?: Record<string, unknown>): CommandResult {
  const user = args?.user;
  if (!validUser(user)) throw new Error("Not an account");
  const ring = `div[role="button"][aria-label^="Story by ${user},"]`;
  if (!doc.querySelector(ring)) throw new Error("This story isn't on the page");
  return { steps: [{ op: "click", target: { css: ring } }], navigates: true };
}

/** Posts a comment through the website's comment box. The box empties once Instagram took it. */
export function addComment(doc: Document, args?: Record<string, unknown>): CommandResult {
  const text = typeof args?.text === "string" ? args.text.trim() : "";
  if (!text || text.length > 2200) throw new Error("A comment needs 1 to 2200 characters");
  const box = 'textarea[aria-label^="Add a comment"]';
  if (!doc.querySelector(box)) throw new Error("This page has no comment box");
  return {
    steps: [
      { op: "fill", target: { css: box }, value: text },
      { op: "click", target: { css: "form [role=button]", text: "Post", exact: true }, timeoutMs: 3000 },
    ],
    until: now => {
      const area = now.querySelector<HTMLTextAreaElement>(box);
      return area !== null && area.value === "";
    },
    deadlineMs: 15_000,
  };
}

const FOLLOW = /^(Follow|Follow Back)$/;
const BUTTONS = "button, [role=button]";
/** The confirm button of Instagram's unfollow menu. */
const UNFOLLOW = { css: BUTTONS, text: "Unfollow", exact: true };

/** A locator for one button of the page: its place among the page's buttons with the same text. */
function buttonTarget(doc: Document, button: Element) {
  const label = clean(button.textContent, 30);
  const same = [...doc.querySelectorAll(BUTTONS)].filter(element => clean(element.textContent, 30) === label);
  return { css: BUTTONS, text: label, exact: true, nth: same.indexOf(button) };
}
const FOLLOWING = /^(Following|Requested)$/;

/** The follow button of the profile header. */
function headerFollow(doc: Document): Element | null {
  return [...doc.querySelectorAll("main header :is(button, [role=button])")]
    .find(button => FOLLOW.test(buttonLabel(button)) || FOLLOWING.test(buttonLabel(button))) ?? null;
}

/** Follows or unfollows the profile shown. Unfollowing confirms in Instagram's menu. */
export function setFollowing(doc: Document, args?: Record<string, unknown>): CommandResult {
  const want = args?.following;
  if (typeof want !== "boolean") throw new Error("Needs a boolean");
  const button = headerFollow(doc);
  if (!button) throw new Error("This profile shows no follow button");
  const following = (now: Document) => FOLLOWING.test(buttonLabel(headerFollow(now)));
  if (following(doc) === want) return { satisfied: true };
  const target = buttonTarget(doc, button);
  return {
    steps: want
      ? [{ op: "click", target }]
      : [{ op: "click", target }, { op: "click", target: UNFOLLOW, timeoutMs: 8000 }],
    until: now => following(now) === want,
    deadlineMs: 15_000,
  };
}

/** The follow button of a person row, found by the row's profile picture. */
function rowButton(doc: Document, user: string): Element | null {
  const avatar = doc.querySelector(`img[alt="${user}'s profile picture"]`);
  if (!avatar) return null;
  const row = personRow(avatar).closest("[data-pressable-container]") ?? personRow(avatar);
  return [...row.querySelectorAll("button, [role=button]")].find(button => /^(Follow|Follow Back|Following|Requested)$/.test(buttonLabel(button))) ?? null;
}

/** Follows or unfollows a person from a row: followers, search results and notifications. */
export function followPerson(doc: Document, args?: Record<string, unknown>): CommandResult {
  const user = args?.user;
  const want = args?.following;
  if (!validUser(user)) throw new Error("Not an account");
  if (typeof want !== "boolean") throw new Error("Needs a boolean");
  const state = (now: Document) => {
    const text = buttonLabel(rowButton(now, user));
    return text ? FOLLOWING.test(text) : null;
  };
  const current = state(doc);
  if (current === null) throw new Error("This row shows no follow button");
  if (current === want) return { satisfied: true };
  const target = buttonTarget(doc, rowButton(doc, user)!);
  return {
    steps: want ? [{ op: "click", target }] : [{ op: "click", target }, { op: "click", target: UNFOLLOW, timeoutMs: 8000 }],
    until: now => state(now) === want,
    deadlineMs: 15_000,
  };
}

/** Opens the chat with the profile shown, through the header's Message button. */
export function message(doc: Document): CommandResult {
  const button = [...doc.querySelectorAll("main header [role=button], main header button")].find(element => clean(element.textContent, 20) === "Message");
  if (!button) throw new Error("This profile shows no Message button");
  return { steps: [{ op: "click", target: { css: "main header :is([role=button], button)", text: "Message", exact: true } }], navigates: true };
}

const CREATE = 'a[href="#"]:has(svg)';
const CREATE_MENU = '[role="dialog"]:has(svg[aria-label="Post"])';

/**
 * Opens the Post and Story menu of the "+" in Home's top bar. Instagram links it to `#` and labels
 * its icon "Home", so the locator is the one `#` link with an icon.
 */
export function openCreate(doc: Document): CommandResult {
  if (doc.querySelector(CREATE_MENU)) return { satisfied: true };
  if (!doc.querySelector(CREATE)) throw new Error("This page has no create button");
  return { steps: [{ op: "click", target: { css: CREATE } }], until: now => now.querySelector(CREATE_MENU) !== null, deadlineMs: 5000 };
}

/** Types a search into the website's search box; the results follow the box. */
export function search(doc: Document, args?: Record<string, unknown>): CommandResult {
  const text = typeof args?.q === "string" ? args.q.slice(0, 100) : "";
  const box = 'input[placeholder="Search"]';
  if (!doc.querySelector(box)) throw new Error("This page has no search box");
  return { steps: [{ op: "fill", target: { css: box }, value: text }], until: now => now.querySelector<HTMLInputElement>(box)?.value === text };
}

const BOX = 'div[role="textbox"][contenteditable="true"]';

/** Opens a chat from the inbox by its row key (`threadKey`). */
export function openThread(doc: Document, args?: Record<string, unknown>): CommandResult {
  const key = typeof args?.key === "string" ? args.key : "";
  const rows = [...doc.querySelectorAll(THREAD)];
  const index = rows.findIndex(row => threadKey(row) === key);
  if (!key || index < 0) throw new Error("This chat isn't in the inbox");
  return { steps: [{ op: "click", target: { css: THREAD, nth: index } }], navigates: true };
}

/** Sends a message through the chat's own message box: types it and presses Enter. The box empties once sent. */
export function sendMessage(doc: Document, args?: Record<string, unknown>): CommandResult {
  const text = typeof args?.text === "string" ? args.text.trim() : "";
  if (!text || text.length > 1000) throw new Error("A message needs 1 to 1000 characters");
  if (!doc.querySelector(BOX)) throw new Error("This page has no message box");
  const count = doc.querySelectorAll(MESSAGE).length;
  return {
    steps: [
      { op: "click", target: { css: BOX } },
      { op: "type", target: { css: BOX }, text },
      { op: "press", target: { css: BOX }, key: "Enter" },
    ],
    until: now => clean(now.querySelector(BOX)?.textContent) === "" && now.querySelectorAll(MESSAGE).length > count,
    deadlineMs: 15_000,
  };
}
