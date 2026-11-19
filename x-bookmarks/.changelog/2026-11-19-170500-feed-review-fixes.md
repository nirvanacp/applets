# Feed review fixes

Problem ID: `x-official-app-parity` · Problem: Make the X applet look and feel like the official X Android app · Spirit animal: 🦜 Parrot

- Goal: fix the feed findings of [the review](../.specs/review-video-and-feed.md) (1, 3, 4, 5, 13, 15 and 16) and the bar and offset faults found while checking them.
- Changes: [lists](../src/components/lists.tsx) key each held list by its name, keep rows X dropped from actions and load nothing while the page reloads. [Feed hold](../src/feed-hold.ts) drops rows Saved and Likes no longer list, forgets text-keyed rows when X's page starts again, saves the anchor on unmount, measures offsets from the stage's top and pins the row while rows above it resize. [The app](../src/app.tsx) stops the hold on a tab reselect and moves the bars only on the reader's own scrolls. [The reader](../src/adapter/read.ts) caps its places map.
- Decisions: decision-0031 amended; decision-0023 amended.
- Verification: `typecheck`, `check` and `build` pass with no warnings. On the phone cold starts restored the row exactly, an X reload and a new post kept it within 1 px, and Bookmarks and Likes stayed apart; see [the verification](../.specs/verification-video-and-feed.md).
