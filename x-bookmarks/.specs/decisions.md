# X decisions

## decision-0001: Adopt current applet baseline

- Date and origin: 2026-11-01T19:24:48+05:30, agent adoption of existing code, README and recorded user choices. This is the record creation date, not a claimed date for every inherited decision.
- Choice and rationale: Preserve one stable `x-bookmarks` app, Home, Explore, Notifications, Saved, Profile, top-right native options, hidden sources and owned UI. The user requested durable local records and a shared menu default; existing UI/data decisions are preserved, not newly inferred approval.
- Evidence and supersession: [manifest](../applet.json), [current spec](current.md) and its historical evidence. Supersedes stale README version and blanket provider-action assertions, not historical records.

## decision-0002: Preserve product-specific choices

- Date and origin: 2026-11-01T19:24:48+05:30, inherited user design direction and agent implementation as described in previous README/code.
- Choice and rationale: Native mobile X design is the inherited user choice, with authenticated mobile website as fallback where native reference is unavailable. Preserve neutral palette, compact shared 15px/20px post text, 40px feed avatars, hairline separators, inline author/handle/time and icon actions. Saved has one Bookmarks/Likes/Categories row. Black media viewer keeps observed image identity and bounded Next/Previous controls. Preserve keyboard-safe category sheets, opaque themes, independent stores, at most 50 categories and 10 memberships per post, and rejection of deleting nonempty categories. The user requested native X identity and the five-section footer; exact token values, account-validation technique and action receipt implementation are inherited engineering choices.
- Evidence and supersession: [current spec](current.md), applet source and historical records linked there. Supersedes none. Future changed decisions append here and update current.md.

## decision-0003: Rebuild on SDK 0.0 with typed sources and screens

- Date and origin: 2026-11-06, the Genesis repository revamp requested by the user; implementation choices by the agent.
- Choice and rationale: The applet moves to manifest schema 5. Three sources publish typed data: `primary` for timelines, notifications, bookmarks, likes, posts, profiles and media, `explore` for trends and search, and `account` for the signed-in handle. One React foreground renders twelve screens. Like and bookmark run as declared intents instead of page scripts. The old separate alerts and saved sources are folded into `primary`. The account is observed from its own source at `/settings/account`, and the Categories library opens only when that handle matches the handle the service was created for. X now serves bookmarks at `/i/history` and own likes at `/i/history/likes`, so both routes, and the `/i/bookmarks` alias, open the Saved screen. Every screen leaves the shell menu button's corner clear. Product choices from decision-0002 stay in force.
- Evidence and supersession: [manifest](../applet.json), [sources](../src/sources) and the 2026-11-06 device check in [current](current.md). Supersedes the schema 3 page and source structure described in decision-0001; the five sections and the service data stay.

## decision-0004: Edit categories on screens

- Date and origin: 2026-11-06, agent choice during the SDK 0.0 rewrite.
- Choice and rationale: Filing a post and managing categories push the `save` and `manage` screens instead of opening keyboard-safe sheets. A full screen keeps the name field clear of the keyboard, and Android Back closes it through the stack. The limits of 50 categories and 10 categories per post, conflict rereads, the delete confirmation and the refusal to delete a nonempty category are unchanged.
- Evidence and supersession: [save screen](../src/screens/save.tsx), [manage screen](../src/screens/manage.tsx). Supersedes the keyboard-safe category sheets in decision-0002.

## decision-0005: Shared post intents, account revalidation at the root and restored filters

- Date and origin: 2026-11-06, fixes from the revamp implementation review; implementation choices by the agent.
- Choice and rationale: Like and bookmark are declared on both `primary` and `explore`, and a post acts through the source of the screen it is shown on, so posts in search results act on the page that shows them. The account is read again with `reload("account")` from the app root on every resume instead of a custom adapter intent, so the Profile tab and the Categories handle check follow a sign-in or sign-out made elsewhere. Categories restores its search and category filter from `preferences` again, as before the SDK 0.0 rewrite.
- Evidence and supersession: [page helpers](../src/sources/page.ts), [app](../src/app.tsx), [categories screen](../src/screens/categories.tsx). Amends decision-0003 on where intents run.

