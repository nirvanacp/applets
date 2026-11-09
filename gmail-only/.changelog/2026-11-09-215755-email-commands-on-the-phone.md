# Email commands, snooze and error paths on the phone

- Goal: Make the email toolbar, bulk commands and snooze work on a real phone, and check the error and account paths, from Step 5 of the phase-12 everyday features plan.
- Changes: `aa97a7f` runs the commands Gmail keeps in More options through its panel, shows only the commands Gmail offers and goes back past the email after a command. `2f93fe6` opens saved emails under Gmail's last list and ends a snooze when its email is opened after coming back. `ebf4ddf` keeps the Snoozed row's buttons on screen.
- Decisions: decision-0013. Genesis shows a failed list as the website, so the applet's retry screen is not reached; that is Genesis behavior and is left as is.
- Verification: `npm run typecheck`, `tsc --noUnusedLocals`, `genesis-applet check` and `build` passed. On the Samsung Galaxy M30s up to revision 17, every toolbar command, bulk Archive and Delete, snooze and the Snoozed actions were run and undone, and offline Refresh and recovery were checked. Blocked: "Add another account" hit Google's reCAPTCHA. Not run: sign out and sign in, sending mail. The unknown-view screen cannot be reached.
