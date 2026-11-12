import { definePageModule, value } from "@genesis/sdk/page";
import { ORIGIN } from "./model.ts";
import { accountProfile, signOut } from "./adapter/account.ts";
import { feedComments, loadMore, more, stories } from "./adapter/feed.ts";
import { infoAccount, infoReady, sections } from "./adapter/info.ts";
import { head, itemComments, rest, showCommentForm, showRest } from "./adapter/item.ts";
import { hnPage, setVoted } from "./adapter/read.ts";
import { results, searchMore, searchReady, total } from "./adapter/search.ts";
import { form, setField, submit, submitAccount, submitReady } from "./adapter/submit.ts";
import { profile } from "./adapter/user.ts";

/**
 * What the page shows about the account: the name while signed in, `false` while signed out and
 * `null` on a page that says nothing, such as the search site or a page still loading.
 */
export function accountEvidence(doc: Document): string | false | null {
  const href = doc.location?.href ?? "";
  let url: URL;
  try { url = new URL(href); } catch { return null; }
  if (url.origin !== ORIGIN || doc.readyState === "loading") return null;
  if (url.pathname === "/submit" || url.pathname === "/r") return submitAccount(doc);
  return infoAccount(doc);
}

/**
 * The page module: readers the screens watch and commands they invoke. Every reader reads only
 * the page it runs in; HN's own links and forms carry the account's tokens, which never leave it.
 */
export default definePageModule({
  readers: {
    "ready.hn": value(hnPage),
    "ready.info": value(infoReady),
    "ready.submit": value(submitReady),
    "ready.search": value(searchReady),
    account: value(accountEvidence),
    signedOut: value(doc => accountEvidence(doc) === false),
    stories,
    "feed.comments": feedComments,
    more,
    story: head,
    "item.comments": itemComments,
    rest,
    profile,
    sections,
    form,
    results,
    total,
    "search.more": searchMore,
    "account.profile": accountProfile,
  },
  commands: {
    setVoted: ({ document }, args) => setVoted(document, args),
    loadMore: () => loadMore(),
    showRest: ({ document }) => showRest(document),
    showCommentForm: ({ document }) => showCommentForm(document),
    setField: ({ document }, args) => setField(document, args),
    submit: ({ document }) => submit(document),
    signOut: ({ document }) => signOut(document),
  },
});
