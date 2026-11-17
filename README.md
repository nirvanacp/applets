# Genesis applets

Example applets for [Genesis](https://github.com/nirvanacp/genesis), built with [Let](https://github.com/nirvanacp/let). Each one is a native-feeling phone app over a website you already use. The website runs underneath in the same session, signed in as you; the applet draws its own screens, adds its own features and data, and shows the website itself for any page it doesn't redesign.

Most of these applets were built by coding agents from a plain product description and Let's builder guidance. Read them as worked examples of what an applet can do and how its code is laid out.

| Applet | Website | What it is |
| --- | --- | --- |
| [hn-bookmarks](hn-bookmarks/README.md) | news.ycombinator.com, hn.algolia.com | A Hacker News app with Home, Search, Post, Saved and Me tabs. Saved stories and categories live in the [`hn-bookmarks` servelet](https://github.com/nirvanacp/servelets/tree/develop/hn-bookmarks) on the phone. Bundled into the Genesis APK |
| [x-bookmarks](x-bookmarks/README.md) | x.com | An X app with Home, Explore, Notifications, Saved and Profile tabs, post threads, a photo viewer, a composer with up to four photos, and a private Categories library in the [`x-bookmarks` servelet](https://github.com/nirvanacp/servelets/tree/develop/x-bookmarks) |
| [gmail-only](gmail-only/README.md) | mail.google.com | Gmail with its own screen for every page, where any email can become a reminder or a to-do. Snoozes and "remind me if no reply" work across several Google accounts, with the data in the applet's storage |
| [instagram](instagram/README.md) | instagram.com | Feed, stories tray, posts, comments, profiles, follow lists, Explore, search, notifications and messages over your instagram.com session. Reels, the story viewer and posting open the website |
| [spotify](spotify/README.md) | open.spotify.com | A Spotify app over the web player: tabs, a mini-player on every screen, Now Playing, albums, playlists, artists and search. Being built in milestones |

## What's in an applet

Each directory that holds an `applet.json` is one applet, named after its applet id. A typical applet:

| Path | What it is |
| --- | --- |
| `applet.json` | The manifest: id, name, website origins, up to three website contexts, storage and services, icon and accent color |
| `src/page.ts` | The page module: readers that turn the website's pages into records, and commands that act on them |
| `src/routes.ts` | Which website URLs get the applet's own screens; every other URL shows the website |
| `src/main.tsx`, `src/screens/` | The UI, in React here, though any web framework works |
| `service.json` | For applets with a servelet: which servelet answers the applet's service |
| `published/` | The published build and its release record, which Genesis installs from GitHub |
| `.specs/` | The applet's current specification, decisions and verification notes |
| `.changelog/` | Development records |

Start with an applet's `README.md`, then `.specs/current.md`.

## Use these applets

This repository is checked out inside a Genesis workspace as its applets directory. It has no `node_modules` of its own: the Genesis root installs the SDK, the tools and every applet's dependencies through its npm workspace. Follow the [Genesis README](https://github.com/nirvanacp/genesis#build-your-own-applet) to set up the workspace and a debug build of the app, then from an applet's directory:

```sh
npm run check
npm run build
npx genesis-applet dev install . --device emulator-5554
```

Applets with a servelet also need Go 1.24 or later, and the servelets repository checked out at `servelets/` next to this one. `build` compiles the servelet into the bundle.

In a release build of Genesis, people add applets with **Add applet** in the Genesis menu, from a public GitHub repository such as this one.

## Build your own

Ask a coding agent, from the Genesis workspace root:

> Read let/AGENTS.md. Build an app for https://example.com with [the features and design you want].

Or start one by hand with `npx genesis-applet create <id> --origin https://example.com` in this directory. Name the directory after the applet id, a short product name such as `hn-bookmarks` rather than a website domain, because one applet can span several websites. Never change an id after release: it keys the applet's stored data and services.

## Releases

Each applet commits its published build in `published/`. Releases are tagged `<id>/v<version>`, such as `hn-bookmarks/v0.0.5`; CI rebuilds the tagged version and publishes the GitHub Release only when the rebuild matches the committed build. No version is tagged yet, and the workflows in `.github/workflows/`, which call the reusable ones in Genesis, run only when started by hand until CI is set up. See [publishing](https://github.com/nirvanacp/let/blob/develop/factory/applets/guides/publishing.md).

## Computer-side backends

An applet can also call an HTTPS backend that runs on a computer. `ports.json` reserves a port for each such backend, `./start-applet-servers.sh` starts them all and `<applet>/start.sh` starts one; `--device <serial>` restores the `adb` tunnels, `--stop` stops them with their data kept, and `--check` validates the reservations. No applet here uses one today: the bookmarks backends moved into servelets that run on the phone.

## Contributing

Follow the Genesis root `AGENTS.md`, Let's applet builder instructions in `let/factory/applets/AGENTS.md`, and this repository's [AGENTS.md](AGENTS.md). Keep each applet's specification in `.specs/` and its development records in `.changelog/`. Pull requests go to `develop`.
