import {
  imageUrl, ORIGIN, postRef, safeLink, userOf, validUser,
  type ActivityRow, type CommentView, type GridItem, type MessageView, type PersonRow, type PostView, type TagRow, type ProfileHeader, type StoryRing, type TextPart, type ThreadHeader, type ThreadRow,
} from "../model.ts";

/**
 * Reading instagram.com's rendered pages. Instagram's class names change with every build, so the
 * readers use roles, `aria-label`s, `time`, `abbr` and link shapes instead. Each function reads only
 * the element it is given, its descendants and the row around it.
 */

/** Collapses whitespace and bounds the length of website text. */
export function clean(value: string | null | undefined, limit = 300): string {
  return [...(value ?? "").replace(/\s+/g, " ").trim()].slice(0, limit).join("");
}

/** A button's visible text, without the titles of its icons ("Following" rather than "FollowingDown chevron icon"). */
export function buttonLabel(button: Element | null | undefined, limit = 30): string {
  if (!button) return "";
  let text = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue ?? "";
    else if (node instanceof Element && node.localName !== "svg") node.childNodes.forEach(walk);
  };
  walk(button);
  return clean(text, limit);
}

/** A short stable key for website text. */
export function hash(text: string): string {
  let value = 5381;
  for (const char of text) value = (value * 33 + char.charCodeAt(0)) >>> 0;
  return value.toString(36);
}

const PROFILE_PICTURE = /'s profile picture$/;
export const AVATAR = 'img[alt$="profile picture"]';

/** True when `a` comes before `b` in the document. */
const before = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

/** The ancestor of `element` that is the largest one still holding a single match of `marker`. */
export function rowOf(element: Element, marker: string, stop?: Element | null): Element {
  let row = element;
  while (row.parentElement && row.parentElement !== stop && row.parentElement.querySelectorAll(marker).length <= 1) {
    row = row.parentElement;
  }
  return row;
}

/** Text as runs; emoji images become their alt text and links keep their resolved target. */
export function textParts(node: Element | null, limit = 4000, skip = "button, svg, time, [role=button]"): TextPart[] {
  const parts: TextPart[] = [];
  let length = 0;
  const push = (text: string, href?: string) => {
    if (length >= limit || !text) return;
    const slice = [...text].slice(0, limit - length).join("");
    length += [...slice].length;
    const last = parts[parts.length - 1];
    if (last && last.href === href) last.text += slice;
    else parts.push(href ? { text: slice, href } : { text: slice });
  };
  const walk = (current: Node, href?: string) => {
    if (current.nodeType === Node.TEXT_NODE) return push(current.textContent ?? "", href);
    if (!(current instanceof Element)) return;
    if (current.tagName === "IMG") return push(current.getAttribute("alt") ?? "", href);
    if (current.tagName === "BR") return push("\n", href);
    if (current.matches("script, style") || (current.matches(skip) && !current.matches("div[role=button][aria-disabled]"))) return;
    const link = current.tagName === "A" ? safeLink(current.getAttribute("href")) ?? undefined : href;
    for (const child of current.childNodes) walk(child, link);
  };
  if (node) walk(node);
  const first = parts[0];
  if (first) first.text = first.text.replace(/^\s+/, "");
  const last = parts[parts.length - 1];
  // A shortened text ends in the website's "... more" control; keep only the ellipsis.
  if (last) last.text = last.text.replace(/\s+$/, "").replace(/\s*(?:\.\.\.|…)\s*more$/, "…");
  return parts.filter(part => part.text.length > 0);
}

/** The text of the `span[role=button]` count next to an action icon, such as the like count. */
function countAfter(icon: Element | null): string | null {
  let element: Element | null = icon?.closest("[role=button]") ?? null;
  for (let depth = 0; element && depth < 4; depth += 1) {
    const next = element.nextElementSibling;
    if (next?.matches("span[role=button]")) return clean(next.textContent, 20) || null;
    element = element.parentElement;
  }
  return null;
}

/** The time of a row: `time[datetime]` with its shown text. */
function timeOf(root: Element): { time: string | null; dateTime: string | null } {
  const time = root.querySelector("time");
  return { time: clean(time?.textContent, 40) || null, dateTime: time?.getAttribute("datetime") ?? null };
}

