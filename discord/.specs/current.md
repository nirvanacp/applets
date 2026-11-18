# Current specification

Problem ID: `discord-applet` · Problem: Build a Discord applet · Spirit animal: 🦔 Hedgehog

## Identity

Name Discord, id `discord`, origin https://discord\.com. Created 2026-11-17T17:07:23+05:30. Template `react`, TypeScript: the UI is React, through `mount` and the hooks of `@let/sdk/react`.

- Context: `primary`, start URL https://discord\.com/channels/@me (the signed-in landing page; Discord sends a signed-out visitor to `/login`).
- Routed screens: `messages`, `chat`. Overlay screens: `servers`, `channels`.
- Services and stored data: none.

| Compatibility | Value |
| --- | --- |
| Manifest schema | 6 |
| Bundle format | 3 |
| Protocol | 1 |
| Page control API (`adapterApi`) | 1 |
| SDK and tools | 0.0.0 |
| Kit | 0.0.0 (see `factory/kit.json`) |

## Product scope

The user asked for a Discord applet that follows every best practice, with a mobile-friendly UI (2026-11-17). Discord's website is a desktop-shaped app that is cramped on a phone; the applet gives it the shape of a phone app over the same signed-in session.

Core journeys:

1. **Messages.** Open the applet and see the direct and group messages with avatars, names, unread marks and mention counts. Tap one to read the conversation.
2. **Servers.** See the servers the account belongs to, with icons and mention counts. Tap one to open its last channel, and pick another channel from the server's channel list.
3. **Read a channel or conversation.** Messages grouped by author with avatars, times, edited marks, replies, links, images and file attachments, and reactions. Load older messages from the top.
4. **Write.** Type a message and send it with one tap; attach photos or files from the phone; reply to a message.
5. **React.** Tap an existing reaction to add or remove yours; tap a message to add one of six quick reactions or copy its text.

Preserved website workflows: everything else stays on the website in the same session: sign-in, settings, voice and video, threads and forums, server discovery, Nitro and payments, friend requests, profile editing, message menus (edit, delete, pin, forward) and the full emoji picker. These appear as the website from controls with the website cue, or through View website in the Genesis menu.

Data authority: Discord owns every record. The applet stores nothing; the unsent draft lives in memory only.

Exclusions (chosen by the builder, open for the user to change): no voice or video, no editing or deleting messages, new reactions limited to six quick ones (👍 ❤️ 😂 😮 😢 🔥), no notifications.

## Defaults and overrides

| Rule id | Current choice | Origin and reason | Decision |
| --- | --- | --- | --- |
| default-platform-menu | Shell floating menu button, Genesis menu and website bar, splash accent `#5865f2` from `shell.accent`, applet icon from `shell.icon` | Factory default | |
| default-theme | Light and dark from the system setting, with Discord's palette in each | Discord's own apps have both themes | decision-0003 |
| default-contexts | One context | Discord is one heavy single-page app with one gateway connection | decision-0002 |

## Routes

The router table is in `src/routes.ts`. Any URL without a route shows the website.

| Route id | Pattern and example URL | Screen | Context | Ready reader | Loading, empty, sign-in and error | Back | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| messages | `/channels/@me`, https://discord\.com/channels/@me | messages | primary | `ready.messages` | conversation-row skeleton; "No messages yet" with Friends on the website; sign-in by the router; error with Retry and View website | leaves the applet (tab root) | implemented | empty state verified on device (the test account has no DMs) |
| dm | `/channels/@me/:channel` | chat | primary | `ready.chat` | message skeleton; the channel's beginning as the confirmed empty state; error with Retry and View website | to the previous entry | implemented | not verified on device |
| thread | `/channels/:guild/:channel/threads/:thread` | website | primary | none | the website, on purpose | website Back | implemented | not verified on device |
| channel | `/channels/:guild/:channel` | chat | primary | `ready.chat` | as `dm` | to the previous entry | implemented | not verified on device |
| guild | `/channels/:guild` | chat | primary | `ready.chat` | message skeleton; at phone width Discord keeps this URL and shows the last channel (decision-0006) | to the previous entry | implemented | verified on device, Back included |
| app | `/app` | messages | primary | `ready.messages` | skeleton while Discord redirects | as `messages` | implemented | not verified on device |

