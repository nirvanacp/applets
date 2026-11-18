# Hacker News decisions

## decision-0001: Adopt current applet baseline

- Date and origin: 2026-11-01T19:25:00+05:30, agent adoption of existing code, README and recorded user choices. This is the record creation date, not a claimed date for every inherited decision.
- Choice and rationale: Preserve one stable `hn-bookmarks` app, Home, Search, Post, Saved, Me, top-right native options, hidden sources and owned UI. The user requested durable local records and a shared menu default; existing UI/data decisions are preserved, not newly inferred approval.
- Evidence and supersession: [manifest](../applet.json), [current spec](current.md) and its historical evidence. Supersedes stale README version and blanket provider-action assertions, not historical records.

## decision-0002: Preserve product-specific choices

- Date and origin: 2026-11-01T19:25:00+05:30, inherited user design direction and agent implementation as described in previous README/code.
- Choice and rationale: Preserve compact story headings shared across feeds/discussion/Saved, current 15px/21px story title treatment, compact domain/metadata rows, orange identity and 48px standalone Save controls. Category normalization uses NFKC/whitespace/case rules, uniqueness and revision checks. Category deletion preserves stories; no active membership means Uncategorized. Comment disclosure collapses branches and same-page links open target/ancestors before scrolling. Account/private list data is not eligible for public failed-refresh caching. The user requested denser HN presentation; shared story components, normalization and disclosure mechanics are inherited engineering choices. Search placeholder is an implementation gap, not approved deferral.
- Evidence and supersession: [current spec](current.md), applet source and historical records linked there. Supersedes none. Future changed decisions append here and update current.md.

## decision-0003: Rebuild on SDK 0.0 with typed sources and screens

- Date and origin: 2026-11-06, the Genesis repository revamp requested by the user; implementation choices by the agent.
- Choice and rationale: The applet moves to manifest schema 5. Three sources (`primary`, `post`, `me`) publish typed data, and one React foreground renders ten screens. Votes, posting and sign-out run as declared intents instead of page scripts. The signed-in account reads from its own `me` source at `/news?account=1`; a timestamped `account` value forces a fresh read after sign-out. Every screen leaves the shell menu button's top-right corner clear with a floated spacer. Product choices from decision-0002 stay in force.
- Evidence and supersession: [manifest](../applet.json), [sources](../src/sources) and the 2026-11-06 device check in [current](current.md). Supersedes the schema 3 page and source structure described in decision-0001; the five tabs and data stay.

## decision-0004: Edit saved stories on a screen

- Date and origin: 2026-11-06, agent choice during the SDK 0.0 rewrite.
- Choice and rationale: Save and Edit push a `save` screen carrying a story snapshot, replacing the old dialog. Android Back closes it through the stack and no leave guard is needed. Conflict and uncertain-write rereads, category creation and confirmed removal are unchanged.
- Evidence and supersession: [save screen](../src/screens/save.tsx). Supersedes the story dialog from the previous release.

## decision-0005: Move to the adapter runtime as a vertical slice

- Date and origin: 2026-11-08, step 7 of the session projection migration requested by the user; implementation choices by the agent.
- Choice and rationale: The applet moves to manifest schema 6 with one `primary` context and an adapter (`feed`, `item`, `user` pages) that publishes regions and actions instead of typed sources and intents. Votes are a desired-state `setVoted` action that clicks HN's own vote link, so the account's vote token stays in the page. Reply, comment and sign-in open HN's pages in the same context; unrouted HN pages show as the website, replacing the `website-*` routes and the `unsupported` screen. Only Home, discussions and profiles are ported; the other screens wait for step 8 and are listed as pending in [current](current.md). A `news` route is kept beside `home` so the front page's own links and its More pages stay on the feed screen.
- Evidence and supersession: [manifest](../applet.json), [adapter](../src/adapter.ts), [adapter tests](../test/adapter.test.mjs). Supersedes the sources and intents of decision-0003; the product choices of decision-0002 stay in force.

## decision-0006: Complete the adapter runtime migration

