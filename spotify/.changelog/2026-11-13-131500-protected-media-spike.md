# Protected media feasibility spike

Problem ID: `spotify-applet` · Spirit animal: 🦜 Parrot

- Goal: learn whether Spotify's web player can run inside Genesis before building the PRD screens.
- Changes: product scope, feasibility table and verification in `.specs/current.md`; decision-0002 in `.specs/decisions.md`. No source changes; the shell patch used for the spike was reverted and not committed.
- Decisions: the signed-in web player needs protected media (Widevine), which the shell denies; applet work paused for the user's questions before the platform decision.
- Verification: on emulator `Medium_Phone_API_37.0`, Google sign-in works; with the current shell the site shows "Playback disabled"; with protected media granted the player renders but audio fails with `PIPELINE_ERROR_DECODE` after the Widevine L3 license is added. Real hardware not checked.
