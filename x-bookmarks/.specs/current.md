# Current X specification

Problem ID: applet-revamp
Problem: Revamp every applet with the native-feel guidance
Spirit animal: 🦉 Owl

## Identity

- Name X, applet id `x-bookmarks`, origin `https://x.com`. The UI was rebuilt on 2026-11-15 from the factory guidance (decision-0012); the page module, adapter, routes and backend are the earlier ones.
- Contexts, each with its own website history:
  - `primary` (`/home`): Home, Notifications, Saved and the composer.
  - `explore` (`/explore`).
  - `account` (`/settings/account`): the Profile tab.
- Route screens: `home`, `notifications`, `saved`, `explore`, `post`, `profile`, `media`, `compose` and `account`.
- Overlay screens: `categories`, plus the `save` and `manage` sheets.
- Service: `bookmarks`, the `x-bookmarks` servelet, which runs on the phone (decision-0018). Its database is in Genesis's private storage for this applet.
- Published release: 0.0.4 in `published/`. Raise the version and publish again before the pull request for the revamp.
- Installed for development with `dev install`; it is not bundled into the APK.
- Storage collections: `preferences` (the last Categories filter) and `operations` (pending library writes).
- The [manifest](../applet.json) is the authority for origins and contexts, and [src/routes.ts](../src/routes.ts) for routes.

| Compatibility | Value |
| --- | --- |
| Manifest schema | 6 |
| Bundle format | 3 |
| Protocol | 1 |
| Page control API (`adapterApi`) | 1 |
| SDK and tools | 0.0.0 |
| Kit | 0.0.0 (the in-repository kit; not exported) |

## Product scope

The UI was first written as a separate applet, X2, to compare it with the earlier X UI. The developer preferred it, so it replaced the earlier UI here and X2 was removed (decision-0012).

- **Tabs:** Home, Explore, Notifications, Saved and Profile.
- **Timelines:** the Home and Notifications timelines.
- **Posts and profiles:** post detail with its conversation, and profiles with Posts, Replies and Media.
- **Media:** a media viewer with Save photo and Share.
- **Post actions:** like, bookmark and Show more.
- **Explore:** search with Top, Latest, People and Media.
- **Saved:** Bookmarks, Likes and Categories.
- **Categories:** Save to categories and Manage categories.
- **Composer:** new posts with up to four photos.

Data authority:
- X owns accounts, posts, likes and bookmarks.
- The `bookmarks` service owns categories and the post snapshots filed in them. It is bound to one X handle: the first signed-in account that opens Categories claims the library, and any other account sees "Different account". It never uses website cookies.
- Filing a post never bookmarks it on X.

Excluded:
- importing X bookmarks;
- an offline write queue;
- a media archive.

## Defaults and overrides

| Rule id | Current choice | Origin and reason | Decision |
| --- | --- | --- | --- |
| default-platform-menu | Shell menu button, accent `#1d9bf0`, icon `assets/icon.png`. Every top bar leaves the button's corner clear (`--menu-corner`) | Factory default | |
| default-primary-navigation | Bottom tab bar of five icon-only tabs with labels for screen readers. Shown on tab roots only. Reselecting a tab returns to its root, or scrolls to the top when already there. Hidden in the media viewer, the composer and sheets | Factory default, with icons as in X | decision-0014 |
| default-pending-skeletons | One skeleton per destination: feed, notifications, post with thread, profile with banner, media grid, trends, people, saved posts, category choices and a photo frame | Factory default | |
| default-website-cue | The kit's external-link cue on every button that opens X: Edit profile, video tiles, profile links, Reply and the error states' View on X | Factory default | |
| default-theme-and-layout | X's palette, light and dark: canvas `#fff`/`#000`, ink `#0f1419`/`#e7e9ea`, accent `#1d9bf0`, like `#f91880`. System font at 15px, 40px avatars, hairline separators, X's black pill for chosen chips | Agent choice from X's mobile app | decision-0014 |
| default-attachment-preview | The composer shows photo thumbnails, each with a Remove button, plus a count out of 4 and a character count | Factory default | |
| Category editors | `save` and `manage` are sheets over the screen that opened them, with a grab handle; Android Back closes them first | Agent choice; the earlier UI used full screens | decision-0015 |
| Discard draft | An in-app dialog "Discard post?" (Discard or Keep editing) through `onConfirmLeave` | Agent choice | decision-0016 |

