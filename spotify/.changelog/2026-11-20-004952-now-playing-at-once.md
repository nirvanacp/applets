# Open Now Playing at once

Problem ID: `spotify-official-app-parity` · Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed · Spirit animal: 🐬 Dolphin

- Goal: Now Playing opens with the current track at once, every control works from the first frame, and the screen has the official app's gestures: a drag down to close, a swipe on the art to skip, and a seek that shows the scrubbed time (plan step 8, gaps C6, P-10).
- Changes:
  - Now Playing draws from the store at once. The store keeps the full player's last reading for the track, so the source line, shuffle and repeat show their last values while the full player opens; shuffle and repeat open it before they press.
  - Leaving Now Playing releases the website's full player, which closes 1.5 s later when nothing else waits (decision-0019). A row, page Play or card tap closes it first, so the tap lands on the page.
  - Drag down to close: from the top of the screen's scroll, the screen follows the finger and closes past a quarter of its height or on a flick; a shorter drag springs back. A swipe on the art skips, shared with the mini-player's swipe.
  - The progress bar shows the scrubbed time while dragging and seeks on release. Fixed: after a release, React's `onChange` on the same `change` event held the bar at the old position; the position is now worked out on each render, so a seek's new clock shows at once.
  - A Share button opens Android's share sheet with the track's link.
  - The outgoing screen's copy shows its scroll by shifting its parts instead of setting `scrollTop`, which forced a 41 to 47 ms layout before Now Playing could draw. Shelves and chip rows count as scrollers, so their tiles out of view copy as empty boxes.
  - Separate commits: a playing row is read from its title only (a Liked button wears the same accent), and the "Listen on this phone" prompt is found by its button's text.
- Design table: added the drag down, the art swipe, Share and the lingering full player (official app). Kept from before: the rise and fall motion, the controls' layout, Next up with only the next title. Left out: a Connect device sheet, since the web player lists only this browser (recorded as a gap).
- Verification:
  - `typecheck`, `check` and `build` pass with no warnings; revision 52 installed on the phone (Samsung SM-M307F).
  - Open from the mini-player: click to Now Playing in the DOM 37 to 44 ms (4 opens), with title, artist, art and controls and no skeleton. Touch-down to first frame 125 to 161 ms, of which the WebView's own tap delay is 52 to 84 ms.
  - Seek: forward (1:33 to 6:25) and back (6:46 to 1:40) drags each showed the target on release and Spotify landed 551 ms and 369 ms after release. Four more drags and a tap all matched Spotify's position within 1 s.
  - Mini-player Play right after Back from Now Playing changed Spotify's state 273 and 299 ms after the tap. The drag down closed the screen and the website's full player was closed 3 s later.
  - A swipe left on the art played the next track and a swipe right the previous one. Share opened Android's share sheet; Back closed it with nothing shared.
  - Back from Now Playing after an art swipe closed it to Home. Reduced motion (emulated): no rise animation, the drag down closes without following the finger. 200% text: Now Playing scrolls with no sideways overflow.
