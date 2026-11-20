import { definePageModule, value } from "@nirvanacp/sdk/page";
import { accountEvidence } from "./adapter/account";
import { addReaction, attached, chatReady, composer, loadOlder, messages, place, send, setReaction } from "./adapter/chat";
import {
  dismiss, me, openProfile, openServerItem, openServerProfile, openServerSettings, openSettings, pending, profile,
  saveNickname, saveProfile, saveServer, serverProfile, serverSettings, setStatus,
  cropReady,
} from "./adapter/profile";
import { channels, conversations, drawer, guilds, openDrawer } from "./adapter/sidebar";
import { MESSAGES, PRIVATE } from "./adapter/read";

/**
 * The page module: readers the screens watch and commands they invoke. Every reader reads only
 * the Discord page it runs in, and never sends page HTML, cookies or tokens anywhere.
 */
export default definePageModule({
  readers: {
    account: value(accountEvidence),
    // The Direct Messages home is drawn once its Friends page or its drawer list is.
    "ready.messages": value(doc => doc.location.pathname === "/channels/@me" &&
      doc.querySelector(`main[aria-label=Friends], ${PRIVATE}, ${MESSAGES}`) !== null),
    "ready.chat": chatReady,
    drawer,
    guilds,
    conversations,
    channels,
    place,
    messages,
    composer,
    attached,
    me,
    profile,
    "profile.pending": value(pending),
    "profile.saved": value(doc => !pending(doc)),
    "profile.cropReady": value(cropReady),
    serverProfile,
    serverSettings,
  },
  commands: {
    openDrawer: ({ document }) => openDrawer(document),
    send: ({ document }, args) => send(document, args),
    loadOlder: ({ document }) => loadOlder(document),
    setReaction: ({ document }, args) => setReaction(document, args),
    addReaction: ({ document }, args) => addReaction(document, args),
    dismiss: ({ document }) => dismiss(document),
    openProfile: ({ document }) => openProfile(document),
    saveProfile: ({ document }, args) => saveProfile(document, args),
    setStatus: ({ document }, args) => setStatus(document, args),
    openSettings: ({ document }) => openSettings(document),
    openServerItem: ({ document }, args) => openServerItem(document, args),
    openServerProfile: ({ document }) => openServerProfile(document),
    saveNickname: ({ document }, args) => saveNickname(document, args),
    openServerSettings: ({ document }) => openServerSettings(document),
    saveServer: ({ document }, args) => saveServer(document, args),
  },
});
