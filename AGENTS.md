# Genesis applets

This repository is a collection of Genesis applets. It is public. It is used from a Genesis checkout: the Genesis root's `genesis.workspace.json` names this directory as its applets directory, and the Genesis root installs the dependencies, SDK and tools for every applet here. Follow the Genesis root `AGENTS.md` and the Genesis applet builder instructions in `factory/AGENTS.md` for every change; this file adds the collection rules.

- Each subdirectory that contains `applet.json` is one applet. Read its `.specs/current.md` and `README.md` before changing it. `build.page` in `applet.json` names an applet's page module, and its routes are in code; the applets here use `src/page.ts` and `src/routes.ts`.
- Name an applet's directory after its applet id, the `id` in `applet.json`: a short product name such as `hn-bookmarks`, never a website domain, because one applet can span several websites. Choose the id when creating the applet (`genesis-applet create <name>` derives it from the directory name). Never change an existing id to match a directory; the id keys the applet's stored data and services, so rename the directory instead. `start-applet-servers.sh --check` refuses a directory whose name differs from its id.
- Applet records are flat: specs, plans and reviews in `<applet>/.specs/`, development records in `<applet>/.changelog/`, as the Genesis applet records guide describes. No phase or date folders.
- Install dependencies with `npm install` from the Genesis root, never in this repository or an applet: the root holds the one `node_modules`, so every applet resolves the same SDK, tools and UI framework copies, such as React.
- Backend ports are reserved in `ports.json`. `start-applet-servers.sh` and `scripts/` serve the whole collection; they are operator commands that coding agents do not run unless asked.
- Preserve each applet's id, service ids, stored data and backend.
