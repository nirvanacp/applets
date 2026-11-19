# Investigation: gaps against the official Spotify app

Problem ID: spotify-official-app-parity
Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed
Spirit animal: 🐬 Dolphin

Compared on 2026-11-19 on a Samsung SM-M307F (Android 11), applet revision 37 (applets `5cc7935`) in a Genesis debug build, against [the official app inventory](investigation-official-app.md). The test account is on the Free plan. Three sources feed this list:

- a walk of the applet on the phone, with the debug log on, measured the same way as the official app;
- a reading of the applet's code and the SDK's router, watch and input code;
- a probe of the hidden web player page through the WebView's DevTools socket.

Severity: P0 blocks use, P1 is wrong or slow, P2 is polish. Timings are medians in milliseconds, official first, then the applet. "Confirm" is the time until Spotify's page showed the change, from the debug log. Evidence files are kept outside the repository, grouped as applet (the applet walk), official (the official app) and probe (the web player probe); the table gives file names only.

The "Web player" column says whether open.spotify.com, as the Free mobile web player draws it, has what the fix needs. "Yes, with Genesis" means the website has it and the applet needs a Genesis capability that the developer approved (decisions 0013 and 0014).

## Playback and controls

| ID | Severity | Screen | Steps | Applet | Official | Timings | Web player | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P-01 | P0 | Home, album | Play a track, open an album or playlist from a Home tile, then Back | The tile's link does not take, so Genesis loads a new document 0.9 to 1.0 s after the tap. Audio stops 90 to 160 ms after the tap. Back to Home also loads a new document | Audio plays on through every navigation | Album open 917 / skeleton 341, settled 1320; Back 750 / 594 | Yes, with Genesis. A history push plus `popstate` renders any path in the same document; a page module may not do it (decision-0013) | applet: album-oc.mp4, w1-home-album.mp4, s-album-load.png; probe: report |
| P-02 | P0 | Mini-player | After P-01, tap Play | Play takes 2368 ms and plays the previous track from 0:00, while the bar still names the later one | Not applicable: the audio never stopped | Confirm 2368 | Yes, follows P-01 | applet: w2-play-after.mp4, w2-np.png |
| P-03 | P0 | Now Playing | Drag the progress bar and release; also tap Next during the drag | The time label jumps and freezes. `seek` runs 9.7 to 14 s, ends with DEADLINE, and the label snaps back. Next during the drag never runs | The label follows the finger, playback jumps on release | Official at release / applet never lands | Yes, with Genesis. The full player's progress bar seeks to a touch point; the SDK tap needs an offset (decision-0014) | applet: h4-seek.mp4, s-seek.png; probe: touchseek.js |
| P-04 | P1 | Mini-player | Tap Play/Pause while a page loads, or right after a tab change | First tap: toast "The page changed before the call finished" (CONTEXT_REPLACED). Second: INVALID_STEPS. Third works. The first call after the Home tab takes 1396 ms | Works at any moment | Confirm 1396 after Home tab | Yes | applet: w1-home-album.mp4, w4-seq.mp4 |
| P-05 | P1 | Playlist | Tap two track rows 350 ms apart | The trusted tap lands on the website's track link, Genesis reveals the website's track page, and both `playTrack` calls end after 15 s | The second row plays | | Yes | applet: h5-row-row.mp4, h6-row-single.mp4 |
| P-06 | P1 | Now Playing, mini-player | Tap Next; tap Next five times within 1 s | The title blanks at about 648 ms, time shows 0:00/0:00, Previous and Next dim, and the new title shows after about 1 s, although "Next up" already named it. Five taps advance two tracks | The title changes in 300 ms; the art follows 0.6 to 1.5 s later. Five taps advance three tracks | Next title 300 / 1021, confirm 468; 5 Next: 3 advances, 2.3 s / 2 advances, 2290 | Yes for the title. No for the next track's art: the bar's carousel has no image for it | applet: np-np.mp4, np-burst.mp4, np-burst2.mp4; official: np-next.mp4, np-burst.mp4 |
| P-07 | P1 | Mini-player, Now Playing | Tap Play/Pause twice 120 ms apart; tap Play during a skip | One input runs; the control stays busy for about 800 ms and drops taps meanwhile. Play/Pause right after a skip waits 1114 to 1138 ms | Each tap counts | Busy ring 873; confirm after skip 1114 to 1138 | Yes | applet: h1-double.mp4, h3-play-during-skip.mp4, mini-pp.mp4 |
| P-08 | P1 | Now Playing | Tap Previous in the first second of a track | Back one track after 887 ms, with the same blank and dimmed controls as P-06 | 183 ms | 183 / 887, confirm 749 | Yes. The bar's carousel scrolled to its start goes back | applet: np-np.mp4; official: np-prev.mp4; probe: carousel.js |
| P-09 | P1 | Album, playlist | Tap a track row | The mini-player names the new track after 1084 ms | 383 ms | 383 / 1084, `playTrack` 1030 | Yes. The row's own title and artist can show at once | applet: row.mp4; official: row-tap.mp4 |
| P-10 | P2 | Now Playing | Close Now Playing, then tap Play/Pause on the mini-player | `closePlayer` runs first, because the page takes one input at a time, so the tap waits behind it | No wait | closePlayer 303 to 349 | Yes | applet: np-oc.mp4; code reading |
| P-11 | P2 | Now Playing | Open Now Playing while a track plays | A skeleton shows until the website's full player opens and is read, although the mini-player already knows the track | A dark frame, then the header and controls at 530 to 700 ms; settled 1233 | Open first 262, settled 462 | Yes | applet: np-open1.mp4; code reading |

