import { definePageModule, value } from "@genesis/sdk/page";
import {
  accountEvidence, accountReady, empty, exploreReady, handle, header, loadMore, mediaReady, people, photos, postReady,
  posts, profileReady, results, setBookmarked, setLiked, thread, timelineReady, trends,
} from "./adapter/pages.ts";
import { composerReady, composerState, holdsMedia, holdsText } from "./adapter/compose.ts";

/**
 * The page module: readers the screens watch and commands they invoke. Every reader reads only
 * the page it runs in. X's own controls carry the account's session, which never leaves the page.
 */
export default definePageModule({
  readers: {
    "ready.timeline": value(timelineReady),
    "ready.post": value(postReady),
    "ready.profile": value(profileReady),
    "ready.explore": value(exploreReady),
    "ready.media": value(mediaReady),
    "ready.account": value(accountReady),
    "ready.compose": value(composerReady),
    "composer.text": value(holdsText),
    "composer.media": value(holdsMedia),
    composer: value(composerState),
    account: value(accountEvidence),
    timeline: posts,
    thread,
    header,
    posts,
    trends,
    people,
    results,
    empty,
    photos,
    handle,
  },
  commands: {
    setLiked: ({ document }, args) => setLiked(document, args),
    setBookmarked: ({ document }, args) => setBookmarked(document, args),
    loadMore: ({ document }) => loadMore(document),
  },
});
