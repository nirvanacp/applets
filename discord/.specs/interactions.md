# Interaction graph

Problem ID: `discord-applet` · Problem: Build a Discord applet · Spirit animal: 🦔 Hedgehog

Every screen of the Discord applet, every control on it, and where each control leads. Use it as a regression script: walk each case in order, compare with **Expect**, and record the date and result in **Last run**. The interaction table in [current.md](current.md) says how each control is built; this file says how to check it.

Last full run: 2026-11-18, emulator `Genesis_Verify_API_37_1` (Android 17, light theme), applet 0.1.1 dev build revision 15, signed in as the test account, in the account's test servers.

## Before you start

- Sign in with the test account (the genesis-test-accounts scripts). The account has no direct messages, five servers and the server **Makrawl HQ** with `#general` and `#quick-notes`.
- **Every message you send must be unique.** Discord blocks repeated identical messages. Use `Genesis <case id> <HHMMSS>-<counter>`, for example `Genesis C-SEND 090339-9`.
- Push a small image to the device first: `adb -s <serial> push test.png /sdcard/Download/genesis-test.png`.
- Discord's own page can be checked through the WebView's DevTools: its rows are `li[id^="chat-messages-"]`, and a reaction is `[aria-pressed]` inside `[class*=reactions]`.

## Graph

```
Genesis launcher
└─ Discord applet
   ├─ [tab] Messages ─────────────────── /channels/@me
   │  ├─ Refresh ──────────────────────── reload, stays
   │  ├─ Friends ⇗ ────────────────────── website (Friends page) ── Done ─→ Messages
   │  ├─ DM row ───────────────────────── Chat (dm)
   │  ├─ Empty: Refresh ───────────────── reload, stays
   │  └─ Back ─────────────────────────── leaves the applet (launcher)
   ├─ [tab] Servers ──────────────────── overlay root
   │  ├─ Refresh ──────────────────────── reload, stays
   │  ├─ Server row ───────────────────── Chat (guild → last channel)
   │  └─ Add or discover servers ⇗ ────── website (current page) ── Done ─→ Servers
   ├─ Chat ───────────────────────────── /channels/<guild>/<channel> or /channels/@me/<dm>
   │  ├─ Back ──────────────────────────── previous history entry (previous channel, or Messages)
   │  ├─ Title "#channel ⌄" ───────────── Channels sheet
   │  │  ├─ text / announcement row ───── Chat of that channel
   │  │  ├─ selected row ──────────────── closes the sheet
   │  │  ├─ voice / stage / forum row ⇗ ─ website (server page) ── Done ─→ Chat
   │  │  └─ Back ──────────────────────── Chat
   │  ├─ Refresh ──────────────────────── reload, stays
   │  ├─ Message list
   │  │  ├─ scroll to top / Load older ── older messages above; ends at "Welcome to #channel"
   │  │  ├─ Jump to present ───────────── bottom of the list
   │  │  ├─ message row (tap) ─────────── Message actions sheet
   │  │  │  ├─ React with 👍 ❤️ 😂 😮 😢 🔥 ── reaction added on Discord, sheet closes
   │  │  │  ├─ Reply ───────────────────── reply bar in the composer
   │  │  │  ├─ Copy text ───────────────── "Copied" toast
   │  │  │  └─ Back / backdrop / Escape ── closes the sheet
   │  │  ├─ reaction chip ─────────────── toggles your reaction
   │  │  ├─ image / video / GIF tile ──── Lightbox
   │  │  │  ├─ Next / Previous / swipe ─── "n / N" changes
   │  │  │  └─ Close / Back / backdrop ─── Chat
   │  │  ├─ link (discord.com) ─────────── its screen or the website
   │  │  ├─ link (other) / embed / file ⇗ ─ Android opens it outside (browser or app)
   │  └─ Composer
   │     ├─ Add files ─────────────────── Android picker → file chip (Remove <name>)
   │     ├─ text field ────────────────── counter from 1800 characters; Send disabled over 2000
   │     ├─ Send ──────────────────────── message posted; field, files and reply bar clear
   │     └─ Cancel reply ──────────────── reply bar closes
   └─ any website page ⇗ ─────────────── Done → back to the applet screen it came from
```

⇗ marks a control that shows the website or leaves the app; it carries the website cue.

## Cases

Each case starts where the previous one ended unless **Start** says otherwise.

### Shell and tabs

