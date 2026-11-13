# Current specification

Problem ID: instagram-applet · Problem: Instagram applet with PRD feature parity · Spirit animal: 🦩 Flamingo

## Identity

Name Instagram, id `instagram`, origin https://www\.instagram\.com. Created 2026-11-13T14:17:46+05:30. Template `react`: the UI is React, through `mount` and the hooks of `@genesis/sdk/react`.

| Version | Value |
| --- | --- |
| Manifest schema | 6 |
| Bundle format | 3 |
| Protocol | 1 |
| Page control API (`adapterApi`) | 1 |
| SDK and tools | 0.0.0 |
| Kit | 0.0.0 (see `factory/kit.json`) |
| Applet version | 0.1.0, the first published build in `published/` (built with Genesis `ce634ae1e41d`), not tagged yet |

## Product scope

### Request

The user asked for an Instagram applet built from the PRD "Photo and Video Social App (Instagram Feature Parity)" and its 55-screen wireframe set, both local and untracked at the Genesis checkout root. It must be built in full, tested on an emulator (never the connected phone), and signed in with the operator's instagram.com test account.

The user chose **website-backed scope** (decision-0002). The applet draws custom screens for everything the instagram.com mobile website shows and acts through the website's own controls. Flows the website owns, or that Genesis forbids an applet to rebuild, show the website in the same session: sign-in, sign-up, password, camera and upload, editors, Live, calls and settings changes. PRD features that instagram.com does not offer are listed as **not possible** and are not mocked.

### Design reference

The wireframes are the visual reference.

- Tokens: background `#FFFFFF`, surface `#F5F5F5`, field `#EFEFEF`, border `#DBDBDB`, text `#0F0F0F`, muted `#6B6B6B`, action blue `#2457D6`, story ring `#E8503A`, Close Friends `#1E9E5A`, like `#E0245E`, and dark `#000000` for Reels and Stories.
- Type: Inter-like system type. Username 14/700, body 14/400, meta 12–13 muted, titles 16/700, profile name 18/800.
- Radii: buttons 8, cards and inputs 12, sheets 16, chips full.
- Navigation: five bottom tabs: Home, Reels, Messages (center, unread badge), Search, Profile (avatar). Create "+" sits at the top left. The heart at the top right of Home opens Notifications, and the wordmark opens the feed switcher.

Genesis adaptations:

- The shell's menu button owns the top-right 44 dp corner. Top-right icons sit to its left.
- The wireframes' back arrows call the router's Back.
- The placeholder wordmark "frame" becomes the text "Instagram".
- No Instagram logo artwork is copied. The applet has no launcher icon of its own yet.

### Feature map

