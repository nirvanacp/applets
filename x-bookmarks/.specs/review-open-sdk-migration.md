# Review: open SDK migration

- **Date:** 2026-11-12
- **Scope:** the move of x-bookmarks to the open SDK, `38aea70..76bad09` on `proto/open-sdk`
- **Reviewer:** Claude Code

## Verdict

These are preserved:

- the 15 routes, in order, with their contexts and account rules;
- the overlay screens;
- like, bookmark and load-more evidence;
- every screen's loading, empty and error states.

Two account problems change behavior that decision-0007 says is unchanged.

## Findings

1. **Medium: the library loses the account when the Profile tab shows X's own page.**
   - [src/library.ts](../src/library.ts) treats the account as known only while the `account` context's route is ready.
   - The old code kept the last account the pages showed.
   - Scenario: in the Profile tab, open your Following list, which shows as X's page. Then Saved, Categories says "Checking your X account…", and Save to categories is blocked.
   - The Saved tabs row also treats your own Likes as another account's while the account is unknown.
2. **Medium: switching from one account to another is not noticed.**
   - The SDK's router now compares only whether the person is signed in.
   - After a switch in the Profile tab, Home and Explore keep showing the first account's timeline, and their buttons act as the second account.
   - This is an SDK problem. The fix belongs in the SDK.
3. **Low: one-segment paths that are not handles now wait on the profile skeleton.**
   - Examples: `/verified-choose`, or `/Settings` in another case. They wait until the deadline.
   - The old ready reader refused names that fail `^[A-Za-z0-9_]{1,15}$` and reserved names in any case.
   - Fix: restore that check in the profile ready reader.
4. **Low, plausible:** a pending like or bookmark shows on the same post in every tab, because [src/components/post.tsx](../src/components/post.tsx) filters pending inputs by post id only.

## Not covered

No device run. Signed-in X was not checked, as before.
