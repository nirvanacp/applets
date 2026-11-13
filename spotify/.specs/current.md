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

Status: the PRD build is on hold at the user's request. A playback probe (decision-0003) shows the applet can read and control Spotify playback; no PRD requirement is implemented yet.

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
| home | `/`, https://open\.spotify\.com/ | home | primary | none: ready once bound | loading, empty and error notices; no sign-in | leaves the applet from the start page | implemented | none: scaffold, not verified |

Any other URL shows the website.

## Page module

`src/page.ts`:

- list reader `links`, keyed by URL and occurrence, extent the surrounding list item or paragraph. Screen `home` watches it as `home:links` and clicks a link through the page agent, by its record.
- value reader `nowPlaying`: `{ title, artist, playing, elsewhere } | null` from the mini-player `[data-testid=floating-now-playing-bar]`, null when there is none. `playing` comes from the play/pause icon (two subpaths for Pause), since the button has no label. `elsewhere` is true while Spotify Connect's open modal offers "Listen on this phone"; the artist is then empty, because the bar names the device instead.
- command `setPlaying({ playing })`: satisfied when the state already matches; otherwise a trusted click on `[data-test-id=play-pause-button]`, preceded by a trusted click on "Listen on this phone" when `elsewhere`. Done when the icon matches and the Connect prompt is gone.

## Probe

Screen `home` shows a now-playing strip above the links: title and artist from `home:now-playing`, a 48 dp Play/Pause button (SVG icon) that calls `setPlaying` with an optimistic state while pending, and a notice on `failed` or `unknown`. With nothing loaded: "Play something on Spotify to control it here." While another device plays: "Playing on another device. Play moves it here." This is a probe; the PRD screens replace it.

## Verification

- Feasibility spike on emulator `Medium_Phone_API_37.0` (`emulator-5554`); see the table above. The scaffold screen was seen reading links from the signed-out and signed-in home page.
- Probe on 2026-11-13, on a Samsung SM-M307F (Android 11, System WebView 156.0.8078.47, Widevine L1), revision 5: `check`, `tsc` and `build` pass. The strip shows the current track and artist; applet Play and Pause change the page's play state and Genesis's media stream, including Play right after the website page reloads. Play from a hidden context works because the click is trusted input.
- Not verified: the Connect takeover path. Spotify showed its "Listen on this phone" prompt once, after a reinstall, and choosing it by hand worked, but it did not appear again on demand, so the command's takeover steps have not run on the device. Whether the audio is audible was not confirmed by ear.
