import { ScrollMemory } from "@genesis/sdk/react";
import { Icon } from "../components/ui";
import { ORIGIN } from "../model";
import { TopBar, useOpenUrl } from "../ui/frame";
import { WebsiteCue } from "../ui/states";

/**
 * Your Library. Spotify's mobile web player sends the library to its app; Liked Songs still opens,
 * as the website, so its row carries the website cue.
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
              <span>Playlist · Opens Spotify's page</span>
            </span>
            <WebsiteCue />
          </button>
        </li>
      </ul>
    </ScrollMemory>
  </>;
}