## decision-0006: Adapter pages, regions and contexts

- Date and origin: 2026-11-08, step 9 of the session projection migration requested by the user; implementation choices by the agent.
- Choice and rationale: The applet moves to manifest schema 6 with an adapter instead of typed sources and intents. Home, Notifications and Saved share the `primary` context; Explore and Profile have their own, so each keeps its X history. Like and bookmark are desired-state `setLiked` and `setBookmarked` actions on the post rows, which click X's own controls. Show more is a `loadMore` page action that scrolls X's page, since X loads rows as the page scrolls. A post's thread is one region split at the post the URL names, because X shows the conversation as one column. Unrouted X pages show X itself, replacing the `website-*` routes and the `unsupported` screen; the `/:handle` profile route also matches one-segment X pages, which the profile page reports as an error.
- Evidence and supersession: [manifest](../applet.json), [adapter](../src/adapter.ts), [app](../src/app.tsx). Supersedes the sources and intents of decision-0003 and decision-0005; the account reload at the root and restored Categories filters of decision-0005 stay in force.


## decision-0007: Move to the open SDK

- Date and origin: 2026-11-12, step 11 of the developer's open SDK plan; the reader and command shapes are the agent's choices, following Hacker News.
- Choice and rationale: [src/page.ts](../src/page.ts) replaces the adapter with named readers (`ready.<page>`, `account`, `timeline`, `thread`, `header`, `posts`, `trends`, `people`, `results`, `empty`, `photos`, `handle`) and commands (`setLiked`, `setBookmarked`, `loadMore`); the read functions in `src/adapter/` stay. Like and bookmark take `{ id, liked }` and `{ id, bookmarked }` and answer at once when X already shows that state. The route table in [src/routes.ts](../src/routes.ts) keeps the 15 routes in order and adds `website: true` routes for the one-segment X paths that are not profiles, before `/:handle`, so those pages show X instead of a profile error. The account screen and the Categories library read the handle from an `account` watch, since the router reports only whether the person is signed in.
- Evidence and supersession: [page module](../src/page.ts), [routes](../src/routes.ts), [screen helpers](../src/screen.ts). Replaces the adapter runtime of decision-0006 and its one-segment profile error; screens, data and behavior are otherwise unchanged.

## decision-0008: Keep the account across pages and refuse non-handles in the profile reader

- Date and origin: 2026-11-12, the agent, fixing findings 1 and 3 of the [open SDK migration review](review-open-sdk-migration.md), so that decision-0007's "behavior unchanged" holds.
- Choice and rationale: `useAccount` in [src/library.ts](../src/library.ts) keeps the last handle the `account` watch read in the Profile tab's context, across that context's pages, as the old store's account did. It forgets the handle when the person is signed out, and on resume or Done, when the app root reads the account page again. While the handle is unknown, a `/<handle>/likes` page shows as "Likes" without the Saved row. `profileReady` in [src/adapter/pages.ts](../src/adapter/pages.ts) again throws for a first path segment that fails `^[A-Za-z0-9_]{1,15}$` or is a reserved name in any case; the router shows X's page for that error, so such paths no longer wait for the deadline. The `website-*` routes stay for the exact lowercase paths.
- Rules and journeys: Categories and Save to categories while the Profile tab shows X's own page; the Saved row's Likes; one-segment X paths.
- Evidence and supersession: static checks only. Refines decision-0007's account reading and restores the one-segment check it replaced, without the profile error screen.

## decision-0009: An app icon

- Date and origin: 2026-11-13. The developer asked to bring X up to date with the rest of the ecosystem; the artwork is the agent's, following Hacker News's icon.
- Choice and rationale: `shell.icon` is [assets/icon.png](../assets/icon.png), 512 px original artwork: a white speech bubble with a bookmark ribbon cut out of it, on a transparent background that the shell fills with the `#1d9bf0` accent. It shows the app's two jobs, reading posts and saving them, without copying X's logo. With the icon, the applet grid, the launch splash, the Recents card and pinned shortcuts show it instead of the letter X. X is not bundled into the APK, so it gets no app drawer entry.
- Evidence and supersession: [manifest](../applet.json), [icon](../assets/icon.png); device check on 2026-11-13 (see current work). Adds to decision-0003's accent; nothing is superseded.

