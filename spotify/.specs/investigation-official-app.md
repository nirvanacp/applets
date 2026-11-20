# Investigation: the official Spotify Android app

Problem ID: spotify-official-app-parity
Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed
Spirit animal: 🐬 Dolphin

Recorded 2026-11-19 on a Samsung SM-M307F (Android 11, 1080x2340) with Spotify 9.2.0.2053, signed in with the test account. The applet under comparison is revision 37, built from applets 5cc7935, running in a Genesis 0.1.0 debug build.

## Account plan

The test account is on the Free plan. The app shows:

- a Premium tab;
- a "3 months of Premium Standard" offer banner pinned above the content of Home, Search, Your Library, album, artist and playlist pages;
- a trial offer modal on first open, closed with Back;
- "Start a Jam" marked Premium in the track menu;
- "Slow connection" banners above the tab bar.

Even so, playback was on demand. Album and search tracks played as chosen, and dozens of Next and Previous presses in a row all worked, so no skip limit was hit during this session.

## Method

- Each measured interaction was recorded with `screenrecord` at 8 Mbit/s, resampled to 60 fps (16.7 ms per frame), and read with a frame difference script.
- Taps were injected. Injected taps draw no touch dot, so the onset is the first visible reaction at the tap point, such as a pressed dim, a ripple or a row highlight. This understates true latency by the time from touch to that first feedback. The applet will be measured the same way, so the two stay comparable.
- The end of an interaction is the first frame whose result region is close to its settled state, checked by eye on frame strips.
- Ten trials were run where practical. Where fewer trials are reported, the table says so and the notes say why.
- Playback ran on "This phone". Genesis appears to the official app as the Connect device "Mobile Web Player" and was paused throughout.

## Interaction timings

| Interaction | Trials | Median | Worst | Notes |
| --- | --- | --- | --- | --- |
| Mini-player Play, icon swap | 10 | 108 ms | 350 ms | The worst was the first, cold trial |
| Mini-player Pause, icon swap | 10 | 367 ms | 400 ms | |
| Now Playing Play or Pause | 10 | 50 ms | 83 ms | |
| Now Playing Next, title changes | 19 | 300 ms | 967 ms | Two runs of 10 and 9 trials. The cover art follows 0.6 to 1.5 s after the title |
| Now Playing Previous, back one track | 9 | 183 ms | 233 ms | Previous within the first seconds of a track goes back one track |
| Previous after about 3 s, restart at 0:00 | 1 | 100 ms | | The seek bar jumps to 0:00 |
| Open Now Playing from the mini-player, fully settled | 9 | 1233 ms | 1333 ms | A dark frame first, the header and controls at 530 to 700 ms, then the art fades in |
| Close Now Playing with the chevron | 9 | 250 ms | 300 ms | |
| Add (+) to the green check | 6 | 350 ms | 400 ms | Each add was undone through the sheet, so fewer trials. The check morph completes at 550 to 650 ms |
| Shuffle toggle | 10 | 75 ms | 100 ms | |
| Repeat cycle | 9 | 67 ms | 100 ms | |
| Album open from a Home recents tile | 3 | 917 ms | 1167 ms | 850, 917, 1167 ms. The page skeleton shows at about 700 ms. The first loop drifted after the banner shifted the layout, so only 3 clean trials |
| Back from an album to Home | 7 | 750 ms | 1217 ms | Measured from the first redraw. The chips appear first and the shelves follow |
| Track row tap on an album page, mini-player title changes | 5 | 383 ms | 500 ms | |
| Search suggestions after typing stops | | about 500 ms | | Observed, not timed per trial |

Other observations:

- **Seek.** Dragging anywhere on the seek bar seeks. The elapsed label follows the finger during the drag, and playback jumps on release.
- **Repeated Next.** Five Next taps within about 1 s advanced the track three times, and the title settled about 2.3 s after the first tap.
- **Mini-player swipe.** A fast injected horizontal swipe on the mini-player opened Now Playing instead of changing the track. Whether a slower swipe skips is not confirmed.

## Mini-player

- It shows:
  - the cover art;
  - the title, and the artists as a scrolling marquee;
  - a device line when playback is on another device;
  - a Connect button, Add (+) and Play/Pause;
  - a thin progress line along its bottom edge.
- Its background color comes from the cover art.
- A tap anywhere outside the buttons opens Now Playing.
- It stays docked above the tab bar on every page visited: Home, Search, Your Library, album, artist, playlist and profile. It stayed in place through every navigation and page load, with no flicker or reload.
- After returning from the background it shows the current state at once, for example the play icon after a pause from the notification.

## Surfaces and controls

### Tab bar

Five tabs: Home, Search, Your Library, Premium and Create. Create opens a sheet over the current page with Playlist, Collaborative playlist and Blend, and the tab turns into a close button.

### Home

- An avatar opens a side drawer with:
  - a profile card with "View profile";
  - Add account, Recents, Your Updates, and Settings and privacy.
- Filter chips: All, Music, Podcasts, Audiobooks.
- A two-column recents grid. The playing item shows an equalizer icon.
- A "Start listening" track list, each row with a ⋮ menu.
- Shelves of albums, playlists and artists, such as "Albums featuring songs you like".
- The Premium offer banner, with a close button.

