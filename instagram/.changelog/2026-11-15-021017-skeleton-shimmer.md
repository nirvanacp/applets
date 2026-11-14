# Skeletons fade in and shimmer

- Goal: The UX pass on 2026-11-15 found the feed, grid and profile skeletons static, so a slow Instagram load looked frozen.
- Changes: The skeleton fades in after 120 ms, so a fast load never flashes it, and its avatar, text, post and grid shapes shimmer with a new `--shimmer` theme token, light and dark. The reduced-motion rule now also covers `::before` and `::after`, so it stops both.
- Decisions: Routine polish within the defaults' loading rules; no new decision.
- Verification: `check` and `build` pass. On the Samsung SM-M307F with the Genesis debug build of `fix/applet-ux-polish`, signed out: the feed skeleton shows on launch, then Instagram's login page as the website. Signed-in screens were not rechecked: sign-in stopped at Instagram's "Check your notifications on another device" challenge, which the test-account rules do not answer.
