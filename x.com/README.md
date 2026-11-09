# X applet

The `x-bookmarks` applet: a native X app with Home, Explore, Notifications, Saved and Profile tabs, and a private Categories library for filing posts. The current state is in [.specs/current.md](.specs/current.md), and the history of choices is in [.specs/decisions.md](.specs/decisions.md). Follow the Genesis applet builder instructions (`factory/AGENTS.md` in the Genesis repository) when changing it.

## Build

From this directory, after `npm install` at the Genesis root:

```sh
npm run check
npm run build
npx genesis-applet dev install . --device <serial>
```

`dev install` sends the last build; run `build` first. This applet is installed for development and is not bundled into the APK.

## Operator setup

Categories live in the `bookmarks` service. Run `./start.sh` here, or `start-applet-servers.sh` at the root of this collection to start every local applet backend. After a reboot or reconnecting the phone, pass `--device <adb-serial>` to restore the tunnel and connection. `./start.sh --stop` keeps the records. Coding agents maintain these scripts but start services only when asked.

The backend needs Node 24, the Genesis workspace dependencies and OpenSSL; SQLite is built in. It uses port 8788, reserved in the collection's `ports.json`. Its private state, token and TLS files, database and log live under `~/.local/share/genesis/services/x-bookmarks/bookmarks/`. Reuse that state; never reset it to repair a connection.

The library belongs to one X handle. Set `X_EXPECTED_HANDLE=<your handle>` only when the database is first created; later starts read it from the database. The helper supplies `X_BACKEND_TOKEN`, `X_BACKEND_DB` and the TLS configuration. Categories open only when the signed-in X account matches that handle. See local startup and ports in the Genesis factory guide `guides/services-and-data.md`.

## Limits

Categories and X bookmarks are independent: filing a post does not bookmark it on X, and nothing imports X bookmarks automatically. Composing, replying, messages, settings and sign-in open X's own pages as the website, with the website bar's Done to return. There is no offline write queue or media archive. The service is not a multi-user backend.
