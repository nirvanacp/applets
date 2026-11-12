import { useEffect, useState } from "react";
import { ScrollMemory, useCommand, useRouter, usePending } from "@genesis/sdk/react";
import {
  dateKey, isBack, quickPresets, timeKey, whenLabel,
  type Conversation, type ConversationCommand, type MailList, type Message, type TextRun,
} from "../model";
import { useAccounts, useItems, useNow, useSettings, useToast } from "../store";
import { AccountDot, Avatar, Icon, IconButton, Notice, Popover, ProgressBar, Skeleton, useSawLoading } from "../components/ui";
import { CONTEXT, linkedTo, newItem, pendingReply, suggestTitle, useOpenItem, type EmailSource } from "../components/mail";
import { ItemRow } from "../components/items";
import { invoked, useMailStatus, usePageWatch } from "../components/page";

const COMMAND_LABELS: Record<ConversationCommand, string> = {
  archive: "Archive", trash: "Delete", deleteForever: "Delete forever", notSpam: "Not spam", moveToInbox: "Move to inbox",
  mute: "Mute", markUnread: "Mark unread", spam: "Report spam",
};
const DONE_TEXT: Partial<Record<ConversationCommand, string>> = {
  archive: "Archived", trash: "Moved to Trash", deleteForever: "Deleted forever", notSpam: "Moved to inbox",
  moveToInbox: "Moved to inbox", mute: "Muted", markUnread: "Marked unread", spam: "Reported as spam",
};

