# Current Hacker News specification

## Identity

- Name Hacker News, applet id `hn-bookmarks`, origins `https://news.ycombinator.com` and HN's search site `https://hn.algolia.com`.
- Three contexts, each with its own website session history: `primary` (Home, start URL `/`), `post` (`/submit`) and `me` (`/news?account=1`). The page module is [src/page.ts](../src/page.ts) (decision-0009): named readers and commands over the read functions in [src/adapter](../src/adapter). The UI runs on the open SDK's router with the route table in [src/routes.ts](../src/routes.ts).
- Launcher: `shell.icon` [assets/icon.png](../assets/icon.png) on the accent `#ff6600`, and an app drawer entry in the Genesis APK (decision-0010). Each opening runs in the applet's own window with its own Recents card.
- Screens: route screens `feed`, `results`, `item`, `user`, `info`, `post` and `me`; overlay screens `search`, `saved`, `categories` and `save`. Service: `bookmarks`, used by Saved, Categories and Save; it runs on the phone as the `hn-bookmarks` servelet ([service.json](../service.json)).
- Manifest schema 6, `@nirvanacp/sdk` 0.1.0-alpha.1, `genesis-applet` tools 0.1.0-alpha.1, protocol 2, adapter API 1. A bundle built before protocol 2 shows "Needs update" until it is rebuilt. Kit version: not exported for this in-repository applet. The [manifest](../applet.json) is the authority for origins and contexts; [src/routes.ts](../src/routes.ts) is the authority for routes. The manifest's `build` section names the UI entry ([src/main.tsx](../src/main.tsx)) and the page module ([src/page.ts](../src/page.ts)); the bundled manifest leaves it out.
- Published release: version 0.0.4, build and release record in `published/` (built with Genesis `f3f32cce9f2f`), not tagged yet. Before a pull request that changes this applet, raise the version and run `genesis-applet publish` again.

## Product scope

One Hacker News app with five tabs: Home, Search, Post, Saved and Me. Preserve the feeds, discussions with collapsible comment branches, profiles, HN's information pages, search of stories and comments, upvoting, posting through HN's submit form, and the Saved library with categories.

Data authority: HN owns accounts, stories, comments, votes and submissions. The `bookmarks` service owns saved stories and categories; it is the local `hn-bookmarks` servelet, whose SQLite database lives in Genesis's private storage on the phone and is deleted with the applet or Clear data (decision-0015). Website cookies never authenticate the service.

Open work: none recorded. Search reads HN's search site (decision-0007).

## Defaults and overrides