const avatarOf = (root: Element) => imageUrl(root.querySelector(AVATAR)?.getAttribute("src"));
const verifiedIn = (root: Element) => root.querySelector('svg[aria-label="Verified"]') !== null;

// ---- Feed and post ----------------------------------------------------------------------------

/** The link that holds a post's time: its permalink. */
export function permalinkOf(article: Element) {
  for (const link of article.querySelectorAll("a[href]")) {
    if (!link.querySelector("time")) continue;
    const ref = postRef(link.getAttribute("href"));
    if (ref) return ref;
  }
  return null;
}

/** A post's key: its shortcode. */
export function postKey(article: Element): string {
  return permalinkOf(article)?.code ?? `x${hash(clean(article.textContent, 400))}`;
}

/** The caption: the first top-level text after the action bar that is not the author, a link or the time. */
function captionOf(article: Element, section: Element | null): Element | null {
  for (const span of article.querySelectorAll("span[dir=auto]")) {
    if (section && !before(section, span)) continue;
    if (span.closest("a") || span.querySelector("time")) continue;
    const outer = span.parentElement?.closest("span[dir=auto]");
    if (outer && article.contains(outer) && (!section || before(section, outer))) continue;
    const text = clean(span.textContent, 80);
    if (!text || /^(View all|Liked by|View replies|Add a comment)/i.test(text)) continue;
    return span;
  }
  return null;
}

export function readPost(article: Element): PostView | null {
  const permalink = permalinkOf(article);
  if (!permalink) return null;
  const section = article.querySelector("section");
  const author = [...article.querySelectorAll("a[href]")].map(link => userOf(link.getAttribute("href"))).find(Boolean) ?? null;
  const user = permalink.user ?? author ?? "";
  const media = [...article.querySelectorAll("img")].filter(img =>
    !PROFILE_PICTURE.test(img.getAttribute("alt") ?? "") && (!section || before(img, section)) && !img.closest("a[href] > span, header a"));
  const images = media.map(img => ({ src: imageUrl(img.getAttribute("src")), alt: clean(img.getAttribute("alt"), 300) }))
    .filter((image): image is { src: string; alt: string } => image.src !== null && !/^data:/.test(image.src));
  const unique = images.filter((image, index) => images.findIndex(other => other.src === image.src) === index);
  const video = article.querySelector("video") !== null;
  const dots = article.querySelectorAll('button[aria-label^="Go to slide"]').length;
  const subtitleLink = article.querySelector('a[href^="/reels/audio/"], a[href^="/explore/locations/"]');
  const header = [...article.querySelectorAll("span")].find(span => clean(span.textContent, 40) === "Suggested for you");
  const caption = captionOf(article, section);
  const after = (element: Element) => !section || before(section, element);
  const more = [...article.querySelectorAll("[role=button]")].some(button => after(button) && /^(… ?)?more$/i.test(clean(button.textContent, 10)));
  const all = [...article.querySelectorAll('a[href$="/comments/"]')].find(after);
  const icon = (label: string) => section?.querySelector(`svg[aria-label="${label}"]`) ?? null;
  return {
    code: permalink.code,
    url: `${ORIGIN}/${permalink.kind === "reel" ? "reel" : "p"}/${permalink.code}/`,
    kind: permalink.kind,
    user,
    avatar: avatarOf(article),
    verified: (() => {
      const mark = article.querySelector('svg[aria-label="Verified"]');
      return mark !== null && (!section || before(mark, section));
    })(),
    subtitle: subtitleLink ? clean(subtitleLink.textContent, 80) || null : header ? "Suggested for you" : null,
    subtitleUrl: safeLink(subtitleLink?.getAttribute("href")),
    suggested: header !== undefined,
    images: video ? [] : unique.slice(0, 20),
    slides: Math.max(1, dots),
    video,
    poster: video ? unique[0]?.src ?? null : null,
    likes: countAfter(icon("Like") ?? icon("Unlike")),
    comments: countAfter(icon("Comment")),
    reposts: countAfter(icon("Repost")),
    shares: countAfter(icon("Share")),
    liked: icon("Unlike") !== null,
    saved: icon("Remove") !== null,
    caption: textParts(caption),
    excerpt: more,
    ...timeOf(article),
    allComments: all ? { text: clean(all.textContent, 60), url: safeLink(all.getAttribute("href")) ?? "" } : null,
  };
}