/** An open email: the toolbar, the "Add to…" pill, the messages and the reply buttons. */
export function ConversationScreen({ threadId, list }: { threadId: string; list: MailList }) {
  const page = useMailStatus();
  const conversation = usePageWatch<Conversation>("conversation").value ?? undefined;
  const { items } = useItems();
  const { settings } = useSettings();
  const accounts = useAccounts();
  const { back, navigate } = useRouter();
  const { show } = useToast();
  const openItem = useOpenItem();
  const now = useNow();
  const [menu, setMenu] = useState<"add" | "more" | null>(null);
  const ready = page.status === "ready" && !page.stale && conversation !== undefined;
  const linked = linkedTo(items, threadId).filter(item => !item.snooze || !item.done);
  const account = accounts.current;

  // Opening an email that is back clears it from "Back in your inbox". Its snooze is over, so it is
  // marked done; a reminder stays open until the person ticks it off.
  const { save, complete } = useItems();
  useEffect(() => {
    for (const item of linked) {
      if (!isBack(item, now) || item.returned) continue;
      void (item.snooze ? complete(item, true) : save({ ...item, returned: true }));
    }
  }, [linked.length]);

  const runCommand = useCommand<{ command: ConversationCommand }>("conversation.run", CONTEXT);
  const setStarred = useCommand<{ starred: boolean }>("conversation.setStarred", CONTEXT);
  const respond = useCommand<{ mode: string }>("respond", CONTEXT);

  useEffect(() => {
    if (!ready || pendingReply.threadId !== threadId) return;
    pendingReply.threadId = null;
    void respond({ mode: "reply" });
  }, [ready, threadId]);

  // One toolbar command at a time: the bar shows progress and its buttons wait until Gmail answers.
  // Gmail then opens the list as a new history entry after the email, so Back from it would reopen
  // the email. Going back past the email returns to where the person opened it.
  const [busy, setBusy] = useState<ConversationCommand | null>(null);
  const run = (command: ConversationCommand) => {
    setMenu(null);
    setBusy(command);
    void runCommand({ command }).then(result => {
      setBusy(null);
      show({ text: result.outcome === "observed" ? DONE_TEXT[command] ?? "Done" : result.message ?? "Couldn't finish. Try again." });
      if (result.outcome === "observed") { back(); back(); }
    });
  };
  // The star shows the requested state while Gmail applies it.
  const pendingStar = [...usePending(undefined, CONTEXT)].reverse().map(input => invoked<{ starred: boolean }>(input, "conversation.setStarred")).find(Boolean);
  const starred = pendingStar ? pendingStar.starred : conversation?.starred ?? false;
  const saw = useSawLoading(!conversation);

  const source = (): EmailSource | null => {
    if (!conversation) return null;
    const first = conversation.messages[0];
    const last = conversation.messages[conversation.messages.length - 1];
    return {
      threadId, subject: conversation.subject, sender: first?.sender ?? "", snippet: (last?.snippet || textOf(last?.body ?? [])).slice(0, 200),
      receivedAt: last?.time ?? "", accountId: account?.id ?? "unknown",
    };
  };

  const openForm = (type: "reminder" | "todo" | "snooze") => {
    const email = source();
    setMenu(null);
    if (!email) return;
    navigate({ screen: "add", params: { type, emails: JSON.stringify([email]), archive: "conversation" } });
  };

  const { saveMany, removeMany } = useItems();
  const quick = async (date: Date) => {
    const email = source();
    setMenu(null);
    if (!email) return;
    const item = newItem("reminder", email, account?.id ?? "unknown", { title: suggestTitle(email.subject), dueDate: dateKey(date), dueTime: timeKey(date) });
    try {
      await saveMany([item]);
      show({ text: `Reminder set · ${whenLabel(item, now)}`, undo: () => removeMany([item.id]), view: () => openItem(item.id) });
    } catch {
      show({ text: "Couldn't save. Try again." });
    }
  };

  let body;
  if (!conversation) body = page.status === "error" ? <Notice title="Couldn't open this email" role="alert" icon="alert"><p>{page.error?.message}</p></Notice>
    : <Skeleton label="Loading email" kind="email" rows={6} />;
  else body = <>
    <div className="subject-row">
      <h1 className="conversation-subject">{conversation.subject}</h1>
      <IconButton icon="star" label={starred ? "Unstar" : "Star"} filled={starred} pressed={starred}
        className={starred ? "star on" : "star"} disabled={!ready} onClick={() => void setStarred({ starred: !starred })} />
    </div>
    <div className="conversation-meta">
      {account && <span className="account-line"><AccountDot color={account.color} /> {account.name}</span>}
      {conversation.labels.slice(0, 3).map(label => <span key={label} className="chip-small label">{label}</span>)}
      {conversation.messages.length > 1 && <span className="muted">{conversation.messages.length} messages</span>}
    </div>
    {linked.length > 0 && <section className="linked-items" aria-label="Linked items">
      <h2 className="section-label">{linked.length === 1 ? "1 item linked" : `${linked.length} items linked`}</h2>
      <ul className="item-list card">{linked.map(item => <ItemRow key={item.id} item={item} now={now} onOpen={() => openItem(item.id)} />)}</ul>
    </section>}
    <ol className="messages">
      {conversation.messages.map((message, index) => message.draft
        ? <DraftView key={message.id} id={message.id} />
        : <MessageView key={message.id} message={message} last={index === conversation.messages.length - 1} />)}
    </ol>
    <div className="reply-row">
      <button type="button" className="outline" disabled={!ready} onClick={() => void respond({ mode: "reply" })}><Icon name="reply" /> Reply</button>
      <button type="button" className="outline" disabled={!ready} onClick={() => void respond({ mode: "replyAll" })}><Icon name="replyAll" /> Reply all</button>
      <button type="button" className="outline" disabled={!ready} onClick={() => void respond({ mode: "forward" })}><Icon name="forward" /> Forward</button>
    </div>
  </>;

  const commands = conversation?.commands ?? [];
  // Before the email loads the toolbar keeps its usual shape; after, it shows only what Gmail offers here.
  const usual: ConversationCommand[] = commands.includes("moveToInbox") ? ["moveToInbox", "trash", "markUnread"] : ["archive", "trash", "markUnread"];
  const primary = conversation ? usual.filter(command => commands.includes(command)) : usual;
  const extra = commands.filter(command => !primary.includes(command));
  const icons: Partial<Record<ConversationCommand, "archive" | "trash" | "unread" | "inbox">> = { archive: "archive", trash: "trash", markUnread: "unread", moveToInbox: "inbox" };

  return <div className="screen-frame">
    <header className="top-bar">
      <IconButton icon="back" label={`Back to ${list.title}`} onClick={back} />
      <span className="spacer" />
      {primary.map(command => <IconButton key={command} icon={icons[command]!} label={COMMAND_LABELS[command]}
        disabled={!ready || busy !== null || !commands.includes(command)} onClick={() => run(command)} />)}
      <IconButton icon="clock" label="Snooze" disabled={!ready || busy !== null} onClick={() => openForm("snooze")} />
      <IconButton icon="more" label="More" disabled={!ready || busy !== null} pressed={menu === "more"} onClick={() => setMenu(menu === "more" ? null : "more")} />
    </header>
    {menu === "more" && <Popover onClose={() => setMenu(null)} className="more-menu">
      {extra.map(command => <button type="button" role="menuitem" key={command} onClick={() => run(command)}>{COMMAND_LABELS[command]}</button>)}
      <button type="button" role="menuitem" onClick={() => { setMenu(null); navigate({ screen: "settings" }); }}>Gmail Only settings</button>
    </Popover>}
    <ProgressBar active={busy !== null || (Boolean(conversation) && page.stale)} label={busy ? COMMAND_LABELS[busy] : "Updating"} />
    <ScrollMemory className={`screen conversation${saw && conversation ? " reveal" : ""}`} aria-busy={!ready}>
      {settings.showAddTo && <div className="add-to">
        <button type="button" className="add-pill" aria-expanded={menu === "add"} disabled={!conversation} onClick={() => setMenu(menu === "add" ? null : "add")}>
          <Icon name="plus" /> Add to… <Icon name={menu === "add" ? "up" : "down"} />
        </button>
        <span className="muted">Save this email as a reminder or to-do</span>
      </div>}
      {menu === "add" && <Popover onClose={() => setMenu(null)} className="add-menu">
        <button type="button" role="menuitem" className="add-option" onClick={() => openForm("reminder")}>
          <span className="tile reminder"><Icon name="bell" /></span>
          <span><strong>Add a reminder</strong><small>Get notified at a set time</small></span>
        </button>
        <button type="button" role="menuitem" className="add-option" onClick={() => openForm("todo")}>
          <span className="tile todo"><Icon name="check2" /></span>
          <span><strong>Add to to-do</strong><small>A task to finish, due date optional</small></span>
        </button>
        <div className="quick-row">
          <span className="section-label">Quick</span>
          {quickPresets(settings.defaultReminderTime, now).map(preset => <button type="button" key={preset.id} className="chip" onClick={() => void quick(preset.date)}>
            <Icon name="clock" size={14} /> {preset.label}
          </button>)}
        </div>
      </Popover>}
      {body}
    </ScrollMemory>
  </div>;
}

