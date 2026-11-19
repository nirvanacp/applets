# Plan: video in place and a feed that holds its place

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

Follows [the official app parity plan](plan-official-app-parity.md) and its [verification](verification-official-app-parity.md). Branch `feat/x-official-app-parity`.

## Reported

1. A tap on a video leaves the list for X's own viewer. It should play in its row, with a full-screen option.
2. Back from a full-screen video should return to the page the video was on, a list or the post page. Playing a video must not add the post page to the history.
3. Home refreshes by itself and moves under the reader. Automatic refresh stays, the reading position holds, and a control shows when newer posts wait above.

Playing the next video on scroll is out of scope: X's site does not do it.

## Steps

1. **Explore.** Agents walk every place a video shows and every list that can change by itself, on a device, beside the official app. They record what a tap, Back, a refresh, a resume and autoload do, and anything else that looks wrong. Result: `investigation-video-and-feed.md` with one row per finding.
2. **Design.** One design for the video row, full screen, the reading position and the new-posts control, with every finding mapped to a fix or left open with a reason. Result: `design-video-and-feed.md` and decisions from 0030.
3. **Find the video route.** Decision 0021 says videos other than GIFs have no file the applet can play. Try, in order: X's HLS playlist on `video.twimg.com`, found through the page's resource timing and matched to the post by the media id in its poster; a reader the check allows; X's own player full screen over the applet through the one-time `fullscreen` grant. Record the result as a decision.
4. **Play in the row.** The video mounts on tap over its poster with no layout shift, with pause, scrubber, mute and full screen. One video sounds at a time. It pauses off screen, on a screen change and in the background. A failure offers Try again and Play on X. If only the grant route works, a tap plays full screen over the applet and nothing navigates.
5. **Full screen and Back.** Full screen is the element's own full screen, else a `player` overlay screen, else X's player through the grant. Back returns to the same screen at the same scroll position, and the history gains no entry.
6. **Hold the reading position.** A list is merged, never replaced: new posts join at the front, rows X's page no longer holds stay, autoloaded rows stay. The first row at least half on screen keeps its offset through every change. Changes wait while a finger is down or the list moves. Pull to refresh and the Refresh button show the newest and go to the top.
7. **New posts pill and go-up button.** Below the top of Home and Notifications, newer posts wait behind a pill under the top bar. A tap, or reaching the top, shows them. Far down a list, scrolling up shows a round go-up button above the compose button.
8. **Fix the rest of the findings**, one screen per change.
9. **Verify** on a device: every video place, every refresh trigger at three scroll positions, the native-feel bar on the changed screens, and the bench against the first plan's numbers. Result: `verification-video-and-feed.md`.
10. **Publish**: raise the patch version, publish, and open the pull request.

## Acceptance

- A tap on a video plays it in its row on every screen that draws posts, or full screen over the applet when step 3 finds no in-place route. The page and the history do not change.
- Back from full screen returns to the same screen within 8 px of the same scroll position.
- No refresh, autoload, resume or Back moves the post being read by more than 8 px or removes it.
- New posts on Home wait behind the pill below the top and show at once at the top.
- `npm run typecheck`, `genesis-applet check` and `genesis-applet build` pass with no warnings, and the bench is no worse than before.
