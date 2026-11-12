# Review: open SDK migration

- **Date:** 2026-11-12
- **Scope:** the move of hn-bookmarks to the open SDK (page module, code routes, React bindings), `38aea70..76bad09` on `proto/open-sdk`
- **Reviewer:** Claude Code

## Verdict

The migration keeps every screen, route and feature that [current.md](current.md) lists:

- the 29 routes, in order, with the same patterns, query keys, contexts and account rules;
- the read functions, which are unchanged;
- command evidence, which is equivalent;
- no token reaches the UI.

The problems come from the new SDK's separate watches and from the changed account handling.

## Findings

1. **Medium: Back shows a skeleton instead of the last copy.**
   - The SDK now keeps the last copy of each page inside a watch.
   - The screen watches close when their screen unmounts, so Back to the feed shows a skeleton instead of the old feed.
   - This is an SDK problem. The fix belongs in the SDK.
2. **Medium: Profile and Post flash an error before their content.**
   - [src/screens/user.tsx](../src/screens/user.tsx) shows "No such user", and [src/screens/post.tsx](../src/screens/post.tsx) shows "Hacker News didn't show its submit form."
   - Both appear while the route is ready but the screen's own watch has not delivered yet: after a tab switch, or on a first load.
   - Fix: require the screen watch to be ready before showing either state.
   - A comment list in [src/screens/feed.tsx](../src/screens/feed.tsx) can briefly say "Nothing here yet" for the same reason (plausible).
3. **Low: Sign out can report "Couldn't sign out" after it succeeded.**
   - [src/screens/me.tsx](../src/screens/me.tsx) no longer counts `CONTEXT_REPLACED` as done.
   - The `AUTH_REQUIRED` it checks is never produced.
   - The Sign out row in current.md names `AUTH_REQUIRED`.
4. **Low, plausible: Hidden and Upvoted wait instead of asking to sign in.**
   - When the HN session has ended, HN serves its bare login page.
   - The `account` reader answers `null` there ([src/adapter/info.ts](../src/adapter/info.ts)), so the route waits for the deadline instead of showing sign-in.

## Not covered

No device run. Vote, post, comment and sign out were not exercised.
