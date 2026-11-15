# Legacy Node backend

The `bookmarks` service this applet used before decision-0018, when it ran on a computer as a personal single-token HTTPS backend on port 8788, bound to the handle in `X_EXPECTED_HANDLE`. It is kept for history and is not part of the build: the applet now uses the `x-bookmarks` servelet, which runs on the phone, through [service.json](../service.json).

`store.mjs` and `model.mjs` are the reference for the servelet's rules. Nothing starts this backend any more, and its data is not copied to the phone.