### Profile

A back arrow, follower and following counts, Edit, a settings gear, a ⋮ menu, and a Playlists section.

### Connect sheet

The current device with a quality badge and a volume slider, "This phone", and "Find Bluetooth devices".

### Now Playing

- **Top bar:** a chevron to close, "Playing from Album <name>", and ⋮.
- **Art:** the cover art. When lyrics are available, a live lyric line shows above the title and the art moves up.
- **Title row:** the title and artists, as a marquee, with + on the right. + saves to Liked Songs and opens a "Saved in" sheet listing Liked Songs and New playlist.
- **Seek bar:** with elapsed and total times.
- **Controls:** Shuffle, Previous, Play/Pause, Next and Repeat.
  - Shuffle has two states, off and on. On is green with a dot.
  - Repeat cycles off, all and one.
- **Bottom row:** Connect, Share and Queue.
- **Below the fold:** a Lyrics preview card, or an "Explore <artist>" card.
- **Background:** a gradient taken from the art.

The ⋮ menu has:

- a track header;
- Share, Lyrics (On), Add to Liked Songs, Add to playlist, Hide in this album;
- Add to Queue, Go to Queue, Go to album, Go to artists;
- Start a Jam (Premium), Exclude track from your taste profile, Sleep timer, Go to song radio;
- View song credits, Show Spotify Code.

### Queue

- A sheet headed "Queue" and "Playing <context>", with Edit.
- The current row with a Pause button.
- The next rows, each with a drag handle.
- Shuffle, Repeat and Timer buttons at the bottom.

### Album

- A hero with the art, title, artist and release date.
- A button row: Add, Download, Share, Shuffle, and a large green Play.
- On scroll, a sticky header with a back arrow and the title, with Play floating.
- Track rows with ⋮. The playing row is green with an equalizer icon.
- A footer with the track count and total length, for example "9 songs • 50 min".

### Search

- **Header:** the avatar, the "Search" title and a camera (scan code) button.
- **Field:** "What do you want to listen to?".
- **Browse:**
  - category tiles: Music, Podcasts, Audiobooks, Live Events, Home of I-Pop and Made For You;
  - "Discover something new" video clips;
  - hashtag browse.
- **Focused field:** a back arrow, the recent searches area and the keyboard.
- **Typing:** shows suggestion rows. Each row has an arrow that copies the suggestion into the field.
- **Submitting:** shows filter chips (Playlists, Songs, Albums, Artists, Profiles, Podcasts) above the results.
  - Track rows have ⋮ and +.
  - Artist rows have Follow.
- **Long press on a result row:** opens the same track menu as Now Playing's ⋮. It has Share, Add to Liked Songs, Add to playlist, Add to Queue, Go to Queue, Go to album, Go to artists, Start a Jam and more.

### Artist

- A hero image with the name, "Verified by Spotify" and monthly listeners.
- A row with a release thumbnail, Follow, Shuffle and Play.
- A "Listen to the new track" card.
- Tabs: Music, Clips, Events.
- Popular: a numbered list with play counts and ⋮ on each row. Artist Pick and other sections follow.
- On scroll, a sticky header with back, the name and ⋮.

### Your Library

- **Header:** the avatar, "Your Library", Search and + (create).
- **Filter chips:** Playlists and Artists. They are shown only for item types the library holds.
- **Sort and view:** a sort control opens a "Sort by" sheet with Recents, Recently added, Alphabetical and Creator. A grid button switches between list and grid.
- **Import card:** "Import your music from other apps".
- **Items:** Liked Songs is pinned at the top with a green pin. Followed artists follow as round thumbnails, then "Add artists".

### Liked Songs and playlists

- A gradient header with back, the title and the song count.
- Download, Shuffle and Play.
- An "Add to this playlist" row.
- Track rows with ⋮.

## Background and notification

- Pressing Home keeps playback going. The media session stays in the playing state.
- The collapsed media notification ("Playing on this phone") shows the art, title, artists, Previous, Pause and Next.
- The expanded notification adds:
  - Add (+);
  - a close (X) button;
  - an output picker;
  - a draggable seek bar with elapsed and total times.
- The media session also offers the custom actions Toggle shuffle, Add to collection, Start radio and Repeat.
- Pause from the notification paused playback. On returning, the app showed the same tab as before, with the mini-player already showing Play.

## Applet bench baseline

The Genesis bench of applet revision 37 before any change. Medians of three runs:

| Scenario | Cold start | App CPU | Renderers CPU | App PSS | Renderers PSS |
| --- | --- | --- | --- | --- | --- |
| Cold, 30 s | 2750 ms | 1590.9 ms/s | 510.0 ms/s | 216.6 MB | 132.9 MB |
| Idle paused on Home, 60 s | | 6.3 ms/s | 0.7 ms/s | 203.4 MB | 120.8 MB |
| Idle playing on an album page, 60 s | | 822.3 ms/s | 288.5 ms/s | 210.7 MB | 162.2 MB |

## Open points

- Whether a slow swipe on the mini-player changes the track.
- Settings and podcast pages were not explored.
- The official app's timings include its own network fetches on a connection it flagged as slow. Compare against the applet on the same network, close in time.
