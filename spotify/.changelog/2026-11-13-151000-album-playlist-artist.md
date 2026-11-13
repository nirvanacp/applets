# Album, playlist and artist pages

Problem ID: `spotify-applet` · Spirit animal: 🦜 Parrot

- Goal: milestone 2 of the PRD build (decision-0004): Album, Playlist and Artist pages with play.
- Changes: `src/routes.ts` routes `/album/:id`, `/playlist/:id` and `/artist/:id` to the new `entity` screen (`src/screens/entity.tsx`) with ready reader `ready.entity`; `src/adapter/entity.ts` adds the `entity`, `tracks` and `releases` readers and the `playEntity`, `playTrack`, `setEntitySaved`, `setFollowing` and `loadMoreTracks` commands; `sections.ts` reads a link card's subtitle from its second text element; `model.ts` adds the entity types; `theme.css` adds the page styles.
- Decisions: one screen serves the three pages because Spotify draws them with one layout; a track plays with a trusted tap on its row; more playlist rows load by scrolling the last row into view, since a jump to the page end loads nothing.
- Verification: `check`, `tsc` and `build` pass. On the Samsung SM-M307F phone, revisions 15 to 18: album, playlist and artist pages; track play; page Play and Pause; album and playlist save with undo; follow with undo; loading rows 31 to 50; Back.
- Blocked or limited: the artist About page, artist pick, tour and merch, playlist collaborators, downloads and the page shuffle button are not in the mobile web player.
