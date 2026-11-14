# Post with photos, save a photo, share a post

- Goal: Let the person write a post with up to four photos in the app, see the photos before posting and post it; save a photo from a post; share a post.
- Changes: a `compose` route and screen with Home's New post button, composer readers in `src/adapter/compose.ts`, Save photo in the media viewer, Share in the post action bar, a shared `actionMessage` for "Tap again to continue.", and new icons and styles.
- Decisions: decision-0010.
- Verification: `check` (no warnings), `typecheck` and `build` pass. On the Samsung SM-M307F (Android 11), 2026-11-14, X was signed out, so the composer, Save photo and Share were not exercised; no sign-in was attempted.
