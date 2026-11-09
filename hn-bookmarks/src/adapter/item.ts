import { collection, single, type ActionSpec, type Page } from "@genesis/sdk/adapter";
import { validItemId, type ItemHead, type RestOfThread } from "../model.ts";
import { comment, hnPage, moreLink, richText, setVoted, story } from "./read.ts";

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
 * The id of the item at the top of the page, which `setVoted` on the head acts on. A head without
 * an item row falls back to the `id` in the page's URL, so the record always has a key.
 */
function headId(table: Element): string {
  const row = table.querySelector("tr.athing")?.id;
  if (row) return row;
  const routed = new URLSearchParams(table.ownerDocument?.location?.search ?? "").get("id");
  return validItemId(routed) ? routed : "item";
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
function scrollTo(target: Element | null | undefined): ActionSpec {
  const view = target?.ownerDocument?.defaultView;
  if (!target || !view) return { satisfied: true };
  const to = Math.max(0, Math.round(target.getBoundingClientRect().top + view.scrollY));
  return { steps: [{ scroll: { target: "window", to } }], until: doc => Math.abs((doc.defaultView?.scrollY ?? 0) - to) < 80, deadlineMs: 3_000 };
}

/** HN's comment box on an item page. HN's `/reply` page only answers comments, not stories. */
const commentForm = (table: Element | null) => table?.querySelector("form[action='comment']");

/**
 * An item page. HN renders the thread flat: each comment row carries its depth in
 * `td.ind[indent]`, and its parent through the "parent" link, so the foreground rebuilds the tree.
 */
export const item: Page = {
  ready: hnPage,
  regions: {
    story: single({
      root: "table.fatitem",
      key: headId,
      entityType: "story",
      read: itemHead,
      actions: {
        setVoted: (table, args) => setVoted(table!.ownerDocument, headId(table!), args),
        showCommentForm: table => scrollTo(commentForm(table)),
      },
    }),
    comments: collection({
      root: "table.comment-tree",
      items: `${COMMENT_ROWS}:nth-child(-n+${SHOWN_COMMENTS})`,
      key: row => row.id,
      entityType: "comment",
      read: row => comment(row),
      more: "a.morelink",
      actions: {
        setVoted: (row, args) => setVoted(row!.ownerDocument, row!.id, args),
      },
    }),
    more: single({ root: "a.morelink", read: moreLink }),
    rest: single({ root: "table.comment-tree", read: restOf, actions: { showRest: tree => scrollTo(tree && firstLeftOut(tree)) } }),
  },
};