const textOf = (runs: TextRun[]) => runs.map(run => run.text).join("").replace(/\s+/g, " ").trim();

/** A reply saved as a draft in this thread. Editing it opens it in the applet's compose screen. */
function DraftView({ id }: { id: string }) {
  const editDraft = useCommand<{ id: string }>("editDraft", CONTEXT);
  const [opening, setOpening] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const open = async () => {
    setOpening(true);
    setFailure(null);
    const result = await editDraft({ id });
    setOpening(false);
    if (result.outcome !== "observed") setFailure(result.message ?? "Couldn't open this draft. Try again.");
  };
  return <li className="message">
    <div className="message-head">
      <span className="tile neutral"><Icon name="draft" /></span>
      <span className="message-who"><strong>Draft</strong><span className="muted">{failure ?? "Not sent yet"}</span></span>
      <button type="button" className="outline" disabled={opening} onClick={() => void open()}><Icon name="pencil" /> {opening ? "Opening…" : "Edit"}</button>
    </div>
  </li>;
}

function MessageView({ message, last }: { message: Message; last: boolean }) {
  const { navigate, viewWebsite } = useRouter();
  const expand = useCommand<{ id: string }>("expandMessage", CONTEXT);
  const [open, setOpen] = useState(last || message.body.length > 0);
  const [opening, setOpening] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const hasBody = message.body.length > 0;
  // Gmail sends a collapsed message without its body, so opening one asks Gmail to expand it.
  const toggle = () => {
    if (hasBody) { setOpen(!open); return; }
    setOpening(true);
    setFailure(null);
    const done = (ok: boolean, message?: string) => {
      setOpening(false);
      if (ok) setOpen(true);
      else setFailure(message ?? "Couldn't open this message. Try again.");
    };
    void expand({ id: message.id }).then(result => done(result.outcome === "observed", result.message), () => done(false));
  };
  return <li className="message">
    <button type="button" className="message-head" aria-expanded={open && hasBody} aria-busy={opening} disabled={opening} onClick={toggle}>
      <Avatar name={message.sender} size={36} />
      <span className="message-who">
        <strong>{message.sender}</strong>
        <span className="muted">{message.recipients}{message.time && message.time !== message.recipients ? ` · ${message.time}` : ""}</span>
      </span>
    </button>
    {open && hasBody ? <div className="message-body" dir="auto">
      {message.body.map((run, index) => run.href
        ? <a key={index} href={run.href} onClick={event => { event.preventDefault(); navigate({ url: run.href! }); }}>{run.text}</a>
        : run.bold ? <strong key={index}>{run.text}</strong> : <span key={index}>{run.text}</span>)}
      {message.truncated && <p className="muted">This message is long. The rest is in Gmail.</p>}
    </div> : <p className="message-snippet">{opening ? "Opening…" : failure ?? message.snippet}</p>}
    {message.attachments.length > 0 && <ul className="attachments">
      {message.attachments.map((file, index) => {
        const card = <>
          <span className="file-tile">{(file.name.split(".").pop() ?? "file").slice(0, 4).toUpperCase()}</span>
          <span><strong>{file.name}</strong><small>{[file.size, file.href ? "Opens in Gmail" : file.download ? "Download in Gmail" : ""].filter(Boolean).join(" · ")}</small></span>
        </>;
        // A viewable file opens Gmail's page that shows it. Any other file is downloaded by tapping it
        // on Gmail's own page, which Genesis reveals; Done returns to this email (decision-0014).
        return <li key={index}>{file.href
          ? <a className="attachment-card" href={file.href} onClick={event => { event.preventDefault(); navigate({ url: file.href! }); }}>{card}</a>
          : file.download
            ? <button type="button" className="attachment-card" onClick={() => viewWebsite()}>{card}</button>
            : <span className="attachment-card">{card}</span>}</li>;
      })}
    </ul>}
  </li>;
}

