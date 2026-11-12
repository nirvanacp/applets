# Show pending commands without arguments

- Goal: Disable More and Sign out while their command runs, as before the move to the open SDK.
- Changes: `invoking` in `src/components/story.tsx` tells whether a pending input is an `invoke` of a command. The feed's More button and the Me screen's Sign out use it. They used `invoked`, which returns the command's arguments, and `loadMore` and `signOut` have none, so neither ever showed as pending.
- Decisions: none. Commands with arguments, such as `setVoted`, keep using `invoked` to read the target state.
- Verification: `typecheck`, `check` and 13 tests pass. Found while moving X to the open SDK, which has the same More button.
