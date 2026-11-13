# Typecheck script for the workspace check

Problem ID: instagram-applet · Spirit animal: 🦩 Flamingo

- `package.json` gains `"typecheck": "tsc -p tsconfig.json"`, like the other applets. The root `npm run typecheck` runs that script in every workspace and failed with "Missing script" without it.
- No source or bundle change, so the version and `published/` stay as they are.
- Verification: `npm run typecheck` and `genesis-applet check` pass with the three open features stacked on `develop`.