- Date and origin: 2026-11-08, step 8 of the session projection migration requested by the user; implementation choices by the agent.
- Choice and rationale: Home, Post and Me are website contexts (`primary`, `post` at `/submit`, `me` at `/news?account=1`), so each tab keeps its own HN history and the sign-in page appears in the tab that needs it. Search, Saved, Categories and Save are applet screens opened above the active context; Saved's category manager becomes its own `categories` screen. Every HN list and information page is routed, so links from profiles and Me stay in the app. Posting fills HN's own form field by field and submits it, and HN judges the post: a story or list page counts as accepted and the form again as rejected, with HN's message shown. The submit form and HN's guideline pages show no account, so they report none instead of a signed-out state. Search stays a placeholder.
- Evidence and supersession: [manifest](../applet.json), [adapter](../src/adapter.ts), [app](../src/app.tsx). Completes decision-0005 and removes its pending list.

## decision-0007: Search through HN's search site

- Date and origin: 2026-11-09, the developer's everyday-features plan asked for a working Search tab instead of the placeholder; design choices by the agent.
- Choice and rationale: Search reads HN's own search site, `https://hn.algolia.com`, which the manifest adds as an origin. The plan suggested a separate `search` context, but an applet may have only three contexts and Home, Post and Me use them, so results open in the `primary` (Home) context through a `search` route (pattern `/` with the `query` key, placed before `home`) and a `results` screen. The Search tab stays highlighted while Home shows results. The Search tab fills its field with the last search. Story and Comments filters and the Popular and Newest sorts replace the page; Next page pushes the next page's URL instead of a page action, so Back walks pages and searches. Results are read only: vote and reply stay on HN's own pages, which open from a result. The search site writes "1 points" and "1 comments"; the adapter writes them as HN does.
- Evidence and supersession: [manifest](../applet.json), [search page](../src/adapter/search.ts), [search screens](../src/screens/search.tsx). Supersedes decision-0006's "Search stays a placeholder".

## decision-0008: Show the first 200 comments of a busy thread

- Date and origin: 2026-11-09. The developer's everyday-features plan (F9) asked that busy threads show in the applet; the agent chose the bound.
- Choice and rationale: HN puts a whole thread on one page. A thread of about 1,100 comments carries some 270k characters of text, which is past the platform's 192 KiB page limit, so the thread showed a load error and then the website. Marking the region `virtualized` does not help: the runtime keeps every record whose element is in the DOM, and HN renders every comment. The `comments` region therefore reads the first 200 rows (`SHOWN_COMMENTS`), about 600 bytes each on a measured thread. A `rest` region counts the remaining rows. The item screen ends with "Read N more comments on Hacker News": its `showRest` page action scrolls HN's page to the first comment left out, and the website then shows from there, in the same session, with Done to return. A thread whose first 200 comments are unusually long can still pass the limit and show the load error with the website button.
- Evidence and supersession: [item page](../src/adapter/item.ts), [item screen](../src/screens/item.tsx). Replaces the known risk recorded under decision-0006.

## decision-0009: Move to the open SDK

- Date and origin: 2026-11-12, the developer's open SDK plan moved this applet first, as the pilot; the reader and command shapes below are the agent's choices.
- Choice and rationale: [src/page.ts](../src/page.ts) replaces the adapter with named readers and commands; the read functions in `src/adapter/` stay. Readers are named by what they read, prefixed where two pages read different things under one name (`feed.comments` and `item.comments`, `ready.info` and `ready.submit`). Commands take plain arguments such as `{ id, voted }` instead of a record target, because the page shows the id and a command needs no watch to act. Each screen opens its watches under its own id with `when` guards built from the routes that show it, so a watch stops reading when its context leaves the screen's pages. The router's route table in [src/routes.ts](../src/routes.ts) keeps the 29 routes in order and marks the account, submit and `/r` routes `requiresAccount`, as the old manifest did through its pages. The `account` reader answers `null` on a page that shows no sign-in evidence (the submit form, the search site, a loading page), so those pages no longer read as signed out; Genesis's router was changed to accept that. Sign out now waits for the `signedOut` reader instead of a page identity.
- Evidence and supersession: [page module](../src/page.ts), [routes](../src/routes.ts), [screen helpers](../src/screen.ts), [adapter tests](../test/adapter.test.mjs). Replaces the adapter runtime described by decision-0006; screens, data and behavior are unchanged.