| Id | Start | Steps | Expect | Last run |
| --- | --- | --- | --- | --- |
| T-OPEN | launcher | Tap Discord | Messages with the Messages tab selected | 2026-11-18 pass |
| T-SERVERS | Messages | Tap the Servers tab | "Servers" with five servers and "Add or discover servers" | 2026-11-18 pass |
| T-MESSAGES | Servers | Tap the Messages tab | Messages | 2026-11-18 pass |
| T-RESELECT | Messages, scrolled | Tap the Messages tab again | list scrolls to the top | not run |
| T-BACK-ROOT | Messages | Press Back | the Genesis launcher | 2026-11-18 pass |

### Messages

| Id | Start | Steps | Expect | Last run |
| --- | --- | --- | --- | --- |
| M-EMPTY | Messages | Look at the list | Friends row, "DIRECT MESSAGES", "No messages yet" with Refresh (test account has no DMs) | 2026-11-18 pass |
| M-FRIENDS | Messages | Tap Friends | website bar "Discord · discord.com" with Done, banner "This page opens on the website", Discord's Friends page | 2026-11-18 pass |
| M-FRIENDS-DONE | M-FRIENDS | Tap Done | Messages | 2026-11-18 pass |
| M-DM | Messages with a DM | Tap a DM row | Chat titled with the person's name, newest message at the bottom | not run (no DMs) |
| M-REFRESH | Messages | Tap Refresh | progress, then the same list | not run (Refresh checked in the chat) |

### Servers

| Id | Start | Steps | Expect | Last run |
| --- | --- | --- | --- | --- |
| S-LIST | Servers | Look at the list | Makrawl HQ, The Makra Company, Better than clubhouse, Tizto, HackerHeads | 2026-11-18 pass |
| S-OPEN | Servers | Tap Makrawl HQ | Chat "#general · Makrawl HQ", newest messages at the bottom | 2026-11-18 pass |
| S-OPEN-2 | Servers | Tap The Makra Company | Chat "#general · The Makra Company" showing "Welcome to #general" | 2026-11-18 pass |
| S-DISCOVER | Servers | Tap Add or discover servers | website with Done; Discord's rail shows its + and discover buttons | 2026-11-18 pass |
| S-DISCOVER-BACK | S-DISCOVER | Press Android Back | **known:** leaves the applet for the launcher when the website has no earlier entry; Done returns to the applet | 2026-11-18 noted |

### Channels sheet

| Id | Start | Steps | Expect | Last run |
| --- | --- | --- | --- | --- |
| CH-OPEN | Chat in Makrawl HQ | Tap the title "#general ⌄" | sheet titled "Makrawl HQ" with categories (MAKRA GENERALS, MAKRA CORE (ENG.), …), general marked current | 2026-11-18 pass |
| CH-SWITCH | CH-OPEN | Tap quick-notes | Chat "#quick-notes", placeholder "Message #quick-notes", "Welcome to #quick-notes" | 2026-11-18 pass |
| CH-SWITCH-BACK | Chat #quick-notes | Title, then general | Chat "#general" | 2026-11-18 pass |
| CH-VOICE | Channels of The Makra Company | Tap "General" (voice, website cue) | website at the server page with Done | 2026-11-18 pass |
| CH-VOICE-DONE | CH-VOICE | Tap Done | Chat "#general · The Makra Company" | 2026-11-18 pass |

### Chat: reading

| Id | Start | Steps | Expect | Last run |
| --- | --- | --- | --- | --- |
| C-READ | Chat #general | Look at the list | avatars, names, "Today at …" times, reply quotes "@author text", reaction chips, images, links | 2026-11-18 pass |
| C-OLDER | Chat #general | Scroll to the top | "Load older messages", then more rows load above (10 → 30 → 50); at the end "Welcome to #general" | 2026-11-18 pass |
| C-JUMP | Chat scrolled up more than a screen | Tap Jump to present | list at the bottom; Jump to present hides | 2026-11-18 pass |
| C-REFRESH | Chat | Tap Refresh | progress bar, then the same messages | 2026-11-18 pass |
| C-BACK | Chat #general opened after #quick-notes | Tap Back | Chat #quick-notes (history order); Back again → the server's first chat → Messages | 2026-11-18 pass |

### Chat: media and links

