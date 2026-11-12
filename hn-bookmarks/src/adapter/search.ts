import { collection, single, type Page } from "@genesis/sdk/legacy/adapter";
import { itemIdOf, searchOf, searchUrl, type MoreLink, type SearchHit } from "../model.ts";
import { clean, hrefOf, richText } from "./read.ts";

/**
 * HN's search site (hn.algolia.com). It is a script-drawn page: each result is an
 * `article.Story` in `.SearchResults`, and `.NoResults` says a search found nothing. Story
 * results have a `.Story_title`; comment results have a `.Story_comment` and an "on:" link to
 * their story. Highlighting is `<em>`, which comment text keeps as emphasis.
 */

/** The item id of the first link in `scope` that points at an HN item, or null. */
function linkedItem(scope: Element | null | undefined) {
  const link = scope?.querySelector("a[href*='item?id=']");
  const url = link ? hrefOf(link) : null;
  const id = url ? itemIdOf(url) : null;
  return id && url ? { id, url } : null;
}

/** A meta link's text by its pattern, such as "123 points". The site writes "1 points"; HN writes "1 point". */
const metaText = (meta: Element | null, pattern: RegExp) =>
  [...(meta?.querySelectorAll("a") ?? [])].map(a => clean(a.textContent, 40)).find(text => pattern.test(text))
    ?.replace(/^1 (point|comment)s$/, "1 $1") ?? null;

export function hit(article: Element): SearchHit | null {
  const meta = article.querySelector(".Story_meta");
  const author = clean(meta?.querySelector("a[href*='user?id=']")?.textContent, 64) || null;
  const age = metaText(meta, /\bago$/);
  const title = article.querySelector(".Story_title");
  if (title) {
    const item = linkedItem(title);
    const name = clean(title.querySelector("a")?.textContent, 400);
    if (!item || !name) return null;
    const link = title.querySelector("a.Story_link");
    const articleUrl = link ? hrefOf(link) : null;
    let domain: string | null = null;
    try { domain = articleUrl ? new URL(articleUrl).hostname.replace(/^www\./, "") : null; } catch { /* no domain */ }
    return {
      kind: "story",
      story: {
        id: item.id, title: name, articleUrl, domain, submitter: author,
        score: metaText(meta, /points?$/), age, comments: metaText(meta, /comments?$/),
        rank: null, canVote: false, voted: false,
      },
    };
  }
  const own = linkedItem(meta?.querySelector("a[href*='item?id=']")?.parentElement);
  const body = article.querySelector(".Story_comment");
  const parts = richText(body, 8_000);
  if (!own || !parts.length) return null;
  const links = [...(meta?.querySelectorAll(".Story_link") ?? [])];
  const parent = links.find(span => !span.textContent?.trim().startsWith("on:"));
  const on = links.find(span => span.textContent?.trim().startsWith("on:"));
  const story = linkedItem(on);
  const parentItem = linkedItem(parent);
  return {
    kind: "comment",
    comment: {
      id: own.id, author, age, depth: 0, parent: parentItem?.id ?? null, parts,
      onStory: story ? { id: story.id, title: clean(on?.querySelector("a")?.textContent, 400) } : null,
      links: parentItem ? [{ label: "parent", url: parentItem.url }] : [],
      canReply: false, canVote: false, voted: false,
    },
  };
}

/** The next result page, when the site offers one. Paging is the `page` key of the URL. */
function nextPage(pagination: Element): MoreLink | null {
  if (!pagination.querySelector(".Pagination_next")) return null;
  const current = searchOf(pagination.ownerDocument?.location?.href);
  return current ? { url: searchUrl({ ...current, page: current.page + 1 }) } : null;
}

export const search: Page = {
  // Results arrive after the script runs; the page is ready once it shows results or says there are none.
  ready: doc => doc.querySelector(".SearchResults article.Story, .SearchResults .NoResults") !== null,
  // The search site shows no HN account, so it is no evidence about signing in or out.
  account: () => undefined,
  regions: {
    results: collection({
      root: ".SearchResults",
      items: "article.Story",
      // A result without an item link reads as null; its text keeps its key unique and non-empty.
      key: article => {
        const found = hit(article);
        return found ? (found.kind === "story" ? found.story.id : found.comment.id) : `unread:${clean(article.textContent, 120)}`;
      },
      entityType: "result",
      read: hit,
      more: ".Pagination_next",
    }),
    total: single({ root: ".SearchFilters_meta", read: meta => clean(meta.querySelector("p")?.textContent, 60).replace(/\s*\(.*$/, "") || null }),
    more: single({ root: ".Pagination", read: nextPage }),
  },
};
