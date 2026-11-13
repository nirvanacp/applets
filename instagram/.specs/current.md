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
| Applet version | 0.1.0 (from the template; not raised) |

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
- No Instagram logo artwork is copied. The launcher icon is original art.

### Feature map

Delivery is **Applet** (a custom screen over website data, with actions through the website's controls), **Website** (instagram.com in the same session) or **Not possible** (instagram.com has no such feature). This map follows current knowledge of the mobile website. Phase 1 (inspection) can move an item between columns, and each move is recorded here with evidence.

| PRD area | Applet | Website | Not possible on instagram.com |
| --- | --- | --- | --- |
| 1 Onboarding (ON-1–6) | Signed-in detection | Log in, sign up, forgot password, profile setup, switch accounts | Teen Account creation flow |
| 2 Home (HF-1–11) | Top bar, stories tray, post cards (carousel, video poster, likes, caption with more, comment count, time), double-tap like, like, save, feed switcher (For you, Following, Favorites), comments sheet, "caught up" marker | Writing a comment, share sheet, ⋯ menu actions beyond save, report | Repost if absent, GIF comments |
| 3 Stories (ST-1–9) | Stories tray (rings, seen state, "Your story") | Story viewer with progress, tap, hold, reply and like (decision-0006); story camera, editor, stickers, audience, viewers, highlight editing | Sticker voting if the site does not render it |
| 4 Reels (RL-1–8) | Reels tab entry; reel posters in grids and feed | Reels player and its overlay, actions and audio page (decision-0006); reel camera, editor, Your Algorithm | Remix, Series, dubbing, Friends tab |
| 5 Creation (CR-1–11) | "+" entry | Gallery picker, editor, post details | Reel timeline editor, AI tools, Live from the web |
| 6 Explore (EX-1–5) | Explore grid, search with recents and results, hashtag and place pages | QR scan | Friends map, Audio and Places tabs if absent |
| 7 Profiles (PF-1–10) | Own and other profile header, highlights, Posts/Reels/Tagged grids, follow, message, followers and following, saved and collections, post detail | Edit profile, share profile, close friends, archive, Your Activity | Reposts tab, grid reorder |
| 8 Notifications (NT-1–4) | Activity feed grouped by period, follow back | Notification settings | Filters the site lacks |
| 9 Messages (DM-1–14) | Inbox (Notes tray if present, unread, requests), thread (text, shared posts, images, reactions, seen), send text | New group, chat details, media and voice, calls, notes composer, channels | Instants, Blend, games, scheduled messages |
| 10 Shopping and business | Product tags if the site renders them | Professional dashboard, insights, boost | Plus subscription, gifts |
| 11 Settings and safety (SE-1–9) | Profile menu sheet with settings entries | Settings, Accounts Center, privacy, safety, report | Family Center supervision |
| 12 Cross-cutting (NF-1–10) | Skeletons, stale copies, toasts with Undo, light and dark themes, labels, 48 dp targets, reduced motion | Uploads | Server-side media, ranking, moderation |

### Core journeys

| Journey | Expected result | Status |
| --- | --- | --- |
| Launch signed out | Instagram's sign-in as the website; Home after signing in | planned |
| Home: scroll, open a post, Back | Feed returns at its scroll position | planned |
| Like, double-tap like, save | The website's state changes; the icon follows it; failure restores the previous state | planned |
| Comments on a post | Sheet with comments; writing opens the website's box | planned |
| Feed switcher | The matching instagram.com feed | planned |
| Story ring | The website's story viewer; Back returns to Home | planned |
| Reels tab | The website's Reels player; switching tabs keeps it | planned |
| Search tab: explore, account search, hashtag | Results and pages; Back returns | planned |
| Profile tab: own profile, grids, followers, saved | Own data; Edit profile opens the website | planned |
| Other profile: follow, message | Follow state from the website; Message opens the chat | planned |
| Heart: notifications | Activity grouped by period | planned |
| Messages: inbox, chat, send text | Thread; sent message appears | planned |
| "+" create | Instagram's create flow as the website | planned |
| Unrouted page, Done | The website, then the previous screen | planned |
| Account change | No copy of the other account's pages | planned |

### Data authority

Instagram owns accounts, posts, stories, reels, comments, likes, saves, follows, messages and notifications. The applet copies none of it into storage. Applet storage holds only UI preferences (decision-0004).

### Open questions

None. Write actions during verification are allowed (decision-0005).

## Plan

Each phase is completed, checked and committed in the applets repository before the next one starts, as `feat/(instagram): …` on branch `feat/instagram-applet`. The applet version stays 0.1.0; raising it and publishing happen only before a pull request.

| Phase | Work | Checks |
| --- | --- | --- |
| 0 Plan | This spec, decisions, change record | Review against the PRD |
| 1 Inspection | Install the Genesis debug build on `emulator-5554`, sign in with the test-accounts scripts, inspect every instagram.com page in the WebView, record stable hooks (URLs, `aria-label`s, roles, `article`, `time[datetime]`, `href` patterns, image `alt`) and which features the site offers | Notes here, no page dumps |
| 2 Shell | Manifest (three contexts, accent, original icon), tokens, screen switch with motion, tab bar with avatar and unread badge, shared components, account reader | `npm run check`, `npm run build`, install, launch |
| 3 Home | Readers for the feed, stories tray and comments; commands `setLiked`, `setSaved`, load more; home screen, post card, carousel, feed switcher, comments sheet | Device journeys |
| 4 Post and profile | Post screen, profile with grids, `setFollowing`, followers and following, saved | Device journeys |
| 5 Stories | Dark story viewer | Device journeys |
| 6 Reels | Reels feed and audio page | Device journeys |
| 7 Explore and search | Explore grid, search, tag and place pages | Device journeys |
| 8 Activity and messages | Notifications, inbox, thread, `sendMessage` | Device journeys |
| 9 Handoffs and polish | `website: true` routes for site-owned flows, profile menu, dark mode, large text, narrow width | Presentation scenarios |
| 10 Acceptance | Walk every journey; update the inventories with evidence and the README | Verification report |

## Contexts

Decision-0003.

| Context | Start URL | Tabs |
| --- | --- | --- |
| home | https://www\.instagram\.com/ | Home, Profile, Notifications |
| explore | https://www\.instagram\.com/explore/ | Search, Reels |
| direct | https://www\.instagram\.com/direct/inbox/ | Messages |

## Routes

Planned; finalized after phase 1. The router table is in `src/routes.ts`. Any URL without a route shows the website.

| Route id | Pattern | Screen | Context | Status |
| --- | --- | --- | --- | --- |
| home | `/` | home | home | planned |
| post | `/p/:code/`, `/reel/:code/` | post | | planned |
| reels | `/reels/`, `/reels/:code/` | reels | reels | planned |
| stories | `/stories/:user/:id/` | story | | planned |
| explore | `/explore/` | explore | reels | planned |
| search | `/explore/search/` | search | reels | planned |
| tag | `/explore/tags/:tag/` | tag | | planned |
| place | `/explore/locations/:id/:slug/` | place | | planned |
| activity | `/notifications/` | activity | home | planned |
| inbox | `/direct/inbox/`, `/direct/requests/` | inbox | direct | planned |
| thread | `/direct/t/:id/` | thread | direct | planned |
| saved | `/:user/saved/…` | saved | | planned |
| follows | `/:user/followers/`, `/:user/following/` | follows | | planned |
| profile | `/:user/`, `/:user/reels/`, `/:user/tagged/` | profile | | planned |
| website | `/accounts/*`, `/create/*`, `/challenge/*` and other site-owned flows | website | | planned |

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
| Search | `/explore/search/` | `input[placeholder=Search]`; results are account rows `a[href="/<user>/"]` with avatar, username, Verified and a subtitle. Hashtags: `/explore/search/keyword/?q=%23tag` (an `h1` and a post grid); `/explore/tags/<tag>/` redirects there |
| Notifications | `/notifications/` | Rows `div[data-pressable-container]` with text, `abbr[aria-label]` time, optional profile link and "Follow Back" button; period headings ("Today"); "Suggested for you" list |
| Inbox | `/direct/inbox/` | No `main`; `h1` "Messages"; Notes tray; Messages and Requests tabs; `/direct/new/` |
| Reels | `/reels/` | Redirects to `/reels/<code>/`; players play `blob:` video (decision-0006) |
| Stories | `/stories/<user>/` | "View as <user>?" interstitial, then the player (decision-0006) |

## Page module

Recorded with each reader as it is built. The scaffold's `links` reader is still in `src/page.ts`.

## Data

| Collection | Owner | Key | Shape version | Notes |
| --- | --- | --- | --- | --- |
| `ui` | Applet storage | `prefs` | 1 | Feed variant and recent searches (decision-0004) |

## Verification

Not run. Device: AVD `Genesis_Verify_API_37_1`, serial `emulator-5554`, created for this task with a 6 GB data partition because the host disk has about 10 GB free. The Genesis debug build is installed on it.
