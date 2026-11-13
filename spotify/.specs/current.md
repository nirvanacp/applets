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

Status: on hold at the user's request, after the feasibility spike in decision-0002. No PRD requirement is implemented yet.

## Feasibility

| Journey | Result | Evidence |
| --- | --- | --- |
| Sign-in through "Continue with Google" | works | Device check on 2026-11-13: the test account's Google sign-in returned a signed-in session and the router showed the applet screen |
| Signed-in web player with the current shell | blocked | Signed-in open.spotify.com shows only "Playback disabled: Spotify won't work if you block protected content"; Home, Search and Library do not render |
| Signed-in web player with protected media granted (local spike, not committed) | renders | Mobile web player loads Home ("Good morning", album and radio shelves), album pages, and Home, Search and Your Library tabs |
| Audio playback with protected media granted, on the emulator | fails | Widevine L3 license is obtained, then the audio decoder fails (`PIPELINE_ERROR_DECODE`) and the page shows "Something went wrong" |

Blocked on a platform capability: the shell must grant protected media (Widevine) to pages on the applet's origins. Playback on real hardware is not yet checked; see decision-0002.

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

`src/page.ts`: list reader `links`, keyed by URL and occurrence, extent the surrounding list item or paragraph. No commands. Screen `home` watches it as `home:links` and clicks a link through the page agent, by its record.

## Verification

Feasibility spike only, on emulator `Medium_Phone_API_37.0` (`emulator-5554`); see the table above. The scaffold screen itself was seen reading links from the signed-out and signed-in home page.
