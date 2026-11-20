# Record the queue and device sheet as open

Problem ID: `spotify-official-app-parity` · Problem: Make the Spotify applet match the official Spotify Android app in features and interaction speed · Spirit animal: 🐬 Dolphin

- Goal: check again whether the web player gives a queue or a device list the applet could draw (plan step 9 group 4, gaps F-04 and F-11).
- Changes: no code. The design and the current specification mark both gaps open, with what the web player showed.
- Decisions: the applet builds no queue screen and no device sheet. The full player's buttons are shuffle, previous, play, next, repeat, Connect, Share and its menu, so there is no queue to read. The Connect view lists "This Web Browser", a "Spotify Connect" note and a volume slider, so a device sheet would hold one entry. Playback on another device keeps its existing handling: the bar says so and Play moves it here (N-05).
- Verification: on the phone (Samsung SM-M307F, revision 57), with Now Playing open, the website's full player buttons were read through remote debugging, and the Connect view was opened with a trusted tap, read and closed again. Nothing was changed on the account.
