# Long seek stops when the track changes

Problem ID: spotify-applet
Problem: Build the Spotify applet from the PRD
Spirit animal: 🦜 Parrot

- Now Playing splits a long seek into several `seek` calls. The loop now checks before each call that the track is the one the user scrubbed and that no newer scrub started or the screen closed. A skip during a long seek no longer moves the new song toward the old target.
- Verification: `tsc`, `build` and `genesis-applet check` pass. Not verified on the device.
- Follow-up: each `seek` call now carries the scrubbed track (`trackKey`, the track's link or title). The adapter fails the call when Spotify shows another song, so a call queued behind Next cannot move the new song. `tsc`, `build` and `check` pass. Not verified on the device.
