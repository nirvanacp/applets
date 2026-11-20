# Design: video and feed position

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

Step 2 of [the plan](plan-video-and-feed-position.md), from [the investigation](investigation-video-and-feed.md). Decisions 0030 to 0032 hold the rules; this note maps every finding.

## Video

A tap plays the post's own video full screen in X's player over the applet (decision-0030). The applet grants `fullscreen` to the page holding the post, and `playVideo` starts the player there from a trusted tap on an overlay outside X's React root, so X opens no page. The page root goes full screen and a stylesheet shows only the marked player, so X can replace its player without ending full screen. Back pauses and mutes it, and the applet is where it was. A row that X's page dropped opens the post's screen, which holds the player. Playing inside the row needs X's files, which no allowed reader gives, so it stays open.

## Reading position

Each feed list is a held list (decision-0031): merged, never replaced, with the row being read kept at its offset, and changes waiting while the reader touches or scrolls. New rows above the screen wait behind the New posts pill on Home and Notifications, and the go-up button follows the reader's own scroll up (decision-0032).

## Findings

| Finding | Result |
| --- | --- |
| V-01, V-05, V-07, V-10, V-15 | Fixed: plays full screen in X's player with sound, in a second, with no page change. In the row: open, no files. |
| V-02, V-04 | Fixed: Back returns to the same screen and offset, and the history gains no entry. |
| V-03, V-12 | Fixed with F-01 and the awake rule: an app switch keeps the applet and the page. |
| V-06, V-08, C-15 | Open: grid tiles still open the post, whose screen plays the video. The grid has no row to return to inside X's page. |
| V-09 | Information only. |
| V-11 | Partly: full screen hides the bars; landscape not checked. |
| V-13, V-14 | Fixed for videos (no navigation); a GIF tap still opens the post. |
| C-01 | Partly: no viewer URL now; a tap plays the post's first video. |
| C-02 | Kept as the failure fallback only (Play on X in the toast). |
| C-03, C-04 | Open: GIF focus taps and media inside quotes are separate reader work. |
| F-01 | Fixed in Genesis (background trim). |
| F-02, F-11 | Fixed: Home and Notifications, and each profile tab, keep their own held list. |
| F-03, F-08 | Fixed: the anchor restores the row on Back and on a cold start while the list holds it. |
| F-04, F-05, F-13 | Fixed: a refresh merges; older rows stay; Refresh goes to the top. |
| F-06, C-14 | Fixed: Show more forgets X's end after a reload. |
| F-07 | Open: X's own ranking skips those rows; the merge keeps what X shows. |
| F-09, F-10, F-12, F-14 | Open: outside this plan's lists; no change. |
| C-05 to C-08 | Fixed by the merge and the anchor. |
| C-09 | Open: Explore results and replies keep their plain lists. |
| C-10 | Fixed earlier (decision-0025). |
| C-11 | Fixed: places move with the drawn rows. |
| C-13 | Not seen on the phone; no change. |
| O-01 to O-19 | Open: other screens, left for later plans, one screen per change. |
| Far-scroll video | Open, found while verifying: with X's page far down its list, X drops the row during full screen and does not draw it again; the page leaves full screen and the post's screen opens, where the video plays. |
| Review 8, 12, 14, 17 | Open or kept: see [the review](review-video-and-feed.md). |
