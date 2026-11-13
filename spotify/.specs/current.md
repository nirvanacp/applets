# Current specification

## Identity

Name Spotify, id `spotify`, origin https://open\.spotify\.com. Created 2026-11-13T12:52:15+05:30. Template `react`: the UI is React, through `mount` and the hooks of `@genesis/sdk/react`.

| Version | Value |
| --- | --- |
| Manifest schema | 6 |
| Bundle format | 3 |
| Protocol | 1 |
| Page control API (`adapterApi`) | 1 |
| SDK and tools | 0.0.0 |
| Kit | 0.0.0 (see `factory/kit.json`) |

Problem ID: `spotify-applet` · Problem: a native-feeling Spotify applet over open.spotify.com · Spirit animal: 🦜 Parrot

## Product scope

Goal: a Spotify applet that feels like the native Spotify app while running the Spotify web player (open.spotify.com) underneath. Source of requirements: the user's PRD (58 screens, about 150 requirement IDs in groups ON, HM, SR, PB, QU, DV, JM, MS, BL, LB, AR, PD, AB, PR, ST, NF) and its PNG designs 1.1 to 12.5. Agreed delivery: phase 1 covers what the web player supports (onboarding and sign-in, Home, Search, Now Playing with mini-player, Queue, Devices, Library and playlists, Album and Artist, Podcasts, Audiobooks, Profile, Settings the web exposes); features the web lacks are recorded as blocked. Phase 2 (sleep timer, share sheet, applet-local extras) is proposed later.

Status: the PRD build runs in six milestones, each verified on the phone and committed before the next (decision-0004). Milestone 1, the app frame and player, is done: tab bar, mini-player on every screen, Now Playing with save, seek, previous, play, next, shuffle and repeat, and "Next up". Milestone 2, Album, Playlist and Artist pages with play, save, follow and track play, is done. Milestone 3, Search, Browse all and category hubs, is built and mostly verified (see Verification). Milestones 4 to 6 (Library, track menu and toasts; Podcasts, Audiobooks, Devices and Lyrics; Profile, Settings and the blocked list) follow.

## Feasibility

| Journey | Result | Evidence |
| --- | --- | --- |
| Sign-in through "Continue with Google" | works | Device check on 2026-11-13: the test account's Google sign-in returned a signed-in session and the router showed the applet screen |
| Signed-in web player with the current shell | blocked | Signed-in open.spotify.com shows only "Playback disabled: Spotify won't work if you block protected content"; Home, Search and Library do not render |
| Signed-in web player with protected media granted (local spike, not committed) | renders | Mobile web player loads Home ("Good morning", album and radio shelves), album pages, and Home, Search and Your Library tabs |
| Audio playback with protected media granted, on the emulator | fails | Widevine L3 license is obtained, then the audio decoder fails (`PIPELINE_ERROR_DECODE`) and the page shows "Something went wrong" |
| Signed-in web player on a phone, with the shell granting protected media | works | Samsung SM-M307F, Android 11, Widevine L1: the web player renders |
| Audio playback from the revealed website on the phone | works | Play shows Pause, the progress animation runs, Genesis has a started media audio stream, no decode error |
| Play and Pause from the applet screen (hidden context) | works | Probe below: the page's play state and Genesis's media stream follow the applet's button |
| Audio after leaving Genesis | stops | Genesis frees an applet's website pages soon after it goes to the background (at once on Home), so audio stops; playback in the background needs platform work |
| Lock-screen and notification controls | unavailable | Android WebView has no `navigator.mediaSession` |

The shell now grants protected media to website pages, as a browser does by default. Background playback and media controls are open platform follow-ups.

## Contexts

| Context | Start URL |
| --- | --- |
| primary | https://open\.spotify\.com/ |

## Routes

The router table is in `src/routes.ts`.

