# Search skeleton matches Browse all, and skeletons shimmer

- Goal: The UX pass on 2026-11-15 found the Search tab's loading state was the generic list skeleton, which then jumped to a grid of genre tiles, and all skeletons were static.
- Changes: `Skeleton` gets a `browse` kind, a heading and eight two-column tiles, used while Browse all loads. Skeletons fade in after 120 ms, so a fast load never flashes them, and lines and tiles shimmer with a new `--shimmer` token. The existing reduced-motion rule stops both.
- Decisions: Routine polish within the defaults' loading rules; no new decision.
- Verification: `check` and `build` pass. On the Samsung SM-M307F with the Genesis debug build of `fix/applet-ux-polish`, signed in: the Search tab shows the tile skeleton with the shimmer, then Browse all in the same layout. The artist page keeps its list skeleton.
