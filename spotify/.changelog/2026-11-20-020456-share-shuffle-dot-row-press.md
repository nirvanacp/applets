# Add entity Share, the Shuffle dot and row press

Problem ID: `spotify-official-app-parity` · Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed · Spirit animal: 🐬 Dolphin

- Goal: the small official-app touches in plan step 9 group 5 (gap F-03) that the web player can support.
- Changes:
  - Album, playlist and artist pages have a Share button in the action row. It opens Android's share sheet with the page's title and link. Liked Songs has none.
  - Shuffle and Repeat in Now Playing show a green dot under them while on.
  - A track row lights as a whole while its play target is held, not only the text part.
- Decisions: entity Shuffle stays open, because the web playlist and album pages have only Save, Share, More and Play. More search results stay open, because the website's list kept 20 rows after scrolling to its end with the Songs filter. The device line was already done as N-05.
- Verification: `typecheck`, `check` and `build` pass with no warnings. On the phone (revision 58), playlist Share opened the share sheet and Back returned with nothing shared; Shuffle showed its dot and was turned off again. The whole-row press was not seen on the phone.
