# Video review fixes

Problem ID: `x-official-app-parity` · Problem: Make the X applet look and feel like the official X Android app · Spirit animal: 🦜 Parrot

- Goal: fix the video findings of [the review](../.specs/review-video-and-feed.md) (2, 6, 7, 8 and 11).
- Changes: [video](../src/adapter/video.ts) starts only a player X newly drew and leaves sound and pause to the user after their own input. The command waits for a mark the page sets once the player holds full screen, and the page leaves full screen when the player is gone for 1.5 s or never shows. Stop looks a replaced player up again. [The post row](../src/components/post.tsx) keeps one play in flight, and a failed tap in the feed opens the post's screen.
- Decisions: decision-0030 stands; the overlay is set up before the steps on purpose (finding 8).
- Verification: `typecheck`, `check` and `build` pass with no warnings. On the phone a tap played full screen with sound and Back paused it with no scroll change; see [the verification](../.specs/verification-video-and-feed.md).
