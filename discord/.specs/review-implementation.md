# Review: Discord applet implementation

Problem ID: `discord-applet` · Problem: Build a Discord applet · Spirit animal: 🦔 Hedgehog

- Reviewer: Claude Fable 5.2, read-only, 2026-11-17.
- Scope: `applets/discord` on branch `feat/discord-applet`, commits `6299056` to `60f17f4`, against `.specs/current.md`, the factory rules and the SDK source.
- Checks the reviewer ran: `npm run typecheck` and `genesis-applet check .`, both pass.

## Findings and outcome

| Id | Severity | Finding | Outcome |
| --- | --- | --- | --- |
| F1 | P1 | `send` looked only at the last row and compared raw typed text, so emoji, markdown or mentions in the first line, or another member's message landing after it, gave `unknown` and invited a second post. | Fixed: any new row created after the tap counts, rows Discord marks as sending or failed do not, and both sides compare letters and digits only. |
| F2 | P1 | The 10-file cap used the list from before the pick, so it never applied. | Fixed: the room is computed before the pick. |
| F3 | P1 | Media and embed pictures preferred the link's `href`, which can be any host, over Discord's proxied `src`, exposing the user's IP address to that host. | Fixed: pictures use only the `img` or `video` source. |
| F4 | P2 | After the first `scroll` step, every failure reports `unknown`; a retry after attached-but-unsent files attached them twice. | Partly fixed: `send` refuses when Discord already holds files. The scroll stays, because the newest message must be in the list for the evidence; a failure after it reads as "Discord didn't confirm", which is the safe message. |
| F5 | P2 | Android Back left the chat instead of closing the image viewer. | Fixed: the viewer registers a Back handler; Tab stays on Close. `referrerPolicy` does not apply to `video`. |
| F6 | P2 | Reactions were matched by emoji label only, so two chips with one label toggled the wrong one and shared a React key. | Fixed: `setReaction` takes the chip's position and confirms the label; chips key on both. |
| F7 | P2 | The virtualized list could keep the previous channel's rows under the new channel's title. | Fixed: message keys are `<channel>-<message>` and the screen shows only the current channel's keys. |
| F8 | P2 | A markdown `### heading` in a continued message made it look like a group start with no author. | Fixed: a group start is found by its username element. |
| F9 | P2 | The field was disabled while sending, which dropped focus and the keyboard after each send. | Fixed: the field is read-only while sending. |
| F10 | P2 | The UI counted code points and the command counted UTF-16 units. | Fixed: both count code points. |

## Verification of the fixes

Typecheck, `genesis-applet check` and `genesis-applet build` pass. On the emulator `Genesis_Verify_API_37_1`: #general renders its 30 rows and images after the key change; the image viewer opens with focus on Close and Android Back closes it, staying in #general. F1, F2, F4, F6 and F9 change sending, attaching and reacting, which were not run on the device so that no real messages or reactions were posted.
