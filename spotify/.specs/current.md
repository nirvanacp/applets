# Current specification

## Identity

Name Spotify, id `spotify`, origin https://open\.spotify\.com. Created 2026-11-13T12:52:15+05:30. Template `react`: the UI is React, through `mount` and the hooks of `@let/sdk/react`.

| Version | Value |
| --- | --- |
| Manifest schema | 6 |
| Bundle format | 3 |
| Protocol | 2 (a bundle built before it shows "Needs update" until rebuilt) |
| Page control API (`adapterApi`) | 1 |
| SDK and tools | 0.0.0 |
| Kit | 0.0.0 (see `factory/kit.json`) |
| Published release | 0.1.2 in `published/` (built with Genesis `f3f32cce9f2f`), not tagged yet |

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
| Audio after leaving Genesis | plays | Stopped on 2026-11-13, when Genesis freed an applet's pages soon after it went to the background. On 2026-11-19 Genesis keeps a suspended applet, and audio played on for 15 min with tracks advancing |
| Lock-screen and notification controls | unavailable | Android WebView has no `navigator.mediaSession` |

The shell now grants protected media to website pages, as a browser does by default. Media controls in the notification and on the lock screen are an open platform follow-up.

## Contexts

| Context | Start URL |
| --- | --- |
| primary | https://open\.spotify\.com/ |

The app holds `primary` at `running` while this page plays (decision-0011), so tracks change on time while the user browses.

One context browses and plays (decision-0013). A second page that only plays would be a second Spotify Connect device, so the applet does not add one. Navigation keeps the audio only while `primary` stays in one document. Today a Home card loads a new document and stops the audio (gap P-01). Planned: Genesis tries a same-document route (a history push and `popstate`) for a same-origin URL the site does not take, before a full load; the applet relies on it with no change of its own. Not built yet.

## Routes

The router table is in `src/routes.ts`.

| Route id | Pattern and example URL | Screen | Context | Ready reader | Loading, empty, sign-in and error | Back | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| home | `/`, https://open\.spotify\.com/ | home | primary | `ready.home` | shelf skeleton; "Nothing to show yet" with Refresh; signed out shows "Log in to Spotify" with a Log in button to the website; error with Try again and View website | leaves the applet from the start page | implemented | phone, revision 14 |
| album | `/album/:id`, https://open\.spotify\.com/album/2L3NV5Fxjrj6mi59Gs5tUx | entity | primary | `ready.entity` | album or playlist skeleton (art, title, actions, rows); error with Try again and View website | Back button and Android Back return to the previous page | implemented | phone, revision 18 |
| playlist | `/playlist/:id`, https://open\.spotify\.com/playlist/37i9dQZF1DX0XUfTFmNBRM | entity | primary | `ready.entity` | as album | as album | implemented | phone, revision 18 |
| artist | `/artist/:id`, https://open\.spotify\.com/artist/4YgUVg4p7xtMOrOS4GjiJZ | entity | primary | `ready.entity` | artist skeleton (photo, actions, numbered rows); otherwise as album | as album | implemented | phone, revision 18 |
| search | `/search`, https://open\.spotify\.com/search | search (Browse all) | primary | `ready.search` | Browse all tile skeleton; "Nothing to browse" with Refresh; error with Try again and View website | the tab root | implemented | phone, revision 19 |
| searchRecent | `/search/recent`, https://open\.spotify\.com/search/recent | search (recent searches) | primary | `ready.search` | results skeleton; "Play what you love" notice when there are none | Cancel and Back return to Browse all | implemented | phone, revision 19 |
| searchResults | `/search/results/:query`, https://open\.spotify\.com/search/results/adele | search (results) | primary | `ready.search` | results skeleton and progress bar while searching; "No results" notice; error with Try again and View website | as searchRecent; typing replaces the history entry | implemented | phone, revision 19 |
| searchFilter | `/search/:filter/:query`, https://open\.spotify\.com/search/song/adele | search (filtered results) | primary | `ready.search` | as searchResults | as searchResults | implemented | phone, revision 19 |
| genre | `/genre/:id`, https://open\.spotify\.com/genre/0JQ5DAqbMKFEC4WFtoNRpw | hub | primary | `ready.hub` | shelf skeleton with a title placeholder; "Nothing here yet" with Refresh; error with Try again and View website | Back button | implemented | not verified on the device |

Overlay screens, opened from the UI without a URL: `player` (Now Playing) and `library` (Your Library). Any other URL shows the website; the Search tab opens https://open\.spotify\.com/search.

