# Shared sign-in and opened links

- Goal: Correct the current spec where it describes Genesis's website sign-in, and record the phone results of the Genesis fixes for opened links, shared links and website windows.
- Changes: No applet code changed. The current spec now says applets share one website sign-in by default. The plan's link step expects Genesis's choice and the item screen. A Genesis update section records the new results.
- Decisions: None.
- Verification: On the Samsung SM-M307F (Android 11) with revision 15, signed in. "Open a link" showed "Open in Hacker News" and "Create a new applet", then the item screen with no pin. A link shared while the applet was open lost its trailing punctuation, showed the item screen, and Back returned to Chrome. The separate sign-in switch opened HN signed out, and turning it off brought back the shared session. `target=_blank` test links on the revealed page: HN loaded in the same context, X opened its applet, and example.com opened a sheet that Back closed.
