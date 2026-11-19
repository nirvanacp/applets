# Verify the official app parity work

Problem ID: `spotify-official-app-parity` · Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed · Spirit animal: 🐬 Dolphin

- Goal: check plan steps 5 to 9 on the phone, by an agent that built none of them, against the acceptance criteria and the gap list.
- Changes: no code. Added `verification-official-app-parity.md` with the timing table, each criterion, each gap id, the bugs and the bench. `current.md` gains the result, two limits (Your Library playback, Android's text size) and the status bar row, and native feel rows 6 and 9 are updated.
- Decisions: the bugs found (B1 to B6) are recorded, not fixed, so the review step can take them. Criterion 3 is read strictly: Spotify's confirm has to beat the smaller of 1.5 s and 60% of the baseline.
- Verification: revision 60 of `c61977d` on the Samsung SM-M307F. Checks pass with no warnings. Criteria 1, 6, 8 to 11 pass; 2, 3, 4, 5 and 7 fail. Bench: cold 2749 ms against 2750, idle paused 4.8 ms/s against 6.3. Not run: reduced motion, screen reader, narrowest width, a second device, ads.
