# Keep the account address during a reload

- Goal: Fix finding 3 of the [open SDK migration review](../.specs/review-open-sdk-migration.md): an item saved while Gmail reloads got the account "unknown", and account dots flickered. Finding 1, Back from the inbox leaving the applet, needs a phone check and is left open; finding 2 is an SDK problem being fixed in the SDK.
- Changes: `src/store.ts` keeps the last address the `view` watch showed as the current account until the page shows another, as the old store's account did. The session index is still taken only while the page shows an address, so a reload's URL never renumbers the previous account.
- Decisions: none; this restores the behavior decision-0015 kept.
- Verification: the applet's `typecheck`, `check` and `build` pass. Not run on a device.