## Screens

- Frame (`src/app.tsx`): bottom tabs Home, Search and Your Library with labels, and the mini-player above them on every screen except Now Playing. Dark only, Spotify's palette as theme tokens (`--canvas` `#121212`, `--accent` `#1ed760`, `--player` `#2b2440`; decision-0006). Screens change through the kit's Stage: forward pushes, Back pops, tab switches fade through, and Now Playing rises over the tabs and falls away (decision-0007). Reselecting the current tab on its first screen scrolls it to the top. A toast region sits above the mini-player and tabs; command outcomes go there (decision-0008). Every header keeps the shell's menu corner clear.
- States: each routed screen draws, in order, signed out ("Log in to Spotify", with a Log in button that carries the website cue), error with nothing to show ("Couldn't load …", Try again and View website with the cue), confirmed empty (with Refresh), its own skeleton, then content. Content that is kept while a refresh fails shows "Couldn't refresh. Showing the last copy." A thin progress bar shows after 250 ms while the page reloads or shows a kept copy. Content that replaces a skeleton fades in.
- Refresh: Home, a category hub, an album, playlist or artist page and Browse all have pull to refresh and a labeled Refresh button in the header (decision-0010).
- `home` (2.1): the greeting as the header title (a skeleton line until Spotify draws it, "Home" once the page is ready without one) and one horizontal shelf per Spotify row, in page order. A tile opens its page by URL, or taps the website card when Spotify gives no link; such a tile dims with a spinner until the page moves, and a failure shows a toast.
- Mini-player: artwork, title and artist ("Playing on another device" in green when Spotify plays elsewhere), a save toggle and Play/Pause. Both show the requested state at once and a busy state until Spotify answers; Play/Pause shows a turning ring. Saving says "Added to Liked Songs"; removing says "Removed from Liked Songs" with Undo. The track opens Now Playing.
- `player` (4.1): rises over the app. Opens the website's full player on mount and closes it on leave; until the current track is read, and while the player opens, a skeleton shaped like the player shows (with the current art once known); "Nothing is playing" only when the read finds no track. If it does not open, "The player didn't open" with Try again. "Playing from" links to the album or playlist; title and artist link to their pages. Save (with the same toasts and Undo), a progress bar that seeks on release, time labels, shuffle, previous, play/pause, next, and repeat with off, all and one. Each control shows busy until Spotify answers (a ring on play, previous and next) and a toast explains a failed or unconfirmed command. "Next up" shows the next track, the only one the web player exposes.
- `entity` (8.1 Album, 7.5 Playlist, 8.2 Artist): one screen for the three pages, with a header bar laid over the art that turns solid and shows the title once the header scrolls away. Album and playlist show centred art, title, a playlist's description, the byline (album artists or playlist owner, linking to their pages) and a meta line ("Album · 2006 · 7 songs · 33 min 6 sec"); an artist shows a full-width photo with the name over it and the monthly listeners. The action row has Follow (artist) or the save switch (album, playlist) and a green Play/Pause for the whole page, each busy until Spotify answers. Saving says "Added to Your Library"; removing says "Removed from Your Library" with Undo; unfollowing says "Unfollowed …" with Undo. Track rows play on tap, show a spinner on the row while it starts and the playing row in green; artist rows are numbered with play counts. Then an artist's "Popular releases" list and the page's rows of tiles ("More by …", "Albums", "Fans also like"). Reaching the end of a playlist loads Spotify's next rows, with a spinner at the end of the list.
- `search` (3.1 to 3.3): on `/search`, the "Search" header, a white search field and the Browse all grid of coloured category tiles; a tile opens its hub. The field opens Spotify's own search page (busy until it does), then shows the applet's field with Cancel. An empty field lists recent searches with a remove button each and "Clear recent searches"; both confirm with a toast and have no Undo (decision-0009). Typing sends the query to Spotify once typing pauses for 350 ms, with the progress bar while results are pending; results show Spotify's filter chips (the tapped chip shows its new state at once), a Top result card (with Play for a song) when no filter is on, and rows titled with "Type · details". A song row plays in place; any other row opens its page; a tapped row shows a spinner over its art.
- `hub` (3.4): a category's name as the header title and its rows of tiles, read by the same `sections` reader as Home.
- `library`: "Your Library" with a Liked Songs row ("Playlist · Opens Spotify's page", with the website cue). Liked Songs shows the website until milestone 4.