| Rule id | Current choice | Origin and reason | Decision |
| --- | --- | --- | --- |
| default-platform-menu | Shell menu button, accent `#ff6600`, original icon (decision-0010); every screen header pads its right side by `--menu-corner` (60px) so the button's corner stays clear | Factory default; layout by the agent | decision-0003, decision-0012 |
| default-primary-navigation | One bottom tab bar, shown on tab roots only (Home's feeds, Search and its results, Post, Saved, Me); pushed screens have no tab bar and no Back arrow, Android Back returns; reselecting the active tab returns it to its start or scrolls to the top | Factory default and design guide | decision-0001, decision-0012 |
| default-pending-skeletons | Neutral, content-shaped skeletons, one per destination, that fade in after 120 ms and shimmer (still under reduced motion) | Factory default; kit motion by the agent | decision-0011 |
| default-compact-website-cue | External-link icon on every control that opens the website: article links (after the domain), reply, Add a comment, Read N more comments, Sign in to comment, View website | Factory default | decision-0013 |
| default-theme-and-layout | Warm paper and HN orange, Verdana, light and dark, 48px controls, compact 15px story titles | Inherited user design direction | decision-0002 |
| Saved editor | A `save` screen in the stack instead of a sheet, so Android Back closes it; Remove is immediate with Undo | Agent choice for SDK 0.0; removal by the agent | decision-0004, decision-0014 |

## Routes

Routes match in the order of [src/routes.ts](../src/routes.ts); the first match wins. The page column names the old adapter page whose readers the route uses; each route's `ready` reader is `ready.hn`, `ready.info`, `ready.submit` or `ready.search`.

| Route id | Example URL | Page and screen | Loading, empty, sign-in and error | Back | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| search | `https://hn.algolia.com/?query=rust&type=story&sort=byPopularity&page=0` | `search`, `results` (context `primary`) | Results skeleton; "No results" with Search comments once the results reader has read a settled page; load error; stale copy with inline error | Context history; filters replace, Next page pushes | implemented | device |
| account | `/news?account=1` | `account`, `me` (context `me`) | Skeleton; HN's login page when signed out (the page requires an account); error | Context history | implemented | device (2026-11-12), adapter tests |
| home, news | `/`, `/news?p=2` | `feed` | Skeleton; empty notice; load error with website button; stale copy with inline error | Context history | implemented | device, adapter tests |
| newest, front, newcomments, ask, show, shownew, asknew, jobs, best, active, from | `/newest`, `/newcomments`, `/from?site=example.com` | `feed` (stories, or comments on `/newcomments`) | As Home | Context history | implemented | device (chips), adapter tests |
| submitted, threads, favorites | `/submitted?id=pg` | `feed` | As Home | Context history | implemented | static |
| hidden, upvoted | `/upvoted?id=<own name>` | `private-feed`, `feed` | As Home; HN's login page when signed out, including the bare login page HN serves once the session has ended (the `account` reader answers signed out there) | Context history | implemented | device (Upvoted) |
| item | `/item?id=1` | `item` | Discussion skeleton; error; "Sign in to comment" when signed out; "No comments yet" only once the comments reader has read the page; the first 200 comments, then "Read N more comments on Hacker News" (decision-0008) | Context history | implemented | device (1,105-comment thread), adapter tests |
| user | `/user?id=pg` | `user` | Skeleton; "No such user" once the profile watch has read the page; error | Context history | implemented | device, adapter tests |
| formatdoc, faq, guidelines, lists, leaders | `/newsguidelines.html`, `/newsfaq.html`, `/lists` | `info` | Skeleton; error | Context history | implemented | device (Guidelines), adapter tests |
| submit | `/submit` | `submit`, `post` (context `post`) | Skeleton; HN's login page when signed out; "didn't show its submit form" once the form watch has read the page | Context history; leave guard while a draft exists | implemented | device (form, guard), adapter tests |
| submit-result | `/r` | `submit`, `post` (requires an account) | HN's message above the form after a rejection | Context history | implemented, not exercised | adapter tests |
| Other HN URLs | `/login`, `/reply?id=1` | Website, same context | HN's page | Context history | platform behavior | |
| Other origins | article links | Website, same context (external) | | Context history | platform behavior | |

## Interactions

| Screen and control | Result | Action, route or website | Pending and failure | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Home, Post, Me tabs | Select the context; reselecting returns it to its start page | `select(context)` | | implemented | device |
| Search, Saved tabs | Open the screen as the overlay root | `navigate({ screen, mode: "root" })` | | implemented | device |
| Search field (Search tab or results) | Show results in Home's context | `navigate({ url, context: "primary" })` from the tab; `mode: "replace"` from results | Skeleton while searching | implemented | device |
| Results: Stories, Comments, Popular, Newest chips | Replace the search | `navigate({ url, mode: "replace" })` | | implemented | device |
| Results: Next page | The next page of results | `navigate({ url })` | Disabled while pending | implemented | device |
| Results: story or comment links | Open the discussion, article, profile or parent | `navigate({ url })` | | implemented | device (discussion, Back keeps scroll) |
| Feed chips (Top, New, Past, Comments, Ask, Show, Jobs) | Replace the Home page with that list | `navigate({ url, mode: "replace" })` | | implemented | device |
| Story title, comments, user | Open article, discussion or profile | `navigate({ url })` | | implemented | device |
| Save (bookmark on a story row) | Open the Save editor with a snapshot of the story | `navigate({ screen: "save" })` | | implemented | device (running service) |
| Upvote and unvote (stories and comments, signed in only) | Vote on HN | `setVoted` command with `{ id, voted }`; clicks HN's own `#up_<id>` or `#un_<id>`, or answers at once when HN already shows the wanted state | Shown voted while pending, the arrow pops; a toast on `failed` and on `unknown` (decision-0013) | implemented | device before the open SDK (vote and unvote, checked in HN's page); not repeated after it; toasts not checked on a device |
| More (feed) | Next page | `loadMore` command (click `a.morelink`), expecting a feed URL; falls back to `navigate({ url })` on failure | Spinner and "Loading more" for at least 800 ms; disabled while pending | implemented | device (2026-11-12, page 2), adapter tests |
| More comments | Next page of the thread | `navigate({ url })` | | implemented | static |
| Read N more comments on Hacker News | HN's page scrolled to the first comment the applet leaves out | `showRest` command, then `viewWebsite()` | Spinner and "Opening…"; a toast on `failed` (the website is not shown then) | implemented | device before the open SDK |
| Comment `[–]` and `[+n]` toggle | Collapse a branch | Local state | | implemented | static |
| Same-page comment link | Reveal target and ancestors, then scroll | Local state | | implemented | static |
| Reply, Sign in to comment | HN's reply or login page in the same context | `navigate({ url })` | | implemented | static |
| Add a comment (signed in, when HN offers a comment box) | HN's item page scrolled to its comment box | `showCommentForm` command, then `viewWebsite()`; HN's `/reply` page answers comments only | Spinner and "Opening…"; a toast on `failed` (the website is not shown then) | implemented | device (box shown; no comment submitted) |
| Profile Submissions, Comments, Favorites | The routed lists | `navigate({ url })` | | implemented | static |
| Post | Fill HN's fields, then submit HN's form | `setField` command per field, then `submit` (expects an item or feed URL, not the post URL) | Spinner and "Posting…" for at least 800 ms; HN's message on `REJECTED`; "Check Hacker News" on `unknown` | implemented | device before the open SDK (one post, then the New list); form shown 2026-11-12, nothing posted; adapter tests |
| Me: Profile, lists, Guidelines, FAQ | The routed pages | `navigate({ url })` | | implemented | device (Upvoted, Guidelines) |
| Me: Sign out | Confirm, then follow HN's logout link | `signOut` command, expecting the `signedOut` reader; signed out when observed, on `CONTEXT_REPLACED`, or on an unknown outcome once the Me tab's page shows no account (up to 5 seconds) | Spinner and "Signing out…"; a "Signed out of Hacker News" toast; inline error otherwise | implemented | device before the open SDK (the Me tab returns to its login page); not repeated after it; adapter tests |
| Saved: filter chips, title filter, the filled bookmark (Edit) | Filter the library; open the Save editor | Local state; `navigate({ screen: "saved", mode: "replace" })` keeps the filter in the screen | Error notice with Try again when the service is unreachable; "Show all" when a filter matches nothing | implemented | device (running and unreachable service) |
| Saved: Manage categories (folder button in the header) | Open the Categories screen | `navigate({ screen: "categories" })` | Toasts for create, rename and delete; delete keeps its confirm step; inline error and reread after a failure | implemented | device before the revamp (rename, delete); toasts not checked on a device |
| Refresh button and pull to refresh (every routed screen; Saved and Categories reread the service) | Reload the page or the library | `reload()`; `library.retry()` | The icon turns and the progress bar shows after 250 ms; content stays; "Couldn't refresh" inline on failure. No pull on Post, Categories and Save, which hold drafts | implemented | static |
| Save editor: Save, Save changes, Remove from Saved | Write the bookmark, then Back | `bookmarkRepository.save` or `remove`, then `back()` | Spinner and "Saving…" or "Removing…"; toasts "Saved", "Changes saved", or "Removed from Saved" with Undo; conflict and uncertain outcomes reread and stay | implemented | static |

