# Release review fixes for shuffle, repeat, search and seek

Problem ID: spotify-applet
Problem: Build the Spotify applet from the PRD
Spirit animal: 🦜 Parrot

- Goal: fix the player and search faults found in the review of the release to `main`.
- Changes: `setShuffle` presses twice to turn plain shuffle off when Spotify offers Smart Shuffle, which cycles off, shuffle, smart shuffle. `setShuffle` and `setRepeat` now fail with "Open the full player" when the shuffle or repeat mode is unknown. Before, repeat assumed "off" and pressed the wrong number of times. `setQuery` fills the trimmed query that its check compares, so a trailing space no longer times out. `seek` formats whole seconds and does not count playback's next second as a press landing.
- Decisions: routine fixes; no new decisions.
- Verification: `tsc`, `genesis-applet build` and `check` pass. Not verified on the device.