## decision-0010: An app icon and an app drawer entry

- Date and origin: 2026-11-12. The developer asked to build on Genesis's applets-as-apps features and update the applets as needed; the artwork and the drawer choice are the agent's.
- Choice and rationale: `shell.icon` is [assets/icon.png](../assets/icon.png), original artwork: a white bookmark ribbon with an up arrow cut out of it, on a transparent background that the shell fills with the `#ff6600` accent. It shows the app's two jobs, reading HN and saving stories, without copying HN's or Y Combinator's logo. With the icon, the Recents card, the launch splash and pinned shortcuts show the ribbon instead of the letter H. The Genesis repository's bundle selection marks this applet `drawer: true`, so the APK gives it its own app drawer entry, labeled "Hacker News", which opens the applet in its own window.
- Evidence and supersession: [manifest](../applet.json), [icon](../assets/icon.png). Adds to decision-0003's accent; nothing is superseded.

## decision-0011: Adopt the native-feel UI kit

- Date and origin: 2026-11-15. The developer asked to revamp every applet with the factory's native-feel guidance, at the quality of the X applet; the choices below are the agent's.
- Choice and rationale: the applet takes the kit pieces in `src/ui/` (Stage and ghost motion, toasts, the delayed progress bar, `useBusy`, pull to refresh, `LoadError`, `WebsiteCue`) and theme tokens for light, dark and `data-theme`, mapped to the warm paper and HN orange of decision-0002. Each destination has its own skeleton shaped like its content, fading in after 120 ms and shimmering, which replaces the neutral static skeleton default. Content wins over loading, and a failed refresh keeps the content with an inline "Couldn't refresh". The compact titles, Verdana, paper colors and 48px Save and vote targets stay.
- Evidence and supersession: [theme](../src/theme.css), [skeletons](../src/ui/skeletons.tsx), [frame](../src/ui/frame.tsx), [screen helpers](../src/screen.ts). Supersedes the static skeleton default; decision-0002 stays.

## decision-0012: A header row per screen and the tab bar on tab roots only

- Date and origin: 2026-11-15, agent choice following the factory design guide.
- Choice and rationale: every screen draws a fixed header above its scroller, with the title (or Home's feed chips) and a Refresh button, and pads its right side by `--menu-corner` for the shell's menu button. This replaces decision-0003's float spacer in the first row. There is no Back arrow and no app name. The tab bar shows on tab roots only (Home's seven feeds, Search and its results, Post, Saved, Me); pushed screens such as a discussion, a profile, a profile's lists, Categories and Save have none, and Android Back returns. Manage categories moves from a button under the Saved list to a folder button in Saved's header.
- Evidence and supersession: [app](../src/app.tsx) `isTabRoot`, [frame](../src/ui/frame.tsx) `ScreenHead`. Supersedes decision-0003's corner spacer; decision-0001's single tab bar stays.

## decision-0013: Outcomes as toasts and the website cue after article domains

- Date and origin: 2026-11-15, agent choice.
- Choice and rationale: a vote that fails or that HN does not confirm says so in a toast instead of an inline line under the row, so the list does not shift. Saves, removal, sign out and category writes end in a toast too. Article titles carry the website cue after the domain, because an article is another website; reply, Add a comment, Read N more comments and Sign in to comment carry it as well. The comment toggle uses HN's `[–]` and `[+n]` look.
- Evidence and supersession: [story components](../src/components/story.tsx), [item](../src/screens/item.tsx). Supersedes the inline vote error.

## decision-0014: Remove a saved story with Undo

