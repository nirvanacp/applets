# Download in Gmail and the browser capabilities phone checks

- Goal: Implement the browser capabilities plan: let people download attachments the WebView cannot show, and check Gmail Only on the phone against Genesis's new website capabilities.
- Changes: Attachments the WebView cannot show are now "Download in Gmail" cards that reveal the email on Gmail's page, where the person taps the file. The reminder sheet no longer counts done snoozes as linked items. The current spec gains the phone results, a known limit, and three Genesis issues with reproductions: Back that never leaves when the website adds a history entry on load, a shared link that shows the applet screen while the applet is open, and unreadable chips on forced-dark pages.
- Decisions: decision-0014. The applet never follows a download link while its screen shows.
- Verification: `genesis-applet check`, `npm run typecheck` and `build` pass. On a Samsung Galaxy M30s (Android 11) with revisions 19 and 20 (device with the real website), steps 1 to 8 pass except where the spec says failed or blocked. The download card, `mailto:`/`tel:` links and account switching are blocked by what the test account holds.