## decision-0010: Post with photos, save a photo, share a post

- Date and origin: 2026-11-14. The user asked to write a post with up to four photos from the app, see the photos before posting and post it, to save a photo from a post and to share a post; the screen and selectors are the agent's choices, following the factory's website features recipes.
- Choice and rationale: `/compose/post` routes to a `compose` screen over X's composer, hidden in `primary`, ready when X's editor and file input are present. The person writes and picks photos in the applet (`useFilePicker`, up to four, thumbnails with Remove, default-attachment-preview); Post types the text (trusted typing when X's editor needs it), attaches the photos with `attachFiles` until X shows that many, and clicks X's Post with `navigates` and an `expect` that X did not move to a sign-in flow. The draft stays after a failure, and leaving with a draft asks first. A reply (`in_reply_to`) keeps X's own composer, since its context is the post above it. Save photo in the media viewer calls `genesis.downloads.save` with the original-size photo URL; Share in the post action bar calls `genesis.share` with the post URL. Without `limits.userActions` each falls back to revealing X.
- Rules and journeys: requirement-user-tap-actions, default-attachment-preview; Home's New post, the media viewer, every post's action bar.
- Evidence and supersession: [compose screen](../src/screens/compose.tsx), [composer readers](../src/adapter/compose.ts), [routes](../src/routes.ts), [media viewer](../src/screens/media.tsx), [post](../src/components/post.tsx). Static checks only; device verification is blocked by sign-in (see current work). Replaces "Compose opens X's page" from the interactions; nothing else is superseded.

## decision-0011: X's root is Home, and its landing page means signed out

- Date and origin: 2026-11-15. The developer asked for a UX pass over every applet; the route and reader change are the agent's.
- Choice and rationale: X sends a signed-out `/home` to `/`, which showed X's "Get the app" landing page as the website. A `root` route maps `/` to the Home screen with `requiresAccount`, so the router treats a signed-out root as a sign-in case and opens X's login. The account reader also counts a page with no `main` and the landing page's Sign in link (`a[href^="/i/jf/onboarding/web?mode=login"]`) as signed out, because that page has no `loginButton`; the `main` check keeps signed-in pages that link to sign-in from counting; without it the page stays on the skeleton until the readiness deadline.
- Rules and journeys: default sign-in handling; launch while signed out, Done from sign-in.
- Evidence and supersession: [routes](../src/routes.ts), [account reader](../src/adapter/read.ts); device check on 2026-11-15 (see current work). Nothing is superseded.

## decision-0012: Replace the UI with X2's

- Date and origin: 2026-11-15; a user instruction ("I don't need two X applets, I only wanted to compare the two. I like X2").
- Choice and rationale: X2 was a separate applet (`x2`) that kept this applet's page module, adapter, routes and backend and wrote every screen, component and style fresh from the factory's native-feel guide and UI kit. Its `src/` replaces this applet's `src/`; the id `x-bookmarks`, the name X, the icon, the `bookmarks` service on port 8788 and its state are kept, so stored categories and device storage carry over. The `x2` applet, its port and its records are removed; its backend state under `services/x2/` is left on disk untouched.
- Evidence and supersession: `check`, `typecheck` and `build` on 2026-11-15, and the phone check in the change record. Supersedes the screen and component structure of decision-0003 and the full-screen editors of decision-0004; the product choices of decision-0002 stay.

## decision-0013: Keep the page module, adapter and backend

- Date and origin: 2026-11-15; agent choice when X2 was built.
- Choice and rationale: only the UI changed. `src/page.ts`, `src/adapter/`, `src/model.ts`, `src/actions.ts`, the route table, `backend/` and `start.sh` keep their behavior, except reader fixes found on the phone (the empty-state reader and the photo reader picking the photo under the viewer's own box).
- Evidence and supersession: none superseded.

## decision-0014: X's look, with icon-only tabs

- Date and origin: 2026-11-15; agent choice.
- Choice and rationale: the palette follows X's mobile app, with its own colors for like and repost. The tabs show icons only, with labels for screen readers; the chosen tab fills its icon over a pill. The tab bar shows only on tab roots, as the factory's `motion.md` asks; X itself keeps it on pushed screens.
- Evidence and supersession: refines the look in decision-0002.

## decision-0015: Save and Manage as sheets

- Date and origin: 2026-11-15; agent choice.
- Choice and rationale: `save` and `manage` draw as bottom sheets in their own stage. The screen below stays in place and is inert, and the sheets rise in, swap and close as `motion.md` describes. The earlier UI used full screens because of the keyboard; the native-feel overlay guidance asks for sheets.
- Evidence and supersession: supersedes decision-0004. The keyboard over a sheet is checked on the phone (see the change record).

## decision-0016: An in-app Discard dialog

- Date and origin: 2026-11-15; agent choice.
- Choice and rationale: leaving a draft asks "Discard post?" in an in-app dialog through the router's `onConfirmLeave`, instead of the browser's `confirm()`, so it matches the app and its theme.
- Evidence and supersession: none superseded.

## decision-0017: The media viewer pages through known photos itself

- Date and origin: 2026-11-15; agent choice after a phone check.
- Choice and rationale: a `replace` navigation loads the URL as a new page, so moving X's page between photo URLs reloaded X, and Close then returned to a new Home feed. When a photo opens from a post or the profile Media grid, the applet keeps that post's photos and the viewer pages through them itself; X's page stays on the opened photo. A photo opened another way, such as a link, still pages through X's viewer by replacing the entry.
- Evidence and supersession: refines the viewer in decision-0002.

## decision-0018: Keep categories in a local servelet

- Date and origin: 2026-11-16, user request to move every applet's server-side feature to the serverless mechanism, after Hacker News moved its backend to a servelet.
- Choice and rationale: the `bookmarks` service runs as the `x-bookmarks` servelet, a Go port of the Node store compiled to wasm, with the same endpoints, limits, revision checks, receipts and error codes. Categories no longer need a computer, port 8788, a tunnel or a token. The Node server read the library's handle from `X_EXPECTED_HANDLE`; a phone has no operator to set it, so the library is now claimed by the first signed-in X account that opens it, through `POST /v1/library { expectedHandle }`, and the applet opens the library only once it knows the account. A different account still sees "Different account"; clearing the applet's data lets it claim a new library. Records in the old Node database are not copied to the phone. The Node backend is kept under `legacy/` for history, and `start.sh` stays because the collection launcher expects one.
- Evidence and supersession: [service.json](../service.json), [library](../src/library.ts) `open`, the servelet in the servelets collection (`x-bookmarks/`), [legacy](../legacy/README.md). Supersedes the computer-hosted backend on port 8788 kept by decision-0012; the service id and record shapes are unchanged.

## decision-0019: Keep the three contexts and the timeline reader

- Date and origin: 2026-11-17; agent choice after a phone measurement. Problem ID: `applet-performance` · Problem: Find what makes page switches, loads and like/save actions lag in the built applets · Spirit animal: 🐆 Leopard
- Finding: Genesis now starts an applet's pages one after another and rests each page the applet is not using. On a phone, X idle on Home cost 4 to 30 ms of processor time per second (it was about 3000 with every page running), the cold open took 8.5 to 11.2 s (15.4 s before), and the app and its pages used about 530 MB together (870 MB before).
- Choice and rationale: the `account` context stays. It is the Profile tab, with its own history, and it now starts last and rests. Reaching the profile through `primary` would put it in Home's history and reload Home's page for each visit. The timeline reader stays as it is: X's own page keeps only the rows near the screen, the list is `virtualized`, and rows are memoized by key. A page module list has no row limit to set, and windowing the applet's own feed would change scrolling for no measured gain.
- Rules and journeys: Home, Explore, Profile.
- Evidence and supersession: phone measurements, 2026-11-17. None superseded.
