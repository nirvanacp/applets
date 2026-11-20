# Investigation: video and feed position

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

Step 1 of [the video and feed position plan](plan-video-and-feed-position.md). On 2026-11-19, three agents used a physical phone with applet revision 44 beside the official X app on the same phone, and one agent read the code. They walked every place a video shows and every list that can change by itself. P0 breaks the reading or loses content. P1 differs clearly from the official app. P2 is polish. Screenshots stay outside the repository.

## Video

| ID | Pri | Where | What happens | Official app |
| --- | --- | --- | --- | --- |
| V-01 | P1 | Home row | A tap on a video leaves the applet for X's `/video/1` website viewer, which opens paused. | Plays muted in the row; a tap opens a native full-screen player. |
| V-02 | P1 | Home, Back from viewer | Back lands about seven screens below the row, with a progress bar. A second Back leaves the app. | Back returns to the row. |
| V-03 | P1 | Viewer, app switch | Done after an app switch shows Home skeletons and starts again at the top. | Player and feed stay. |
| V-04 | P1 | Post page viewer | X's × in the viewer adds a history entry, so the next Back opens the viewer again. | × closes; Back returns. |
| V-05 | P1 | Replies | A reply's video opens `/video/1` of the reply. | Plays in the reply. |
| V-06 | P1 | Search, Media tab | Video tiles open the post page, sometimes scrolled into the middle of the thread. One tile was blank after Back. | Opens the media viewer. |
| V-07 | P1 | Search, Latest | The video badge opens the website viewer. | Plays in the row. |
| V-08 | P1 | Profile, Media tab | Tiles open the post, the viewer or the website, depending on the tile. | Opens the media viewer. |
| V-09 | Info | View website | X's site plays its own player inline and muted. | |
| V-10 | P1 | Viewer | The spinner stays for more than 15 seconds. | Plays within a second. |
| V-11 | P2 | Viewer, landscape | The video is cropped and the website bar stays. | Full screen, no bars. |
| V-12 | P1 | Viewer, app switch | Returning reloads in a loop that traps Back; Done goes to Explore with the query lost. | Player stays. |
| V-13 | P2 | Search | The search query is lost after a video. | Query stays. |
| V-14 | P2 | GIF tap | A GIF tap on a row opens the post; two Backs drop the search query. | Opens the media viewer. |
| V-15 | P2 | Feed | No sound and no unmute control. | Unmute in the row. |

From the code:

| ID | What the code does |
| --- | --- |
| C-01 | The viewer URL is always `/video/1`, so the second video of a post is never reached. |
| C-02 | "Play on X" pushes the post page, so the website shows. |
| C-03 | A GIF tap on the focused post does nothing. |
| C-04 | Media inside a quoted post is not read. |
| C-15 | Video tiles in grids open the post. |

Not walked: videos in Notifications, Saved and Likes; in posts above the focused post; quoted, multi-video, mixed with photos, sensitive and long videos.

## Feed position

| ID | Pri | Where | What happens | Official app |
| --- | --- | --- | --- | --- |
| F-01 | P0 | Any list, app switch | Any app switch, even of 10 seconds, returns to the top of a reloaded Home. The phone sends `onTrimMemory(40)` about 0.4 s after leaving, and Genesis retires the suspended applet at that level, so the applet and X's page start again. | Keeps the position and shows a "New posts" pill. |
| F-02 | P1 | Home → Notifications → Home | Home starts again at the top. Both tabs share one website context, and the tab switch navigates it. | Keeps the position. |
| F-03 | P1 | Back from a post opened deep in Home | Lands several screens below the row. | Returns to the row. |
| F-04 | P1 | Refresh button | The row at the top stays, but the rows around and below it are replaced. | Shows newest at the top. |
| F-05 | P0 | Refresh from deep in the list | The list becomes X's first page; the older rows are gone. | Older rows stay. |
| F-06 | P0 | After a refresh | Home ends after seven or eight rows with "You're all caught up", and loading more never runs again. | Loads on. |
| F-07 | P1 | Fresh Home load | Rows between an hour ago and the day before are skipped. | Continuous. |
| F-08 | P2 | Cold start | White, then the kept list, then two replacements, then the top. | Kept list, then a pill. |
| F-09 | P2 | Resume | Relative times are stale, and avatars fall back to letters. | Current times and pictures. |
| F-10 | P2 | Home | A like count does not rise on tap. After a refresh, the header hiding moves content by 95 to 135 px. | |
| F-11 | P1 | Profile Posts ↔ Replies | "No posts yet" flashes and the position is lost. | Keeps each tab. |
| F-12 | P1 | Post replies, refresh | The replies shrink to about nine, and no more load. | All stay. |
| F-13 | P1 | Refresh while loading more | The post on screen is replaced. | Stays. |
| F-14 | P2 | Search, Saved | Skeletons show for about 18 s; Saved shows skeletons on every entry. | |

