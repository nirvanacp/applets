import { definePageModule, value } from "@genesis/sdk/page";
import {
  answerClose, archiveSelected, archiveThread, clearSelection, compose, conversation, conversationCommand, discardCompose, editDraft,
  expandMessage, fillCompose, listInfo, loadMore, menu, menuAccount, moveThreadToInbox, openMenuEntry, ready, refresh, respond,
  setConversationStarred, setSelected, setStarred, threads, trashSelected, trashThread, view,
} from "./adapter/pages.ts";

/**
 * The page module: readers the screens watch and commands they invoke. Every reader reads only
 * the Gmail page it runs in. Commands click Gmail's own controls, which carry the session; the
 * applet never sends mail.
 */
export default definePageModule({
  readers: {
    ready: value(ready),
    view,
    list: listInfo,
    threads,
    conversation,
    compose,
    menu,
    menuAccount,
  },
  commands: {
    "thread.setStarred": ({ document }, args) => setStarred(document, args),
    "thread.setSelected": ({ document }, args) => setSelected(document, args),
    "thread.archive": ({ document }, args) => archiveThread(document, args),
    "thread.trash": ({ document }, args) => trashThread(document, args),
    "thread.moveToInbox": ({ document }, args) => moveThreadToInbox(document, args),
    archiveSelected: ({ document }) => archiveSelected(document),
    trashSelected: ({ document }) => trashSelected(document),
    clearSelection: ({ document }) => clearSelection(document),
    loadMore: ({ document }) => loadMore(document),
    refresh: ({ document }) => refresh(document),
    "conversation.run": ({ document }, args) => conversationCommand(document, args),
    "conversation.setStarred": ({ document }, args) => setConversationStarred(document, args),
    expandMessage: ({ document }, args) => expandMessage(document, args),
    respond: ({ document }, args) => respond(document, args),
    editDraft: ({ document }, args) => editDraft(document, args),
    "compose.fill": ({ document }, args) => fillCompose(document, args),
    "compose.discard": ({ document }) => discardCompose(document),
    "compose.answerClose": ({ document }, args) => answerClose(document, args),
    "menu.open": ({ document }, args) => openMenuEntry(document, args),
  },
});
