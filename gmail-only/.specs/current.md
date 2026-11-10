# Current specification

## Identity

Name Gmail Only, id `gmail-only`, origin https://mail\.google\.com. Created 2026-11-08T23:59:17+05:30. One context `primary` (start URL `/mail/u/0/`, which Gmail redirects to its mobile web app at `/mail/mu/mp/239/`). Screens: `mail`, `todo`, `item`, `add`, `bulk`, `search`, `settings`, `accounts`, `account-setup`, `snoozed`. No services.

| Compatibility | Value |
| --- | --- |
| Manifest schema | 6 |
| Bundle format | 3 |
| Protocol | 1 |
| Adapter API | 1 |
| SDK and tools | 0.0.0 |
| Kit | 0.0.0 |
| Published release | 0.0.1 in `published/`, built with Genesis `941e0065dfe3`, not tagged yet |

## Product scope

The user asked for a Gmail app built around the feature brief "To-do & Reminders from Email" (decision-0002), with every Gmail page drawn by the applet (decision-0003) and multi-account support, built switched off (decision-0006) and now turned on (decision-0010).

Core journeys:

- Read mail: inbox with Primary, Promotions and Social chips, system folders and the person's labels from the drawer, an open email with its attachments, star, archive, delete, mark unread, Gmail's other conversation commands, and Reply, Reply all, Forward.
- Save an email for later: the "Add to…" pill on an open email offers a quick reminder (presets), a full reminder form, a to-do form or a snooze. Selecting rows in a list offers the same for several emails ("Save for later"). Swipes on a row remind or archive (configurable).
- Work through the list: the To-do tab groups items "When it's due" under a week strip, or "When I added it" with type filters. Item detail has Reply, Snooze and Mark done, with Undo.
- See what is due: the Today card at the top of the inbox, reminder chips on inbox rows, "Back in your inbox" for reminders that bring their email back, and the To-do badge (due today plus overdue).
- Compose with "Remind me if no reply", which saves a follow-up to-do when the person continues to Gmail to write and send the message.
- Search Gmail with recent searches and filter chips, and see matching to-dos above the results.

Data ownership: Gmail owns mail, labels, stars and read state. The applet owns reminders, to-dos, snoozes, accounts and its settings, in Genesis storage on the device (decision-0004). Nothing the applet saves changes the Google account.

Not in scope, from the brief's "Not in version 1": AI-detected tasks, shared tasks and projects, calendar sync, repeating to-dos.

Open questions for the user:

- Phone notifications from the brief's section 9 are not built; the applet shows due items inside the app only (decision-0005). The user has not approved this as a deferral.
- Gmail's mobile web has no scheduled send or native snooze; snooze is done by the applet (decision-0004).

## Defaults and overrides

| Rule id | Current choice | Origin and reason | Decision |
| --- | --- | --- | --- |
| default-platform-menu | Shell floating menu button, Genesis menu and website bar, splash accent `#2347d9` from `shell.accent` | Factory default; accent from the user's mockups | |
| theme | Light and dark tokens in `src/theme.css`, following the system or the Theme setting | Agent, matching the mockups' palette | decision-0007 |
| multi-account | On (`MULTI_ACCOUNT_ENABLED = true` in `src/model.ts`); sessions addressed by `authuser=<address>` | User instruction | decision-0006, decision-0010 |
| motion-and-feedback | Directional screen motion, sheet and popover motion, delayed shimmer skeletons, progress bar, pull to refresh, optimistic star and selection, Undo toasts; none of it plays with reduced motion | User instruction to make screens and events feel less rigid | decision-0009 |

## Routes

| Route id | Example URL | Page and screen | Context | Loading, empty, sign-in and error | Back | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mail` | `/mail/mu/mp/239/#tl/priority/%5Esmartlabel_personal` | `mail` page, `mail` screen | primary | Skeletons while Gmail draws; empty state per list; sign-in screen that opens Google's page; load error with retry | Gmail history in the context | verified | device |
| `root` | `/` | same as `mail` | primary | same | same | implemented | static |

The `mail` screen picks a view from the one Gmail shows (decision-0003):

| Gmail view | Applet view | Status |
| --- | --- | --- |
| `#tl/…` lists, labels, search | Inbox or list, Today card, bulk bar | verified on the device (inbox, search) |
| `#cv/…` conversation | Open email | verified on the device |
| `#co` compose, reply, forward | Compose | verified (open and close; nothing sent) |
| `#mn` menu | Drawer | verified on the device |
| `#pr` Gmail settings | Gmail settings screen that opens Gmail's own page | verified on the device |
| Anything else | Themed screen that offers Gmail itself | implemented, not reachable: for unknown hashes Gmail keeps its list showing, so the applet shows the list |