What held: Back from a post or profile a few rows down, Done on the website, rotation, a tap on the active tab scrolling to the top, and Back on search and profile. New rows that X inserts above the screen mostly do not move the reading row.

From the code:

| ID | What the code does |
| --- | --- |
| C-05 | When a new snapshot shares no key with the list, the merge appends its rows at the end. |
| C-06 | A reload replaces the order of the watch, so autoloaded rows go. |
| C-07 | The list keeps no anchor: nothing restores the reading row after the order changes. |
| C-08 | The router's scroll memory restores for up to 10 s and can fight later changes. |
| C-09 | Explore results and post replies draw every row with no virtual list and no steady order. |
| C-10 | A video's length falls back to X's countdown text, so its record changes every second while X plays it. |
| C-11 | The `at` value that locates a row goes stale after X's page moves. |
| C-13 | The account may read as missing for a moment, which makes the applet forget every other page. Not shown on the phone. |
| C-14 | Show more keeps its "end" note after a reload, the cause of F-06. |

## Other findings

The fourth agent walked the rest of the applet. Its official-app column comes from X's known behavior, not a side-by-side check.

| ID | Pri | Where | What happens | Official app |
| --- | --- | --- | --- | --- |
| O-01 | P1 | Search, Top | Only "Some results couldn't be read." shows; the website has results, including a survey cell the reader cannot read. Latest loads. | Shows the results. |
| O-02 | P1 | Reply from the post page | After Reply, the applet lands on Home. Back reopens an empty X composer, and a second Back reaches the post. | Stays on the post with the new reply. |
| O-03 | P1 | Tabs and Back | Back on Explore or Profile leaves the applet and skips Home. | Back from a tab returns to Home. |
| O-04 | P1 | Saved, Categories | Back from a post lands on Bookmarks, not Categories. | Returns to the sub-tab. |
| O-05 | P1 | Quoted post in a row | A tap on the quote card does nothing. | Opens the quoted post. |
| O-06 | P1 | Reply from a row | For about 3 s, X's composer shows as a plain new post with no reply context, and the keyboard does not open. | Reply sheet with context and keyboard. |
| O-07 | P1 | Accessibility | The hidden website's page shows in the accessibility tree. Some row toggles have no label. "1 replies". | Labelled controls, no hidden content. |
| O-08 | P2 | Post page | A full skeleton for 2 to 3 s, with a media block even for text posts, though the row's data is known. | Shows at once. |
| O-09 | P2 | Own profile | A skeleton for 5 to 9 s; Media takes about 8 s and mixes two empty texts. | Header at once. |
| O-10 | P2 | Search tabs | A tab opens scrolled partway down; Top shows the skeleton again; no Follow on people; many letter avatars. | Opens at the top and keeps each tab. |
| O-11 | P2 | Search field | No recent searches or suggestions; the tab bar rides above the keyboard. | Suggestions; tab bar hidden while typing. |
| O-12 | P2 | View website, Back, Done | Back reloads X with its splash; Done returns to Explore and the results are lost. | |
| O-13 | P2 | Photo viewer | White background, no swipe-down to close, no actions. | Black, swipe to close, actions. |
| O-14 | P2 | Composer | A letter avatar, only the image tool, stays open while posting, no Save draft. | Full toolbar, closes at once. |
| O-15 | P2 | Save sheet | A new category is not checked; the empty text has no padding; the row's icon does not change. | |
| O-16 | P2 | Home header, Explore | No For you and Following, no drawer, no topic tabs; "1 Views". | |
| O-17 | P2 | Notifications | One row and a spinner for more than 5 s; no sub-tabs. | |
| O-18 | P2 | Home after a self-reply | The reply shows alone, and the parent's count does not rise. | A connected thread. |
| O-19 | P2 | Post page | One tap on the save icon landed on Home. Not reproduced. | |

Side effects of the walk: one reply and two Home posts were liked, and a test post, a self-reply and an applet category were created.
