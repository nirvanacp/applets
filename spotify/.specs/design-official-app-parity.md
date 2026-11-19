# Official app parity design

Problem ID: spotify-official-app-parity
Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed
Spirit animal: 🐬 Dolphin

This design covers the gaps in `investigation-parity-gaps.md` that plan steps 5 to 8 left, and the ones found since. Each screen section below says what the screen should do for each gap. The table at the end maps every gap id to the step that fixed it, the step 9 group that takes it, or the reason it stays open.

The rules for every group:

- A control whose outcome is predictable answers at once: the screen shows the new state on the touch and the store sends the command behind it (decision-0017). A control whose outcome is not predictable shows busy, then the outcome.
- One tap makes one write.
- A gap that needs a Genesis capability stays open here, with the capability, a proposed public contract and a reproduction anyone can run. The applet does not patch the platform.
- A gap that would take more than a day stays open and is reported.

New ids found during step 9:

| ID | Severity | Screen | Found |
| --- | --- | --- | --- |
| P-12 | P1 | Now Playing, mini-player | Next tapped in the last moment of a track moved two tracks: the track ended by itself, then the Next ran as well |
| N-04 | P1 | Now Playing, every screen | A drag that starts at the left edge fires Android's Back gesture instead of the control under it |
| N-05 | P2 | Mini-player | While Spotify Connect asked to move playback here, the bar named the device ("Mobile Web Player") as the artist |

## Mini-player

- Play/Pause, save and the title answer on the touch (P-04, P-07 and N-01, fixed). The bar stays docked through navigation and tab changes (N-01, N-02, fixed).
- After a burst of Nexts the bar names the track the website will play, not a stale carousel slot (N-03, fixed).
- When another device plays, the second line reads "Playing on another device" in green, never the device's name (N-05). The prompt is found by its "Listen on this phone" button alone, so it does not matter where Spotify draws it.
- The progress line along the bar's bottom edge and the sideways swipe to skip are drawn (F-03, part fixed in steps 5 and 8). A swipe that starts at the left edge fires system Back instead (N-04). The colour from the cover art (F-09) stays open: the website gives no art colour.

## Now Playing

- Opens on the touch with the track the store knows, no skeleton (P-11, fixed). Close releases the full player without holding the next input (P-10, fixed).
- Seek by drag and tap moves the thumb at once and lands within a second (P-03, fixed). Next and Previous show the next title at once and keep the controls lit (P-06, P-08, fixed).
- A track that ends by itself while a Next waits counts as that Next (P-12). The store passes the title it skipped from; the page treats the Next as done when that track has already ended. Five quick Nexts still move five tracks.
- A drag that starts within Android's back zone should move the control under it, as in the official app (N-04). This needs the shell to exclude applet elements from the system gesture. It stays open:
  - Capability: the shell calls `View.setSystemGestureExclusionRects` for the rectangles an applet declares, such as the progress bar and horizontal swipe areas, and keeps them current as they move.
  - Contract sketch: an attribute on the element, for example `data-let-gesture-exclusion="left right"`, or an SDK call `excludeSystemGestures(element, edges)` that returns a release function. Android caps the exclusion at 200 dp per edge, so the contract reports what it granted.
  - Reproduction: on a phone with gesture navigation, open any applet screen with a full-width horizontal slider, press about 2 mm from the left edge on the slider and drag right. Android Back fires and the screen closes. The same drag started 1 cm in moves the slider.
- The Connect button and device sheet (F-11) stay open. On 2026-11-20 the web full player's Connect view listed "This Web Browser" and a volume slider and nothing else, so a device sheet would have one entry. When another device plays, the mini-player and Now Playing say so and Play moves playback here (N-05). The queue (F-04) stays open as well: the full player's buttons are shuffle, previous, play, next, repeat, Connect, Share and its menu, with no queue button, and Now Playing shows the next title, the only one the web player gives. Share is drawn (step 8); the dot under an active Shuffle (F-03) is group 5. Lyrics (F-08) stay open: the web full player has none.
- Now Playing has no track menu of its own: its save and Share cover the row menu's items, and its title and artist link to their pages (F-07).

## Album, playlist and artist

- Rows play on the touch and the bar names the row's track at once (P-05, P-09, fixed). No automatic load ends in CONTEXT_REPLACED (O-03, fixed).
- Album and artist Shuffle, entity Share and row press feedback (F-03) are group 5.
- A row's menu (F-07, fixed in step 9 group 3) opens from the row's ⋮ button or a long press, as a sheet from the bottom. It has Add to Liked Songs or Remove from Liked Songs, Share, View artist and View album, from the Free web player's own row menu. A page hides its link to itself. The web menu also has View track, which opens a track page the applet does not draw, so the sheet leaves it out. Add to queue and Add to playlist are not in the web menu (F-05, F-06, decision-0018).
  - Like answers at once: the sheet closes, the row shows a green tick or loses it, and the toast says what Spotify did, with Undo after a removal. View artist and View album show a spinner until the page opens.
  - The page module opens the website row's menu with a trusted tap and taps the item, so each sheet tap is one write.

