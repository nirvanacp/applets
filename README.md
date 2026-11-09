# Genesis applets

A collection of [Genesis](https://github.com/nirvanacp/genesis) applets. Each directory that holds an `applet.json` is one applet, named after its applet id.

| Applet | Websites | What it is |
| --- | --- | --- |
| [hn-bookmarks](hn-bookmarks/README.md) | news.ycombinator.com | A native Hacker News app with a personal Saved library and categories, backed by a local service |
| [x-bookmarks](x-bookmarks/README.md) | x.com | A native X app with a private Categories library, backed by a local service |
| [gmail-only](gmail-only/README.md) | mail.google.com | Gmail with reminders, to-dos and snoozes stored on the device |

## Setup

This repository does not install anything on its own. A Genesis checkout uses it as its applets directory, named in the Genesis root's `genesis.workspace.json`:

```sh
# from the Genesis root
npm run workspace -- setup    # clones this repository into the configured directory
npm install                   # installs the dependencies of the platform and every applet here
```

Build and check an applet from its directory with `npm run check` and `npm run build`; each applet's README has the details.

## Backends

`ports.json` reserves one port per applet backend. `./start-applet-servers.sh` starts every local backend, and `<applet>/start.sh` starts one; pass `--device <adb-serial>` to restore Android tunnels and connections, `--stop` to stop them with their data kept, or `--check` to validate the registry without starting anything.

## Working on an applet

Follow the Genesis root `AGENTS.md`, the Genesis applet builder instructions in `factory/AGENTS.md` and this repository's [AGENTS.md](AGENTS.md). Each applet keeps its current specification in `.specs/` and its development records in `.changelog/`.
