# Official app parity review

Problem ID: spotify-official-app-parity
Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed
Spirit animal: 🐬 Dolphin

A read-only code review of the parity work (plan step 11) found 17 issues. The [verification](verification-official-app-parity.md) found bugs B1 to B6. This record lists each one, what was done and the commit. Commits are in the applets repository unless a line says the Let framework or the Genesis shell. Phone checks ran on the Samsung SM-M307F with a debug build of `88c2c65`.

## Applet findings

| Id | Severity | Finding | Outcome | Commit |
| --- | --- | --- | --- | --- |
| F1 | P1 | The store dropped an intent as already met by comparing it with a page reading older than the call that had just confirmed. Pause tapped while Play was on its way was deleted and never sent (B1). | Fixed. A confirmed call now records its value and time, and an intent counts as met only against a reading taken after it. Phone: Play then Pause fast ended paused, and Pause then Play fast ended playing. | `58a4f7d` |
| F2 | P1 | Requests expired 6 s after the tap even when they had not been sent, and the skip fallback at the end of a queue could hold the serial queue for 8 s (B2). | Fixed. Requests age on an active clock that stops while a call is on its way and during the first 3 s of a page load, so a request held behind another never expires unsent. | `58a4f7d` |
| F3 | P1 | A skip in a burst went out as soon as the last one first looked done, could be satisfied by the previous skip's tail, used a stale title, and one failure cleared every queued tap (B3). | Fixed. The next skip waits until the watch shows the last one and then 200 ms more for Spotify's row. Only a refused skip clears the queue; an unconfirmed one keeps the rest. Phone: five Next taps 150 ms apart moved five tracks. | `58a4f7d` |
| F4 | P1 | Your Library opened the website's `/collection` page, whose upsell covers the website's own player, so Play/Pause and Now Playing failed there (B5). | Fixed. The tab opens Your Library as an applet screen over the website's current page, which stays in place. Phone: Pause and Play from the mini-player on Your Library both worked with no toast. Limit: Back from Liked Songs returns to the website page under the library, not to the library. | `15efb12` |
| F9 | P2 | A skip put back after a not-ready answer had no retry time, so it could be resent in a tight loop. | Fixed. It waits 300 ms through a timer before it goes again. | `58a4f7d` |
| F10 | P2 | Requests did not age while a page loaded, with no cap, so a stuck load kept the hold and retries going forever. | Fixed. Only the first 3 s of a load stop the clock. | `58a4f7d` |
| F11 | P2 | The position hook set React state on every frame at the top of each screen, so Now Playing redrew 60 times a second while playing. | Fixed. The mini-player's line is a CSS animation, and Now Playing's progress is its own component that ticks four times a second. Bench: renderer CPU while playing fell from 860 to 410 ms/s. | `c4e203e` |
| F12 | P2 | The paused position could count the delay twice, and the origin mixed the page's clock with the applet's (likely B4). | Changed. The position now comes from the animation's own progress, and the origin is rounded to 50 ms. Not proven on the phone: B4 did not show in this pass, but no run aimed at it. | `cd93edf` |
| F13 | P2 | Album rows had no art, and the artwork image remounted on each new URL, which flashed a placeholder (B6). | Fixed. Album rows take the album's art, and the image keeps the last loaded picture until the next one loads. | `88c2c65` |
| F14 | P2 | A save, shuffle or repeat call that the page replaced after some steps ran was sent again, so a landed press could repeat. | Fixed. A replaced call that had completed steps is dropped without a retry. | `58a4f7d` |
| F15 | P2 | Any title change counted a skip as landed, including carousel text lag, and a track ending by itself could use up a queued Next. | Fixed. Only a move off the title the skip left counts, and a natural end counts only when the clock was within 3 s of the track's end. | `58a4f7d` |
| F16 | nit | After the list scrolled a row into view, the tap went to the row's centre, which can be a link. | Fixed. The tap goes to the row's plain area. | `88c2c65` |

The duplication the review named is gone: `failureText`, `Result` and `RESTART_AFTER` now have one definition each (`58a4f7d`, `cd93edf`).

## Platform findings

These are Genesis and Let changes, independent of any applet.

| Id | Severity | Finding | Outcome | Commit |
| --- | --- | --- | --- | --- |
| F5 | P2 | The covered check and scroll into view used the target's centre while the tap went to the requested point. | Fixed. Both use the tap's own point. | Let `622eb53` |
| F6 | P2 | The shell counts any page change within 1 s as the website's router handling a route, and a router slower than 1 s gets a full load. | Open. A better signal needs a design, and a generic change here risks every applet's navigation. | none |
| F7 | P2 | The pushed history entry and its `popstate` carry the previous entry's state. | Open. No single state value suits every router: a common router misroutes with the old state and with none. Spotify works with the current behaviour. | none |
| F8 | P2 | A link the page took without moving fell back to a full load and never tried the in-document route. | Fixed. It tries the in-document route first. | Genesis shell `a3fdaea` |
| F17 | nit | Two navigations share one pending slot, so the second drops the first one's fallback. | No change. The newest navigation wins, and the older fallback would load a stale address. | none |

## Verification bugs

| Bug | Outcome |
| --- | --- |
| B1 | Fixed by F1. |
| B2 | Fixed by F2 in the code. Play after Next at the end of a queue was not re-run; a Next held behind the slow end-of-album skip was sent. That skip is still slow; see B7. |
| B3 | Fixed by F3: five fast Nexts move five tracks. |
| B4 | Changed by F12, not proven. |
| B5 | Fixed by F4. |
| B6 | Fixed by F13. |

## Found in this pass

- B7 (P2, open): at the last track of an album, Next stops Spotify on the album's first track, as the web player does. A Next from that stopped state is not confirmed: Spotify moves or starts, but the command waits 5 to 8 s and the screen shows "Spotify didn't confirm that." In one of two runs one of five taps at that point was not sent. Recorded once; the cause is not traced.
- During a fast burst the title showed the track after next for one frame before settling.

## Re-measured

Medians, milliseconds, from screen recordings with the tap time taken from the debug log, as in the verification.

| Criterion | Target | Before | After |
| --- | --- | --- | --- |
| 2. Shuffle | under 100 | 133.5 | 89.5 (84 to 148, 4 taps) |
| 2. Repeat | under 100 | 128 | 109 (99 to 126, 6 taps) |
| 2. Lost taps | none | B1, B2, B3 | none in 12 single taps, a quick double tap on Shuffle, five fast Nexts and Play/Pause pairs; see B7 |
| 3. Next confirmed | 613 | 771 | 552.5 for single taps (525 to 692, 6 taps); 529 inside a burst; title in 98 |
| 4. Five fast Nexts | five tracks | 2 to 3 | 5 |
| 5. Play/Pause on Your Library | works | fails (B5) | works |
| 7. Now Playing first frame | under 100 | 179 | 199 (192 to 214); art at 280, settled 512 |

Criterion 7 still fails. The applet's route event comes at the tap, and the WebView then spends one long frame of 113 to 144 ms building Now Playing before the first change shows. Getting under 100 ms needs Now Playing ready before the tap, which is a larger change than this step.

Repeat misses 100 ms by 9 ms on the median. It draws the same way as Shuffle.

## Bench

Idle while playing on Home, 60 s, three runs: app CPU 1140 ms/s (1119 to 1149) against 1092 before the fixes; renderers 410 ms/s (390 to 504) against 860; app memory about 286 MB.
