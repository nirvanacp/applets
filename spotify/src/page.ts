import { definePageModule, value } from "@genesis/sdk/page";
import { accountEvidence } from "./adapter/account";
import {
  closePlayer, nowPlaying, openPlayer, player, seek, setPlaying, setRepeat, setShuffle, setTrackSaved, skip,
} from "./adapter/player";
import { heading, homeReady, sections } from "./adapter/sections";

/**
 * The page module: readers the screens watch and commands they invoke. Every reader reads only
 * the page it runs in. Playback commands press the web player's own buttons with real taps.
 */
export default definePageModule({
  readers: {
    account: value(accountEvidence),
    "ready.home": homeReady,
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
  },
});