/** Story rings of the tray above the feed. */
export function readStory(ring: Element): StoryRing | null {
  const label = clean(ring.getAttribute("aria-label"), 120);
  const match = /^Story by ([A-Za-z0-9._]{1,30}), (not seen|seen)/.exec(label);
  if (!match) return null;
  return { user: match[1], avatar: imageUrl(ring.querySelector("img")?.getAttribute("src")), seen: match[2] === "seen", own: false, label };
}

export const storyKey = (ring: Element) => /^Story by ([A-Za-z0-9._]{1,30})/.exec(ring.getAttribute("aria-label") ?? "")?.[1]
  ?? `s${hash(ring.getAttribute("aria-label") ?? "")}`;

// ---- Comments ---------------------------------------------------------------------------------

/** A comment row: the largest element around its `time` that holds no other comment's time. */
export const commentRow = (time: Element) => rowOf(time, "time", time.closest("main"));

function commentId(row: Element): string | null {
  for (const link of row.querySelectorAll('a[href*="/c/"]')) {
    const id = /\/c\/(\d+)\//.exec(link.getAttribute("href") ?? "")?.[1];
    if (id) return id;
  }
  return null;
}

export function commentKey(time: Element): string {
  const row = commentRow(time);
  return commentId(row) ?? `c${hash(clean(row.textContent, 400))}`;
}

/** "View all 1 replies" as "1 reply", "View 12 replies" as "12 replies". */
function replyCount(text: string) {
  const count = /\d[\d,.KM]*/.exec(text)?.[0] ?? "";
  return count === "1" ? "1 reply" : `${count} replies`;
}

export function readComment(time: Element): CommentView | null {
  const row = commentRow(time);
  const userLink = [...row.querySelectorAll("a[href]")].find(link => userOf(link.getAttribute("href")) && link.textContent?.trim());
  const user = userOf(userLink?.getAttribute("href"));
  if (!user) return null;
  // The text is the `span[dir=auto]` after the username that is not a link, the time or a count.
  const text = [...row.querySelectorAll("span[dir=auto]")].find(span =>
    userLink && before(userLink, span) && !span.closest("a") && !span.querySelector("time") && !span.closest("time")
    && clean(span.textContent, 5) !== "" && !span.parentElement?.closest("span[dir=auto]:not(:has(a))"));
  const likes = [...row.querySelectorAll('a[href$="/liked_by/"]')].map(link => clean(link.textContent, 30)).find(Boolean) ?? null;
  const replies = [...row.querySelectorAll("[role=button], span")].map(element => clean(element.textContent, 40))
    .find(value => /^View (all )?\d[\d,.KM]* repl/i.test(value)) ?? null;
  return {
    id: commentId(row) ?? `c${hash(clean(row.textContent, 400))}`,
    user,
    avatar: avatarOf(row),
    verified: verifiedIn(row),
    parts: textParts(text ?? null, 2200),
    ...timeOf(row),
    likes,
    liked: row.querySelector('svg[aria-label="Unlike"]') !== null,
    replies: replies ? replyCount(replies) : null,
  };
}

// ---- Profiles -------------------------------------------------------------------------------

/** The count in a header stat such as "1,407 posts"; the exact number in `title` when shown. */
function stat(root: Element, selector: string, word: RegExp): string | null {
  const element = selector ? root.querySelector(selector) : [...root.querySelectorAll("span[dir=auto]")].find(span => word.test(clean(span.textContent, 40)));
  if (!element) return null;
  const text = clean(element.textContent, 40);
  return /^([\d.,]+[KMB]?)/i.exec(text)?.[1] ?? null;
}

