# Current X specification

## Identity

- Name X, applet id `x-bookmarks`, origin `https://x.com`.
- Three contexts, each with its own website session history: `primary` (Home, Notifications and Saved, start URL `/home`), `explore` (`/explore`) and `account` (`/settings/account`, the Profile tab). The adapter is [src/adapter.ts](../src/adapter.ts) with pages `timeline`, `post`, `profile`, `explore`, `media` and `account` in [src/adapter](../src/adapter).
- Screens: route screens `home`, `notifications`, `saved`, `explore`, `post`, `profile`, `media` and `account`; overlay screens `categories`, `save` and `manage`. Service: `bookmarks`.
- Manifest schema 6, `@genesis/sdk` 0.0.0, `genesis-applet` tools 0.0.0, protocol 1, adapter API 1. Kit version: not exported for this in-repository applet. The [manifest](../applet.json) is the authority for routes and contexts.
- Published release: version 0.0.0, build and release record in `published/` (built with Genesis `aebef4c113b0`), not tagged yet. Before a pull request that changes this applet, raise the version and run `genesis-applet publish` again.
- Installed for development with `dev install`; it is not bundled into the APK.

## Product scope

One complete X client with five tabs: Home, Explore, Notifications, Saved and Profile, in the mobile X visual identity. Saved holds Bookmarks, Likes and the private Categories library in one row. Preserve post detail with its conversation, the media viewer, profiles with Posts, Replies and Media, liking and bookmarking.

Data authority: X owns accounts, posts, likes and bookmarks. The `bookmarks` service owns Categories and the post snapshots filed in them; it is a personal backend bound to one X handle, not a multi-user service. Website cookies never authenticate the service. Categories and X bookmarks stay independent: filing a post never bookmarks it, and removing it from Categories never changes its X bookmark.

Excluded: automatic import or sync of X bookmarks into Categories, an offline write queue, and a media archive.

## Defaults and overrides

| Rule id | Current choice | Origin and reason | Decision |
| --- | --- | --- | --- |
| default-platform-menu | Shell menu button, accent `#1d9bf0`; the first row of every screen leaves the button's corner clear | Factory default | decision-0003 |
| default-primary-navigation | One bottom tab bar of five sections; reselecting the active root tab scrolls to the top; hidden in the media viewer | Inherited user choice | decision-0001 |
| default-pending-skeletons | Neutral, static, content-shaped skeletons | Factory default | |
| default-compact-website-cue | External-link icon on every control that opens the website (shown with the website bar and Done) | Factory default | |
| default-theme-and-layout | Neutral X palette, light and dark, system font, 15px/20px post text, 40px avatars, hairline separators | Inherited user design direction | decision-0002 |
| Category editors | `save` and `manage` screens in the stack instead of keyboard-safe sheets, so Android Back closes them | Agent choice for SDK 0.0 | decision-0004 |

## Routes

Routes are matched in manifest order and the first match wins. A URL without a route shows X's page itself in its context.

| Route id | Example URL | Page and screen | Loading, empty, sign-in and error | Back | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| home | `/home` | `timeline`, `home` (context `primary`) | Skeleton; X's empty-state text; sign-in prompt; error with website button | Context start | verified | device |
| notifications | `/notifications` | `timeline`, `notifications` (`primary`) | As above | Context history | verified | device |
| bookmarks, bookmarks-alias, own-likes | `/i/history`, `/i/bookmarks`, `/i/history/likes` | `timeline`, `saved` with the Saved row (`primary`) | As above | Context history | verified (Bookmarks) | device |
| explore, search, hashtag | `/explore`, `/search?q=genesis`, `/hashtag/android` | `explore`, `explore` (context `explore`) | Skeleton; empty notice; error | Context history | verified (explore) | device |
| account | `/settings/account` | `account`, `account` (context `account`), then replaced by the own profile | Sign-in prompt when signed out | Context start | verified (signed in) | device |
| photo | `/XDevelopers/status/1/photo/1` | `media`, `media` | Black viewer; Open on X on failure | Context history | implemented | static |
| post | `/XDevelopers/status/1` | `post`, `post`: one `thread` region split at the post the URL names | Skeleton; X's empty text; error | Context history | verified | device |
| likes | `/XDevelopers/likes` | `timeline`, `saved` without the Saved row unless it is the signed-in handle | As for home | Context history | implemented | static |
| replies, profile-media, profile | `/XDevelopers/with_replies`, `/XDevelopers/media`, `/XDevelopers` | `profile`, `profile` with Posts, Replies and Media | Skeleton; empty notice; error. One-segment X pages such as `/messages` match `profile` and show the error "This X page isn't a profile" with Open on X | Context history | verified (other and own profile) | device |
| Other X URLs | `/i/flow/login`, `/XDevelopers/following` | X's page in the context | X's page | Context history | implemented | static |