## Home

- A card opens its page in the same document, so the audio keeps playing (P-01, P-02, fixed).
- The first shelf starts at its left edge (O-02, group 6).
- The drawer and the All, Music and Podcasts chips (F-10) stay open: the mobile web player has neither, and a drawer of applet-only links would lead nowhere the website can show.

## Search

- Search opens on the last Browse all the applet read, with no skeleton (O-05, group 6).
- Results beyond the first rows Spotify draws (F-03) are group 5, through the website's own list growth.

## Your Library

- The official app's library has chips, sort, grid and list, Liked Songs pinned and followed artists, saved albums and playlists (F-02).
- The mobile web player's Your Library tab, `/collection`, and its playlists, albums and artists pages draw only an upsell to the Spotify app. Only Liked Songs, `/collection/tracks`, has a page.
- Group 2 makes Liked Songs an applet screen. The library row opens it in the applet with no website cue. Saved playlists, albums, artists, the chips, sort and grid stay open: the web player has no page to read them from.

## Liked Songs

- Route `liked` on `/collection/tracks`, drawn by the entity screen with the kind "liked": the title "Liked Songs", the song count, Play, and the track rows with their hearts.
- Play and row taps work as on a playlist. Back returns to Your Library, and the Your Library tab stays selected.
- No art from the website: the screen draws Spotify's Liked Songs tile (a heart on a purple gradient) as its own art.
- Remove from Liked Songs in the row's menu unlikes a song (step 9 group 3). The website keeps the row until the page reloads, so Undo works here too.
- Your Library itself becomes a route on `/collection`, the website's library address, so it has a place in history. The website draws only its upsell there, which the applet never shows.

## Outside Genesis

- Notification and lock-screen controls (F-01) stay open: Android WebView has no `navigator.mediaSession`. The capability is a Genesis media session the applet drives with the track, art, playing state and the Play, Pause, Next and Previous actions.
- Genesis opening on Applet info after Home (O-04) is shell behaviour and stays open.
- The status bar colour (O-01, group 6) comes from the applet's theme colour if the shell honours one, and is open otherwise.

## Gap map

| ID | Status |
| --- | --- |
| P-01 | fixed in step 7 (`4e248e2`) |
| P-02 | fixed in step 7 (`4e248e2`) |
| P-03 | fixed in step 5 (`737a622`), drag in step 8 (`e649c54`) |
| P-04 | fixed in step 6 (`608d1e1`), started in step 5 (`737a622`) |
| P-05 | fixed in step 7 (`4e248e2`) |
| P-06 | fixed in step 5 (`737a622`) |
| P-07 | fixed in step 5 (`737a622`) |
| P-08 | fixed in step 5 (`737a622`) |
| P-09 | fixed in step 7 (`4e248e2`) |
| P-10 | fixed in step 8 (`e649c54`) |
| P-11 | fixed in step 8 (`e649c54`) |
| P-12 | fixed in step 9 group 1 |
| N-01 | fixed in step 6 (`608d1e1`) and step 7 (`4e248e2`) |
| N-02 | fixed in step 6 (`608d1e1`) |
| N-03 | fixed in step 5 (`737a622`) |
| N-04 | open: needs a shell capability to exclude applet elements from the system Back gesture (see Now Playing) |
| N-05 | fixed in `1b3e362` (the prompt found by its text); confirmed in step 9 group 1 |
| F-01 | open: needs a Genesis media session; WebView has no `navigator.mediaSession` |
| F-02 | Liked Songs fixed in step 9 group 2; saved playlists, albums, artists, chips, sort and grid open, the web player has no page for them |
| F-03 | progress line fixed in step 5 (`737a622`); bar swipe and Now Playing Share fixed in step 8 (`e649c54`); Shuffle dot, entity Share, entity Shuffle, row press feedback, more results and the device line in step 9 group 5 |
| F-04 | open: the web player has no queue view (decision-0018); checked again in step 9 group 4, the full player has no queue button |
| F-05 | open: the Free web player's menu has no Add to queue (decision-0018) |
| F-06 | open: the Free web player's menu has no Add to playlist (decision-0018) |
| F-07 | fixed in step 9 group 3 |
| F-08 | open: the web full player has no lyrics |
| F-09 | open: the website gives no art colour; reading pixels from the art is more than a day for a P2 |
| F-10 | open: the mobile web player has no drawer or chips |
| F-11 | open: checked in step 9 group 4, the web player's Connect view lists only this browser and a volume slider |
| O-01 | step 9 group 6 |
| O-02 | step 9 group 6 |
| O-03 | fixed in step 7 (`4e248e2`) |
| O-04 | open: shell behaviour |
| O-05 | step 9 group 6 |
| O-06 | fixed in step 5 (`737a622`) |