export function readProfile(header: Element): ProfileHeader | null {
  const doc = header.ownerDocument;
  const user = clean(header.querySelector("h2")?.textContent ?? header.querySelector("h1")?.textContent, 40);
  if (!user) return null;
  const sections = [...header.querySelectorAll(":scope > div > section, :scope > section")];
  const about = sections.find(section => section.querySelector("span[dir=auto]") && !section.querySelector("h2") && !section.querySelector("button"))
    ?? sections[2] ?? null;
  const name = about ? clean([...about.querySelectorAll("span[dir=auto]")].find(span => !span.closest("a, [role=button]"))?.textContent, 80) || null : null;
  const bioRoot = about?.querySelector("[role=button][aria-disabled] span[dir=auto], [role=button] > span[dir=auto]") ?? null;
  const links = [...header.querySelectorAll('a[target="_blank"][href]')].map(link => ({
    text: clean(link.textContent, 80), url: safeLink(link.getAttribute("href")) ?? "",
  })).filter(link => link.url && link.text);
  const followed = about?.querySelector('a[href$="/followers/mutualOnly"]');
  const buttons = [...header.querySelectorAll("button, [role=button]")].map(button => buttonLabel(button));
  const follow = buttons.find(text => /^(Follow|Following|Follow Back|Requested)$/.test(text)) ?? null;
  const own = buttons.some(text => /^Edit profile$/i.test(text));
  const main = header.closest("main") ?? doc.body;
  return {
    user,
    avatar: avatarOf(header) ?? imageUrl(header.querySelector("img")?.getAttribute("src")),
    verified: verifiedIn(header),
    name,
    bio: textParts(bioRoot, 1000),
    links,
    posts: stat(header, "", /posts?$/i),
    followers: stat(header, 'a[href$="/followers/"]', /followers/) ?? stat(header, "", /followers$/i),
    following: stat(header, 'a[href$="/following/"]', /following/) ?? stat(header, "", /following$/i),
    followedBy: followed ? clean(followed.textContent, 160) || null : null,
    follow: own ? null : follow,
    canMessage: buttons.includes("Message"),
    own,
    private: /This account is private/i.test(main.textContent ?? ""),
  };
}

/**
 * One's own profile when Instagram's mobile website shows it without a header: the page then has
 * the own section links (`/<user>/saved/`) and the account's picture, but no counts, name or bio.
 */
export function ownProfile(main: Element | null, user: string): ProfileHeader | null {
  if (!main || !validUser(user) || main.querySelector("header")) return null;
  const own = [...main.querySelectorAll("a[href]")].some(link => link.getAttribute("href")?.toLowerCase() === `/${user.toLowerCase()}/saved/`);
  if (!own) return null;
  const picture = [...main.ownerDocument.querySelectorAll("img[alt]")].find(img => img.getAttribute("alt") === `${user}'s profile picture`);
  return {
    user, avatar: imageUrl(picture?.getAttribute("src")), verified: false, name: null, bio: [], links: [],
    posts: null, followers: null, following: null, followedBy: null, follow: null, canMessage: false, own: true, private: false,
  };
}

/** The keys of grid links: the shortcode, with a suffix for a repeated post. */
export function gridKey(link: Element): string {
  const ref = postRef(link.getAttribute("href"));
  if (!ref) return `g${hash(link.getAttribute("href") ?? "")}`;
  const root = link.closest("main") ?? link.ownerDocument.body;
  const same = [...root.querySelectorAll("a[href]")].filter(other => postRef(other.getAttribute("href"))?.code === ref.code);
  const index = same.indexOf(link);
  return index > 0 ? `${ref.code}~${index}` : ref.code;
}

export function readGridItem(link: Element): GridItem | null {
  const ref = postRef(link.getAttribute("href"));
  if (!ref) return null;
  const img = link.querySelector("img");
  const label = (name: string) => link.querySelector(`svg[aria-label="${name}"]`) !== null;
  const video = ref.kind === "reel" || label("Clip") || label("Reel") || label("Video");
  const views = [...link.querySelectorAll("span")].map(span => clean(span.textContent, 20)).find(text => /^[\d.,]+[KMB]?$/i.test(text)) ?? null;
  return {
    code: ref.code,
    url: `${ORIGIN}/${ref.kind === "reel" ? "reel" : "p"}/${ref.code}/`,
    kind: ref.kind,
    src: imageUrl(img?.getAttribute("src")),
    alt: clean(img?.getAttribute("alt"), 200),
    carousel: label("Carousel"),
    video,
    views,
  };
}

/** Grid links of posts and reels. */
export const GRID = 'a[href*="/p/"], a[href*="/reel/"]';

// ---- People ---------------------------------------------------------------------------------

/** A person row (followers, following, search results): the row around one profile picture. */
export const personRow = (avatar: Element) => rowOf(avatar, AVATAR, avatar.closest("main"));

export function personKey(avatar: Element): string {
  const match = /^(.+)'s profile picture$/.exec(avatar.getAttribute("alt") ?? "");
  return match?.[1] ?? `u${hash(clean(personRow(avatar).textContent, 200))}`;
}

