# Official app parity verification

Problem ID: spotify-official-app-parity
Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed
Spirit animal: 🐬 Dolphin

Checked on 2026-11-20 by an agent that implemented none of the work, on the phone (Samsung SM-M307F, Android 11) with a debug build of applets commit `c61977d`, revision 60, signed in with the test account. The [design](design-official-app-parity.md) and the [gap list](investigation-parity-gaps.md) set what was checked.

Status words: **verified** means seen on the phone in this pass or, where said, in an earlier step's phone check. **Implemented** means the code is there but no phone evidence covers it. **Partly implemented** means part works on the phone and part does not. **Blocked** means the web player or the platform does not allow it.

## Method

- Timings come from screen recordings made with `screenrecord --bugreport`, which stamps each frame with the time. The tap time is the client's input event in the applet's debug log, or the command's start. The first changed frame in the control's region is "first"; the frame where the region stops changing is "settled". "Confirmed" is when the page command reported that Spotify showed the change.
- Medians are over 2 to 8 trials, not ten as the criteria ask. The trial count for each row is in the evidence log.
- Evidence files are in the local evidence folder, outside every repository, under `verify/` (recordings, logs, frames) and `bench-after/`. They are named below without the folder.
- The debug log was on for the timed runs and off again at the end.

## Checks

On a clean build: the SDK and core typecheck and build, the tools, `cargo build` and `clippy` for the host, `npm run workspace -- check`, then in the applet `npm run -s typecheck`, `genesis-applet check` and `genesis-applet build`. All passed with no warnings. The debug build installed and `dev install` loaded revision 60.

## Timings

Milliseconds, medians. "Official" is from the [official app inventory](investigation-official-app.md); "before" is revision 37, from the gap list's measurements.

| Interaction | Official | Before | After | Evidence |
| --- | --- | --- | --- | --- |
| Mini-player Play/Pause | 108 to 367 | 130 / 91 | 83 (70 to 204); confirmed 245 to 356 | `v-pp4a`, `v-pp4b`, `v-mini-pp` |
| Now Playing Play/Pause | 50 | 99 | 71 (29 to 99) | `v-np-pp` |
| Next, title | 300 | 1021 | 43.5 (20 to 81); confirmed 771 (682 to 971) | `v-np-np` |
| Previous, title | 183 | 887 | 58.5 (38 to 106) | `v-np-np`, `v-ctl` |
| Open Now Playing | 1233 settled | first 262, settled 462 | first 179, content 240, settled 505; first open after install 470, settled 970 | `v-np-oc`, `v-np-open1` |
| Close Now Playing | 250 | first 232, settled 403 | first 302, settled 580 | `v-np-oc` |
| Save | 350 | 90 | 85.5 | `v-ctl` |
| Shuffle | 75 | 118 | 133.5 | `v-ctl` |
| Repeat | 67 | 105 | 128 | `v-ctl` |
| Album open | 917 | skeleton 341, settled 1320 | first 240, settled 373, no skeleton | `v-album-oc` |
| Back from an album | 750 | 594 | first 358, settled 489 | `v-album-oc` |
| Row tap, bar title | 383 | 1084 | 83; confirmed 622 to 790 | `v-row`, `v-row2` |
| Five Next taps | 3 advances | 2 advances | 2 to 3 advances (B3) | `v-burst`, `v-burst2` |
| Seek | none (drag) | never landed | thumb 94; landed 748 to 951 after release | `v-seek` |

## Acceptance criteria

