# Shared sign-in and opened links

- Goal: Correct the current spec's explanation of X's signed-out state, and record how X opens after the Genesis fixes for opened links.
- Changes: No applet code changed. The current spec no longer says the update signed X out: applets share one website sign-in unless the Applet info switch is on. X most likely ended the session, and it refused the test account. The plan's link step expects Genesis's choice and the post screen, and a Genesis update section records the new result.
- Decisions: None.
- Verification: On the Samsung SM-M307F (Android 11) with revision 6, signed out. A `target=_blank` test link to `https://x.com/home` on Hacker News's revealed page opened X, which showed X's landing page with the "doesn't have a screen" banner, and Back went to Genesis Home. Still blocked: the post screen and Back to a sharing app, which need X to accept a sign-in.