export function readPerson(avatar: Element): PersonRow | null {
  const row = personRow(avatar);
  const user = /^([A-Za-z0-9._]{1,30})'s profile picture$/.exec(avatar.getAttribute("alt") ?? "")?.[1]
    ?? [...row.querySelectorAll("a[href]")].map(link => userOf(link.getAttribute("href"))).find(Boolean);
  if (!user) return null;
  const texts = [...row.querySelectorAll("span[dir=auto]")].filter(span => !span.querySelector("span[dir=auto]"))
    .map(span => clean(span.textContent, 120)).filter(text => text && text !== user);
  const button = [...row.querySelectorAll("button, [role=button]")].map(element => clean(element.textContent, 30))
    .find(text => /^(Follow|Following|Follow Back|Requested|Remove|Message)$/.test(text)) ?? null;
  return {
    user,
    url: `${ORIGIN}/${user}/`,
    avatar: imageUrl(avatar.getAttribute("src")),
    verified: verifiedIn(row),
    name: texts[0] ?? null,
    button,
  };
}

// ---- Activity -------------------------------------------------------------------------------

const PERIODS = /^(New|Today|Yesterday|This week|This month|Last 7 days|Last 30 days|Earlier|Older)$/;

/** An activity row: the pressable container around its time. */
export const activityRow = (time: Element) => time.closest("[data-pressable-container]") ?? rowOf(time, "abbr", null);

export function activityKey(time: Element): string {
  const row = activityRow(time);
  return `a${hash(clean(row.textContent?.replace(/\d+[smhdw]\b/g, ""), 400) + (row.querySelector("img")?.getAttribute("alt") ?? ""))}`;
}

export function readActivity(time: Element): ActivityRow | null {
  const row = activityRow(time);
  const doc = row.ownerDocument;
  // The heading the row is under: the last period heading before it.
  let period: string | null = null;
  for (const heading of doc.querySelectorAll("span[dir=auto], h2, h3, h4")) {
    if (!before(heading, row)) break;
    const text = clean(heading.textContent, 30);
    if (PERIODS.test(text) && !row.contains(heading)) period = text;
  }
  const textRoot = time.closest("span[dir=auto]");
  const parts = textParts(textRoot, 600, "abbr, button, svg, [role=button]");
  const profile = [...row.querySelectorAll("a[href]")].map(link => userOf(link.getAttribute("href"))).find(Boolean) ?? null;
  const target = [...row.querySelectorAll("a[href]")].map(link => postRef(link.getAttribute("href"))).find(Boolean);
  const images = [...row.querySelectorAll("img")];
  const thumb = images.find(img => !PROFILE_PICTURE.test(img.getAttribute("alt") ?? "") && img !== images[0]);
  return {
    id: activityKey(time),
    period,
    parts,
    user: profile,
    avatar: imageUrl(images[0]?.getAttribute("src")),
    thumb: imageUrl(thumb?.getAttribute("src")),
    url: target ? `${ORIGIN}/${target.kind === "reel" ? "reel" : "p"}/${target.code}/` : profile ? `${ORIGIN}/${profile}/` : null,
    time: clean(time.textContent, 20) || null,
    button: [...row.querySelectorAll("button, [role=button]")].map(element => clean(element.textContent, 30))
      .find(text => /^(Follow|Following|Follow Back|Requested|Message)$/.test(text)) ?? null,
  };
}

// ---- Messages -------------------------------------------------------------------------------

/** An inbox row: a button holding the chat's title (`span[title]`) and its last activity (`abbr`). */
export const THREAD = 'div[role="button"]:has(span[title]):has(abbr)';

export const threadKey = (row: Element) => clean(row.querySelector("span[title]")?.getAttribute("title"), 120) || hash(clean(row.textContent));

export function readThread(row: Element): ThreadRow | null {
  const title = clean(row.querySelector("span[title]")?.getAttribute("title"), 120);
  if (!title) return null;
  const preview = [...row.querySelectorAll("span[dir=auto]")].map(span => clean(span.textContent, 200))
    .find(text => text && text !== title && !row.querySelector("abbr")?.textContent?.includes(text)) ?? null;
  return {
    title,
    avatar: imageUrl(row.querySelector("img")?.getAttribute("src")),
    verified: row.querySelector('svg[aria-label="Verified"]') !== null,
    preview,
    time: clean(row.querySelector("abbr")?.textContent, 20) || null,
  };
}