## Routes

The router table and its order are in [src/routes.ts](../src/routes.ts). It lists `home`, `root`, `notifications`, `bookmarks`, `own-likes`, `bookmarks-alias`, `explore`, `search`, `hashtag`, `website-reply`, `compose`, `account`, `photo`, `post`, `likes`, `replies`, `profile-media`, the `website-*` paths in `X_PAGES`, then `profile`. Any URL without a route shows X's page in its context.

| Route id | Screen | Loading, empty, sign-in and error | Back | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| home, root, notifications | `home`, `notifications` | Feed or notification skeleton, X's empty text, sign-in prompt, error with Try again and View on X, stale notice | Context start or history | implemented | static |
| bookmarks, own-likes, bookmarks-alias, likes | `saved` with the Bookmarks, Likes and Categories row | As above | Context history | implemented | static |
| explore, search, hashtag | `explore` | Trends, people or feed skeleton, "No results" empty state, error | Context history; Back leaves a search | implemented | static |
| compose | `compose` | Progress bar while X's composer opens; sign-in prompt; error line | A draft asks "Discard post?" first | implemented | static |
| account | `account`, then replaced by the profile | Profile skeleton; sign-in prompt; an error with Try again and View on X when the page shows no handle | Context start | implemented | static |
| photo | `media` | Photo frame skeleton; a message with View on X when the page fails or shows no photo | Context history | implemented | static |
| post | `post` | Post skeleton with a thread line; "No replies yet." once the replies stay empty for 5 s | Context history | implemented | static |
| replies, profile-media, profile | `profile` | Banner and header skeleton, then a feed or grid skeleton; the header stays while a section loads; empty text only from X's empty state or after the section stays empty for 5 s; a missing or suspended account shows X's empty text with View on X; error | Context history | implemented | static |

## Page module

