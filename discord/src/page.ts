import { definePageModule, value } from "@let/sdk/page";
import { accountEvidence } from "./adapter/account";
import { attached, chatReady, composer, loadOlder, messages, place, send, setReaction } from "./adapter/chat";
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
  },
  commands: {
    openDrawer: ({ document }) => openDrawer(document),
    send: ({ document }, args) => send(document, args),
    loadOlder: ({ document }) => loadOlder(document),
    setReaction: ({ document }, args) => setReaction(document, args),
  },
});