## Native feel

Checked against the factory's native-feel guidance on 2026-11-15 (revamp, decisions 0011 to 0014). On a phone: the Home feed with header chips, the discussion skeleton then comments, Back, Saved's error with Try again while the bookmarks service was off, and Me. The other items are checked statically only; dark theme, reduced motion and the Undo flows are not checked on a device.

| Item | Status | Evidence |
| --- | --- | --- |
| Theme tokens for light, dark and `data-theme` overrides; HN look kept (decision-0002) | implemented | [theme](../src/theme.css) `:root`, `prefers-color-scheme` and `[data-theme]` blocks |
| Screen motion: push, pop and tab fades through the kit Stage | implemented | [app](../src/app.tsx) `Stage`, `usePlaceMotion`; [motion](../src/ui/motion.tsx) |
| Tab bar on tab roots only; no Back arrow; reselect returns to start or scrolls to top | implemented | [app](../src/app.tsx) `isTabRoot`, `choose` |
| Menu corner clear on every screen | implemented | `.screen-head` right padding `--menu-corner` in [theme](../src/theme.css); [frame](../src/ui/frame.tsx) `ScreenHead` |
| One skeleton per destination, delayed fade and shimmer | implemented; discussion seen on a phone | [skeletons](../src/ui/skeletons.tsx): story list, comment list, discussion, profile, info, results, post form, account, Saved, categories, choices |
| Content wins over loading; a failed refresh keeps content with "Couldn't refresh" | implemented | [screen helpers](../src/screen.ts) `viewOf` over each watch's data state (`dataOf`, from `watchStatus`), `refreshing`; each routed screen |
| Stale first: kept data shows at once with the progress bar, never a skeleton; Home's feed is kept on the phone for the next start (decision-0017) | implemented | `persist` on the feed watches in [feed](../src/screens/feed.tsx) |
| Empty and "not found" states only after the screen's watches delivered on a settled page | implemented | `viewOf` with `delivered(...)` in feed, results, item comments, user, post |
| Errors with Try again and View website | implemented; Saved's error seen on a phone | [states](../src/ui/states.tsx) `LoadError`; Saved and Categories use `RetryButton` |
| Progress bar for work on shown content (after 250 ms) | implemented | [frame](../src/ui/frame.tsx) `PageScroller`; [feedback](../src/ui/feedback.tsx) `ProgressBar` |
| Pull to refresh and a labeled Refresh button | implemented | `PageScroller` with `usePullToRefresh`; `RefreshButton` in each header; no pull on Post, Categories and Save |
| Busy feedback of at least 800 ms and an outcome on every command | implemented | `useBusy` on More, Add a comment, Read N more, Post, Sign out, Save, Remove, category writes; toasts for votes, saves, removal, sign out and category writes |
| Removals offer Undo | implemented | [save](../src/screens/save.tsx) `undoRemove`; category delete keeps a confirm step (decision-0014) |
| Website cue on every control that shows the website | implemented | `WebsiteCue` in [story](../src/components/story.tsx) and [item](../src/screens/item.tsx) |
| Toast region raised above the tab bar | implemented | `.app.has-tabs .toast-region` in [theme](../src/theme.css) |
| Reduced motion covers `*`, `*::before` and `*::after` | implemented | the `prefers-reduced-motion` block in [theme](../src/theme.css) |
| Pressed states, 48px targets, no tap flash or text selection on controls | implemented | `.button`, `.icon-button`, `.vote`, `.chip`, `.list button`, `.tab` in [theme](../src/theme.css); the vote arrows keep their drawn size and reach 48×48 through a transparent `::after` |