## Native feel

The factory's acceptance bar, as implemented in this revamp (2026-11-15). Nothing here is checked on a device yet.

| Item | Status |
| --- | --- |
| 1. Cold start signed in and signed out: no website flash; the signed-out start reaches the sign-in at once | signed in checked on the phone 2026-11-15: Home skeleton, then content; signed out not checked |
| 2. Every core journey's landing URLs are routed or recorded as website pages on purpose | implemented (static evidence), not checked on a device: Home, album, playlist, artist, Search pages and genre hubs are routed; Liked Songs and any other URL show the website on purpose |
| 3. Every routed screen has its own destination-shaped, shimmering skeleton, an error with Retry and View website, a confirmed empty state and a stale state | shelf, album and player skeletons checked on the phone; "No results" waits 3 s on an empty list, because the search page is ready before its results render (fixed after a phone check); errors not forced on the phone |
| 4. Opening a detail shows its screen and skeleton at once | checked on the phone: an album opens on its skeleton at once |
| 5. Every control shows a pressed state; every action shows busy, then an outcome; removals offer Undo | implemented (static evidence), not checked on a device: Liked Songs, library and follow removals offer Undo; recent-search removals do not (decision-0009) |
| 6. Back closes overlays first, restores the previous screen at once with its scroll position, and the system gesture works | implemented (static evidence), not checked on a device |
| 7. Screen changes push, pop, fade through and rise as motion describes; no copy stays on screen after rapid Back | Now Playing opens from the mini-player and closes back to Home on the phone (decision-0007); rapid Back not checked |
| 8. Pull to refresh and a labeled Refresh control where the product has refresh | implemented (static evidence), not checked on a device: Home, hubs, entity pages and Browse all; not on search results or Now Playing (decision-0010) |
| 9. Light and dark, 200% text, the narrowest width and reduced motion all checked on the changed screens | light and dark not applicable (dark only, decision-0006); 200% text, narrow width and reduced motion implemented (static evidence), not checked on a device |
| 10. Controls that show the website carry the cue; the website appears nowhere else in the journeys | implemented (static evidence), not checked on a device: Log in, View website and the Liked Songs row |

## Page module

`src/page.ts`, with the code in `src/adapter/`:

- `account`: signed in when the website shows its settings gear or the mini-player's save button; signed out on its login button or link.
- `ready.home`, `heading` and `sections` (list, keyed by row title with "#n" for repeats; each row is `{ title, cards }` with at most 20 cards, extent its `h2`). Cards come from `home-card`, `card-mwp` and Encore `card` elements.
- `nowPlaying` (value, measured): `{ title, artist, image, playing, saved, elsewhere, next }` from the mini-player. Its carousel holds the previous, current and next tracks; the current one is the first whose left edge is inside the bar.
- `player` (value): the open full player's track, links, artwork, saved state, position and duration (from its range input's `aria-valuetext`), playing, shuffle, repeat, and which buttons are enabled. Null while it is closed.
- `ready.entity`, `entity` (value): kind, title, image, description, byline links, meta, monthly listeners, saved, following, and whether the page's play button shows Pause. `tracks` (list, virtualized, keyed by the row's `aria-labelledby`): title, artists or play count, image, URL, explicit and playing. `releases` (list): an artist's popular releases. The entity screen also reads `sections`.
- `ready.search`, `search` (value: the query from the URL, the filter chips with their checked state, whether recent searches can be cleared), `searchRows` (list keyed by the row's `aria-labelledby`: title, type, details, image, kind, explicit, verified and whether it can be dismissed; results and recent searches share it) and `browse` (list: the Browse all tiles with title, colour, image and hub URL). `ready.hub` waits for a hub's heading and first row.
- Commands: `setPlaying`, `skip({ direction })`, `setShuffle`, `setRepeat` (presses the button as often as the off, all, one cycle needs), `setTrackSaved`, `seek({ seconds })`, `openPlayer` and `closePlayer`. Each is satisfied when the page already matches and otherwise waits for the page to show the change. Clicks that start or change playback are trusted input. `seek` presses the arrow key in the full player's range input (decision-0005). Entity pages add `playEntity({ playing })`, `playTrack({ rowId })` (a trusted tap on the row, which plays it in the page's context), `setEntitySaved({ saved })`, `setFollowing({ following })` and `loadMoreTracks` (scrolls the last row into view and on to the end; a plain jump to the end loads nothing). Search adds `openSearch` (taps the page's search button), `setQuery({ query })` (fills Spotify's search input; Spotify searches as it changes and replaces the URL, so no page load happens per keystroke, where navigating by URL would reload the page), `setFilter({ label, checked })`, `openResult({ rowId })` (a trusted tap, which plays a song or opens a page and adds a recent search), `removeRecent({ rowId })` and `clearRecents`.