| # | Result | Evidence and reason |
| --- | --- | --- |
| 1 | Pass | The records of steps 2 and 3 are in `.specs/`. |
| 2 | Fail | Play, Pause, Next, Previous and Save show their state in 43 to 86 ms. Shuffle (133.5 ms) and Repeat (128 ms) miss 100 ms. Taps are lost behind a running command: B1, B2 and B3. `v-ctl`, `v-mini-pp`, `v-endq2`, `v-burst2` |
| 3 | Fail | The title shows in 43.5 ms, well inside 150 ms. Spotify's confirm takes a median of 771 ms. That is under 1.5 s, but the criterion takes the smaller of 1.5 s and 60% of the 1021 ms baseline, 613 ms, and 771 ms misses it. The command's time includes waiting for Spotify to rebuild its carousel, so it is an upper bound on when Spotify switched. `v-np-np` |
| 4 | Fail | Five Next taps gave 3 advances at about 0.9 s apart and 2 in a faster burst (B3). Play and Pause tapped fast end in the last tap's state, except after a slow first Play (B1). The screen settled within 5 s in every run. `v-burst`, `v-burst2`, `fr/b2/stack.png`, `v-pp4a`, `v-pp4b`, `v-mini-pp` |
| 5 | Fail | The mini-player stayed docked with the right track through the walk (Home, album, artist, Back, Back, Search, a hub, a playlist, Your Library, Now Playing and back). Play/Pause worked during and after loads everywhere but Your Library, where it fails after about 4.9 s (B5). The progress line jumped once after a Pause (B4). `v-walk`, `fr/walk/drop.png`, `v-libmini` |
| 6 | Pass | Every navigation in the walk was `sameDocument: true`, the progress line advanced steadily, and the audio never stopped except for the user's Pause. `v-walk`, `full-log-0.jsonl` |
| 7 | Fail on the 100 ms target | Now Playing opens with title, artist, art and working controls and no skeleton, but the first frame is 179 ms and the content 240 ms after the tap. Opening it from Your Library shows "The target is covered" (B5). `v-np-oc`, `v-libnp` |
| 8 | Pass | Seek landed 748 to 951 ms after release, for short and long moves. `v-seek` |
| 9 | Pass | Every gap row has a status below. Every P0 row (P-01, P-02, P-03, N-01) is verified. |
| 10 | Pass | See Checks. |
| 11 | Pass | Cold start 2749 ms against 2750; idle paused 4.8 ms/s against 6.3. See Bench. |
| 12 | Pass after this record's commit | Nothing is pushed. |

## Re-check after the review fixes

Re-measured on 2026-11-20 on the same phone with a debug build of applets `88c2c65` and the platform fixes, in the same way as above. The [review record](review-official-app-parity.md) lists each fix and its commit.

| # | Result after the fixes | Evidence |
| --- | --- | --- |
| 2 | Partly passes. Shuffle 89.5 ms (84 to 148). Repeat 109 ms (99 to 126), 9 ms over. No tap was lost in 12 single taps, a quick double tap, five fast Nexts or fast Play/Pause pairs. At the end of an album one tap of five was not sent in one run (B7). | `f-ctl`, `f-burst`, `fix-f1-*.png` |
| 3 | Pass. Next confirms in 552.5 ms for single taps (525 to 692, 6 taps) and 529 ms inside a burst, under 613. The title shows in 98 ms. | `f-next`, `f-next2`, `f-burst` |
| 4 | Pass. Five Next taps 150 ms apart moved five tracks, each skip confirmed in turn. | `f-burst`, `fr/fix/burst-titles.png`, `fr/fix/burst-mid.png` |
| 5 | Pass. On Your Library, Pause and Play from the mini-player worked with no toast. | `fix-f4-library-pause.png`, `fix-f4-library-play.png` |
| 7 | Fail. First frame 199 ms (192 to 214), art 280 ms, settled 512 ms. One long frame of 113 to 144 ms builds Now Playing after the tap. | `f-np-oc` |

The bugs: B1, B2, B3, B5 and B6 are fixed; B4 is changed but not proven. A new one, B7, is below.

Bench after the fixes, idle while playing, three runs of 60 s, label `after-fix-playing`: app CPU 1140 ms/s (1119 to 1149), renderers 410 ms/s (390 to 504) against 860, app memory about 286 MB. Evidence `bench-fix/`.

## Gap status