## Data

| Collection or service path | Owner | Key | Shape version | Notes |
| --- | --- | --- | --- | --- |
| `bookmarks` service, collection `bookmarks` | Local servelet | `bookmarkKey(itemId)` | 1 | Story snapshot, category ids, `savedAtMs`, `orderKey` |
| `bookmarks` service, collection `bookmark-order` | Local servelet | `orderKey` (newest first) | 1 | Index pointing to the bookmark key |
| `bookmarks` service, collection `categories` | Local servelet | Category id | 1 | Name and normalized name; deletion is soft and keeps the stories |
| `bookmarks` service, collection `category-names` | Local servelet | Normalized name | 1 | Keeps names unique |
| `bookmarks` service, collection `category-meta` | Local servelet | `active` | 1 | Active category ids; its revision guards category writes |

Categories are read once when Saved opens and again on a category change or resume. Stories with no active category show as Uncategorized. Record shapes are unchanged from the first release. Data in the earlier Node backend is not copied to the phone (decision-0015).

## Current work and verification

Runtime speed upgrade, 2026-11-18 (decision-0017): implemented, not yet checked on a device. Rebuilt for Genesis's protocol 2, where Genesis keeps each watch's last value and shows it at once as stale. Screens pick skeleton, content, empty or error from each watch's data state; stale data keeps the content with the progress bar. Home's feed watches (`stories`, `feed.comments`, `more`) are kept on the phone for the next start. When HN shows no account and the applet last saw one, the applet forgets the kept pages. Saved draws a library of more than 50 stories as a virtual list. `typecheck`, `check`, `build` and the servelet `check` pass with no warnings. To check on a device: a cold start shows the last feed before HN loads; Back to a feed or thread shows it at once; signing out, then a restart, shows no earlier feed with vote state; Saved with more than 50 stories scrolls smoothly and keeps its place after the Save editor and Back.

