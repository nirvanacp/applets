# Videos play full screen in X's player

Problem ID: `x-official-app-parity` · Problem: Make the X applet look and feel like the official X Android app · Spirit animal: 🦜 Parrot

- Goal: a tap on a video plays it with sound and Back returns to the same place, with no page or history change (plan steps 3 to 5).
- Changes: `playVideo` in the page module ([video](../src/adapter/video.ts)) and `usePlayVideo` in the post row. The reader keeps where X's list placed each post and shifts the undrawn rows when a drawn one moves, so `reachPost` finds rows after X adds posts at its top. A row X dropped opens the post's screen.
- Decisions: decision-0030; Genesis keeps the page awake while its video shows (platform change, approved by the developer). Rejected: X's player itself in full screen, since X replaces it within a second.
- Verification: `typecheck`, `check` and `build` pass with no warnings. Phone check: a post's video played full screen with sound for 16 s with no swap; Back paused it and kept the scroll offset (0 px); the URL and history did not change. A dropped row opened its post. Not checked: a Home row X still holds (none had its own video during the check), landscape.
