# Legacy Node backend

The `bookmarks` service this applet used before decision-0015, when it ran on a computer as a personal single-token HTTPS backend on port 8787. It is kept for history and is not part of the build: the applet now uses the `hn-bookmarks` servelet, which runs on the phone, through [service.json](../service.json).

`store.mjs` is the reference for the servelet's store rules. Nothing starts this backend any more, and its data is not copied to the phone.
