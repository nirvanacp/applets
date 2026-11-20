# Verification: video and feed position

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

Step 9 of [the plan](plan-video-and-feed-position.md). Checked on 2026-11-19 on a physical phone, applet revision 65, with the Genesis build that keeps a page awake while its video shows and restores the page's level after full screen ends. Offsets are the anchor row's top in CSS px, read from the applet page before and after each step.

## Video

| Check | Result |
| --- | --- |
| Tap a feed video near the top of Home | Plays full screen in X's player with sound; its time advances. The page and the history do not change. |
| Back from full screen | The video pauses and mutes. The applet's scroll changes by 0 px. |
| Tap a video X's page has dropped | Opens the post's screen, where the video plays. Back returns to the row: −51 px before and after, held while the list grew. |
| Tap a video while X's page sits far down its list | Falls back to the post's screen: X drops the row during full screen and does not draw it again. A retry from the post plays. Recorded as a known limit in [the design](design-video-and-feed.md). |
| Pause or mute in X's player | Stays paused or muted; the video is not restarted (review finding 2). |
| Grid tiles, GIFs, landscape | Not checked. Grid tiles still open the post (V-06). |

## Reading position

| Check | Result |
| --- | --- |
| Cold start with the anchor row still on X's page | Restored exactly, twice: −25 px to −25 px and −79 px to −79 px. |
| Cold start after X's reload no longer lists the row | Opens at the top, as designed. |
| X reloads Home while the reader is down the list | The row stays: −109 px before and after. |
| A new post while the reader is down Home | The New posts pill shows and the row holds within 1 px. A tap goes to the top, where the new post shows. |
| Saved: Bookmarks, Likes, Bookmarks again | Each keeps its own rows; the lists do not mix (review finding 1). |
| Bars on scroll | The reader's swipe hides the bars; a list putting its row back does not move them. |

## Acceptance

1. A tap plays full screen with no page or history change: verified on Home.
2. Back lands within 8 px: verified, 0 px.
3. No refresh, autoload, resume or Back moves the post being read by more than 8 px: verified for an X reload, a cold start, Back from the post screen and a new post above. A row X's reload no longer lists opens at the top.
4. The pill works on Home: verified.
5. `npm run typecheck`, `genesis-applet check` and `genesis-applet build` pass with no warnings.
6. Bench, against the first plan's numbers: cold start 3115, 2782 and 2656 ms against the 3064 ms baseline, under the 3400 ms limit. Idle: app 3.3 ms/s and renderers about 1 ms/s, against app 84 ms/s and renderers about 240 ms/s. Journey: app 1042 ms/s and renderers about 1115 ms/s over Home, swipes and a video cycle; the earlier journey (app 1961 ms/s) took a different route, so the two do not compare directly.

Not checked: landscape, grid tiles, GIF taps, 200% text, a screen reader and the native-feel bar beyond Back and the bars.
