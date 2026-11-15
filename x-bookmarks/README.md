# X applet

The `x-bookmarks` applet: a native X app with five icon tabs (Home, Explore, Notifications, Saved and Profile), post detail with its conversation, profiles with Posts, Replies and Media, a photo viewer, a composer for posts with up to four photos, and a private Categories library for filing posts. Its UI follows the factory's native-feel guide and UI kit. The current state is in [.specs/current.md](.specs/current.md), and the history of choices is in [.specs/decisions.md](.specs/decisions.md). Follow the Genesis applet builder instructions (`factory/applets/AGENTS.md` in the Let repository, checked out at `let/` in Genesis) when changing it.

## Build

From this directory, after `npm install` at the Genesis root:

```sh
npm run check
npm run typecheck
npm run build
npx genesis-applet dev install . --device <serial>
```

`dev install` sends the last build; run `build` first. This applet is installed for development and is not bundled into the APK.

## Operator setup

None. Categories live in the `bookmarks` service, which runs on the phone as the `x-bookmarks` servelet from the servelets collection (`servelets/x-bookmarks` next to this collection in Genesis). `build` compiles it into the bundle; the build needs Go 1.24 or later on PATH. Its data stays in Genesis's private storage on the phone and is deleted when the applet is removed or its data is cleared. There is no port, token or tunnel. The earlier Node backend is under [legacy/](legacy/README.md), kept for history only.

The library belongs to one X handle: the first account that is signed in to X when Categories opens. After that, Categories open only when the signed-in X account matches it. Clearing the applet's data lets another account claim a new library.

## Limits

Categories and X bookmarks are independent: filing a post does not bookmark it on X, and nothing imports X bookmarks automatically. A new post with up to four photos is written in the applet; replying, messages, settings and sign-in open X's own pages as the website, with the website bar's Done to return. There is no offline write queue or media archive. The service keeps one phone's data; it is not shared between devices.
