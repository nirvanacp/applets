# Instagram

A Genesis applet over https://www\.instagram\.com: native-feeling screens for the feed, stories tray, posts, comments, profiles, follow lists, Explore, search, notifications and messages, over the person's own instagram.com session. Reels, the story viewer, sign-in, creating posts and settings show instagram.com itself. The current state, routes and verification are in [.specs/current.md](.specs/current.md); choices are in [.specs/decisions.md](.specs/decisions.md).

## Setup

No backend and no keys. Install the applet, open it and sign in on Instagram's own page; Instagram may ask to confirm the sign-in on another device.

```sh
npm install
npm run check
npm run build
npx genesis-applet dev install . --device <serial>
```

Genesis setup is described in [factory/guides/getting-started.md](factory/guides/getting-started.md).

## Known limits

- Videos play only on instagram.com's own pages, so feed and grid videos show a poster and open the website.
- instagram.com's mobile pages sometimes load slowly; screens show a skeleton until the website's page is ready.
- Profile pictures from Instagram's CDN sometimes fail to load and show the account's first letter.
- Highlights, the Notes tray, the Messages unread badge, the profile menu and Undo toasts are not built yet.
