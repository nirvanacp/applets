import { ScrollMemory } from "@genesis/sdk/react";
import { Icon, useOpenUrl } from "../components/ui";
import { ORIGIN } from "../model";

/** Your Library. Spotify's mobile web player sends the library to its app; Liked Songs still opens. */
export function LibraryScreen() {
  const open = useOpenUrl();
  return <ScrollMemory className="screen">
    <h1 className="screen-title">Your Library</h1>
    <div className="list">
      <button type="button" onClick={() => open(`${ORIGIN}/collection/tracks`)}>
        <span className="list-lead"><span className="liked-art"><Icon name="heart" filled /></span>Liked Songs</span>
        <Icon name="chevron" />
      </button>
    </div>
  </ScrollMemory>;
}
