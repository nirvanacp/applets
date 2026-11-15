# Hacker News applet

The `hn-bookmarks` applet: a native Hacker News app with Home, Search, Post, Saved and Me tabs, and a personal Saved library with categories. The current state is in [.specs/current.md](.specs/current.md), and the history of choices is in [.specs/decisions.md](.specs/decisions.md). Follow the Genesis applet builder instructions (`factory/applets/AGENTS.md` in the Let repository, checked out at `let/` in Genesis) when changing it.

## Build

From this directory, after `npm install` at the Genesis root:

```sh
npm run check
npm run build
npx genesis-applet dev install . --device <serial>
```

`dev install` sends the last build; run `build` first. `npm test` runs the page module and route tests.

## Operator setup

None. Saved stories live in the `bookmarks` service, which runs on the phone as the `hn-bookmarks` servelet from the servelets collection (`servelets/hn-bookmarks` next to this collection in Genesis). `build` compiles it into the bundle; the build needs Go 1.24 or later on PATH. Its data stays in Genesis's private storage on the phone and is deleted when the applet is removed or its data is cleared. There is no port, token or tunnel. The earlier Node backend is under [legacy/](legacy/README.md), kept for history only.

## Limits

Home, Post and Me each keep their own Hacker News session history; Search and Saved are app screens; Search shows results from HN's search site in Home's history. Replies, sign-in and HN pages without a screen open as the website in the same context. The service keeps one phone's data; it is not shared between devices.