## Interactions

| Screen and control | Result | Action, navigation, website or store | Pending, failure and unknown | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| List row | Opens the email | Navigates to the thread URL | Skeleton until Gmail draws it | verified | device |
| List avatar, row long press | Selects the row, shows the bulk bar | `threads.setSelected` | Shows the requested selection while pending (`usePending`); a long press does not open the email | verified | device |
| List star | Stars or unstars | `threads.setStarred` | Shows the requested state while pending; star pops | implemented | static |
| Pull down at the top of a list | Reloads Gmail's page | `reload(primary)` | Disc spins and progress bar runs until the page is ready again; 10 s limit | verified | device |
| List end Refresh, empty state Refresh | Same as pull to refresh | `reload(primary)` | | implemented | static |
| Bulk bar Archive, Delete, Save for later | Archives, trashes, or opens `bulk`; the selection clears afterwards | `archiveSelected`, `trashSelected`, `bulk` screen | | verified (each run, then undone) | device |
| Row swipe | Remind or archive, per settings | `add` sheet or `threads.archive` | Row follows the finger, icon grows past 30%; archive slides the row off and closes the gap, and restores it if Gmail refuses. The "Archived" toast's Undo opens All mail, moves the row back with `threads.moveToInbox` and returns (decision-0011) | verified | device |
| Email "Add to…" | Menu with presets, Reminder, To-do, Snooze | `add` sheet; store `items` | Save failure keeps the sheet open | verified | device |
| Email toolbar | Archive, Delete, Mark unread, Snooze, Move to inbox, more | `conversation.*` actions; commands Gmail keeps in More options run through its panel (decision-0013) | Progress bar and disabled toolbar while one runs; unknown outcome shows a toast. After a command, Back skips the email Gmail leaves behind | verified (each run, then undone; spam not confirmed) | device |
| Email star | Stars or unstars | `conversation.setStarred` | Shows the requested state while pending | verified (starred, then unstarred) | device |
| Reply, Reply all, Forward | Compose with the addresses Gmail filled shown as chips | Gmail's own buttons, then `compose.fill` | Body is typed and sent in Gmail (decision-0008). Reply all is titled "Reply", the same as Reply | verified | device |
| Attachment card in an email | An image, text, audio or video file opens in Gmail's viewer; any other file is a "Download in Gmail" card that shows the email on Gmail's page, where the person taps the file and Genesis downloads it | `navigate` to Gmail's attachment page with `disp=inline`; `viewWebsite()` for downloads; at most 8 cards | decision-0014: the applet never follows a download link while its screen shows | implemented (viewable files verified; the download card not seen, because the test account has no attachment of that kind) | device |
| Draft in an email | A "Draft" card with Edit, in place of an empty message | `conversation.editDraft` opens Gmail's compose for that draft | A reopened reply draft is titled "New message", because Gmail drops its "Re:" | verified | device |
| Compose Close | An empty draft goes back to where compose was opened; a draft with content asks "Close this draft?" with Discard, Save draft and Keep editing | Back, or `compose.discard` then `compose.answerClose` (decision-0012) | Gmail's sheet sits outside compose, so the page also rereads when it appears | verified | device |
| Drawer folders and labels | Opens the list | URL navigation; labels through `menu.open` | | verified (folders listed) | device |
| To-do views, week strip, filters | Groups and filters items | Store `items` | | verified | device |
| To-do add button | Manual to-do form | `add` sheet; store `items` | | verified (added, then deleted) | device |
| Item Mark done and Undo | Marks done, restores | Store `items` | Conflict rereads the item | verified | device |
| Today card and to-do row check | Check pops, title strikes through, then the item is done with an Undo toast | Store `items` | Save failure shows a toast | verified | device |
| "Back in your inbox" dismiss | Dismisses with an Undo toast | Store `items` | | implemented | static |
| Item Delete | Removes the item, toast with Undo | Store `items` | | verified | device |
| Item Snooze, Change, Edit | Snooze chips, edit form | Store `items` | A snoozed email that is opened after it comes back ends its snooze (decision-0013) | verified (snooze from the email, Snoozed row Bring back now and Remove snooze) | device |
| Search | Results, matching to-dos, filter chips | URL navigation to `#tl/search/…` | | verified | device |
| Mail and To-do tabs | Switch sections | Inbox URL or `todo` screen | | verified | device |
| Gmail Only settings | Stored preferences | Store `settings/prefs` | | verified (opened) | device |
| Accounts, Snoozed | Account list, snoozed emails | Store `accounts`, `items` | | verified (opened) | device |
| Accounts row | Switches to that account's inbox | Navigates to `/mail/mu/?authuser=<address>#tl/…` | Unread counts clear, then show the new inbox's | verified (both directions) | device |
| Add another account | Google's add-session page, then the new session's inbox | Navigates `primary` to `accounts.google.com/AddSession` | The new session becomes an account when Gmail shows it | blocked: Google's sign-in page opens, then Google asks for a reCAPTCHA | device (sign-in page only) |
| Saved email from another account | Opens it in that account's session | `nav.email` with the item's `accountId` | | verified | device |

