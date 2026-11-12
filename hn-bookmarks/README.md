# Hacker News applet

The `hn-bookmarks` applet: a native Hacker News app with Home, Search, Post, Saved and Me tabs, and a personal Saved library with categories. The current state is in [.specs/current.md](.specs/current.md), and the history of choices is in [.specs/decisions.md](.specs/decisions.md). Follow the Genesis applet builder instructions (`factory/AGENTS.md` in the Genesis repository) when changing it.

## Build

From this directory, after `npm install` at the Genesis root:

```sh
npm run check
npm run build
npx genesis-applet dev install . --device <serial>
```

`dev install` sends the last build; run `build` first. `npm test` runs the page module and route tests.

## Operator setup

Saved stories live in the `bookmarks` service. Run `./start.sh` here, or `start-applet-servers.sh` at the root of this collection to start every local applet backend. After a reboot or reconnecting the phone, pass `--device <adb-serial>` to restore the tunnel and connection. `./start.sh --stop` keeps the records. Coding agents maintain these scripts but start services only when asked.

The backend needs Node 24, the Genesis workspace dependencies and OpenSSL. It uses port 8787, reserved in the collection's `ports.json`. Its private state, token and TLS files, database and log live under `~/.local/share/genesis/services/hn-bookmarks/bookmarks/`. Reuse that state; never reset it to repair a connection. It is a personal single-token service. See local startup and ports in the Genesis factory guide `guides/services-and-data.md`.

## Limits

Home, Post and Me each keep their own Hacker News session history; Search and Saved are app screens. Search is a placeholder. Replies, sign-in and HN pages without a screen open as the website in the same context. The service is not a multi-user backend.