| Route id | Pattern and example URL | Screen | Context | Ready reader | Loading, empty, sign-in and error | Back | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | `/`, https://open\.spotify\.com/ | home | primary | `ready.home` | skeleton shelves; "Nothing to show yet" notice; signed out shows the website sign-in; load error notice | leaves the applet from the start page | implemented | phone, revision 14 |
| album | `/album/:id`, https://open\.spotify\.com/album/2L3NV5Fxjrj6mi59Gs5tUx | entity | primary | `ready.entity` | skeleton rows; load error notice with "Open on Spotify" | Back button and Android Back return to the previous page | implemented | phone, revision 18 |
| playlist | `/playlist/:id`, https://open\.spotify\.com/playlist/37i9dQZF1DX0XUfTFmNBRM | entity | primary | `ready.entity` | as album | as album | implemented | phone, revision 18 |
| artist | `/artist/:id`, https://open\.spotify\.com/artist/4YgUVg4p7xtMOrOS4GjiJZ | entity | primary | `ready.entity` | as album | as album | implemented | phone, revision 18 |
| search | `/search`, https://open\.spotify\.com/search | search (Browse all) | primary | `ready.search` | skeleton rows; load error notice | the tab root | implemented | phone, revision 19 |
| searchRecent | `/search/recent`, https://open\.spotify\.com/search/recent | search (recent searches) | primary | `ready.search` | "Play what you love" notice when there are none | Cancel and Back return to Browse all | implemented | phone, revision 19 |
| searchResults | `/search/results/:query`, https://open\.spotify\.com/search/results/adele | search (results) | primary | `ready.search` | skeleton rows while searching; "No results" notice | as searchRecent; typing replaces the history entry | implemented | phone, revision 19 |
| searchFilter | `/search/:filter/:query`, https://open\.spotify\.com/search/song/adele | search (filtered results) | primary | `ready.search` | as searchResults | as searchResults | implemented | phone, revision 19 |
| genre | `/genre/:id`, https://open\.spotify\.com/genre/0JQ5DAqbMKFEC4WFtoNRpw | hub | primary | `ready.hub` | skeleton shelves; "Nothing here yet" notice; load error notice | Back button | implemented | not verified on the device |

Overlay screens, opened from the UI without a URL: `player` (Now Playing) and `library` (Your Library). Any other URL shows the website; the Search tab opens https://open\.spotify\.com/search.

## Screens

- Frame (`src/app.tsx`): bottom tabs Home, Search and Your Library, and the mini-player above them on every screen except Now Playing. Accent `#1ed760` on a `#121212` background, as in the PRD designs.
- `home` (2.1): the greeting heading and one horizontal shelf per Spotify row, in page order. A tile opens its page by URL, or clicks the website card when Spotify gives no link.
- Mini-player: artwork, title and artist, a save toggle and Play/Pause with an optimistic state while the command runs. The track opens Now Playing.
- `player` (4.1): opens the website's full player on mount and closes it on leave. "Playing from" links to the album or playlist; title and artist link to their pages. Save, a progress bar that seeks on release, time labels, shuffle, previous, play/pause, next, and repeat with off, all and one. Each control disables while its command runs, and a notice explains a failed or unconfirmed command. "Next up" shows the next track, the only one the web player exposes.
- `entity` (8.1 Album, 7.5 Playlist, 8.2 Artist): one screen for the three pages. Album and playlist show centred art, title, a playlist's description, the byline (album artists or playlist owner, linking to their pages) and a meta line ("Album · 2006 · 7 songs · 33 min 6 sec"); an artist shows a full-width photo with the name over it and the monthly listeners. The action row has Follow (artist) or the save switch (album, playlist) and a green Play/Pause for the whole page. Track rows play on tap and show the playing row in green; artist rows are numbered with play counts. Then an artist's "Popular releases" list and the page's rows of tiles ("More by …", "Albums", "Fans also like"). Reaching the end of a playlist loads Spotify's next rows.
- `search` (3.1 to 3.3): on `/search`, the title, a white search field and the Browse all grid of coloured category tiles; a tile opens its hub. The field opens Spotify's own search page, then shows the applet's field with Cancel. An empty field lists recent searches with a remove button each and "Clear recent searches". Typing sends the query to Spotify once typing pauses for 350 ms; results show Spotify's filter chips, a Top result card (with Play for a song) when no filter is on, and rows titled with "Type · details". A song row plays in place; any other row opens its page.
- `hub` (3.4): a category's name and its rows of tiles, read by the same `sections` reader as Home.
- `library`: "Your Library" with a Liked Songs row. Liked Songs shows the website until milestone 4.