| ID | Status | Evidence |
| --- | --- | --- |
| P-01 | verified | Album and artist opened from Home while playing, same document, audio on. `v-walk` |
| P-02 | verified | Play after navigation resumed the same track. `v-walk` |
| P-03 | verified | Seek landed within 1 s. `v-seek` |
| P-04 | partly implemented | Play/Pause during page loads worked on Home, album, artist, Search and the hub. It fails on Your Library (B5), and a burst after a slow first Play ends wrong (B1). `v-walk`, `v-mini-pp` |
| P-05 | verified | Two row taps 200 ms apart: the bar and Spotify ended on the second row with one write. Whether the first tap reached Spotify was not shown. `v-row2` |
| P-06 | partly implemented | A single Next is instant and lands. Quick Nexts are lost (B3). `v-np-np`, `v-burst2` |
| P-07 | partly implemented | Play/Pause twice fast ends right on a warm page. After a slow first Play it ends in the opposite state (B1). Play after Next at the end of the queue is never sent (B2). `v-pp4a`, `v-mini-pp`, `v-endq2` |
| P-08 | verified | Previous shows its title in 58.5 ms and lands. `v-np-np` |
| P-09 | verified | Row tap shows its title in 83 ms, Spotify confirms in 622 to 790 ms. `v-row` |
| P-10 | verified | Close then mini-player Play/Pause answered at once and landed. `v-np-oc` |
| P-11 | verified | Opens with the known track, no skeleton. `v-np-oc` |
| P-12 | implemented | Not re-tested: no Next landed in a track's last moment during this pass. |
| N-01 | verified | Bar present through the walk. `v-walk` |
| N-02 | verified | Search and Home tab changes while playing kept the bar and audio. `v-walk` |
| N-03 | partly implemented | After a burst the bar names the track Spotify plays, but the burst moves fewer tracks than tapped (B3). `v-burst2` |
| N-04 | blocked | Needs a shell capability to exclude applet elements from the system Back gesture. The Back gesture itself works on Now Playing and the album. `fr/back-gesture-np.png`, `fr/back-gesture-album.png` |
| N-05 | implemented | Not tested: no second device played on the account. |
| F-01 | blocked | Needs a Genesis media session; WebView has no `navigator.mediaSession`. |
| F-02 | partly implemented | Liked Songs opens from Your Library as an applet screen. Saved playlists, albums, artists, chips, sort and grid are blocked: the web player has no page for them. Play/Pause fails on Your Library (B5). `v-libmini` |
| F-03 | partly implemented | Seen: the progress line, the bar swipe, Now Playing Share. Entity Shuffle and more search results are blocked by the web player. `v-mswipe` |
| F-04 | blocked | The web player has no queue view. |
| F-05 | blocked | The Free web player's menu has no Add to queue. |
| F-06 | blocked | The Free web player's menu has no Add to playlist. |
| F-07 | verified in step 9 group 3 | Not re-walked in this pass. |
| F-08 | blocked | The web full player has no lyrics. |
| F-09 | blocked | The website gives no art colour. |
| F-10 | blocked | The mobile web player has no drawer or chips. |
| F-11 | blocked | The web player's Connect view lists only this browser. |
| O-01 | blocked | Still white in the light system theme. Needs a shell capability for applet-chosen system bar colours. |
| O-02 | not reproduced | Not reproduced in step 9 group 6; not re-checked in this pass. |
| O-03 | verified | Albums opened with no failure toast and no `CONTEXT_REPLACED` in the log. `v-album-oc`, `full-log-0.jsonl` |
| O-04 | blocked | Relaunching Genesis after Home lands on Genesis's own screen, not the applet. Shell behaviour. `v-bgret2` |
| O-05 | verified | Search opened on the kept tiles with no skeleton. `v-walk` |
| O-06 | implemented | Not re-walked with Now Playing left open for long. |

## Control and navigation lists (plan step 3)

| Check | Result |
| --- | --- |
| Tap twice fast | Pass on a warm page; fail after a slow first Play (B1) |
| Next five times | Fail (B3) |
| Play during a skip | Fail at the end of the queue (B2); not run elsewhere |
| A control while Now Playing opens | Not run |
| Skip from the mini-player and from Now Playing | Pass, by button and by swipe (`v-mswipe`, `v-np-np`) |
| Skip at the end of a queue | Fail (B2) |
| Previous at second 1 and second 10 | Previous measured and landed; the two positions were not split |
| Seek short and long; skip mid-seek | Seek passes; skip mid-seek not run |
| Row tapped while another loads | Pass, the last tap wins |
| Controls while another device plays | Not run, no second device |
| Open pages from pages, Back, tabs, Your Library, Now Playing open and close | Pass, except Play/Pause and Now Playing on Your Library (B5) |
| Link from Now Playing, pull to refresh, reveal the website and Done | Not re-run in this pass (verified in step 7) |
| The walk paused | Pass, except B4 |
| Leave Genesis 30 s while playing, return | Pass: audio continued, the last screen showed at once with no skeleton (`v-bgret`, `fr/bgstack.png`) |
| Lock and unlock, offline, rotate | Not run |

Edge cases from the brief: two row taps 200 ms apart pass (P-05). End of queue fails (B2). A deep link while playing does not apply: Genesis has no link filter for open.spotify.com, so no outside link reaches the applet. No ad played during the pass, so ads on Free are not checked. The Back gesture passes. Background and return passes.

