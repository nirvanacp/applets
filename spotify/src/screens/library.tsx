import { ScrollMemory } from "@let/sdk/react";
import { Icon } from "../components/ui";
import { ORIGIN } from "../model";
import { TopBar, useOpenUrl } from "../ui/frame";

/**
 * Your Library. Spotify's mobile web player sends the library to its app and has a page only for
 * Liked Songs, which opens on the applet's own entity screen.
 */
export function LibraryScreen() {
  const open = useOpenUrl();
  return <>
    <TopBar title="Your Library" />
    <ScrollMemory className="screen">
      <ul className="library-list">
        <li>
          <button type="button" className="row" onClick={() => open(`${ORIGIN}/collection/tracks`)}>
            <span className="liked-art" aria-hidden="true"><Icon name="heart" filled /></span>
            <span className="row-text">
              <strong>Liked Songs</strong>
              <span>Playlist</span>
            </span>
          </button>
        </li>
      </ul>
    </ScrollMemory>
  </>;
}
