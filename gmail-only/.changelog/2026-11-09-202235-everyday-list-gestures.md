# Long press, bulk selection and swipe archive Undo

- Goal: Make the everyday list gestures work on a phone, from Step 3 of the phase-12 everyday features plan: a long press must select a row, bulk actions must not leave a stale selection, and the "Archived" toast's Undo must bring the thread back.
- Changes: `8778a24` selects a row on a long press and stops the press from selecting text. `88296f2` clears the selection after bulk Archive, Delete and Save for later. `fb9d5f5` adds a `threads.moveToInbox` action, which runs Gmail's "Move to inbox" on a row and waits for the row's Inbox chip, and makes the swipe archive's Undo open All mail, move the row back, then return to the list.
- Decisions: decision-0011. The Undo goes through All mail because Gmail's own Undo lasts about 3 s and only All mail offers "Move to inbox" on an archived row.
- Verification: `npm run typecheck`, `genesis-applet check` and `build` passed. On a Samsung Galaxy M30s with revision 4, the long press, Save for later, swipe remind and swipe archive with Undo all worked. Every test archive was moved back and every test reminder was deleted.
