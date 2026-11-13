import { definePageModule, value } from "@genesis/sdk/page";
import { accountEvidence } from "./adapter/account";
import {
  closePlayer, nowPlaying, openPlayer, player, seek, setPlaying, setRepeat, setShuffle, setTrackSaved, skip,
} from "./adapter/player";
import { entity, entityReady, loadMoreTracks, playEntity, playTrack, releases, setEntitySaved, setFollowing, tracks } from "./adapter/entity";
import { heading, homeReady, sections } from "./adapter/sections";
import {
  browse, clearRecents, hubReady, openResult, openSearch, removeRecent, search, searchReady, searchRows, setFilter, setQuery,
} from "./adapter/search";

/**
 * The page module: readers the screens watch and commands they invoke. Every reader reads only
 * the page it runs in. Playback commands press the web player's own buttons with real taps.
 */
export default definePageModule({
  readers: {
    account: value(accountEvidence),
    "ready.home": homeReady,
    "ready.entity": entityReady,
    "ready.search": searchReady,
    "ready.hub": hubReady,
    search,
    searchRows,
    browse,
    entity,
    tracks,
    releases,
    heading,
    sections,
    nowPlaying,
    player,
  },
  commands: {
    setPlaying: ({ document }, args) => setPlaying(document, args),
    skip: ({ document }, args) => skip(document, args),
    setShuffle: ({ document }, args) => setShuffle(document, args),
    setRepeat: ({ document }, args) => setRepeat(document, args),
    setTrackSaved: ({ document }, args) => setTrackSaved(document, args),
    seek: ({ document }, args) => seek(document, args),
    openPlayer: ({ document }) => openPlayer(document),
    closePlayer: ({ document }) => closePlayer(document),
    playEntity: ({ document }, args) => playEntity(document, args),
    playTrack: ({ document }, args) => playTrack(document, args),
    setEntitySaved: ({ document }, args) => setEntitySaved(document, args),
    setFollowing: ({ document }, args) => setFollowing(document, args),
    loadMoreTracks: ({ document }) => loadMoreTracks(document),
    openSearch: ({ document }) => openSearch(document),
    setQuery: ({ document }, args) => setQuery(document, args),
    setFilter: ({ document }, args) => setFilter(document, args),
    openResult: ({ document }, args) => openResult(document, args),
    removeRecent: ({ document }, args) => removeRecent(document, args),
    clearRecents: ({ document }) => clearRecents(document),
  },
});
