# Genesis applets

This repository is a collection of Genesis applets. It is used from a Genesis checkout: the Genesis root's `genesis.workspace.json` names this directory as its applets directory, and the Genesis root installs the dependencies, SDK and tools for every applet here. Follow the Genesis root `AGENTS.md` and the Genesis applet builder instructions in `factory/AGENTS.md` for every change; this file adds the collection rules.

- Each subdirectory that contains `applet.json` is one applet. Read its `.specs/current.md` and `README.md` before changing it.
- Applet records are flat: specs, plans and reviews in `<applet>/.specs/`, development records in `<applet>/.changelog/`, as the Genesis applet records guide describes. No phase or date folders.
- Install dependencies with `npm install` from the Genesis root, never in this repository or an applet: the root holds the one `node_modules` and the one copy of React that every applet resolves.
- Backend ports are reserved in `ports.json`. `start-applet-servers.sh` and `scripts/` serve the whole collection; they are operator commands that coding agents do not run unless asked.
- Preserve each applet's id, service ids, stored data and backend.
