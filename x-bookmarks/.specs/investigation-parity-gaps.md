# Investigation: gaps against the official X app

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

Compared on 2026-11-19 on a physical phone, applet revision 27, against [the official app inventory](investigation-official-app.md). P0 breaks a core journey or the app's character, P1 is a visible difference on a core screen, P2 is polish. The applet keeps its own Saved tab and categories, which the official app does not have; they are the applet's purpose and are not gaps.

| ID | Surface | Official app | Applet | Priority |
| --- | --- | --- | --- | --- |
| G-001 | Feed video | Plays inline, muted, at its aspect ratio, once on screen; one at a time | A "Video · Play on X" tile that opens the website | P0 |
| G-002 | Feed end | Loads the next posts on its own, with a small spinner at the foot | A "Show more" button that the user must tap | P0 |
| G-003 | Video full screen | Tap opens a black full-screen player with sound, scrubber, mute and the post's actions | The website's post page | P0 |
| G-004 | Bars on scroll | Top bar and tab bar slide away while scrolling down and return on the first scroll up | Both stay fixed | P1 |
| G-005 | Home top bar | Avatar (drawer), X logo, then the feed tabs For you and Following | The title "Home", a Refresh icon and the shell menu | P1 |
| G-006 | Repost | A sheet with Repost and Quote; the count turns green | A count without a control | P1 |
| G-007 | Notification row | A type icon, a row of avatars, a bold first line, the post text in grey | One run of text with the parts joined without spaces | P1 |
| G-008 | Post detail reply | A pinned "Post your reply" bar at the bottom | Reply only from the action row, through the website composer | P1 |
| G-009 | Like and bookmark motion | Pink heart with a burst, blue bookmark, colors on the counts | A pop without the color on the count | P2 |
| G-010 | Explore | Category tabs, news rows with thumbnails and avatars | One list of trends, then people | P2 |
| G-011 | Profile | Banner with round buttons on it, pill buttons, icon tabs | A plain header and segments | P2 |
| G-012 | Media grid video | A video tile plays on tap | Opens the website post | P2 |
| G-013 | Messages and Grok tabs | Own tabs | Not present; Messages stays the website on purpose, Grok is out of scope | Not a gap |

## Measured baseline

Cold start to the first Home rows: 3064 ms, app CPU 1650 ms/s during start. The idle sample right after start was not settled and is retaken during polish.

## What the platform and x.com allow

Checked in the WebView on the device:

- X's mobile site plays feed videos from `blob:` streams, so the applet cannot reuse the element's source.
- The video player's React props on the page (`source.variants`, beside `aspectRatio` and `durationMs`) list an HLS playlist and direct MP4 files at 270p to 1080p on `video.twimg.com`. The page module runs in the page's main world, where these props are visible.
- `video.twimg.com` answers 403 when the request carries the applet's referrer and 200 without one. With the applet document's referrer policy set to `no-referrer`, a muted MP4 plays inline in the applet WebView, and `play()` succeeds without a tap.
- The Saved tab's start page is `/i/history`; X's own Bookmarks page stays behind it.
- No platform change is needed for G-001 to G-012.