## Interactions

| Screen and control | Result | Action, navigation, website or store | Pending and failure | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Tabs | Home selects `primary`, Explore `explore`, Profile `account`; Notifications and Saved load their X page in `primary` unless it already shows them | `select`, `navigate({ url, context: "primary" })` | | verified (all five) | device |
| Post body, author, quote | Open the post or profile | `navigate({ url })` | Unrouted pages show X's page | verified | device |
| Post photo | Open the media viewer; Previous and Next replace the entry | `navigate({ url, mode: "replace" })` | Open on X when the photo is missing | implemented | static |
| Like | Like or unlike on X | `setLiked` on the row of the region the post is shown in | Optimistic state while pending; inline error; disabled while stale or without an account | implemented, not exercised | static |
| Bookmark | Bookmark or remove the X bookmark | `setBookmarked`, as above | As above | implemented, not exercised | static |
| Show more | X loads the next rows | `loadMore` page action: scroll X's page to its end until the last row changes | "No more posts right now." when the last row stays put | verified (Home) | device |
| Saved row: Bookmarks, Likes, Categories | Switch Saved view | `navigate` URL in `primary`, or the `categories` overlay | | verified (Bookmarks) | device |
| Categories chips, search, Load more | Filter and page filed posts | `bookmarks` service | Skeleton; unavailable notice with Try again | verified (unavailable state) | device |
| Save to categories and Edit | Open the `save` overlay | `bookmarks` service | Conflict rereads; a pending change is checked before new writes | verified (unavailable state) | device |
| Manage categories | Create, rename and delete categories | `bookmarks` service | Delete confirmation; nonempty categories are refused | implemented, writes not exercised | static |
| Edit profile, Reply, Compose, Sign in | X's page in the context | `navigate({ url })` | | implemented | static |
| Profile tab after sign-in or sign-out | Read the account again | `reload("account")` at the app root on resume | | implemented | static |

## Data

| Collection or service path | Owner | Key | Shape version | Notes |
| --- | --- | --- | --- | --- |
| `bookmarks` service, table `libraries` | Applet service | Library id | 1 | Expected X handle, set at first database creation; the account source must match it |
| `bookmarks` service, table `categories` | Applet service | Library id and category id | 1 | Name, revision; at most 50 |
| `bookmarks` service, table `saved_posts` | Applet service | Library id and post id | 1 | Post URL and snapshot, revision, saved time |
| `bookmarks` service, table `memberships` | Applet service | Library, post and category ids | 1 | At most 10 categories per post |
| `bookmarks` service, table `operations` | Applet service | Library id and operation id | 1 | Receipts for idempotent writes |
| Local collection `operations` | Applet storage | `pending:<libraryId>` | 1 | Marker for a write whose outcome is unknown; checked before the next write |

The backend and its records are unchanged by the SDK 0.0 rewrite. Categories restores its search and category filter from the local `preferences` collection (key `library:<libraryId>`) and writes them back when the user changes them; its scroll position is kept by the SDK. The old `session` collection is no longer read.

## Current work and verification

Browser capabilities, checked on 2026-11-10 on the Samsung SM-M307F (Android 11) with revision 5. Evidence kind: device with the real website. No code change was needed. `check` (no warnings) and `typecheck` pass. Results of the plan below:

1. Sign-in: blocked by X. X was signed out when checked: opening it shows X's landing page as the website, not the applet's signed-out state, because the start page leaves `/home` for X's landing page. The update did not cause the sign-out, since applets share one website sign-in unless the Applet info switch is on, and it was off; the session had most likely ended on X's side before. Signing in on X's page with the test account (username, then password) answered "Sorry, you are not allowed to log in at this time.", twice; no third attempt was made. "Sign in with Google" was not tried, because it needs the operator's approval. Session lifetime and separation from the other applets were therefore not checked.
2. Links in: partly verified, signed out. A `https://x.com/<handle>/status/<id>` link in Home's "Open a link" opens in X without a choice, as X's page under the website bar with the banner "X doesn't have a screen for this page"; Done then shows X's landing page, since a signed-out person gets no post screen. This is the same Genesis behavior Hacker News records: a link Genesis opens always shows the website. Genesis has since changed this; see the Genesis update below. Blocked: the post screen, sharing from another app and Back, which need a signed-in session.
3. Outside links: blocked, needs a signed-in session.
4. Dark mode and font size: dark mode verified for X's revealed landing page only. The applet's own screens and the largest font size are blocked, needs a signed-in session.
5. Regression: blocked, needs a signed-in session.