## Data

| Collection or service path | Owner | Key | Shape version | Notes |
| --- | --- | --- | --- | --- |
| `items` | Applet | Random item id | `v: 1` | Reminders, to-dos and snoozes. Each keeps the linked email (thread id, sender, subject, snippet) and its account id. Done items are purged after the "Keep done items" setting. |
| `accounts` | Applet | Id derived from the email address | `v: 1` | Name, color, Gmail session index, "Show in inbox" and "Show in To-do". Created when a signed-in account is first seen; the session index is corrected from the page when Google renumbers sessions. A second account on the same domain is named after its address. |
| `settings/prefs` | Applet | `prefs` | `v: 1` | Brief section 12 settings, swipe actions, theme, recent searches. |

## Current work and verification

Verified on 2026-11-09 on emulator-5556 (Android 17, `app.nirvana.genesis`), installed revision 12, with the one test Google account, light and dark mode. Evidence kind: device with the real website. Checked: inbox, Today card, reminder chip, open email with attachment, "Add to…" and the reminder sheet, item detail with Mark done and Undo, To-do in both views, manual to-do add and delete, drawer, accounts, snoozed, Gmail Only settings, Gmail settings, search, compose open and close, and the tabs. Static checks: `npm run typecheck`, `npm run check`, `npm run build`, and `tsc --noUnusedLocals`.

Not verified at that time, because each changes the Google account or needs a second one: archive, delete, mark unread, spam and the other conversation commands; bulk archive and delete; swipes; snooze (it archives); archive after adding a to-do; sending mail. Also not seen: the fallback screen for unknown Gmail views, the sign-in screen, and list error states. The phone checks below cover most of these; sending mail stays unrun.

Motion and feedback, verified on 2026-11-09 with revision 14 on the same device, dark then light mode: push and pop between list and email, the drawer sliding in and out, tab fade-through, sheets opening, dragging closed and closing with Back with the screen under them kept in place, the segmented thumb, the shimmer list skeleton, Today card completion with the Undo toast lifting the Compose button, pull to refresh, the email star and its pending state. Not seen: swipe archive and toolbar commands (they change the account), the email skeleton on a slow load, and reduced motion on the device (checked in code: every motion path reads `prefers-reduced-motion`). Once, after the Today card emptied, the emulator showed a stale strip over the category chips; the WebView's own capture was clean and the strip cleared on the next screen change.

Multiple accounts, verified on 2026-11-09 with revisions 17 to 19 on the same device and two Google sessions: the accounts screen lists both; switching goes to the right session both ways (`mp/239` and `mp/450`, checked by the signed-in address); unread counts clear on a switch and come back for the first inbox; a reminder saved from the first account opens its email in the first session from the second account; "Show in inbox" off hides that account's reminder from the Today card and on brings it back; To-do lists it under All accounts. Not run: "Add another account" through to a new session, because Google asked for a CAPTCHA during the scripted second sign-in; the second session on the device was added before it. Found and fixed during this check: session indices were always 0, saved emails opened in the current session, "Show in inbox" was ignored, the search placeholder claimed to search all inboxes, and counts carried over between accounts.

Known limits:

- No phone notifications (decision-0005).
- The compose body is written in Gmail, not in the applet (decision-0008).
- The Primary chip's unread count can be missing after returning from compose, until Gmail's menu is read again.
- One reminder, "Wallpaper Image Share", is stored on the test device from verification. It lives in applet storage only.
- With Theme forced to Light or Dark, Gmail's revealed pages still follow the system appearance.

Everyday features, verified on 2026-11-09 on a Samsung Galaxy M30s (Android 11, `RZ8N20D84GX`) with revision 4: a long press selects a row without opening it; Save for later from the bulk bar clears the selection; swipe right opens the reminder sheet; swipe left archives, and the toast's Undo moves the thread back to the inbox through All mail. The bulk bar in All mail offers Archive but not Move to inbox.