## Navigation and mini-player

| ID | Severity | Screen | Steps | Applet | Official | Timings | Web player | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N-01 | P0 | Every screen | After a new document (P-01) | The mini-player is gone for at least 5.5 s, then shows stale (Play, the old track), flips Play/Pause, and slides out and in | The bar stays docked through every navigation and load, with no flicker | Absent 5500 or more | Yes | applet: alb2.png, alb2b.png, alb2b-c.png, s-album-load.png |
| N-02 | P1 | Search and Home tabs | Switch to the Search or Home tab while a track plays | The bar is gone for 650 ms (Search) and 551 ms (Home), starting 340 to 400 ms after the tap. A tap in that window is lost. No gap on Your Library or Back | Always present | Absent 650 and 551 | Yes | applet: w4-seq.mp4, s-search-load.png |
| N-03 | P1 | Mini-player | Skip several times quickly through the website's bar carousel | The applet's bar shows a title the website no longer plays; the carousel's slots hold stale titles and artists after a burst. Five scrolls 250 ms apart advance one track, then the row sticks off centre | Not applicable | | Yes, one skip per command, waiting until the row is centred (decision-0015) | probe: carousel.js, burst.js, burst5.js |

## Missing features

| ID | Severity | Screen | Steps | Applet | Official | Timings | Web player | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 | P1 | Outside Genesis | Leave Genesis while a track plays; press the media pause key | No notification, no lock-screen controls; MEDIA_PAUSE does nothing. Audio itself keeps playing in the background (10 s, 2 min and 15 min checked) | A media notification with Previous, Pause, Next, Add, seek bar and output picker | | No. Android WebView has no `navigator.mediaSession`; needs platform work | applet: bg10.png, bg2m-return.mp4, bg15-return.mp4; official: shade.png, shade2.png |
| F-02 | P1 | Your Library | Open the Your Library tab | One Liked Songs row that opens Spotify's page. No artists, filter chips, sort, grid, create or search | Chips, sort sheet, grid and list, Liked Songs pinned, followed artists, create | | No library page: the web player's Your Library tab shows an upsell. Liked Songs has its own page (decision-0018) | applet walk; official: library.png, lib-sort.png; probe: report |
| F-03 | P1 | Mini-player, Now Playing, album, artist, tab bar | Compare each screen | Missing: the bar's progress line, its Connect device line and a skip gesture; Now Playing's Connect and Share buttons and the green dot on Shuffle; the album's Shuffle and footer; the artist's Shuffle and tabs; five tabs (the applet has three); pressed feedback on rows. Queue, the track menu, lyrics and the "Saved in" sheet are split out as F-04 to F-07 | Has each of these | | Mostly yes: the progress line from the bar's style variables (decision-0016), skip through the carousel (decision-0015), the full player's Connect and Share buttons. No for Download. Unknown for the artist tabs | applet: home-playing.png, w2-np.png; official: nowplaying.png, album.png, artist.png |
| F-04 | P1 | Now Playing | Tap Queue | No queue; Now Playing shows only "Next up" | A Queue sheet with the context, the next rows with drag handles, Shuffle, Repeat and Timer | | No. The mobile web player has no queue view (decision-0018) | official: queue.png |
| F-05 | P1 | Now Playing menu, track rows | Add a track to the queue | Not offered | "Add to Queue" in every track menu | | No. The Free mobile web player's track menu has no Add to queue (decision-0018) | official: np-menu.png, longpress-row.png; probe: report |
| F-06 | P1 | Now Playing, track rows | Tap + on a saved track; add to a playlist | + saves or removes from Liked Songs only | + saves, then opens a "Saved in" sheet with Liked Songs and New playlist; "Add to playlist" in every track menu | Add to check 350 / 90, settled 221, confirm 598 to 844 | No. The Free mobile web player's track menu has no Add to playlist (decision-0018) | official: saved-in-sheet.png, post-add.png, np-add.mp4; applet: np-save.mp4 |
| F-07 | P1 | Now Playing, track rows | Open a track's menu | No menu | Share, Lyrics, Like, Add to playlist, Add to Queue, Go to Queue, Go to album, Go to artists, Sleep timer, song radio, credits and more | | Partly. The web player's menu has Like, Share, View track, View artist and View album | official: np-menu.png, np-menu2.png, longpress-row.png; probe: report |
| F-08 | P2 | Now Playing | Look above the title, or scroll below the controls | No lyrics | A live lyric line over the art and a Lyrics card below | | No. The mobile web full player has no lyrics panel | official: nowplaying.png |
| F-09 | P2 | Mini-player | Look at the bar's background | One fixed colour | The colour comes from the cover art | | Not probed | official: home-thisphone.png |
| F-10 | P2 | Home, profile | Tap the avatar; look at the chips | No drawer, no All, Music and Podcasts chips, no profile page | A side drawer with the profile card, Recents and Settings; filter chips | | Not probed | official: drawer.png, drawer2.png, home-1.png, profile.png |
| F-11 | P2 | Now Playing | Tap Connect | No device picker | A sheet with the current device, a volume slider and "This phone" | | Probably. The full player has a Connect button; its sheet was not probed | official: device-picker.png; probe: report |