Genesis update, 2026-11-10, with revision 6 on the same phone, no applet code changed: an opened link now asks where it opens ("Open in X" or "Create a new applet") and shows the applet's own screen with no website pin. On Hacker News's revealed page, a test link to `https://x.com/home` with `target=_blank` opened X; X was still signed out, so it showed X's landing page with the banner "X doesn't have a screen for this page", and Back went to Genesis Home. The post screen and Back to a sharing app stay blocked until X accepts a sign-in.

2026-11-08, migration to adapter pages, regions and contexts, on the `emulator-5554` emulator (Android 17) with a signed-in X account and no running `bookmarks` service:

- Static: `check` (no warnings), `typecheck` and `build` passed.
- Device: Home, Explore with trends and People, Notifications, Saved Bookmarks, the Profile tab moving on to the own profile, another account's profile, and a post with the thread split at the focal post rendered. Saved to Home returns to `/home`. Show more added rows from X. The Save overlay showed its unavailable state and Back closed it.
- Fixed: a focused post's view count read "87.7K Views views".
- Not exercised: like and bookmark actions (no X action was performed), the media viewer, search and hashtags, signed-out states and dark mode.
- Known gaps: notification text runs X's name, time and text together; a one-segment X page that isn't a profile shows an error with Open on X instead of X's page.

## Plan: browser capabilities update (2026-11-10)

Genesis now gives website pages in an applet what a browser gives them: file downloads, popup windows, site permission prompts, links to other apps, dark mode and the system font size on website pages, links shared to Genesis, and a separate website sign-in for an applet whose Applet info switch is on. The switch is off by default, so applets share one website sign-in. The SDK did not change. X needs no code change: its adapter reports the account, `safeLink` keeps only web links, and the theme follows `prefers-color-scheme`. X's sign-in page offers "Sign in with Google" and "Sign in with Apple", which open a popup window; Genesis now shows such windows as a sheet, so that path may work for the first time. This plan only verifies the applet under the new platform, including the dark mode and signed-out states the 2026-11-08 check did not reach.

Verify on the phone with the current Genesis debug build (`android/gradlew -p android :app:installDebug`) and the applet (`node packages/applet-tools/src/cli.mjs dev install applets/x-bookmarks --device <serial>`), both run from the Genesis root. Do not like, bookmark, post, follow or change account settings, except on a disposable account the operator approves. Record the device, Android version, revision and results here, and keep account names and screenshots out.

1. Sign-in after the update. Applets keep sharing one website sign-in unless the separate sign-in switch in Applet info is on, so the update itself asks for no new sign-in. If X is signed out, it shows its signed-out state ("Sign in to X to use your categories."). Record what it showed. Sign in on X's page with the test account. With the operator's approval, also try "Sign in with Google": Google's page opens as a sheet over X, and after sign-in the sheet closes and X shows Home. The session lasts after the app is closed and reopened, and does not change Gmail Only's or Hacker News's session.
2. Links in. Share a `https://x.com/<handle>/status/<id>` link from another app to Genesis, and paste one into Home's "Open a link". Genesis asks where it opens, with "Open in X" and "Create a new applet"; Open in X shows the post screen. Back from a shared link leaves to the app that shared it.
3. Outside links. A profile link or a post's link card to another website opens in the same context under the website bar, and Done returns. If that page opens a window, the window appears as a sheet and closes back to the page. If it asks for the camera, microphone or location, Genesis asks first; deny it.
4. Dark mode and font size. In system dark mode the applet is dark, and so are X's pages shown as the website, such as compose, messages and settings. At the largest system font size, Home, a post with its thread, a profile, Explore and the Save overlay keep labels readable and controls tappable, with no clipped text.
5. Regression. The tabs, Explore search, a profile and Back, the media viewer, and Saved and Categories with the service stopped.

Report each step as verified, failed or blocked. Fix a failure in the applet when the applet's code causes it; describe a platform failure with a sanitized reproduction instead of working around it in the applet.