Planned playback routes (decisions 0014 to 0017), not built yet. The list above describes the code as it is.

- `skip({ direction })` scrolls the website's mini-player carousel (`[data-testid=floating-now-playing-bar] > img + div`) with a page-control scroll to its end for Next or its start for Previous. It sends one skip per command and is satisfied when the track changes and the row is centred again. It falls back to the full player's skip buttons and no longer opens the full player first (decision-0015).
- `seek({ seconds })` taps the full player's progress bar once, at the target's fraction of its width, with the SDK tap gesture's offset option. One write per seek; the arrow-key presses go (decision-0014). The full player must be open.
- A position reader takes the position, the duration and the play state from the website bar's style variables `--animationDelay`, `--finalAnimationDuration` and `--animationPlayState`, which change only when the position jumps or the play state changes. The applet runs a local clock from them. `player` no longer carries a position that changes every second (decision-0016).
- One playback store merges `nowPlaying`, `player` and the position with what the user asked for since. Screens draw from it. Controls are never disabled for busy, taps queue per command, opposite taps cancel, and an intent Spotify has not confirmed after 6 s falls back with one toast (decision-0017).

## Blocked or limited

| PRD item | Status | Reason |
| --- | --- | --- |
| Queue screen (QU) | limited | The mobile web player has no queue view; Now Playing shows only the next track (decision-0018, gap F-04) |
| Add to queue | blocked | The Free mobile web player's track menu has no Add to queue (decision-0018, gap F-05) |
| Add to playlist and the "Saved in" sheet | blocked | The Free mobile web player's track menu has no Add to playlist (decision-0018, gap F-06) |
| Your Library page (LB) | blocked | The mobile web player's Your Library tab shows an upsell, not a library; Liked Songs stays the website's own page (decision-0018, gap F-02) |
| Next track's art right after Next | limited | The website's bar has no image for the next track; the title shows at once and a neutral tile holds the art's place (decision-0018) |
| Opening a page from a Home card while playing | limited until Genesis's same-document route ships | Spotify loads a new document for Home cards even on a real tap, which stops the audio (decision-0013, gap P-01) |
| Lyrics in Now Playing | milestone 5 | The mobile web player's full player has no lyrics panel |
| Lock-screen and notification controls | blocked | Android WebView has no `navigator.mediaSession` |
| Playback in the background | works, not limited | Seen on the phone on 2026-11-19: with Genesis in the background for 10 s, 2 min and 15 min, audio kept playing and tracks advanced. Notification and lock-screen controls stay blocked (gap F-01) |
| Artist "About" (8.3), artist pick, tour and merch | limited | The mobile web artist page has no About, artist pick, concerts or merch sections; Popular, releases and related rows are shown |
| Playlist collaborators and per-track adders (7.5) | limited | The mobile web playlist page names one owner and no adder per track |
| Download, shuffle-play button on entity pages | blocked | The web player has no downloads; shuffle is set in Now Playing |
| Search video clips (SR-6) and camera scanner (SR-7) | blocked | The web player has neither |
| "Discover something new" tiles on Search (3.1) | limited | The mobile web Search page shows only Browse all |
| Search by lyrics (SR-8) | limited | Results are whatever Spotify's web search returns; the applet adds no matching of its own |
| More results while scrolling | limited | The applet shows the rows Spotify first draws for a query (about 20); a filter narrows them |
| Seek | limited, change planned | Today `seek` presses a key per five seconds and on the phone never landed (gap P-03). Planned: one tap at a point on the full player's progress bar, through the SDK tap offset the developer approved (decision-0014) |

## Verification

