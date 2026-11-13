import { definePageModule, value } from "@genesis/sdk/page";
import {
  accountEvidence, activity, activityReady, addComment, comments, commentsReady, exploreReady, feed, feedReady, followPerson, followsReady,
  grid, inboxReady, keywordReady, loadMore, me, message, messages, openCreate, openStory, openThread, people, post, postReady, profile,
  profileReady, query, results, search, tags, searchReady, sendMessage, setFollowing, setLiked, setSaved, stories, thread, threadReady,
  threads, title,
} from "./adapter/pages.ts";

/**
 * The page module: readers the screens watch and commands they invoke. Every reader reads only the
 * page it runs in, and every command clicks or types into instagram.com's own controls, which
 * carry the account's session; the session never leaves the page.
 */
export default definePageModule({
  readers: {
    "ready.feed": value(feedReady),
    "ready.post": value(postReady),
    "ready.comments": value(commentsReady),
    "ready.profile": value(profileReady),
    "ready.follows": value(followsReady),
    "ready.explore": value(exploreReady),
    "ready.search": value(searchReady),
    "ready.keyword": value(keywordReady),
    "ready.activity": value(activityReady),
    "ready.inbox": value(inboxReady),
    "ready.thread": value(threadReady),
    account: value(accountEvidence),
    me,
    feed,
    stories,
    post,
    comments,
    profile,
    grid,
    people,
    results,
    tags,
    query,
    title,
    activity,
    threads,
    messages,
    thread,
  },
  commands: {
    setLiked: ({ document }, args) => setLiked(document, args),
    setSaved: ({ document }, args) => setSaved(document, args),
    loadMore: ({ document }, args) => loadMore(document, args),
    openStory: ({ document }, args) => openStory(document, args),
    addComment: ({ document }, args) => addComment(document, args),
    openCreate: ({ document }) => openCreate(document),
    setFollowing: ({ document }, args) => setFollowing(document, args),
    followPerson: ({ document }, args) => followPerson(document, args),
    message: ({ document }) => message(document),
    search: ({ document }, args) => search(document, args),
    openThread: ({ document }, args) => openThread(document, args),
    sendMessage: ({ document }, args) => sendMessage(document, args),
  },
});
