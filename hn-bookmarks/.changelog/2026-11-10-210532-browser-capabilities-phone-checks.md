# Browser capabilities phone checks

- Goal: Check Hacker News on the phone against Genesis's new website capabilities, as the browser capabilities plan in the current spec asks.
- Changes: No applet code changed. The current spec gains the phone results for steps 1 to 6 and four Genesis issues with reproductions: shared or typed links that show the website with a banner saying the applet has no screen, a link shared while the applet is open that does not change the screen, Back from a shared link that stops at Genesis Home, and the leave guard's dialog title that shows Genesis's internal address.
- Decisions: None. The applet keeps its routes; the link behavior belongs to the platform.
- Verification: `genesis-applet check`, `npm run typecheck` and `build` pass. On a Samsung Galaxy M30s (Android 11) with revision 13 (device with the real website; the outside page's window, location prompt and PDF started through WebView DevTools), steps 1 and 3 to 6 are verified and step 2 failed in Genesis. Not shown: HN's login page in dark mode, because HN redirects a signed-in user.