Local servelet, 2026-11-16 (decision-0015): implemented. The `bookmarks` service is the `hn-bookmarks` servelet; the Node backend moved to `legacy/`. Verified 2026-11-16 with the Genesis debug build. On the emulator Genesis_Verify_API_37 (Android 17): save a story, create a category, move the story into it with Edit, rename it, create and delete a second category; all of it survived a force stop and a reinstall, with no Service connections setup and nothing listening on port 8787. The database is `files/servelets/hn-bookmarks/bookmarks/data.sqlite3`. Requests took 240 ms after a cold start (203 ms opening the module) and 4 to 25 ms warm. Clear data empties Saved, and Remove deletes the servelet directory. On the developer's phone (Samsung SM-M307F, Android 11) the same journey up to the force stop passed: 533 to 583 ms cold, 11 to 19 ms warm. Clear data and Remove were not run on the phone, and the test bookmark and the category Books remain there. The applet has no category reordering, so that step does not apply.

Native-feel revamp, 2026-11-15 (decisions 0011 to 0014): the UI kit (Stage motion, toasts, progress bar, pull to refresh, busy feedback), a header row per screen, one skeleton per destination, the tab bar on tab roots only, vote and write outcomes as toasts, Remove with Undo and the website cue after article domains. Fallback fixes: "No results" and "No comments yet" wait for their readers. Routes, readers, commands, storage and the service are unchanged. `typecheck`, `check` and `build` pass. Checked on a phone as the Native feel section says (Home, discussion, Back, Saved's error, Me); the rest is checked statically only. Review fixes: Saved shows its error with Try again instead of "No saved stories" when the read failed with nothing saved; vote, Add a comment, Read N more and Sign out report a rejected command; the vote arrows' hit area is 48×48. Not checked on a device.

UX polish, 2026-11-15, on the Samsung SM-M307F with the Genesis debug build of `fix/applet-ux-polish`: skeletons fade in and shimmer; Saved and Categories errors offer Try again; Search and Home after a search show their own screen at once (SDK router pending pushes). Verified on the device except a successful retry, because the bookmarks service was not running.

App icon and drawer entry (decision-0010), 2026-11-12, checked on 2026-11-13 on the Samsung SM-M307F (Android 11), signed in, with the Genesis debug build of the same branch. The app drawer shows a Hacker News entry with the ribbon on orange; it opens the applet in its own window with the feed. Its Recents card shows the icon and accent. The pinned shortcut from Genesis's "Add to home screen" opens the feed. The Genesis applet grid, Applet info and the splash show the icon on its orange accent, after a Genesis fix: the transparent icon had been drawn alone, white on white. Not checked: notifications, which this applet does not use. `check` passes with the icon.

Open SDK review fixes ([review](review-open-sdk-migration.md) findings 2 to 4), 2026-11-12. Implemented: "No such user", "didn't show its submit form" and a feed's "Nothing here yet" show only once the screen's own watch has read the current page, with the skeleton until then; Sign out counts `CONTEXT_REPLACED`, and an unknown outcome followed by a signed-out page, as done; the `account` reader answers signed out on HN's bare login page. `typecheck` for the applet, `check`, `build` and 13 tests pass. Not run on a device. Finding 1 (Back shows a skeleton) is being fixed in the SDK.

Open SDK migration (decision-0009), checked on 2026-11-12 on the Samsung SM-M307F (Android 11), signed in, with the Genesis debug build of the same branch. `typecheck`, `check`, `build` and `npm test` (13 tests over the page module's readers and commands and the route table) pass. On the phone: the Top feed with vote arrows and Save buttons, a thread with nested comments and Add a comment, Back to the feed, the Me tab with the account card and its lists, Guidelines, Search with story results, the Post form with Post disabled while empty, and More loading page 2. Saved showed "Couldn't load saved stories" because the bookmarks service was not running. Not repeated, because they write to HN: vote, post and sign out. Choosing Home from the Saved overlay first closes the overlay and needs a second tap; the router keeps the earlier SDK's `select` rule, so this predates the migration.

Browser capabilities, checked on 2026-11-10 on the Samsung SM-M307F (Android 11) with revision 13, signed in to the disposable test account. Evidence kind: device with the real website; the window, location prompt and PDF on the outside page were started by a script run through WebView DevTools, with a user gesture. No code change was needed. `check`, `typecheck` and `build` pass. Results of the plan below:

1. Sign-in: verified. No new sign-in was needed after the update. The session lasted after Genesis was force-stopped. Signing out from the Me tab showed HN's login page as the website; signing in returned to the Me tab. Not rechecked: Gmail Only's and X's sessions after that sign-out.
2. Links in: failed in Genesis. An item link shared from Chrome while Genesis is on Home, and the same link in Home's "Open a link", opens in Hacker News without a choice, but as HN's page under the website bar with the banner "Hacker News doesn't have a screen for this page"; Done then shows the item screen. An `hn.algolia.com/?query=rust` link behaves the same, and Done shows the results screen. A link shared while Hacker News is open loads in the context but the Me tab stays on screen. Back from a shared link goes to Genesis Home, and a second Back to Chrome. See the platform issues below; the Genesis update below resolves them.
3. Outside links: verified. A story link to another site opens in the same context under the website bar, and Done returns to the feed (or to Search results when opened from there). A window opened by that page shows under the website bar and Back closes it to the page. A location request shows Genesis's "wants to use your location" prompt; Don't allow gives the page a denial. A PDF link downloads with Android's "Download complete" notification and the file in Downloads.
4. Links out: verified. HN serves no email link in comments or profiles; an about text with an address shows it as plain text. The footer's Contact link (`mailto:`) on HN's revealed feed opens Gmail's compose with the address filled in; the draft was discarded.
5. Dark mode and font size: verified. In system dark mode the applet and HN's revealed item page with its comment box are dark. Not shown: HN's login page, because HN sends a signed-in user from `/login` to the feed. At the largest text size (font scale 1.35) the feed, a 900-comment thread, the Post form and the Me tab stay readable and tappable, with no clipped text.
6. Regression: verified. Home's Past chip, a profile then Back keeping the thread's scroll position exactly, Search with the Comments filter, Saved's "Couldn't load saved stories" with the service stopped, and the Post leave guard (a typed title, then a tab: "Discard this post?"; discarded).

Platform issues, reported to Genesis with these reproductions and not worked around:

- A shared or typed link shows the website even when the applet has a screen for it, and the banner says the applet has none. With Genesis on Home, open `https://news.ycombinator.com/item?id=<id>` through "Open a link": HN's page shows with "Hacker News doesn't have a screen for this page, so here's the website."; Done shows the applet's item screen for the same page. The host pins the website (`user.viewWebsite`) for every link it opens, and the banner wording comes from whether the person chose View website.
- A link shared while the applet is open loads in its context but the screen does not change (also seen in Gmail Only): with the Me tab showing, share an item link to Genesis; the context is at the item, the Me tab stays.
- Back from a shared link returns to Genesis Home before the sharing app; the plan expects one Back to leave to the sharing app.
- A screen's leave guard uses the WebView's default `confirm()` dialog, titled "The page at "https://appassets.androidplatform.net…" says", which shows Genesis's internal address. This predates the update.

Genesis update, checked on 2026-11-10 on the same phone with revision 15, no applet code changed:

- Links in: verified. "Open a link" with `https://news.ycombinator.com/item?id=1` asks where it opens, titled with the site, with "Open in Hacker News", "Create a new applet" and Cancel. Open in Hacker News shows the applet's item screen, with no website pin and no banner; Back goes to Genesis Home. With Hacker News already open, text shared from Chrome, "Look at this (https://news.ycombinator.com/item?id=1).", shows the same choice, the link loses its trailing punctuation, the item screen shows, and Back returns to Chrome. The first three platform issues above are resolved.
- Sign-in: applets share one website sign-in by default. The plan's wording, that each applet now has its own sign-in, was wrong. With the Applet info switch "Use a separate sign-in" on, Hacker News opened signed out, at HN's login page; turning it off asked "Sign Hacker News out of its separate sign-in?", and after Sign out the applet was signed in again with the shared session.
- Links that open a window on the revealed website, through test links added by WebView DevTools and tapped on the phone: a `target=_blank` link to HN loads in the same context; one to `x.com` opens X with its own screen; one to `example.com` opens as a sheet under the website bar, and Back closes it to HN's page.

2026-11-09, writes and Saved on a phone: `typecheck`, `check`, `build` and `npm test` passed (revision 9). On the Samsung SM-M307F, signed in: story and comment vote and unvote, checked in HN's own page; one post submitted, which opened the New list; sign-out, after which the Me tab shows its login page again (it showed a blank page before), and sign-in again. Add a comment opened a blank page because HN's `/reply` page does not answer stories; it now shows HN's item page at its comment box, and Done returns to the thread. No comment was submitted. With the service running: save with a new category, edit, rename and delete a category, and remove a story. Known limit: the applet has no edit or delete for the user's own posts, and HN refuses to delete a post that has replies.

2026-11-09, busy threads (decision-0008): `typecheck`, `check`, `build` and `npm test` passed. On the Samsung SM-M307F, signed in, a 1,105-comment thread showed as the item screen with 200 comments. "Read 912 more comments on Hacker News" opened HN's page at comment 201, and Done returned to the end of the thread. Hide and Show worked, and a profile then Back kept the scroll. Search now hides Next page when the results fit on one page. Remaining risk: 200 unusually long comments can still pass the page limit.

2026-11-09, search (decision-0007): `typecheck`, `check`, `build` and `npm test` passed. On a Samsung SM-M307F (Android 11), signed out: search from the tab, story and comment results with highlighting, both filters and sorts, Next page (page 2), opening a discussion and Back with the scroll kept, and the empty state. Not tested: a slow or offline search site.

2026-11-08, full migration (decision-0006):

- `check` (no warnings), `build`, `typecheck` and `npm test` (adapter read functions on hand-written HN-shaped pages, including the submit form, account and information pages) passed.
- Device (emulator, signed in to a test account): Home with chips, the Me tab, Upvoted, Guidelines, Search, the Post form and its leave guard, and Saved showing its error with the service stopped.
- Not exercised: posting (nothing may be posted), sign-out, Saved and the editors against a running service. Exercised on a phone on 2026-11-09, above.
- Known risk, superseded by decision-0008: a thread whose page exceeds the platform page limit showed a load error with the website button.

## Plan: browser capabilities update (2026-11-10)

Genesis now gives website pages in an applet what a browser gives them: file downloads, popup windows, site permission prompts, links to other apps, dark mode and the system font size on website pages, links shared to Genesis, and a separate website sign-in for an applet whose Applet info switch is on. The switch is off by default, so applets share one website sign-in. The SDK did not change. Hacker News needs no code change: it uses `signInUrl`, `account()` and `requiresAccount` as the platform expects, `safeUrl` already shows `mailto:` and other non-web links in HN text as plain text instead of a link that does nothing, and the theme follows `prefers-color-scheme`. This plan only verifies the applet under the new platform.

Verify on the phone with the current Genesis debug build (`android/gradlew -p android :app:installDebug`) and the applet (`node packages/applet-tools/src/cli.mjs dev install applets/hn-bookmarks --device <serial>`), both run from the Genesis root. Do not vote, post, comment or change account settings, except on a disposable account the operator approves. Record the device, Android version, revision and results here, and keep account names and screenshots out.

1. Sign-in after the update. Applets keep sharing one website sign-in unless the separate sign-in switch in Applet info is on, so no new sign-in is expected. Record whether one was asked. Sign in through the Me tab; HN's login page shows as the website and returns to the Me tab. The session lasts after the app is closed and reopened, and signing in or out here does not change Gmail Only's or X's session.
2. Links in. Share a `https://news.ycombinator.com/item?id=<id>` link from another app to Genesis, and paste one into Home's "Open a link". Genesis asks where it opens, with "Open in Hacker News" and "Create a new applet"; Open in Hacker News shows the item screen. An `hn.algolia.com` search link opens on the results screen. Back from a shared link leaves to the app that shared it.
3. Outside links. A story whose link goes to another website opens that page in the same context under the website bar, and Done returns to the feed. If that page opens a window, the window appears as a sheet and closes back to the page. If it asks for the camera, microphone or location, Genesis asks first; deny it. A file link on that page, such as a PDF, downloads with Genesis's notification.
4. Links out. A comment or profile with an email address shows it as text. On a revealed HN page, such as a profile's about text shown as the website, a `mailto:` link opens Android's mail app.
5. Dark mode and font size. In system dark mode the applet is dark, and so are HN's pages shown as the website, such as login and the comment box. At the largest system font size, the feed, a busy thread, the Post form and the Me tab keep labels readable and controls tappable, with no clipped text.
6. Regression. Home chips, a thread with Back keeping the scroll, Search with a filter, Saved with the service stopped, and the Post form's leave guard.

Report each step as verified, failed or blocked. Fix a failure in the applet when the applet's code causes it; describe a platform failure with a sanitized reproduction instead of working around it in the applet.
