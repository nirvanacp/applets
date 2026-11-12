# Current Hacker News specification

## Identity

- Name Hacker News, applet id `hn-bookmarks`, origins `https://news.ycombinator.com` and HN's search site `https://hn.algolia.com`.
- Three contexts, each with its own website session history: `primary` (Home, start URL `/`), `post` (`/submit`) and `me` (`/news?account=1`). The page module is [src/page.ts](../src/page.ts) (decision-0009): named readers and commands over the read functions in [src/adapter](../src/adapter). The UI runs on the open SDK's router with the route table in [src/routes.ts](../src/routes.ts).
- Screens: route screens `feed`, `results`, `item`, `user`, `info`, `post` and `me`; overlay screens `search`, `saved`, `categories` and `save`. Service: `bookmarks`, used by Saved, Categories and Save.
- Manifest schema 6, `@genesis/sdk` 0.0.0, `genesis-applet` tools 0.0.0, protocol 1, adapter API 1. Kit version: not exported for this in-repository applet. The [manifest](../applet.json) is the authority for origins and contexts; [src/routes.ts](../src/routes.ts) is the authority for routes. The manifest's `build` section names the UI entry ([src/main.tsx](../src/main.tsx)) and the page module ([src/page.ts](../src/page.ts)); the bundled manifest leaves it out.
- Published release: version 0.0.1, build and release record in `published/` (built with Genesis `941e0065dfe3`), not tagged yet. Before a pull request that changes this applet, raise the version and run `genesis-applet publish` again.

## Product scope

One Hacker News app with five tabs: Home, Search, Post, Saved and Me. Preserve the feeds, discussions with collapsible comment branches, profiles, HN's information pages, search of stories and comments, upvoting, posting through HN's submit form, and the Saved library with categories.

Data authority: HN owns accounts, stories, comments, votes and submissions. The `bookmarks` service owns saved stories and categories; it is a personal single-token backend, not a multi-user service. Website cookies never authenticate the service.

Open work: none recorded. Search reads HN's search site (decision-0007).

## Defaults and overrides

| Rule id | Current choice | Origin and reason | Decision |
| --- | --- | --- | --- |
| default-platform-menu | Shell menu button, accent `#ff6600`; the first row of every screen leaves the button's corner clear | Factory default; layout fix by the agent | decision-0003 |
| default-primary-navigation | One bottom tab bar; reselecting the active root tab scrolls to the top | Factory default | decision-0001 |
| default-pending-skeletons | Neutral, static, content-shaped skeletons | Factory default | |
| default-compact-website-cue | External-link icon on every control that opens the website (shown with the website bar and Done) | Factory default | |
| default-theme-and-layout | Warm paper and HN orange, Verdana, light and dark, 48px controls, compact 15px story titles | Inherited user design direction | decision-0002 |
| Saved editor | A `save` screen in the stack instead of a sheet, so Android Back closes it | Agent choice for SDK 0.0 | decision-0004 |

## Routes

Routes match in the order of [src/routes.ts](../src/routes.ts); the first match wins. The page column names the old adapter page whose readers the route uses; each route's `ready` reader is `ready.hn`, `ready.info`, `ready.submit` or `ready.search`.