[src/page.ts](../src/page.ts) is unchanged in behavior by the revamp.
- **Ready readers:** `ready.timeline`, `ready.post`, `ready.profile`, `ready.explore`, `ready.media`, `ready.account` and `ready.compose`.
- **Lists:** `timeline`, `posts`, `thread`, `trends`, `people`, `results` and `tiles` (X's photo and video grid on search Media, which renders `li` tiles without posts).
- **Values:** `header`, `empty`, `photos`, `handle`, `account`, `composer`, `composer.text` and `composer.media`.
- **Commands:**
  - `setLiked` and `setBookmarked` wait for the control's pressed state to change.
  - `loadMore` waits for the last row to change.

Each screen opens its watches through `whenScreen(screen)`, so a watch reads only on its own screen's pages.

## Interactions

| Screen and control | Result | Input or command, navigation, website or store | Pending, failure and unknown | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Tabs | Select the tab's context or URL | `select`, `navigate` | | implemented | static |
| Post body, avatar, quote | Open the post or profile at once with its skeleton | `navigate({ url })` | | implemented | static |
| Like, Bookmark | Toggle on X | `setLiked`, `setBookmarked` | Optimistic state with a pop animation; a bookmark shows a toast, and removing one offers Undo; a failure or unconfirmed result reverts and says so in a toast | implemented | static |
| Show more | X loads more rows | `loadMore` | Spinner; "No more posts right now."; rate-limit and failure notes with Try again | implemented | static |
| Pull to refresh, Refresh button | Reload the page | `reload` | Pull indicator; progress bar | implemented | static |
| Photo, media tile | Open the media viewer; swipe, Previous and Next move through the post's photos in the viewer, or replace the entry for a photo opened from a link (decision-0017) | `navigate` | "Photo N of M" | implemented | static |
| Media viewer: Save photo, Share | Downloads, Android share sheet | `genesis.downloads.save`, `genesis.share`, the first await of the tap | "Saving to Downloads"; a toast on errors; without `limits.userActions`, View on X | implemented | static |
| Post menu: Save to categories, Edit | Open the `save` sheet | `bookmarks` service | Busy Save; "Saved to …" toast; Remove asks for confirmation, then offers Undo | implemented | static |
| Categories: chips, search, Load more, Manage | Filter and page filed posts; open `manage` | `bookmarks` service; `preferences` store | Skeleton; dimmed list while it reloads; unavailable notice with Try again | implemented | static |
| Manage: create, rename, delete | Change categories | `bookmarks` service | Delete asks for confirmation and offers Undo, which recreates the category by name. A category that still has posts explains why it can't be deleted | implemented | static |
| New post button | Open the composer | `navigate` to `/compose/post` | Lifts above a toast | implemented | static |
| Compose: photo, Remove, Post | Pick up to four photos; post | `useFilePicker`, then `read`/`type`/`attachFiles`/`click` on X's composer | Progress bar and Post spinner; refuses when X's composer holds other content; "Your post was sent" toast | implemented | static |
| Edit profile, profile links, video, Reply, Sign in | X's page in the context | `navigate({ url })` or `viewWebsite`, with the cue | | implemented | static |

## Website features

| Feature and where the site offers it | Handling | Status | Evidence |
| --- | --- | --- | --- |
| Post with photos, `/compose/post` | The applet's composer: `useFilePicker`, then `attachFiles` on X's file input | implemented | static |
| Save photo | `genesis.downloads.save` of the `name=orig` URL | implemented | static |
| Share post | `genesis.share({ url })` | implemented | static |
| Video playback | X's page (website on purpose) | implemented | static |
| Reply composer, `/compose/post?in_reply_to=` | X's page (website on purpose) | implemented | static |
| Sign-in, `/i/flow/login` | X's page through `signInUrl` | implemented | static |

## Data

| Collection or service path | Owner | Key | Shape version | Notes |
| --- | --- | --- | --- | --- |
| `bookmarks` service: categories, filed posts | Servelet on the phone, one X handle | Category id; post id | 1 | Revisions; conflicts reread. Same API as before the revamp |
| `preferences` | Device storage | `categories` | 1 | The last chip and search |
| `operations` | Device storage | Operation id | 1 | A pending write is checked before new writes |

## Native feel

Nothing here has been checked on a device. The brief forbids devices and emulators, so every item stays not checked.

- [ ] Cold start signed in and signed out: not checked. `root` and `home` require the account, and the app opens on the Home feed skeleton.
- [ ] Landing URLs routed or listed as website pages: not checked on a device. These pages show the website on purpose:
  - the `X_PAGES` paths (messages, settings, lists, communities, premium and the rest);
  - the reply composer;
  - video playback;
  - Edit profile;
  - the following and followers lists;
  - sign-in.
- [ ] Skeleton, error, empty and stale state on every routed screen: implemented for each screen, not checked.
- [ ] Details open at once: implemented (each push shows its skeleton), not checked.
- [ ] Pressed state, busy, outcome and Undo on every control: implemented, not checked.
- [ ] Back, overlays and scroll restoration: implemented (sheets close first; ScrollMemory on lists), not checked.
- [ ] Screen motion, no leftover copy after rapid Back: implemented with the kit's Stage and GhostLayer, not checked.
- [ ] Refresh: pull to refresh, plus a Refresh icon button with an aria-label. Not checked.
- [ ] Themes, 200% text, narrow width, reduced motion: light and dark tokens and a reduced-motion block are written. None checked.
- [ ] Website cue on every control that shows the website: implemented, not checked.

## Current work and verification

- Local servelet, 2026-11-16 (decision-0018): implemented. The `bookmarks` service is the `x-bookmarks` servelet; the Node backend moved to `legacy/`. The servelet passes its 32 contract checks and installs on the emulator; the on-device journey is blocked because X answers the Google sign-in with "An unexpected error occurred", so the claim, a category write and a restart remain unverified on a device.
- 2026-11-15, static: `npm run check`, `npm run typecheck` and `npm run build` pass.
- Not run:
  - device installation;
  - the backend;
  - all native-feel scenarios;
  - posting, liking and bookmarking on a real account.
- Known risk: the sheets hold text inputs, and the Android keyboard over a bottom sheet is unverified. The earlier UI used full screens for this reason (decision-0015).
