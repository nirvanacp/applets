# App frame and player

Problem ID: `spotify-applet` · Spirit animal: 🦜 Parrot

- Goal: milestone 1 of the PRD build (decision-0004): the app frame, a mini-player on every screen, and Now Playing with its controls.
- Changes: `src/app.tsx` adds the tab bar, mini-player and screens; `src/screens/` adds `home` (greeting and shelves), `player` (Now Playing) and `library`; `src/components/` adds the mini-player, shelves, icons and shared UI; `src/adapter/` adds the account, shelf and player readers and the playback commands; `src/routes.ts` routes `/` to `home` with ready reader `ready.home`; `applet.json` sets the accent and an original icon (`assets/icon.png`); the probe strip is gone.
- Decisions: Now Playing opens the website's full player while it shows; the current track is read from the mini-player's carousel position; repeat is read from the button's label; seeking presses arrow keys, waiting for each to land (decision-0005).
- Verification: `check`, `tsc` and `build` pass. On the Samsung SM-M307F phone, revisions 7 to 14: Home shelves, mini-player, Play and Pause, Now Playing, Next, Previous, shuffle, repeat's three states, seek, save and its undo, and the Your Library tab. Not verified: the Connect takeover steps and audibility by ear.
- Blocked or limited: the queue view (web player shows only the next track), lock-screen controls and background playback (platform), seek speed (five seconds a press).
