# Review: open SDK migration

- **Date:** 2026-11-12
- **Scope:** the move of gmail-only to the open SDK, `38aea70..76bad09` on `proto/open-sdk`
- **Reviewer:** Claude Code

## Verdict

These are preserved:

- every row and bulk command, with the same evidence;
- the conversation actions, compose and the More menu;
- pending star and selection;
- both routes.

The More menu as a router screen and `conversation.run` are equivalent to the old code. Dropping the sign-in screen (decision-0015) changes nothing visible: the old screen was very likely unreachable, because the page script never runs on Google's sign-in site.

## Findings

1. **Medium, unexplained: Back from the inbox leaves the applet.**
   - The final verification found this.
   - No line in the applet explains it, and the SDK's Back order is unchanged.
   - Check on the phone: inbox, Promotions, then Back should return to the inbox. Check again after a resume.
2. **Low, plausible: Back can flash a skeleton.**
   - Back to the list or a conversation can flash a skeleton, because the SDK drops a screen watch's last copy when the screen closes.
   - The verification found Back unchanged on the phone.
3. **Low, plausible: an item saved during a reload gets the account "unknown".**
   - The account address now comes from the `view` watch, which is empty while Gmail reloads, for example after an account switch.
   - An item saved in that moment gets the account `"unknown"`, and account dots flicker.

## Not covered

No device run. Writes and the service were not exercised.
