# Legacy SDK imports

- Goal: Keep the applet working while Genesis builds a new applet SDK under the old package names.
- Changes: The source now imports `@genesis/sdk/legacy`, `@genesis/sdk/legacy/adapter` and `@genesis/sdk/legacy/react` in place of `@genesis/sdk`, `@genesis/sdk/adapter` and `@genesis/sdk/react`. These are the same modules at their new paths. Screens, data and behavior did not change.
- Decisions: Genesis moved the current SDK to `legacy` paths so the old paths can carry the new SDK later. The applet moves to the new SDK in a later change.
- Verification: `genesis-applet check` and `genesis-applet build` pass. Not opened on the phone in this step; the import change is the same as the one checked in Hacker News.
