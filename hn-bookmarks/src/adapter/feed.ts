import { list, one } from "@genesis/sdk/page";
import { comment, moreLink, story, type CommandResult } from "./read.ts";

/**
 * List pages. Story lists (`/`, `/newest`, `/ask`, ...) put each story in two table rows:
 * `tr.athing.submission` holds the rank and title, the next row holds the subtext with score,
 * author, age and the vote state. Comment lists (`/newcomments`, `/threads`) put one comment in
 * each `tr.athing` row, so a page fills one list or the other.
 */
export const stories = list({
  root: "#hnmain",
  items: "tr.athing.submission",
  key: row => row.id,
  read: story,
  extent: row => [row.nextElementSibling],
  more: "a.morelink",
});

export const feedComments = list({
  root: "#hnmain",
  items: "tr.athing:not(.submission)",
  key: row => row.id,
  read: row => comment(row),
  more: "a.morelink",
});

/** HN's "More" link, on list pages and long threads. */
export const more = one({ root: "a.morelink", read: moreLink });

/** Follows HN's "More" link to the next page of the list. */
export const loadMore = (): CommandResult => ({ steps: [{ op: "click", target: { css: "a.morelink" } }], navigates: true });
