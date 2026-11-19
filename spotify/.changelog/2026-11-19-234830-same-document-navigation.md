# Navigate without interrupting playback

Problem ID: `spotify-official-app-parity` · Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed · Spirit animal: 🐬 Dolphin

- Goal: Keep the audio playing through every navigation, as in the official app, and make row taps play at once without showing the website (gaps P-01, P-05, P-09, C12, O-03).
- Changes:
  - The Home and Search tabs, cards, bylines and every other Spotify URL open through `navigate({ url, sameDocument: true })`, so the page stays in one document and the audio goes on.
  - A row tap goes through the playback store: the bar shows the row's title, artist and art in the same frame, the row shows as playing, and a second row tap replaces the first. The page module taps the row's plain area, the point farthest from any link or button, so a tap never opens a page.
  - Links in Now Playing close the full player first, then open the page.
  - `loadMoreTracks` waits until the page is ready and current, and a load cut off by a route change is asked again on the next scroll instead of reported.
  - Refresh while Spotify plays in this page resyncs the watches instead of reloading, because a reload stops the audio.
  - Fixed: opening Now Playing clicked the first title in the mini-player bar, which belongs to the previous track's slot, so Spotify played the previous track from 0:00. It now clicks the current slot's title.
- Design table: added the instant row start and last-tap-wins (official app), and same-document navigation for every page. Kept from before: the row's look, the playing accent, the Stage's push, pop and fade, the full player's close motion. Left out: a reload while playing; refresh resyncs instead and the limit is recorded.
- Verification: `typecheck`, `check` and `build` pass with no warnings; revision 46 installed on the phone. Measurements are in the navigation entry of the specification's Verification section.
