# Shared sign-in and opened links

- Goal: Correct the current spec where it describes Genesis's website sign-in and opened links, and record the Back issue again after the Genesis fixes.
- Changes: No applet code changed. The current spec now says applets share one website sign-in, with a separate one only when the Applet info switch is on. The plan's link steps expect Genesis's new choice ("Open in Gmail Only" or "Create a new applet") and the applet's own screen. A Genesis update section records the new behavior and the Back issue.
- Decisions: None for the applet. Back that never leaves Gmail Only stays a Genesis issue: the applet's Back steps the context back, and Gmail adds its `#tl` entry again.
- Verification: On the Samsung SM-M307F (Android 11) with revision 21, four Backs from the inbox stayed in Gmail Only. The context history held `/mail/mu/mp/239/` and the same URL with `#tl/...`. The link choice was checked with Hacker News.
