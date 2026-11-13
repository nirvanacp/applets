# Unique list keys and the post's own like button

Problem ID: instagram-applet · Spirit animal: 🦩 Flamingo

- Goal: fix the faults found in the review of the release to `main`.
- Changes: a new `placed` helper makes a key unique by adding the item's place among items with the same key (`~1`, `~2`). Activity rows that read the same ("alice liked your post." twice), messages without an Instagram id that read the same (two "ok"), and a person shown twice on a page (one's own picture in the tab bar and in search results) now get distinct keys. Before, a repeat key failed the whole list with `CONFLICT`. Like and Save read their state from the post's first section, as `readPost` does, so a liked comment no longer counts as a liked post. The post's article is found by a link that contains its code, so a permalink with a query still matches.
- Decisions: routine fixes; no new decisions.
- Verification: `tsc`, `genesis-applet build` and `check` pass. Not verified on the device.
