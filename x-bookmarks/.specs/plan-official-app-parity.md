# Plan: official app parity

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

Built from [the gaps](investigation-parity-gaps.md). Every step is applet work; none needs a platform change or a version change.

## Steps

1. **Inline video (G-001).** The post reader reads each video's MP4 variants, aspect ratio and duration from the player's props on the page, keeping only `https://video.twimg.com` URLs. The row draws a `<video muted playsinline loop>` at the video's aspect ratio with its poster. A shared observer plays the one video that is most on screen above half and pauses the rest. The feed uses the 360p variant. The applet document sends no referrer. When the page has no variant, the row keeps the tile that opens the website.
2. **Full-screen video (G-003).** Tapping an inline video opens a `video` overlay screen: black, full screen, sound on, the best variant up to 720p, native controls, Back to close, and the post's author and Open post. It is an overlay screen, so the system Back closes it and the feed keeps its position.
3. **Autoload (G-002).** A sentinel near the end of the feed calls `loadMore` when it comes within a screen of view, one call at a time, with a spinner at the foot. "You're all caught up" ends it; a failure shows the reason and Try again. The command stays the same.
4. **Bars on scroll (G-004).** On Home, Notifications and Saved, scrolling down by more than a few pixels slides the top bar up and the tab bar down; the first scroll up brings both back. The compose button stays. Reduced motion swaps without sliding.
5. **Home top bar (G-005).** The account avatar on the left opens the Profile tab, the X logo sits in the middle, and the Refresh control stays at the right for people who do not pull. For you and Following are not added: X's mobile site switches them inside the page without changing the URL, and a page command for that is left for a later change.
6. **Repost (G-006).** The repost control opens a sheet with Repost or Undo repost, and Quote. Repost runs a `setReposted` command that clicks X's control and its confirmation, with the same pending, busy and outcome rules as like. Quote opens X's composer on the website, with the cue.
7. **Notifications (G-007).** The notification reader reads the visible lines, so the text keeps its breaks: the first line is bold, the rest grey, with the type icon taken from X's own icon.
8. **Reply bar (G-008).** The post detail ends in a pinned "Post your reply" bar that opens X's reply composer, with the website cue.
9. **Polish (G-009).** Counts take the action's color when on.
10. **Verify** on the phone: each journey side by side with the official app, the bench idle and journey runs, and the native-feel bar on the changed screens.

G-010 to G-012 stay open for a later change.

## Decisions

- decision-0021: play feed videos in the applet from X's MP4 variants.
- decision-0022: load more posts on their own at the end of a feed.
- decision-0023: hide the bars while scrolling down.
- decision-0024: repost from a sheet through X's own controls.