Delivery is **Applet** (a custom screen over website data, with actions through the website's controls), **Website** (instagram.com in the same session) or **Not possible** (instagram.com has no such feature). The Applet column lists what is built; **Not built** lists planned applet work that is not done and shows the website today.

| PRD area | Applet | Not built | Website | Not possible on instagram.com |
| --- | --- | --- | --- | --- |
| 1 Onboarding | Signed-in detection, sign-in prompt | | Log in, sign up, forgot password, profile setup, switch accounts | Teen Account creation flow |
| 2 Home | Top bar, stories tray, post cards (carousel, video poster with play badge, likes, caption with more, comment count, time), double-tap like, like, save, For you / Following / Favorites tabs, load more | "Caught up" marker, wordmark switcher (tabs instead) | Share sheet, ⋯ menu, report, video playback | GIF comments |
| 3 Stories | Stories tray (rings, seen state) | "Your story" ring | Story viewer, replies, camera, editor, highlights (decision-0006) | |
| 4 Reels | Reels tab entry, reel posters in grids and feed | | Reels player and its actions (decision-0006) | Remix, Series, Friends tab |
| 5 Creation | "+" opens Instagram's Post and Story menu (decision-0010) | | Picker, editor, post details | Reel timeline editor, Live from the web |
| 6 Explore | Explore grid, account search, hashtag suggestions, keyword and hashtag grids, load more | Place pages | QR scan | Map, Audio and Places tabs |
| 7 Profiles | Own and other profile header, Posts / Reels / Tagged / Saved (own) grids, follow and unfollow, Message, followers and following with row follow, post screen, comments screen with posting | Highlights row, saved collections | Edit profile, share profile, close friends, archive | Reposts tab, grid reorder |
| 8 Notifications | Activity rows grouped by period, Follow Back | | Notification settings | |
| 9 Messages | Inbox, chat (text, shared posts, images), send text | Notes tray, unread badge on the tab | Requests, new chat, chat details, media, voice, calls | Instants, Blend, games, scheduled messages |
| 10 Shopping and business | | | Professional dashboard, insights | Plus, gifts |
| 11 Settings and safety | | Profile menu sheet | Settings, Accounts Center, privacy, report | Family Center supervision |
| 12 Cross-cutting | Skeletons, stale copies, inline errors, empty states, light and dark themes, labels | Toasts with Undo | Uploads | Ranking, moderation |

### Core journeys

Status is implementation status. Evidence is in **Verification**.

| Journey | Expected result | Status |
| --- | --- | --- |
| Launch signed out | Instagram's sign-in as the website; Home after signing in | built |
| Home: scroll, open a post, Back | Feed returns | built |
| Like, double-tap like, save | The website's state changes; the icon follows it; failure restores the previous state. On a feed post Instagram has taken off its page, Like and Save open the post's page | built |
| Comments on a post | Comments screen; posting goes through the website's box | built |
| Feed tabs | The matching instagram.com feed; an empty one says so | built |
| Story ring | The website's story viewer; Done returns Home | built |
| Reels tab | The website's Reels player; Done returns to the previous screen | built |
| Search tab: explore, account search, hashtag, keyword | Results and grids; Back returns | built |
| Profile tab: own profile, grids, followers, saved | Own data | built |
| Other profile: follow, message | Follow state from the website; Message opens the chat | built |
| Heart: notifications | Activity grouped by period; Follow Back | built |
| Messages: inbox, chat, send text | Thread; sent message appears | built |
| "+" create | Instagram's Post and Story menu as the website | built |
| Unrouted page, Done | The website, then the previous screen | built |
| Account change | No copy of the other account's pages | built (router `account`) |

### Data authority

Instagram owns accounts, posts, stories, reels, comments, likes, saves, follows, messages and notifications. The applet copies none of it and keeps no storage (decision-0008).

### Open questions

None. Write actions during verification are allowed (decision-0005).

## Plan

Phases 0–9 are done on branch `feat/instagram-applet` of the applets repository; the dark story viewer and Reels feed of phases 5 and 6 became website pages (decision-0006). Remaining work is the **Not built** column above. Version 0.1.0 is published for the first pull request; raise the patch version and run `genesis-applet publish` again before each later pull request that changes the applet.

## Contexts

Decision-0007.

| Context | Start URL | Tabs |
| --- | --- | --- |
| primary | https://www\.instagram\.com/ | Home, Reels, Profile; Notifications |
| explore | https://www\.instagram\.com/explore/ | Search |
| direct | https://www\.instagram\.com/direct/inbox/ | Messages |

## Routes

The router table is `ROUTES` in `src/routes.ts`, in match order. Every route except the website ones needs the account. A URL without a route shows the website.

| Route id | Screen | Context | Ready reader |
| --- | --- | --- | --- |
| `website-*` (Reels, stories, accounts, create, challenge, new chat, requests) | website | | |
| home | home | primary | `ready.feed` |
| activity | activity | primary | `ready.activity` |
| keyword, tag | keyword | explore | `ready.keyword` |
| search | search | explore | `ready.search` |
| explore | explore | explore | `ready.explore` |
| inbox | inbox | direct | `ready.inbox` |
| thread | thread | | `ready.thread` |
| comments | comments | | `ready.comments` |
| post, reel, user-post, user-reel | post | | `ready.post` |
| followers, following | follows | | `ready.follows` |
| profile-reels, profile-tagged, profile-saved, profile | profile | | `ready.profile` |
| `website-<reserved>` (Instagram paths `/:user` would match) | website | | |

## Website inspection

Phase 1 read the instagram.com mobile website in the Genesis WebView on `emulator-5554`, signed in with the test account. Hooks the page module relies on:

| Page | URL | Stable hooks |
| --- | --- | --- |
| Any | | Global nav links `a[href="/"]`, `/explore/`, `/reels/`, `/direct/inbox/`, `/notifications/`; own profile is the nav link whose `img` alt is "<user>'s profile picture" |
| Sign-in | `/accounts/login/` | The website's own form; a "Check your notifications on another device" challenge can follow |
| Home feed | `/` (`?variant=following`, `?variant=favorites`) | Each post is an `article`; the key is the shortcode of the link that holds `time[datetime]` (`/<user>/p/<code>/` or `/<user>/reel/<code>/`); author `a[href="/<user>/"]`, `svg[aria-label=Verified]`; media `img` alt "Photo by …"; carousel `ul > li` with `button[aria-label="Go to slide N"]`; video is `video[src^=blob:]` beside a poster `img`; `section` with `svg[aria-label=Like]` (`Unlike` when liked), the like count in the next `span[role=button]`, `Comment`, `Repost`, `Share`, `Save` (`Remove` when saved); caption `span[dir=auto]` with a "more" button. Synthetic clicks on the Like and Save buttons work |
| Stories tray | `/` | `div[role=button][aria-label^="Story by "]`, "not seen" in the label; no links, opens by click |
| Post | `/<user>/p/<code>/`, `/p/<code>/` | One `article`; "View all N comments" links to `/p/<code>/comments/` |
| Comments | `/p/<code>/comments/` | Rows of avatar link, username, text, `time[datetime]`, "N likes" link `/p/<id>/c/<cid>/liked_by/`, Reply, `svg[aria-label=Like]`; `textarea[aria-label="Add a comment…"]` inside a `form` |
| Profile | `/<user>/` | `header`: avatar img, `h2` username, Verified, counts as "N posts", `a[href$="/followers/"]`, `a[href$="/following/"]` (exact count in `span[title]`); name, bio, links, "Followed by"; a `Follow`/`Following` button and `Message`; grid links `/<user>/p/<code>/`, `/<user>/reel/<code>/` with `svg[aria-label=Carousel]` or `Clip`; tab links `/<user>/reels/`, `/<user>/tagged/`, and `/<user>/saved/` on one's own profile |
| Followers | `/<user>/followers/`, `/following/` | Rows of username link, name and Follow button |
| Explore | `/explore/` | Grid of `a[href^="/p/"]`, `svg[aria-label=Reel]` on reels |
| Search | `/explore/search/` | `input[placeholder=Search]`; results sit in a `nav` inside `main`: account rows `a[href="/<user>/"]` with avatar, username, Verified and a subtitle, and hashtag rows `a[href^="/explore/tags/"]` with the tag and "N posts". Hashtags: `/explore/search/keyword/?q=%23tag` (an `h1` and a post grid); `/explore/tags/<tag>/` redirects there. The box empties on Back |
| Notifications | `/notifications/` | Rows `div[data-pressable-container]` with text, `abbr[aria-label]` time, optional profile link and "Follow Back" button; period headings ("Today"); "Suggested for you" list |
| Inbox | `/direct/inbox/` | No `main`; `h1` "Messages"; Notes tray; Messages and Requests tabs; `/direct/new/` |
| Reels | `/reels/` | Redirects to `/reels/<code>/`; players play `blob:` video (decision-0006) |
| Stories | `/stories/<user>/` | "View as <user>?" interstitial, then the player (decision-0006) |
| Favorites, Following feeds | `/?variant=…` | An empty feed shows an `h3` heading and no `article` |
| Create | `/` | The top bar's "+" is `a[href="#"]` with an icon labelled "Home"; it opens a `[role=dialog]` with Post and Story. `/create/select/` is an account's profile, not a create page |
| Chat | `/direct/t/<id>/` | The inbox stays in the DOM inside `[role=navigation]` with the account's own name in an `h2`; the chat title is the first `h2` outside it |

## Page module

`src/page.ts`, built from `src/adapter/pages.ts` (readers and commands) and `src/adapter/read.ts` (row readers).

| Reader | Kind | Reads |
| --- | --- | --- |
| `ready.*` | value | Whether a route's page shows its subject |
| `account`, `me` | value, one | Signed-in evidence; own username and avatar from the nav |
| `feed` | list, virtualized | Feed posts by shortcode |
| `stories` | list | Story rings |
| `post`, `comments` | one, list | A post page and its comments |
| `profile`, `grid` | one, list | Profile header; post and reel tiles |
| `people`, `results`, `tags` | list | Follow lists; search accounts; search hashtags |
| `query`, `title` | one, value | Search box text; page `h1` |
| `activity` | list | Notification rows |
| `threads`, `thread`, `messages` | list, one, list | Inbox rows; chat header; chat messages |

| Command | Does |
| --- | --- |
| `setLiked`, `setSaved` | Clicks the post's Like or Save until its label matches |
| `loadMore` | Scrolls to the end until a new last item shows |
| `openStory` | Clicks a story ring |
| `addComment` | Fills the comment box and clicks Post |
| `setFollowing`, `followPerson` | Follows or unfollows from a profile header or a row |
| `message` | Clicks a profile's Message |
| `search` | Fills the search box |
| `openCreate` | Opens Home's Post and Story menu |
| `openThread`, `sendMessage` | Opens a chat by its row key (the title, plus its place among chats of the same title); types and sends a message |

## Data

The applet keeps no storage (decision-0008).

## Verification

Device: AVD `Genesis_Verify_API_37_1`, serial `emulator-5554`, Genesis debug build, applet installed as a development build (latest revision 14), signed in with the operator's test account. Checked on the device by tapping the applet and reading the WebViews over the DevTools socket, 2026-11-13:

- Home feed, carousel, video poster, like, save, double-tap like, comments screen, posting a comment, load more (3 to 6 posts), Following feed, empty Favorites notice.
- Story ring opens the website viewer; Done returns Home. Reels tab opens the player; Done returns to the previous screen (Notifications) or Home.
- Explore grid; account search and opening a profile; hashtag suggestions; hashtag grid and its load more (24 to 48 tiles); keyword grid; a caption hashtag opens its grid; a grid tile opens the post screen.
- Own profile; another profile's follow and unfollow; followers and following with tab switching and row follow and unfollow; Message opens the chat.
- Notifications grouped by period; Follow Back.
- Inbox; chat header; sending a message.
- "+" opens Instagram's Post and Story menu; Done returns Home.

Not verified: signing in from the signed-out state (the session was kept), switching accounts, dark mode, large text, posting through the create flow, and video playback beyond opening the website player. Avatars from Instagram's CDN sometimes fail to load and show a letter instead.