- Date and origin: 2026-11-15, agent choice following the native-feel rule that removals offer Undo.
- Choice and rationale: Remove from Saved acts at once, closes the editor and shows "Removed from Saved" with Undo, instead of a confirm step. Undo saves the story again with its categories that still exist; it counts as newly saved, so it moves to the top of Saved. Deleting a category keeps its confirm step, because a recreated category would get a new id and its stories would not return to it.
- Evidence and supersession: [save](../src/screens/save.tsx) `undoRemove`, [categories](../src/screens/categories.tsx). Supersedes decision-0004's confirmed removal; the Save editor stays a screen.

## decision-0015: Keep bookmarks in a local servelet

- Date and origin: 2026-11-16, user request to move the Hacker News backend to a servelet that runs on the phone.
- Choice and rationale: the `bookmarks` service runs as the `hn-bookmarks` servelet, a Go port of the Node store compiled to wasm, with the same `GET /health` and `POST /v1/documents`, the same collections, limits, revision checks and error messages. Saved no longer needs a computer, port 8787, a tunnel or a token. Data lives in Genesis's private storage on the phone and is deleted when the applet is removed or its data cleared. Records in the old Node backend's database are not copied to the phone; nothing imports them. The Node backend is kept under `legacy/` for history. `start.sh` stays because the collection launcher expects one in every applet. A request with a JSON `null` body answers "Invalid JSON" instead of the Node store's "Expected an object"; the applet never sends one.
- Evidence and supersession: [service.json](../service.json), the servelet in the servelets collection (`hn-bookmarks/`), [legacy](../legacy/README.md). Supersedes the personal single-token backend of decision-0001's baseline; the service id and record shapes are unchanged.

## decision-0016: Keep the Post context

- Date and origin: 2026-11-17; agent choice after a phone measurement. Problem ID: `applet-performance` · Problem: Find what makes page switches, loads and like/save actions lag in the built applets · Spirit animal: 🐆 Leopard
- Finding: Genesis now starts an applet's pages one after another and rests each page the applet is not using. On a phone the feed idles at 4 to 9 ms of processor time per second with all three pages open (about 280 before).
- Choice and rationale: the `post` context stays. The Post tab keeps its own history and its draft's form while the user reads Home, and the leave guard depends on that. Loading `/submit` in `primary` would replace the feed's page and lose its scroll position on return. The page now starts after Home and rests, so it costs memory for one small page and nothing else.
- Rules and journeys: Post tab, submit, leave guard.
- Evidence and supersession: phone measurements, 2026-11-17. None superseded.

## decision-0017: Render from kept data, keep Home on the phone, virtualize long Saved lists

- Date and origin: 2026-11-18; agent choice while upgrading the applet to Genesis's runtime speed work. Problem ID: `applet-performance` · Problem: Find what makes page switches, loads and like/save actions lag in the built applets · Spirit animal: 🐆 Leopard
- Choice and rationale: Genesis now keeps each watch's last value and shows it at once, as stale, while the page reads again. Screens decide what to draw from each watch's data state (`watchStatus`): content whenever there is data, fresh or stale, so no screen shows a skeleton over data Genesis kept. Home's feed watches use `persist`, because Home is the first screen and HN's lists are public. When HN shows no account and the applet last saw one, the applet calls `forgetCached`, so a signed-out start never shows the last account's feed with its votes; the applet remembers only "signed in" or "signed out" in its own storage to avoid forgetting on every signed-out start. Saved draws more than 50 stories with `VirtualList`. Feeds stay plain lists: HN pages hold 30 rows. The discussion stays a plain list: its rows vary from one line to many paragraphs, Back must return to the exact comment (checked on a phone before), and a link to a comment on the same page scrolls to a row a virtual list might not have drawn. The thread already stops at 200 comments.
- Rules and journeys: every routed screen's loading and empty states, cold start, Back, sign out, Saved.
- Evidence and supersession: [screen helpers](../src/screen.ts), [feed](../src/screens/feed.tsx), [saved](../src/screens/saved.tsx), [app](../src/app.tsx). None superseded.
