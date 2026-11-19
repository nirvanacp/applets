# Show Liked Songs as an applet screen

Problem ID: `spotify-official-app-parity` · Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed · Spirit animal: 🐬 Dolphin

- Goal: Your Library opens Liked Songs on the applet's own screen instead of the website, and Back from it returns to Your Library, as in the official app (plan step 9 group 2, gap F-02).
- Changes:
  - New route `liked` on `/collection/tracks`, drawn by the entity screen with the kind `liked`: Spotify's heart tile as its art, the title, "Playlist · N songs" from the section under the website's header, Play and the song rows. The rows, Play and row taps reuse the playlist code.
  - Your Library is a route on `/collection` instead of an overlay screen, so it has a place in history and Back from Liked Songs returns to it. The tab opens it in the same document, so playback keeps going. The website draws only its app upsell there, which never shows.
  - The Liked Songs row says "Playlist" and has no website cue. The Your Library tab stays selected on Liked Songs.
  - Saved playlists, albums and artists, chips, sort and grid stay open: the web player's pages for them show only the upsell.
- Design table: F-02 is fixed for Liked Songs and open for the rest. Added the library route and the heart tile.
- Verification:
  - `typecheck`, `check` and `build` pass with no warnings; revision 55 installed on the phone (Samsung SM-M307F).
  - Liked Songs from the library row: the skeleton showed within 0.5 s of the tap command (this includes the tap tool's own delay), the title 1.3 s after it and the song count 1.7 s after it. The song row played from a tap and turned green, and the page's Play showed Pause.
  - Back from Liked Songs showed Your Library, and Back again showed Home. With a track playing, Library tab, Liked Songs, Back, Back, Library tab, Liked Songs and Home tab all kept the mini-player on Pause with the same track.
  - The load-more spinner under the one row ended within 1.5 s.
