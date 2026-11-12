# Open SDK review fixes

- Goal: Fix findings 2 to 4 of the [open SDK migration review](../.specs/review-open-sdk-migration.md). Finding 1, Back showing a skeleton, is an SDK problem and is being fixed in the SDK.
- Changes: `delivered` in `src/screen.ts` tells whether a watch has read the current page. The profile shows "No such user", Post shows "didn't show its submit form" and a feed shows "Nothing here yet" only once their own watches have delivered, and show the skeleton until then; a failed watch shows its error. Sign out in `src/screens/me.tsx` counts `CONTEXT_REPLACED` as done, as before the open SDK, and an unknown outcome once the Me tab's page shows no account within 5 seconds; the `AUTH_REQUIRED` check, which nothing produces, is gone. `loginForm` in `src/adapter/read.ts` lets the `account` reader in `src/page.ts` answer signed out on HN's bare login page, so Hidden and Upvoted show sign-in instead of waiting.
- Decisions: none; these restore the behavior decision-0009 kept.
- Verification: the applet's `typecheck`, `check`, `build` and 13 tests pass. Not run on a device; sign out was not exercised.