| Route id | Example URL | Page and screen | Loading, empty, sign-in and error | Back | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| search | `https://hn.algolia.com/?query=rust&type=story&sort=byPopularity&page=0` | `search`, `results` (context `primary`) | Skeleton; "No results" with Search comments; load error; stale copy with inline error | Context history; filters replace, Next page pushes | implemented | device |
| account | `/news?account=1` | `account`, `me` (context `me`) | Skeleton; HN's login page when signed out (the page requires an account); error | Context history | implemented | device (2026-11-12), adapter tests |
| home, news | `/`, `/news?p=2` | `feed` | Skeleton; empty notice; load error with website button; stale copy with inline error | Context history | implemented | device, adapter tests |
| newest, front, newcomments, ask, show, shownew, asknew, jobs, best, active, from | `/newest`, `/newcomments`, `/from?site=example.com` | `feed` (stories, or comments on `/newcomments`) | As Home | Context history | implemented | device (chips), adapter tests |
| submitted, threads, favorites | `/submitted?id=pg` | `feed` | As Home | Context history | implemented | static |
| hidden, upvoted | `/upvoted?id=<own name>` | `private-feed`, `feed` | As Home; HN's login page when signed out, including the bare login page HN serves once the session has ended (the `account` reader answers signed out there) | Context history | implemented | device (Upvoted) |
| item | `/item?id=1` | `item` | Skeleton; error; "Sign in to comment" when signed out; the first 200 comments, then "Read N more comments on Hacker News" (decision-0008) | Context history | implemented | device (1,105-comment thread), adapter tests |
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
| Upvote and unvote (stories and comments, signed in only) | Vote on HN | `setVoted` command with `{ id, voted }`; clicks HN's own `#up_<id>` or `#un_<id>`, or answers at once when HN already shows the wanted state | Shown voted while pending; inline error on `failed` | implemented | device before the open SDK (vote and unvote, checked in HN's page); not repeated after it |
| More (feed) | Next page | `loadMore` command (click `a.morelink`), expecting a feed URL; falls back to `navigate({ url })` on failure | Button disabled while pending | implemented | device (2026-11-12, page 2), adapter tests |
| More comments | Next page of the thread | `navigate({ url })` | | implemented | static |
| Read N more comments on Hacker News | HN's page scrolled to the first comment the applet leaves out | `showRest` command, then `viewWebsite()` | | implemented | device before the open SDK |
| Comment Hide and Show | Collapse a branch | Local state | | implemented | static |
| Same-page comment link | Reveal target and ancestors, then scroll | Local state | | implemented | static |
| Reply, Sign in to comment | HN's reply or login page in the same context | `navigate({ url })` | | implemented | static |
| Add a comment (signed in, when HN offers a comment box) | HN's item page scrolled to its comment box | `showCommentForm` command, then `viewWebsite()`; HN's `/reply` page answers comments only | | implemented | device (box shown; no comment submitted) |
| Profile Submissions, Comments, Favorites | The routed lists | `navigate({ url })` | | implemented | static |
| Post | Fill HN's fields, then submit HN's form | `setField` command per field, then `submit` (expects an item or feed URL, not the post URL) | "Posting…"; HN's message on `REJECTED`; "Check Hacker News" on `unknown` | implemented | device before the open SDK (one post, then the New list); form shown 2026-11-12, nothing posted; adapter tests |
| Me: Profile, lists, Guidelines, FAQ | The routed pages | `navigate({ url })` | | implemented | device (Upvoted, Guidelines) |
| Me: Sign out | Confirm, then follow HN's logout link | `signOut` command, expecting the `signedOut` reader; signed out when observed, on `CONTEXT_REPLACED`, or on an unknown outcome once the Me tab's page shows no account (up to 5 seconds) | Buttons disabled while pending; inline error otherwise | implemented | device before the open SDK (the Me tab returns to its login page); not repeated after it; adapter tests |
| Saved: filter chips, title filter, Edit | Filter the library; open the Save editor | Local state; `navigate({ screen: "saved", mode: "replace" })` keeps the filter in the screen | Error notice when the service is unreachable | implemented | device (running and unreachable service) |
| Saved: Manage categories | Open the Categories screen | `navigate({ screen: "categories" })` | Status line; reread after a failure | implemented | device (rename, delete) |

## Data

| Collection or service path | Owner | Key | Shape version | Notes |
| --- | --- | --- | --- | --- |
| `bookmarks` service, collection `bookmarks` | Applet service | `bookmarkKey(itemId)` | 1 | Story snapshot, category ids, `savedAtMs`, `orderKey` |
| `bookmarks` service, collection `bookmark-order` | Applet service | `orderKey` (newest first) | 1 | Index pointing to the bookmark key |
| `bookmarks` service, collection `categories` | Applet service | Category id | 1 | Name and normalized name; deletion is soft and keeps the stories |
| `bookmarks` service, collection `category-names` | Applet service | Normalized name | 1 | Keeps names unique |
| `bookmarks` service, collection `category-meta` | Applet service | `active` | 1 | Active category ids; its revision guards category writes |

Categories are read once when Saved opens and again on a category change or resume. Stories with no active category show as Uncategorized. Record shapes are unchanged from the first release, so existing data reads as is.

## Current work and verification

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
