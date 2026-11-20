# Review: video and feed position

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

A read-only code review of the video and feed position work ([the plan](plan-video-and-feed-position.md)), done on 2026-11-19 after steps 1 to 9. It found 17 issues from reading the code. Two were in Genesis itself: a memory trim level that current Android no longer sends, and the order in which the shell restores a page's level when full screen ends. Both are fixed or documented in Genesis. The applet findings and their outcome follow.

| # | Finding | Outcome |
| --- | --- | --- |
| 1 | Saved keeps its screen between Bookmarks and Likes, so one held list took the other's rows | Fixed: each list name gets its own held list instance. Checked on the phone. |
| 2 | The full-screen video restarted after the user paused it, and again at its end | Fixed: only a newly drawn player is started; after the user's own input, sound and pause are theirs. |
| 3 | Clearing X's end during a reload started a load into a page that was not there | Fixed: nothing loads while the page reloads. |
| 4 | Held lists never dropped rows: unbookmarked posts stayed in Saved, and notifications keyed by their text piled up | Fixed: Saved and Likes drop rows X no longer lists between two it does; text-keyed rows go when X's page starts again. |
| 5 | Rows X's page no longer holds stayed actionable, so a like went to a stale place | Fixed: those rows are not actionable. |
| 6 | A refused full screen counted as played, and a missing player failed silently for seconds | Fixed: the command waits for a mark the page sets once the player holds full screen, and the page leaves full screen when the player never shows. |
| 7 | A second video tap while one was pending showed a false failure | Fixed: one play in flight at a time. |
| 8 | `playVideo` changes the page before it returns its steps, and the list reader records places | Kept: the overlay must exist before the trusted tap. It removes itself after 10 s or on its first tap, and the places map is now capped. |
| 11 | Stopping could miss a player X had just replaced | Fixed: stop looks the player up again. |
| 12 | After a refresh with no shared rows, X's next page lands after the old rows; at the 800-row cap, loading more appears to do nothing | Open: the documented design of decision-0031. |
| 13 | A tab reselect could be pulled back by the anchor restore | Fixed: a reselect stops the hold. |
| 14 | A new visit to the same path opens at the old position | Open: kept for now, since Back and a new visit look the same to the list. |
| 15 | The places map was never pruned | Fixed: least recently used, capped by path. |
| 16 | The saved anchor was lost when leaving Home within half a second of the last scroll | Fixed: the anchor is saved on unmount. |
| 17 | Held lists survive an account switch that never shows a signed-out state | Open: the same rule as the kept pages. |

Found while verifying the fixes and fixed: the bars moved when a list put its row back, which moved the row again, so only the reader's own scrolls move them; anchor offsets now count from the stage's top, so the bars sliding do not shift the row; a resize pin keeps the row while rows above it are measured; a video tap that fails in the feed opens the post's screen.
