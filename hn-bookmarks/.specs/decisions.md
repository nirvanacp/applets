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
