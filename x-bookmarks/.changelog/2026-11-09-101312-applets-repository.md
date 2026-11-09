# Move to the applets repository

- Goal: The user moved all applet code out of the Genesis repository into its own applets repository, and asked for applet directories named after the applet instead of the website domain, because applets can span several websites.
- Changes: The applet moved from Genesis `examples/x.com` to `x-bookmarks/` in this repository, matching its unchanged id `x-bookmarks`. `tsconfig.json` holds its own compiler options instead of extending the Genesis root's base config, and the README builds from this directory. In the collection, the bookmarks service keeps port 8788.
- Decisions: The id, service ids, stored data and backend are unchanged (user rule to preserve them); only the directory moved. Its name follows the id because the id keys stored data and services, so renaming the id would lose them.
- Verification: `tsc -p tsconfig.json`, `genesis-applet check .` and `genesis-applet build .` passed from the new directory. `start-applet-servers.sh --check` passed for the collection. Not run on a device; no backend was started.
