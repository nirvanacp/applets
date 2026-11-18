# Sending, replies and message actions

Problem ID: `discord-applet` · Problem: Build a Discord applet · Spirit animal: 🦔 Hedgehog

- Goal: Make sending and replying work, and check every feature on the emulator, as the user asked on 2026-11-18.
- Changes: the composer selector is one compound selector, which fixes the `trim` error on Send; Discord's sending rows are no longer read twice; a tap on a message opens a sheet with six quick reactions, Reply and Copy text; the composer shows "Replying to <author>" with Cancel reply; `send` takes `replyTo` and a new `addReaction` command adds reactions; `.specs/interactions.md` is the interaction graph and regression script for every screen. Version 0.1.1 republished with `genesis-applet publish` (no version change, no tag).
- Decisions: decision-0012.
- Verification: typecheck and `genesis-applet check` pass; on emulator `Genesis_Verify_API_37_1` every case in interactions.md marked pass, with unique messages in the test servers: send in two channels, replies to own and others' messages, an image attachment, quick reactions, chip removal, copy, the counter, the channel sheet, voice rows, load older, Jump to present, Refresh, the lightbox with three images and a GIF, external links and embeds, and Back on each screen. Not run: DMs, Discord links, file rows, dark theme, 200% text.