## Bugs found

| ID | Severity | Bug | Reproduction | Evidence |
| --- | --- | --- | --- | --- |
| B1 | P1 | After a slow first Play, a Pause tapped while it runs is dropped and the icon reverts, so the burst ends in the opposite state. | Force-stop Genesis, open the applet, tap Play on the mini-player, then Pause about 1.5 s later. | `v-mini-pp`, `v-mini-pp-end.png` |
| B2 | P1 | At the end of the queue, Next holds the command queue for about 8 s. A Play tapped then is never sent: the screen shows Pause and a running clock with no audio, then "Spotify didn't confirm that." and falls back. | Play the last track of an album, tap Next, then tap Play. | `v-endq`, `v-endq2`, `fr/endq2.png` |
| B3 | P1 | A Next tapped while a skip is in flight is lost when that skip confirms: the title steps forward, then back. | Tap Next five times about 0.25 to 1 s apart in Now Playing. | `v-burst`, `v-burst2`, `fr/b2/stack.png` |
| B4 | P2 | After Pause while an artist page loads, the mini-player's progress line jumps about 20% ahead for about 2 s, then corrects. | During the walk, tap Pause just after opening an artist page. | `v-walk` frames 201 to 271, `fr/walk/drop.png` |
| B5 | P1 | On Your Library (`/collection`) the website's upsell covers its own player. Now Playing shows "The target is covered" with Try again; Play/Pause from the mini-player or Now Playing fails after about 4.9 s with that toast, and a second, opposite tap in that time is swallowed. Next works. | Open the Your Library tab while a track plays, tap Pause on the mini-player, or open Now Playing. | `v-libmini`, `v-libnp`, `fr/libmini-single.png`, `fr/libnp-stack.png` |
| B6 | P2 | On a fast row change, the mini-player art briefly showed a placeholder. | Tap two track rows 200 ms apart. | `v-row2`, `fr/r2/stack.png` |
| B7 | P2 | Found after the review fixes. At the last track of an album, Next stops Spotify on the album's first track. A Next from there is not confirmed: Spotify moves or starts, but the command waits 5 to 8 s and the toast "Spotify didn't confirm that." shows. In one run one of five taps there was not sent. | Play the last track of an album, tap Next three times about 3 s apart. | `f-endq`, `f-next`, `fr/fix/endq-strip.png` |

## Bench

Three runs each with `tools/bench.mjs`, label `after`. CPU is app milliseconds per second; renderers leave out an unrelated process from another applet.

| Scenario | Baseline | After (median of 3) | Change | Criterion 11 |
| --- | --- | --- | --- | --- |
| Cold start | 2750 ms | 2749 ms (2717, 2749, 3133) | 0% | pass |
| Idle paused, app CPU | 6.3 ms/s | 4.8 ms/s (3.0, 4.8, 4.8) | -24% | pass |
| Idle playing, app CPU | 822 ms/s | 1092 ms/s (991, 1092, 1279) | +33% | not part of it |
| Idle playing, renderers | 288 ms/s | 860 ms/s | | not part of it |

Idle playing costs more because the playback hold keeps `primary` running and the mini-player's clock draws each frame. App memory rose from about 203 MB to about 265 MB while paused.

## Native feel on the changed screens

| Item | Result |
| --- | --- |
| 200% text | Limited: Android font scale 2.0 left the applet's text the same size, so the system setting does not reach the applet (`fr/t2.png`, `fr/text200-home.png`, `fr/text200-np.png`). Step 8 checked Now Playing at 200% through remote debugging. |
| Narrowest width | Not run |
| Reduced motion | Not run in this pass (step 8 emulated it on Now Playing) |
| Screen reader over the bar and Now Playing | Not run |
| Back from every new state | Back gesture closes Now Playing and leaves an album; the track menu was checked in step 9 group 3 |
| Stale first after leave and return | Pass (`v-bgret`) |

## Open items

- After the review fixes: B4 not proven fixed, B7 open, Repeat at 109 ms, and criterion 7 at 199 ms.
- Not run: reduced motion, screen reader, narrowest width, a control while Now Playing opens, skip mid-seek, lock and unlock, offline, rotate, a second device (N-05), a track ending under a pending Next (P-12), an ad on Free.
- Medians come from fewer than the ten trials the criteria ask for.
