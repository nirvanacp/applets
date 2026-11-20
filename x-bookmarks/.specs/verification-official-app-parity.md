# Verification: official app parity

Problem ID: x-official-app-parity
Problem: Make the X applet look and feel like the official X Android app
Spirit animal: 🦜 Parrot

Checked on 2026-11-19 on a physical phone, applet revisions 28 to 42, against the official X app on the same phone. Built from [the plan](plan-official-app-parity.md) and [the gaps](investigation-parity-gaps.md).

## Gaps

| ID | Status | Evidence and what is left |
| --- | --- | --- |
| G-001 Feed video | Partly implemented | Videos show at their shape with poster, play button and length; GIFs play inline, one at a time (decision-0021). Other videos do not autoplay in the feed: X streams them from `blob:` sources and names the files only where page modules may not read. Needs the developer's decision to accept, or a platform change. |
| G-002 Feed end | Verified | Home loads more with no tap over three rounds of flings; Notifications reaches "You're all caught up for now." (decision-0022). Ten pages in a row, and profile, search and Saved, are not checked. |
| G-003 Video full screen | Verified, by X's viewer | A tap opens X's own full-screen viewer with sound; Back returns to the same feed position (decision-0021). The applet has no player of its own. |
| G-004 Bars on scroll | Verified on Home | Both bars leave and return (decision-0023). Explore and Profile roots are not checked. |
| G-005 Home top bar | Partly implemented | Avatar opens Profile, X logo in the middle. For you and Following are not drawn, as the plan records. |
| G-006 Repost | Verified | Repost, Undo repost, Quote posted, Quote then Discard (decision-0025). A quote with photos, and Quote from post detail, are not checked. |
| G-007 Notification row | Verified | X's icon, bold headline, time, grey post text (decision-0026). Like, repost and follow notifications are not checked: the test account has none. |
| G-008 Reply bar | Verified | The account's picture and "Post your reply" open X's reply composer; Done returns to the post (decision-0027). Compared with X's app. |
| G-009 Like motion | Verified | Pink burst on a like, counts in the action's color (decision-0028). |
| G-010 to G-012 | Deferred | Left for a later change by the plan. |

Found while checking and fixed: a count read as two numbers joined while X animated it, "1920" for 19 to 20 (decision-0029).

Found and not fixed: autoload jumps X's page to its end, so a list misses posts X never drew. They show later, out of place, once X returns to them.

## Acceptance criteria

1. Inventory and gap matrix: implemented, in [the inventory](investigation-official-app.md) and [the gaps](investigation-parity-gaps.md).
2. P0 and P1 gaps: G-002, G-003, G-004, G-006, G-007 and G-008 are verified. G-001 and G-005 are partly implemented, with agent decisions recorded but no developer decision yet.
3. Autoload: verified on Home and Notifications. Ten pages in a row, and profile, search and Saved, are not checked.
4. Video: no route to autoplay non-GIF videos without a platform change; the decision and the remaining behavior are recorded (decision-0021).
5. Side-by-side recordings of each core journey: not done. Post detail and Home were compared screen against screen. The other journeys and frame-by-frame recordings are left.
6. Native-feel bar: not filled in for every item. Checked on the phone: Back closes the repost sheet and keeps Home; Back from post detail keeps the feed position; reduced motion ends the burst invisible, by the stylesheet only. Light and dark, 200% text, narrowest width and a screen reader are not checked.
7. `npm run typecheck`, `genesis-applet check` and `genesis-applet build` pass with no warnings. Back to Home shows the last feed at once. After a new install, the first start shows skeletons for about ten seconds; a start without a new install is not checked.
8. Bench: cold start 3400, 2871 and 2854 ms against the 3064 ms baseline, so no worse. Idle: app 84 ms/s, renderers about 240 ms/s together; the baseline has no settled idle sample to compare with, and the renderers still do some work at idle. Journey: app 1961 ms/s over Home, post, Back, Notifications, Home; no baseline journey exists.
9. Commits: local, on `feat/x-official-app-parity`, in the repository that owns the files.
