import { list, one } from "@genesis/sdk/page";
import type { ItemHead, RestOfThread } from "../model.ts";
import { comment, richText, story, type CommandResult } from "./read.ts";

/** The item at the top of `/item?id=`: a story with its text, or a comment on its own page. */
function itemHead(table: Element): ItemHead {
  const row = table.querySelector("tr.athing");
  const head = row?.matches(".submission") ? story(row) : null;
  return {
    story: head,
    comment: row && !head ? comment(row, { links: true }) : null,
    text: richText(table.querySelector(".toptext")),
    canComment: commentForm(table)?.querySelector("textarea") != null,
  };
}

/**
 * Comments read into the applet. HN puts a whole thread on one page, and a busy thread's text
 * passes the platform's page limit, so the comments after these stay on HN's page (`rest`).
 */
export const SHOWN_COMMENTS = 200;
const COMMENT_ROWS = "tr.athing.comtr";

/** The first comment row the applet leaves out, or null when the thread fits. */
const firstLeftOut = (tree: Element) => tree.querySelectorAll(COMMENT_ROWS)[SHOWN_COMMENTS] ?? null;

function restOf(tree: Element): RestOfThread | null {
  const first = firstLeftOut(tree);
  return first ? { count: tree.querySelectorAll(COMMENT_ROWS).length - SHOWN_COMMENTS } : null;
}

/** Scrolls HN's page to an element, before the website shows it. */
function scrollTo(target: Element | null | undefined): CommandResult {
  const view = target?.ownerDocument?.defaultView;
  if (!target || !view) return { satisfied: true };
  const to = Math.max(0, Math.round(target.getBoundingClientRect().top + view.scrollY));
  return { steps: [{ op: "scroll", to: { y: to } }], until: doc => Math.abs((doc.defaultView?.scrollY ?? 0) - to) < 80, deadlineMs: 3_000 };
}

/** HN's comment box on an item page. HN's `/reply` page only answers comments, not stories. */
const commentForm = (table: Element | null) => table?.querySelector("form[action='comment']");

/**
 * An item page. HN renders the thread flat: each comment row carries its depth in
 * `td.ind[indent]`, and its parent through the "parent" link, so the foreground rebuilds the tree.
 */
export const head = one({ root: "table.fatitem", read: itemHead });

export const itemComments = list({
  root: "table.comment-tree",
  items: `${COMMENT_ROWS}:nth-child(-n+${SHOWN_COMMENTS})`,
  key: row => row.id,
  read: row => comment(row),
  more: "a.morelink",
});

export const rest = one({ root: "table.comment-tree", read: restOf });

/** Scrolls HN's page to its comment box. */
export const showCommentForm = (doc: Document) => scrollTo(commentForm(doc.querySelector("table.fatitem")));

/** Scrolls HN's page to the first comment the applet leaves out. */
export const showRest = (doc: Document) => {
  const tree = doc.querySelector("table.comment-tree");
  return scrollTo(tree && firstLeftOut(tree));
};
