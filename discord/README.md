# Discord

A Genesis applet over https://discord\.com: direct messages, servers, channels and chat in a phone-shaped UI over the same signed-in Discord session. The current state is in [.specs/current.md](.specs/current.md).

## Build

```sh
npm install
npm run check
npm run typecheck
npm run build
npx genesis-applet dev install . --device <serial>
```

Setup is described in the Genesis checkout's `let/factory/applets/guides/getting-started.md`.
