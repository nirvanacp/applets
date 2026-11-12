# Open SDK review fixes

- Goal: Fix findings 1, 3 and 4 of the [open SDK migration review](../.specs/review-open-sdk-migration.md). Finding 2, account switches going unnoticed, is an SDK problem and is being fixed in the SDK.
- Changes: `useAccount` in `src/library.ts` keeps the last handle the Profile tab's pages showed, so Categories and Save to categories keep working while that tab shows X's own page; it forgets the handle on sign-out, resume and Done. `kindOf` in `src/screens/feed.tsx` shows a likes page as "Likes" without the Saved row while the account is unknown. `profileReady` in `src/adapter/pages.ts` refuses first path segments that are not handles, so they show X's page at once. Like and bookmark in `src/components/post.tsx` read pending inputs and send commands in the context of the screen that shows the post.
- Decisions: [decision-0008](../.specs/decisions.md#decision-0008-keep-the-account-across-pages-and-refuse-non-handles-in-the-profile-reader).
- Verification: the applet's `typecheck`, `check` and `build` pass. Not run on a device; X cannot be signed in to for checks, so the signed-in paths stay unexercised.
