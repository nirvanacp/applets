# Search, Browse all and category hubs

Problem ID: spotify-applet
Problem: Spotify applet over the web player, built from the PRD designs
Spirit animal: 🦜 Parrot

Milestone 3 of the PRD build.

- New `search` screen for `/search`, `/search/recent`, `/search/results/:query` and `/search/:filter/:query`: Browse all tiles, recent searches with remove and clear, live results with filter chips, a Top result card and typed result rows.
- New `hub` screen for `/genre/:id`, reusing the `sections` reader.
- New adapter `src/adapter/search.ts` with the readers `search`, `searchRows`, `browse`, `ready.search`, `ready.hub` and the commands `openSearch`, `setQuery`, `setFilter`, `openResult`, `removeRecent` and `clearRecents`.
- The query goes into Spotify's own search input rather than a URL navigation, because the shell loads a URL as a full page load, while Spotify updates its results and URL in place as the input changes.
- `BackButton` moved to `src/components/ui.tsx` for the entity and hub screens; a `close` icon was added.
- The Search tab is marked current on the search screens.

Verification: see `.specs/current.md`, Milestone 3. Several checks are still open, because the device tools left the session.