export const MESSAGE = 'div[role="article"][aria-roledescription="message"]';

export const messageKey = (message: Element) =>
  message.querySelector('[id^="double_tappable_id"]')?.id.replace("double_tappable_id.", "") || hash(clean(message.textContent));

/** A message. Instagram marks no sender on one's own messages, only their place on the right. */
export function readMessage(message: Element): MessageView | null {
  const bubble = message.querySelector('[id^="double_tappable_id"]') ?? message;
  const text = [...bubble.querySelectorAll("div[dir=auto]")].map(div => clean(div.textContent, 2000)).find(Boolean) ?? null;
  const image = imageUrl([...bubble.querySelectorAll("img")].find(img => !PROFILE_PICTURE.test(img.getAttribute("alt") ?? ""))?.getAttribute("src"));
  if (!text && !image) return null;
  const rect = bubble.getBoundingClientRect();
  const width = message.ownerDocument.documentElement.clientWidth;
  return { id: messageKey(message), mine: rect.width > 0 && rect.left + rect.width / 2 > width / 2, text, image };
}

/** The chat's header: the `h2` title and, for a one-to-one chat, the profile link next to it. */
export function readThreadHeader(doc: Document): ThreadHeader | null {
  // The inbox stays in the page, hidden, as a navigation region with the account's own name in an h2.
  const outside = (element: Element) => !element.closest('[role="navigation"], nav');
  const title = clean([...doc.querySelectorAll("h2")].find(outside)?.textContent, 120);
  if (!title) return null;
  const link = [...doc.querySelectorAll("a[href]")].find(a => outside(a) && userOf(a.getAttribute("href")) !== null);
  return {
    title,
    user: link ? userOf(link.getAttribute("href")) : null,
    avatar: imageUrl(link?.querySelector("img")?.getAttribute("src")),
  };
}

// ---- Account --------------------------------------------------------------------------------

/** The bottom navigation: the smallest element holding the Explore and Reels links. */
export function navOf(doc: Document): Element | null {
  const explore = doc.querySelector('a[href="/explore/"]');
  const reels = doc.querySelector('a[href="/reels/"]');
  if (!explore || !reels) return null;
  let nav: Element | null = explore;
  while (nav && !nav.contains(reels)) nav = nav.parentElement;
  return nav;
}

/**
 * The signed-in username: the profile link of the navigation bar, whose picture is the account's.
 * `false` when the page shows Instagram's sign-in form, `null` when it shows neither.
 */
export function accountOf(doc: Document): { user: string; avatar: string | null } | false | null {
  const nav = navOf(doc);
  if (nav) {
    for (const link of nav.querySelectorAll("a[href]")) {
      const user = userOf(link.getAttribute("href"));
      const img = link.querySelector(AVATAR);
      if (user && img && img.getAttribute("alt") === `${user}'s profile picture`) {
        return { user, avatar: imageUrl(img.getAttribute("src")) };
      }
    }
  }
  const signIn = doc.querySelector('input[name="username"], input[name="email"]') && doc.querySelector('input[type="password"]');
  if (signIn || (!nav && doc.querySelector('a[href^="/accounts/login"]') && !doc.querySelector('a[href="/direct/new/"]'))) return false;
  return null;
}

/** Instagram's own failure text, such as "Sorry, this page isn't available." */
export function failureText(doc: Document): string | null {
  const main = doc.querySelector("main") ?? doc.body;
  if (!main) return null;
  for (const element of main.querySelectorAll("h1, h2, span")) {
    const text = clean(element.textContent, 120);
    if (/^Sorry, this page isn't available\.?$/i.test(text) || /^Something went wrong/i.test(text) || /^Page not found/i.test(text)) return text;
  }
  return null;
}

/** A hashtag row of search: a link to the tag's page with the tag and its post count. */
export function readTag(link: Element): TagRow | null {
  const match = /^\/explore\/tags\/([^/]+)\/?$/.exec(link.getAttribute("href") ?? "");
  if (!match) return null;
  let tag: string;
  try { tag = decodeURIComponent(match[1]); } catch { return null; }
  const texts = [...link.querySelectorAll("span")].filter(span => span.childElementCount === 0).map(span => clean(span.textContent, 80)).filter(Boolean);
  return { tag: clean(tag, 100), posts: texts.find(text => /\bposts?$/i.test(text)) ?? null };
}