## Page module

`src/page.ts`, with the code in `src/adapter/`:

- `account`: signed in when the website shows its settings gear or the mini-player's save button; signed out on its login button or link.
- `ready.home`, `heading` and `sections` (list, keyed by row title with "#n" for repeats; each row is `{ title, cards }`, extent its `h2`). Cards come from `home-card`, `card-mwp` and Encore `card` elements.
- `nowPlaying` (value, measured): `{ title, artist, image, playing, saved, elsewhere, next }` from the mini-player. Its carousel holds the previous, current and next tracks; the current one is the first whose left edge is inside the bar.
- `player` (value): the open full player's track, links, artwork, saved state, position and duration (from its range input's `aria-valuetext`), playing, shuffle, repeat, and which buttons are enabled. Null while it is closed.
- `ready.entity`, `entity` (value): kind, title, image, description, byline links, meta, monthly listeners, saved, following, and whether the page's play button shows Pause. `tracks` (list, virtualized, keyed by the row's `aria-labelledby`): title, artists or play count, image, URL, explicit and playing. `releases` (list): an artist's popular releases. The entity screen also reads `sections`.
- `ready.search`, `search` (value: the query from the URL, the filter chips with their checked state, whether recent searches can be cleared), `searchRows` (list keyed by the row's `aria-labelledby`: title, type, details, image, kind, explicit, verified and whether it can be dismissed; results and recent searches share it) and `browse` (list: the Browse all tiles with title, colour, image and hub URL). `ready.hub` waits for a hub's heading and first row.
- Commands: `setPlaying`, `skip({ direction })`, `setShuffle`, `setRepeat` (presses the button as often as the off, all, one cycle needs), `setTrackSaved`, `seek({ seconds })`, `openPlayer` and `closePlayer`. Each is satisfied when the page already matches and otherwise waits for the page to show the change. Clicks that start or change playback are trusted input. `seek` presses the arrow key in the full player's range input (decision-0005). Entity pages add `playEntity({ playing })`, `playTrack({ rowId })` (a trusted tap on the row, which plays it in the page's context), `setEntitySaved({ saved })`, `setFollowing({ following })` and `loadMoreTracks` (scrolls the last row into view and on to the end; a plain jump to the end loads nothing). Search adds `openSearch` (taps the page's search button), `setQuery({ query })` (fills Spotify's search input; Spotify searches as it changes and replaces the URL, so no page load happens per keystroke, where navigating by URL would reload the page), `setFilter({ label, checked })`, `openResult({ rowId })` (a trusted tap, which plays a song or opens a page and adds a recent search), `removeRecent({ rowId })` and `clearRecents`.

## Blocked or limited

| PRD item | Status | Reason |
| --- | --- | --- |
| Queue screen (QU) | limited | The mobile web player has no queue view; Now Playing shows only the next track |
| Add to queue | blocked until checked | Not found in the mobile web player's menus yet; revisited in milestone 4 |
| Lyrics in Now Playing | milestone 5 | The mobile web player's full player has no lyrics panel |
| Lock-screen and notification controls | blocked | Android WebView has no `navigator.mediaSession` |
| Playback in the background | blocked | Genesis frees an applet's website pages soon after it leaves the foreground |
| Artist "About" (8.3), artist pick, tour and merch | limited | The mobile web artist page has no About, artist pick, concerts or merch sections; Popular, releases and related rows are shown |
| Playlist collaborators and per-track adders (7.5) | limited | The mobile web playlist page names one owner and no adder per track |
| Download, shuffle-play button on entity pages | blocked | The web player has no downloads; shuffle is set in Now Playing |
| Search video clips (SR-6) and camera scanner (SR-7) | blocked | The web player has neither |
| "Discover something new" tiles on Search (3.1) | limited | The mobile web Search page shows only Browse all |
| Search by lyrics (SR-8) | limited | Results are whatever Spotify's web search returns; the applet adds no matching of its own |
| More results while scrolling | limited | The applet shows the rows Spotify first draws for a query (about 20); a filter narrows them |
| Seek speed | limited | Seeking moves five seconds per key press, about 0.4 s each, so a long jump takes several seconds |

