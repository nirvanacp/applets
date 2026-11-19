# Open Search on the kept Browse all

Problem ID: `spotify-official-app-parity` · Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed · Spirit animal: 🐬 Dolphin

- Goal: close the polish gaps in plan step 9 group 6. O-01 is the status bar colour, O-02 the first Home shelf starting scrolled and O-05 the Search skeleton on every visit.
- Changes: the Browse all watch is kept on the phone, as Home's shelves are. The Search tab draws the last tiles at once, even on the first visit after a restart, and the read refreshes them behind. Signing out forgets them with the other kept pages.
- Decisions:
  - O-01 stays open. The manifest's `shell` has only an accent and an icon, and the shell paints the system bars in Genesis's own colour. The design proposes a shell capability for an applet-chosen bar colour.
  - O-02 did not reproduce, so nothing changed.
- Verification: `typecheck`, `check` and `build` pass with no warnings. On the phone (revision 59), Search after a force-stop showed Browse all with no skeleton in the first screenshot. Home's shelves all read scroll offset 0 after a fresh install and after a tab return.