## Other

| ID | Severity | Screen | Steps | Applet | Official | Timings | Web player | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O-01 | P2 | Every screen | Look at the status bar | Light grey over the dark UI | Matches the dark UI | | Not a website question; the applet's or the shell's status bar colour | applet walk |
| O-02 | P2 | Home | Open Home | The first shelf starts a few pixels scrolled | Starts at its left edge | | Yes | applet walk |
| O-03 | P2 | Album | Open an album that loads as a new document (P-01) | An automatic `loadMoreTracks` call, probably from the entity screen's list end observer, ends CONTEXT_REPLACED after 4337 ms | Not applicable | 4337 | Yes, follows P-01 | applet: w1-home-album.jsonl |
| O-04 | P2 | Outside Genesis | Open the launcher after pressing Home | Genesis opens on Applet info, not on the applet | Returns to the same tab | | Not a website question; a shell behaviour | applet walk |
| O-05 | P2 | Search | Open the Search tab | A grey skeleton for about 0.5 s every time | Browse shows at once | 500 | Yes, show the kept copy first | applet walk |
| O-06 | P2 | Now Playing | Leave Now Playing open while a track plays | The `player` value holds the position, so the whole record is sent and the screen renders again every second. Idle playing costs 822 ms/s of app CPU against 6 ms/s paused | Not measured | | Yes, position from the bar's style variables (decision-0016) | code reading; applet bench |

## Passed

These matched the official app and are not gaps:

- Same-document navigations kept the audio: the artist link from Now Playing, Back from an artist to its album, the Search, Your Library and Home tabs, and Done on the revealed website.
- Previous within the first second went back one track; at 10 s it restarted the track.
- With Genesis in the background for 10 s, 2 min and 15 min, audio kept playing and tracks advanced; the mini-player was right on return.
- Play 1.1 s after Now Playing opened worked.
- Mini-player Play and Pause, Now Playing Play and Pause, Shuffle, Repeat and Save show their new icon within 91 to 130 ms, close to the official app.

Not run, because the phone was locked and off power: the walk while paused, lock and unlock, offline, rotation, a track ending on each screen, a cold start with Spotify playing elsewhere, control of another device, the end of a queue, pull to refresh and the rest of the sweep.

## Causes

The code reading confirmed every likely cause in the plan, with these corrections. Play/Pause, Save, Shuffle and Repeat icons already flip early through `usePending`; the title, the art and the skip do not. The SDK merges identical pending calls, so fast taps collapse into one. The page takes one input at a time per document.

| Cause | Gaps |
| --- | --- |
| C1. A control shows the result only after Spotify's page changes and the watch delivers, and stays busy for at least 800 ms. Only the icons flip early | P-06, P-07, P-08, P-09 |
| C2. Controls are disabled while busy, Previous and Next lock each other, and identical pending calls merge in the SDK, so a burst collapses | P-06, P-07 |
| C3. A command is a series of trusted taps and waits; `skip` opens the website's full player first when it is closed | P-06, P-08 |
| C4. Now Playing shows a skeleton until the full player is read | P-11 |
| C5. The `player` value changes every second | O-06 |
| C6. `closePlayer` on leaving Now Playing runs ahead of the next tap, because inputs run one at a time per document | P-10, and Play/Pause right after a skip in P-07 |
| C7. `seek` presses a key per five seconds and the range input does not commit | P-03 |
| C8. The bar draws nothing when the watch is empty. Every URL change runs the watch's restore, which gives null or an old history copy until the next snapshot (150 ms to 1 s) or the new document binds (seconds) | N-01, N-02 |
| C9. `navigate({ url })` clicks the site's link for the URL and falls back to a full load after 1000 ms when the site does not take it. Spotify does not take an untrusted click on a Home card, and loads a new document even on a real tap | P-01, P-02, N-01, O-03 |
| C10. A command fails NOT_READY at once while the page is unbound, and CONTEXT_REPLACED or PRECONDITION_FAILED during a same-document change. Nothing queues it | P-04, O-03 |
| C11. The playback hold lets go when `nowPlaying` is empty. Host tails of 2.5 to 3 s soften this, and no gap was seen from it | none observed |
| C12. A link from Now Playing navigates while the full player covers the page | none observed: the artist link from Now Playing kept the audio |
| Not among C1 to C12. `playTrack`'s trusted tap at the row's centre can land on the website's track link | P-05 |
| Not among C1 to C12. The web player's bar carousel holds stale titles after a burst of scrolls | N-03 |
| Not among C1 to C12. Missing website features or missing platform capabilities | F-01 to F-11 |