Compose, verified on 2026-11-09 on the same phone with revisions 9 to 11: Reply shows the sender as a To chip; closing a reply with content shows the applet's "Close this draft?" sheet; Keep editing stays; Discard and Save draft both return to the email, and Back from there reaches the list; Forward and Reply all close through Discard; a saved draft shows as a "Draft" card with Edit, which reopens it, and Discard deleted it; an empty new message closes straight back to the list. "Continue in Gmail" opened Gmail's compose form without the "Upgrade to the Gmail app" page, and the Primary count stayed after compose, so neither issue reproduced on the phone and nothing changed for them. Nothing was sent.

Email commands and error paths, verified on 2026-11-09 on the same phone up to revision 17: the email toolbar's Archive, Delete, Mark unread, Snooze, Move to inbox and the More options commands (Report spam opened without confirming); bulk Archive and bulk Delete, each restored through All mail or Trash with Move to inbox and Mark unread, so Primary ended with its 3 unread; snoozing from an email, with the Snoozed screen's Bring back now and Remove snooze on screen at phone width; a saved email opening under Gmail's last list with Back returning there. With Wi-Fi and data off, Refresh dims the list with a progress bar and, once Genesis's deadline passes, Genesis shows the website (Chrome's "Webpage not available") rather than the applet's retry screen, because Genesis shows a failed page as the website; with the network back the applet recovers. Not run: the sign-in screen (signing out risks the same reCAPTCHA on the only signed-in test account) and "Add another account" past Google's reCAPTCHA. Open items: under an unknown Gmail hash the Mail and To-do tabs hide while the list shows; Reply all is titled "Reply"; a reopened reply draft is titled "New message"; All mail's bulk bar has no Move to inbox; opening an email to bring it back marks it read.

Browser capabilities, checked on 2026-11-10 on the same phone with revisions 19 and 20, one signed-in test account. Evidence kind: device with the real website. Results of the plan's Step 2:

1. Sign-in: verified. No new sign-in was needed after the update; the session lasted after Genesis was closed and reopened, and after opening Hacker News and X.
2. Attachments: verified for an image, which opens in Gmail's viewer, with Done back to the email. On the revealed email, tapping the file downloaded it (Genesis's download notification, the file in Downloads); Done and Back worked afterwards. Blocked: the "Download in Gmail" card, because no email in the account has a file type the WebView cannot show, and getting one needs a send. Not checked: opening the file from the notification.
3. Hidden download: verified. Nothing downloaded while the applet screen showed, including after a pull to refresh.
4. Dark mode and font size: verified. With the system dark and Theme on System, the applet and Gmail's revealed pages are dark; at the largest font size the inbox, an email, "Add to…" and the reminder sheet stay readable and tappable. Known limit: with Theme on Light while the system is dark, Gmail's pages stay dark. Failed in Genesis: on Gmail's forced-dark pages, some light chips keep a white background with light text (see the platform issues below).
5. Links in: verified that a Gmail link opens in Gmail Only without a choice, from Home's "Open a link" and when shared from Chrome while Genesis is on Home. Failed in Genesis: a link shared while Gmail Only is already open shows the applet's inbox instead of the website, and Back never leaves Gmail Only (see below).
6. Links out: verified for web links. A link with `target=_blank` on a revealed email opens as a popup under the website bar, and Done or Back closes it back to the email; a link in the applet's own email opens in the same context with the website banner, and Done returns to the email. Blocked: `mailto:` and `tel:`, because no email in the account has one.
7. Popups and prompts: verified by the popup above. No camera, microphone or location prompt appeared.
8. Regression: verified for the inbox, an open email, "Add to…" with the reminder sheet (closed without saving), To-do, search, and compose open and close. Blocked: switching accounts, because only one Google session is signed in now.

Found and fixed: the reminder sheet counted done snoozes as linked items, so it said "3 items already linked" while the email said "1 item linked". It now counts what the email counts.

Platform issues, reported to Genesis with these reproductions and not worked around:

- Back never leaves an applet whose website adds a history entry on load. Open Gmail Only from Home and press Back: nothing happens, however many times. The context history is the start URL and then the same URL plus `#tl`, which the page's script adds. Back steps to the first entry, and the script adds `#tl` again. This also stops Back from leaving after a shared link. Chrome skips entries a page adds without a user gesture.
- A link shared while the applet is open shows the applet screen, not the website. Open an applet whose route covers a site's page, switch to Chrome, and share that page's URL as text to Genesis: the applet's route screen shows, once after a loading skeleton. Shared from Genesis Home, the same link shows the website as intended.
- On Android 11 with the system in dark mode, Gmail's revealed basic HTML pages show some light-background controls, such as the account chip and the "Primary" back chip, as a white background with light text.