## Verification

- Feasibility spike on emulator `Medium_Phone_API_37.0` (`emulator-5554`); see the table above. The scaffold screen was seen reading links from the signed-out and signed-in home page.
- Probe on 2026-11-13, on a Samsung SM-M307F (Android 11, System WebView 156.0.8078.47, Widevine L1), revision 5: `check`, `tsc` and `build` pass. The strip shows the current track and artist; applet Play and Pause change the page's play state and Genesis's media stream, including Play right after the website page reloads. Play from a hidden context works because the click is trusted input.
- Not verified: the Connect takeover path. Spotify showed its "Listen on this phone" prompt once, after a reinstall, and choosing it by hand worked, but it did not appear again on demand, so the command's takeover steps have not run on the device. Whether the audio is audible was not confirmed by ear.
- Milestone 1 on 2026-11-13, on the Samsung SM-M307F phone, revisions 7 to 14: `check`, `tsc` and `build` pass. Verified on the device: Home shelves with artwork; the mini-player's title, artist and art; Play and Pause from the mini-player; Now Playing opening from the mini-player; Next; Previous (disabled by the website on the context's first track, restarting the track otherwise); shuffle on and off; repeat off, all, one, off; seek from 0:55 to 3:45 for a 3:44 target; save to Liked Songs and removing it again; the Your Library tab and its Liked Songs row opening the website page. Not verified: the Connect takeover steps, and audibility by ear.
- Milestone 2 on 2026-11-13, on the Samsung SM-M307F phone, revisions 15 to 18: `check`, `tsc` and `build` pass. Verified on the device: an album opened from Home with its art, artist, meta and 7 tracks; a tap on a track row plays it and turns it green; the album's Play and Pause; saving the album and removing it again; the artist link opening the artist page; Follow and unfollow; a tap on a popular track playing it; a playlist with description, owner and saves; saving the playlist and removing it again; a 50-track playlist loading rows 31 to 50 when the list end is reached; Back from the artist to the playlist.
- Milestone 3 on 2026-11-13, on the Samsung SM-M307F phone, revisions 19 to 21: `check`, `tsc` and `build` pass. Verified on the device: the Search tab showing Browse all tiles with colours and art; the field opening recent searches with the keyboard up; typing "adele" giving live results with the chips and a Top result card; the Songs chip filtering to songs; a tap on a song result playing it; the Artists chip; Cancel beside the Genesis menu button without overlap (revision 20); opening an artist result and Back to the same filtered results; an opened artist becoming a recent search; removing one recent search; clearing recent searches (the website list is empty afterwards); Cancel back to Browse all; the Hindi genre hub with its heading and rows; a hub card without a link opening its playlist (revision 21: such cards now get a trusted tap on the card, because Spotify ignored the synthetic click on the title); Back from the playlist to the hub and from the hub to Browse all; a Home mix card still opening. Open: the keyboard comes back up when Back returns to the results.
- Review fixes on 2026-11-13: `playTrack` scrolls a dropped row back, a long seek takes several bounded calls, Now Playing shows a retry when the player does not open, and filter chips stay when a filter finds nothing. `check`, `tsc` and `build` pass. Not verified on the device.
- A long seek stops when the track changes, another scrub starts or Now Playing closes (2026-11-13). Not verified on the device.
