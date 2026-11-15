# X2

Problem ID: x2-applet
Problem: Rebuild the X applet with the native-feel guidance
Spirit animal: 🦊 Fox

X2 is an X client for Genesis. It has five icon tabs (Home, Explore, Notifications, Saved and Profile), post detail with its conversation, profiles with Posts, Replies and Media, a media viewer, a composer that takes up to four photos, and a private Categories library for filing posts. Its UI was written from the factory's applet-builder instructions and UI kit; the page module, adapter and backend come from the `x-bookmarks` applet. The current state is in [.specs/current.md](.specs/current.md) and the choices behind it are in [.specs/decisions.md](.specs/decisions.md). Follow the Genesis applet-builder instructions (`factory/AGENTS.md` in the Genesis repository) when changing it.

## Build

From this directory, after `npm install` at the Genesis root:

```sh
npm run check
npm run typecheck
npm run build
npx genesis-applet dev install . --device <serial>
```

`dev install` sends the last build, so run `build` first. X2 is installed for development only and is not bundled into the APK.

## Operator setup

Categories live in the `bookmarks` service. To start it, run `./start.sh` here, or `start-applet-servers.sh` at the root of this collection. `./start.sh --stop` stops it and keeps the records. Coding agents maintain these scripts but start services only when asked.

The backend needs Node 24, the Genesis workspace dependencies and OpenSSL. It uses port 8789, reserved in the collection's `ports.json`. Its token, TLS files, database and log live under `~/.local/share/genesis/services/x2/bookmarks/`. Reuse that state; never reset it to repair a connection. The library belongs to one X handle: set `X2_EXPECTED_HANDLE=<handle>` only when the database is first created.

## Limits

- Categories and X bookmarks are independent, and X bookmarks are never imported automatically.
- Replying, messages, settings, Edit profile, the following and followers lists, video playback and sign-in open X's own pages, with the website bar's Done to return.
- There is no offline write queue.
- X2 has not been run on a device yet (see the current spec's Native feel section).