## Plan: browser capabilities update (2026-11-10)

Genesis now gives website pages in an applet what a browser gives them: file downloads, popup windows, site permission prompts, links to other apps, dark mode and the system font size on website pages, links shared to Genesis, and a separate website sign-in for each applet. The SDK did not change, so no applet code has to move to a new API. Gmail Only has one workaround built for the old limits: it gives a link only to attachments the WebView can display, because Genesis could not download files (decision-0014).

### Step 1: download attachments through Gmail's page

1. `src/adapter/read.ts`: keep `viewLink` for the file types in `VIEWABLE`. For every other attachment, return `download: true` in place of an `href`. Rewrite the comments that say the app cannot download.
2. `src/model.ts`: add `download?: boolean` to `Attachment` and update its comment. The page record stays `v: 1`, because the field is optional and only the adapter writes it.
3. `src/screens/conversation.tsx`: a card with `download` is a button labelled with the file name and "Download in Gmail". It calls `viewWebsite()`, which reveals Gmail's open email. The person taps the file there, Genesis downloads it and posts its notification, and the website bar's Done returns to the email. A card with `href` keeps "Opens in Gmail".
4. Do not navigate to Gmail's `disp=attd` download link from the applet screen. The context is hidden then, and Genesis ignores downloads from a hidden page, because Android does not say whether a tap started them.
5. Update the attachment row above, the README's known limits if they name attachments, and write a change record.

Static checks: `npx genesis-applet check applets/gmail-only`, `npm run typecheck` and `node packages/applet-tools/src/cli.mjs build applets/gmail-only`, all from the Genesis root.

### Step 2: verify on the phone

Install the current Genesis debug build (`android/gradlew -p android :app:installDebug`) and the applet (`node packages/applet-tools/src/cli.mjs dev install applets/gmail-only --device <serial>`). Use the signed-in test account. Do not send, archive, delete or change Google account settings. Record the device, Android version, revision and results here, and keep account names and screenshots out.

1. Sign-in after the update. Open Gmail Only from the launcher. Each applet now has its own website sign-in, so an applet signed in before the update may ask once. If it does, the sign-in screen appears and "Sign in with Google" shows Google's page. Record whether a sign-in was needed and whether the session lasts after the app is closed and reopened. Opening Hacker News or X must not affect Gmail's session.
2. Attachments. Open an email with an image or PDF attachment and one with another file type such as `.docx` or `.zip`. The image opens in Gmail's viewer as before. "Download in Gmail" reveals the email on Gmail's page; tapping the file shows Genesis's download notification, and the file opens from the notification or the Downloads app. Done returns to the applet's email, and Back returns to the list.
3. Hidden download. Confirm that nothing downloads while the applet screen shows, for example when Gmail's page loads in the background after a pull to refresh.
4. Dark mode and font size. With the system in dark mode and the Theme setting on System, the applet is dark, and so are Gmail's pages revealed for sign-in, settings and "Continue in Gmail". With Theme forced to Light while the system is dark, the applet is light and Gmail's pages follow the system; record this as a known limit. At the largest system font size, the inbox, an open email, the "Add to…" menu and the reminder sheet keep every label readable and every control tappable, with no clipped text.
5. Links in. Share a `https://mail.google.com/mail/...` link from another app to Genesis, and paste one into Home's "Open a link". Gmail Only opens it without a choice, because it is the only applet that declares that site. Back leaves to the app that shared it.
6. Links out. In an email whose body Gmail shows on the website (Continue in Gmail, or a message the applet cannot draw), tap a `mailto:` or `tel:` link: Android offers the mail or phone app. Tapping a web link in a revealed email opens it in the same context under the website bar, and Done returns.
7. Popups and prompts. If Gmail's revealed page opens a window, such as Google's account chooser, it appears as a sheet over the page and closes back to it. Record any camera, microphone or location prompt that appears, and deny it. None is expected.
8. Regression. Inbox, an open email, "Add to…" with a reminder, the To-do tab, search, compose open and close, and switching accounts still work.

Report each step as verified, failed or blocked. Fix a failure in the applet when the applet's code causes it; describe a platform failure with a sanitized reproduction instead of working around it in the applet.