Website pages on purpose: `/login`, `/register` and every challenge (the router's sign-in), threads and forum posts, settings, voice, discovery, Nitro, and any unrouted link.

## Page module

`src/page.ts`, readers in `src/adapter/*`:

| Reader | Kind | Key and extent | Used by |
| --- | --- | --- | --- |
| `account` | value | `true` while Discord shows its signed-in app (user area, drawer, or menu button with the inbox); `false` on `/login`, `/register` and the sign-in form | router `account.signedIn` |
| `ready.messages` | value | true once the direct-messages sidebar is drawn | route `messages` |
| `ready.chat` | value | true once the message list of the URL's channel is drawn; on a server URL without a channel, once any rows exist (decision-0006) | routes `dm`, `channel`, `guild` |
| `drawer` | value | true while Discord's drawer is open | `useDrawer` |
| `conversations` | list | DM channel id; the sidebar's DM links | `messages:conversations` |
| `guilds` | list | guild id; the server rail; entries without a numeric id get a `-` prefix and are not shown | `servers:guilds` |
| `channels` | list, virtualized | channel id; the current server's channel list, with its category | `channels:channels` |
| `place` | value | the current channel's id (URL or rows), name, kind, server name and whether the channel's beginning is shown | `chat:place` |
| `messages` | list, virtualized | message id; text parts, reply, media, stickers, files, embeds and reactions; extent the group's first message, whose header names the author of a continued group | `chat:messages` |
| `composer` | value | the editor's text, label, whether it is writable, and the number of attachments waiting | `chat:composer` |
| `attached` | value | args `{ count }`: true once that many uploads wait in the composer | `send` with files |

| Command | Does | Evidence |
| --- | --- | --- |
| `openDrawer` | clicks Discord's menu button when the drawer is closed | the drawer is drawn |
| `send` | args `{ text, files, replyTo? }`: cancel a leftover reply bar; with `replyTo`, open the message's More menu and Reply (decision-0012); scroll to the newest message, `attachFiles` when files wait, then `fill` and click Send on the phone composer, or trusted typing and Enter on the desktop editor (decision-0007) | a new message row, created after the tap and not sending or failed, holds the text (decision-0009), and with `replyTo` quotes that message; editor and uploads empty |
| `loadOlder` | scrolls Discord's message scroller to the start | the first message changes |
| `setReaction` | args `{ message, emoji, on }`: clicks the reaction when its pressed state differs | the reaction's `aria-pressed` equals `on` |
| `addReaction` | args `{ message, emoji }`: clicks the existing chip, or opens the message's Add Reaction picker, searches the emoji's name and picks it (decision-0012) | the emoji's chip is pressed |

## Interactions

The regression script for these, case by case with the last run, is [interactions.md](interactions.md).

| Screen and control | Result | Input or command, navigation, website or store | Pending, failure and unknown | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Tabs: Messages | the DM list | `navigate({ url: /channels/@me })`; reselect scrolls to top | none | implemented | verified 2026-11-18; reselect not checked |
| Tabs: Servers | the server list | `navigate({ screen: "servers", mode: "root" })` | none | implemented | verified: five servers |
| Messages: row | the conversation | `navigate({ url })` with the row's URL | skeleton at once | implemented | not verified |
| Messages: Friends | Discord's friends page | `viewWebsite()`, website cue | none | implemented | verified 2026-11-18, Done returns |
| Servers: Add or discover servers | Discord's add and discover pages | `viewWebsite()`, website cue | none | implemented | verified 2026-11-18 |
| Servers: row | the server's last channel | `navigate({ url: /channels/<guild> })` | skeleton at once | implemented | verified |
| Chat: channel title (server channels) | the channel list sheet; while the page loads the title shows the tapped row's name and server (decision-0011) | `navigate({ screen: "channels" })` | none | implemented | verified; the tapped name shows during a channel switch on the phone |
| Channels: row | a text or announcement channel opens here; voice, stage and forum rows show the website with the cue | `navigate({ url })` or `viewWebsite()` | skeleton at once | implemented | verified: #general from #welcome-and-rules |
| Chat: Send | the message is posted | `send` with its text, picked files and the reply target | busy at least 800 ms; failed keeps the draft and says why; unknown keeps the draft and says Discord didn't confirm | implemented | verified 2026-11-18 in two channels, with an image and as replies |
| Chat: message row | the message actions sheet: preview, six quick reactions, Reply, Copy text (decision-0012) | in the applet; Back, Escape or the backdrop closes it | none | implemented | verified 2026-11-18 |
| Actions: quick reaction | the reaction is added | `addReaction` | failure toasts the reason | implemented | verified 2026-11-18: 👍, ❤️, 😂 pressed on Discord |
| Actions: Reply | the composer shows "Replying to <author>" with Cancel reply; Send replies | `send` with `replyTo` | a message no longer loaded on the page fails with a reason | implemented | verified 2026-11-18 on own and others' messages |
| Actions: Copy text | the text on the clipboard, toast "Copied" | Clipboard API, `execCommand` fallback | toast "Couldn't copy the text." | implemented | toast verified 2026-11-18 |
| Chat: Attach | Android's picker | `useFilePicker().pick` from the tap | `USER_ACTION_REQUIRED` asks for another tap; without `limits.userActions` the control opens the website | implemented | verified 2026-11-18: an image picked and sent |
| Chat: reaction chip | toggles the user's reaction | `setReaction`, optimistic from `usePending` | the chip shows the pending state; failure toasts the reason | implemented | verified 2026-11-18: removing 👍 and 🔥 |
| Chat: Load older | older messages above | `loadOlder`, also when the top of the list scrolls into view | busy control; the channel's beginning ends it; failure keeps the button | implemented | verified: scrolled to the beginning of #welcome-and-rules |
| Chat: image, video or GIF | up to four tiles, the rest as "+N" on the last; GIFs play muted on a loop while on screen; a tap opens the full-screen viewer at that item, which pages with arrows, arrow keys and a swipe; Close or Back closes it (decision-0011) | in the applet | none | implemented | verified on the phone: five screenshots show four tiles and "+1", the viewer opened at 4 / 5, a swipe moved to 5 / 5, Back closed it; Tenor GIFs play on screen and pause off screen |
| Chat: link in a message | a Discord link opens its screen or the website; any other link opens outside | `navigate({ url })` or `links.openExternal` | toast "Couldn't open that link." | implemented | verified 2026-11-18: a Drive link and a YouTube embed opened outside; Discord links not checked |
| Any screen: Refresh, pull to refresh | reload the page | `reload("primary")` | progress bar | implemented | verified 2026-11-18 in the chat |

## Website features

| Feature and where the site offers it | Handling | Status | Evidence |
| --- | --- | --- | --- |
| File and photo attachments in the composer | `useFilePicker`, then `attachFiles` on the composer's file input; chips with remove and the count | implemented | verified 2026-11-18 |
| Images, videos and stickers in messages | images inline in a grid, tap opens the viewer; stickers inline (decision-0008) | implemented | images and stickers verified on device |
| Voice, video, screen share | the website (camera and microphone stay there) | on purpose | n/a |
| Sign-in, hCaptcha, email verification | the website, by the router | on purpose | hCaptcha seen on device 2026-11-17 |
| Reply and add reaction from Discord's message menu | the applet's message actions sheet | implemented | verified 2026-11-18 |
| Edit, delete, pin, forward, full emoji picker, settings | the website from View website | on purpose | n/a |

## Data

No collections, services or backends. Discord owns every record.

## Native feel

- [ ] Cold start signed in and signed out — not checked
- [ ] Landing URLs routed or listed as website pages — not checked
- [ ] Skeleton, error, empty and stale state on every routed screen — implemented; skeleton and empty seen on device, error and stale not checked
- [ ] Details open at once — not checked
- [ ] Pressed state, busy, outcome on every control; no removals, so no Undo — implemented, not checked
- [x] Back and overlays — Back between channels, the channel sheet and the media viewer checked on device; scroll restoration not checked
- [ ] Screen motion, no leftover copy after rapid Back — not checked
- [x] Refresh — checked in the chat
- [ ] Themes, 200% text, narrow width, reduced motion — not checked
- [x] Website cue on every control that shows the website — Friends, Add or discover servers and voice rows checked

## Plan

Steps, each committed in the applets repository on branch `feat/discord-applet`:

1. **Records and manifest.** This plan, decisions, `applet.json` (start URL, accent `#5865f2`, icon), `ports.json` entry.
2. **Foundation.** The UI kit (theme with Discord's light and dark tokens, motion stage, toasts and busy, states, pull to refresh, frame, skeletons) and the app shell with Messages and Servers tabs.
3. **Page module.** Readers and commands above.
4. **Screens.** Messages, Servers, Channels and Chat with every state, the composer with attachments, and reactions.
5. **Check and build.** `npm run check`, `npm run typecheck` and `npm run build` in the applet, then install on the emulator and walk the journeys signed in.
6. **Review.** A Fable 5.2 review saved as `.specs/review-implementation.md`; fix its findings.
7. **Release.** Version, `genesis-applet publish`, pull request.

## Current work and verification

- Implementation: steps 1 to 7 done; the review and its outcome are in `review-implementation.md`.
- Published: version 0.1.1, `published/applet-discord.bundle.json`, built from Genesis commit `53df296`; no tag yet (tags wait for the developer).
- Checks, 2026-11-17: `npm run typecheck`, `genesis-applet check .` and `genesis-applet build .` pass.
- Phone, 2026-11-17, with the developer's permission for this task, signed in as the test account: sign-in from the applet's sign-in notice; Messages empty state; Servers lists five servers in under 1.5 s; list skeletons keep the side gutter; the chat title shows the tapped server or channel at once; attachments show once each (the reader had read every picture twice); the media grid, viewer and GIFs as in Interactions; Jump to present returns to the newest message. A channel's messages arrive in 4 to 15 s, the time Discord's page takes.
- Device, 2026-11-17, emulator `Genesis_Verify_API_37_1`, light theme, signed in as the test account: Messages shows its empty state; Servers lists the five servers; a server opens its last channel with the title, server name, avatars, times, mentions, reply quotes, reactions, images and stickers, starting at the bottom; the channel sheet shows categories, the selected channel and voice rows with the website cue; tapping #general switches the chat; Back returns to the previous channel; scrolling up reaches the channel's beginning with Jump to present.
- Device, 2026-11-18, emulator `Genesis_Verify_API_37_1`, dev build revision 15, in the account's test servers: the full walk in [interactions.md](interactions.md), the regression script for every screen and control. Sending had failed with a `trim` error: the composer selector was a list of two selectors, so `${COMPOSER} textarea` scoped only the second and the first matched the form itself; it is now one compound selector. Reply, quick reactions and copy are new (decision-0012). Sent, replied to, attached and reacted with unique messages in #general and #quick-notes of Makrawl HQ.
- Not verified: dark theme, 200% text, conversations with real DMs, and Discord honouring `redirect_to` after a fresh sign-in (decision-0010; a signed-in visit lands on Discord's Quests page instead).
- Platform finding, not the applet's: Android Back on a website page with no earlier entry (Friends, Add or discover servers) leaves the applet for the launcher; Done returns to the applet.
- Known gap: after Back, the chat can show its skeleton for up to about 20 seconds before Discord's page reports ready.