- Official app parity, 2026-11-19 (problem `spotify-official-app-parity`): planned. [The official app inventory](investigation-official-app.md) records the target features and timings on the phone, and [the gap list](investigation-parity-gaps.md) compares revision 37 with it: 4 P0 gaps (Home cards load a new document and stop the audio, Play after that plays the wrong track, seek never lands, the mini-player vanishes for seconds after a load), slow skips and row taps, taps dropped while busy, and features the Free mobile web player lacks. Nothing is fixed yet.
- Runtime speed upgrade on 2026-11-18 (decision-0012): rebuilt for Genesis's protocol 2, where Genesis keeps each watch's last value and shows it at once as stale. `delivered` and the failed checks read the watch's data state (`watchStatus`). Home's `sections` and `heading` watches are kept on the phone for the next start; `nowPlaying` is not, so a kept "playing" never starts the playback hold. When the web player shows no account and the applet last saw one, the applet forgets the kept pages. Album and playlist track rows draw through `VirtualList`; an artist's numbered Popular rows stay a plain list. `usePlaybackHold` is unchanged. `check`, `typecheck` and `build` pass with no warnings. Not checked on a device. To check: a cold start shows the last Home shelves at once; a playlist of more than 100 songs scrolls to the end, loads more and plays a row near the end; Back from an album to Home and from a playlist to its hub keeps the position; playing a track still holds the page through a track change; sign out, restart, and no earlier Home shows.

- Native-feel revamp on 2026-11-15: `check`, `typecheck` and `build` pass. Not checked on a device.
- UX polish on 2026-11-15, on the Samsung SM-M307F: the Search tab shows a tile skeleton in the Browse all layout, and skeletons fade in and shimmer. `check` and `build` pass.

- Feasibility spike on emulator `Medium_Phone_API_37.0` (`emulator-5554`); see the table above. The scaffold screen was seen reading links from the signed-out and signed-in home page.
- Probe on 2026-11-13, on a Samsung SM-M307F (Android 11, System WebView 156.0.8078.47, Widevine L1), revision 5: `check`, `tsc` and `build` pass. The strip shows the current track and artist; applet Play and Pause change the page's play state and Genesis's media stream, including Play right after the website page reloads. Play from a hidden context works because the click is trusted input.
- Not verified: the Connect takeover path. Spotify showed its "Listen on this phone" prompt once, after a reinstall, and choosing it by hand worked, but it did not appear again on demand, so the command's takeover steps have not run on the device. Whether the audio is audible was not confirmed by ear.
- Milestone 1 on 2026-11-13, on the Samsung SM-M307F phone, revisions 7 to 14: `check`, `tsc` and `build` pass. Verified on the device: Home shelves with artwork; the mini-player's title, artist and art; Play and Pause from the mini-player; Now Playing opening from the mini-player; Next; Previous (disabled by the website on the context's first track, restarting the track otherwise); shuffle on and off; repeat off, all, one, off; seek from 0:55 to 3:45 for a 3:44 target; save to Liked Songs and removing it again; the Your Library tab and its Liked Songs row opening the website page. Not verified: the Connect takeover steps, and audibility by ear.
- Milestone 2 on 2026-11-13, on the Samsung SM-M307F phone, revisions 15 to 18: `check`, `tsc` and `build` pass. Verified on the device: an album opened from Home with its art, artist, meta and 7 tracks; a tap on a track row plays it and turns it green; the album's Play and Pause; saving the album and removing it again; the artist link opening the artist page; Follow and unfollow; a tap on a popular track playing it; a playlist with description, owner and saves; saving the playlist and removing it again; a 50-track playlist loading rows 31 to 50 when the list end is reached; Back from the artist to the playlist.
- Milestone 3 on 2026-11-13, on the Samsung SM-M307F phone, revisions 19 to 21: `check`, `tsc` and `build` pass. Verified on the device: the Search tab showing Browse all tiles with colours and art; the field opening recent searches with the keyboard up; typing "adele" giving live results with the chips and a Top result card; the Songs chip filtering to songs; a tap on a song result playing it; the Artists chip; Cancel beside the Genesis menu button without overlap (revision 20); opening an artist result and Back to the same filtered results; an opened artist becoming a recent search; removing one recent search; clearing recent searches (the website list is empty afterwards); Cancel back to Browse all; the Hindi genre hub with its heading and rows; a hub card without a link opening its playlist (revision 21: such cards now get a trusted tap on the card, because Spotify ignored the synthetic click on the title); Back from the playlist to the hub and from the hub to Browse all; a Home mix card still opening. Open: the keyboard comes back up when Back returns to the results.
- Review fixes on 2026-11-13: `playTrack` scrolls a dropped row back, a long seek takes several bounded calls, Now Playing shows a retry when the player does not open, and filter chips stay when a filter finds nothing. `check`, `tsc` and `build` pass. Not verified on the device.
- A long seek stops when the track changes, another scrub starts or Now Playing closes (2026-11-13). Not verified on the device.
