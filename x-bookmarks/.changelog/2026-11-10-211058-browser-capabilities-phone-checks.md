# Browser capabilities phone checks

- Goal: Check X on the phone against Genesis's new website capabilities, as the browser capabilities plan in the current spec asks.
- Changes: No applet code changed. The current spec gains the phone results: X refused the test account's sign-in, so most steps are blocked, and a link Genesis opens shows X's page with a banner saying the applet has no screen, the Genesis behavior Hacker News also records.
- Decisions: None.
- Verification: `genesis-applet check` and `npm run typecheck` pass. On a Samsung Galaxy M30s (Android 11) with revision 5 (device with the real website), signed out: a post link opens in X without a choice, and X's landing page is dark in system dark mode. Blocked: sign-in, where X answered "not allowed to log in at this time" twice; "Sign in with Google", which needs the operator's approval; and the steps that need a signed-in session (the post screen, sharing and Back, outside links, the applet's dark mode and font size, and the regression list).
