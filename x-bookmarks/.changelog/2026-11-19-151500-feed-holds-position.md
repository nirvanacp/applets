# Feeds hold the reading position

Problem ID: `x-official-app-parity` · Problem: Make the X applet look and feel like the official X Android app · Spirit animal: 🦜 Parrot

- Goal: no refresh, autoload, resume, tab switch or Back moves the post being read; newer posts wait behind a pill (plan steps 6 and 7).
- Changes: [feed hold](../src/feed-hold.ts) merges X's order with `holdOrder`, keeps dropped rows and the anchor row's offset, and waits while the reader touches or scrolls. `FeedList` uses it with a list name per path, the New posts pill and the go-up button. Home and Notifications keep separate lists; Refresh goes to the top; sign-out forgets the held lists; Show more forgets X's end after a reload. Records: design, decisions 0030 to 0032, the current spec.
- Decisions: decisions 0031 and 0032.
- Verification: `typecheck`, `check` and `build` pass with no warnings. Phone check: Back from a post and from full screen kept the row within 1 px; a relaunch restored the anchor row while X held it; new rows after a reload joined above behind the pill. See [the verification](../.specs/verification-video-and-feed.md).
