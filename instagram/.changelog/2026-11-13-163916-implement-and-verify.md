# Implement and verify the Instagram applet

Problem ID: instagram-applet · Spirit animal: 🦩 Flamingo

- Goal: build the website-backed Instagram applet from the PRD and wireframes, and check every journey on an emulator.
- Changes: page module with readers for feed, stories, posts, comments, profiles, grids, people, search accounts and hashtags, activity and messages, and commands for like, save, comment, follow, message, search, load more, story, create and send; the route table; screens for Home, post, comments, profile, follow lists, Explore, search, keyword grids, notifications, inbox and chat. Device fixes: avatars, search results inside a `nav`, follow-list tabs, chat title, empty feeds, Done on website pages, the create entry.
- Decisions: decision-0007 to decision-0010 (contexts, no storage, Done and resume, create menu).
- Verification: journeys walked on `emulator-5554` as listed in the current spec; signed-out launch, account switch, dark mode and the create flow itself are not verified.