| Id | Start | Steps | Expect | Last run |
| --- | --- | --- | --- | --- |
| L-IMAGE | Chat with an image | Tap the image | lightbox "Image", image centered, Close top left | 2026-11-18 pass |
| L-BACK | L-IMAGE | Press Back | lightbox closes, chat stays | 2026-11-18 pass |
| L-MULTI | Message with three images (Yooooo-anus, Feb 10) | Tap the first | "1 / 3" | 2026-11-18 pass |
| L-NEXT | L-MULTI | Next, then Previous | "2 / 3", then "1 / 3" | 2026-11-18 pass |
| L-SWIPE | L-MULTI | Swipe right to left | "2 / 3" | 2026-11-18 pass |
| L-CLOSE | L-MULTI | Tap Close | chat | 2026-11-18 pass |
| L-GIF | Message with a GIF (Show GIF) | Tap it | lightbox "Video", playing, looped | 2026-11-18 pass |
| K-EXTERNAL | Drive link (The Dicktator, Feb 10) | Tap the link | Android opens it outside (the Drive app on the emulator) | 2026-11-18 pass |
| K-EMBED | YouTube embed "10 Zsh hacks…" | Tap the card | the YouTube app opens; Back returns to Genesis | 2026-11-18 pass |
| K-DISCORD | a discord.com link | Tap it | its applet screen, or the website for unrouted pages | not run (none in the test servers) |
| K-FILE | a file attachment row | Tap it | opens outside | not run (none in the test servers) |

### Chat: message actions

| Id | Start | Steps | Expect | Last run |
| --- | --- | --- | --- | --- |
| A-OPEN | Chat | Tap a message's text | sheet with a preview, six reactions, Reply, Copy text | 2026-11-18 pass |
| A-BACK | A-OPEN | Press Back | sheet closes, chat stays | 2026-11-18 pass |
| A-BACKDROP | A-OPEN | Tap above the sheet | sheet closes | 2026-11-18 pass |
| A-REACT | A-OPEN on a message without 👍 | Tap "React with 👍" | sheet closes; chip "👍 1" pressed in the applet and on Discord | 2026-11-18 pass (👍, ❤️, 😂) |
| A-COPY | A-OPEN | Tap Copy text | toast "Copied" | 2026-11-18 pass (clipboard content not readable in the test) |
| R-CHIP-OFF | a pressed chip | Tap it | chip disappears (count 1 → 0) in the applet and on Discord | 2026-11-18 pass (👍, 🔥) |
| R-CHIP-ON | an unpressed chip of someone else's | Tap it | chip pressed, count + 1 | not run (no unpressed chips) |

### Chat: composer

| Id | Start | Steps | Expect | Last run |
| --- | --- | --- | --- | --- |
| W-SEND | Chat #general | Type a unique text, tap Send | busy, then the message is last in the list and on Discord; field clears | 2026-11-18 pass ("Genesis final 090339-9") |
| W-SEND-2 | Chat #quick-notes | Same | same, in #quick-notes | 2026-11-18 pass |
| W-REPLY-OWN | A-OPEN on your own message | Reply, type a unique text, Send | bar "Replying to NirvanaBot01"; sent row shows "@NirvanaBot01 <quoted text>"; bar clears | 2026-11-18 pass ("Genesis final-reply 090402-10") |
| W-REPLY-OTHER | A-OPEN on another member's message | Same | bar "Replying to <member>"; sent row quotes it | 2026-11-18 pass ("Genesis reply-other 085620-6") |
| W-CANCEL | reply bar shown | Tap Cancel reply | bar closes; the next send is a plain message | 2026-11-18 pass |
| W-ATTACH | Chat | Add files → pick genesis-test.png in Android's picker | chip "genesis-test.png 1 KB" with Remove | 2026-11-18 pass |
| W-ATTACH-SEND | W-ATTACH | Type a unique text, Send | message with the text and the image tile; chip clears | 2026-11-18 pass ("Genesis attach 085115-4") |
| W-COUNT | Chat | Enter 1850 characters, then 2010 | "150 characters left"; then "10 characters over Discord's limit", Send disabled | 2026-11-18 pass |
| W-EMPTY | Chat | Empty field | Send disabled | 2026-11-18 pass |

## Known behavior and gaps

- Android Back on a website page that has no earlier entry leaves the applet; Done always returns. This is the shell's Back handling, not the applet's.
- Back from a chat follows the website's history, so a server opened from the Servers tab goes back to Messages, not Servers (the routes table in current.md).
- Not run: DMs (the account has none), discord.com links, file rows, pressing a chip that is not yours, tab reselect, dark theme, 200% text.
