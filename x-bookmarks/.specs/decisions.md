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
