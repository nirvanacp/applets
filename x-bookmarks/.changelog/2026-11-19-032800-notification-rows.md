# Notification rows read as X's app draws them

Problem ID: `x-official-app-parity` · Problem: Make the X applet look and feel like the official X Android app · Spirit animal: 🦜 Parrot

- Goal: Draw notifications as X's app does (G-007), instead of one run of joined text.
- Changes: the notification reader splits the row's rendered lines into a headline, its explanation, X's time and the post's text, and takes X's own icon path. The row shows the headline in bold, the time and the post's text in grey (four lines at most), and the icon in pink for likes, green for reposts and blue otherwise.
- Decisions: decision-0026.
- Verification: `typecheck`, `genesis-applet check` and `build` pass with no warnings. On the phone, a Community Notes notification shows X's icon, the bold headline, the time and the grey text. Not checked: like, repost and follow notifications, which the test account has none of.
