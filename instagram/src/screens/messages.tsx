import { useEffect, useRef, useState } from "react";
import { ScrollMemory, useCommand, usePending, useRouter } from "@genesis/sdk/react";
import { ORIGIN, profileUrl, type MessageView, type ThreadHeader, type ThreadRow } from "../model";
import { invoked, invoking } from "../components/post";
import { Avatar, Icon, InlineError, LoadError, Notice, Skeleton, TopBar, useOpenUrl, Verified } from "../components/ui";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

/** The inbox. A new chat starts on Instagram's page; requests stay there too. */
export function InboxScreen() {
  const { navigate, viewWebsite } = useRouter();
  const page = usePageStatus();
  const threads = useScreenWatch<unknown, ThreadRow | null>("inbox", "threads");
  const open = useCommand<{ key: string }>("openThread");
  const opening = usePending().map(input => invoked<{ key: string }>(input, "openThread")?.key).find(Boolean);
  const here = onScreen(page, "inbox");
  const rows = here ? threads.order.flatMap(key => threads.records[key] ? [{ key, row: threads.records[key]! }] : []) : [];
  const website = (path: string) => { navigate({ url: `${ORIGIN}${path}` }); viewWebsite(); };

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <header className="home-bar">
      <span className="icon-button" />
      <h1>Messages</h1>
      <button type="button" className="icon-button" aria-label="New message on Instagram" onClick={() => website("/direct/new/")}><Icon name="plus" /></button>
    </header>
    <div className="section-head"><h2>Chats</h2><button type="button" className="link" onClick={() => website("/direct/requests/")}>Requests</button></div>
    {rows.length === 0
      ? page.status === "ready" && here && delivered(threads) ? <Notice title="No messages yet"><p>Message someone from their profile.</p></Notice>
        : page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading messages" />
      : <ul className="rows">
        {rows.map(({ key, row }) => <li key={key}>
          <button type="button" className="row" disabled={opening !== undefined} onClick={() => void open({ key })}>
            <Avatar src={row.avatar} size={56} name={row.title} />
            <span className="row-text">
              <span className="username">{row.title}{row.verified && <Verified />}</span>
              <span className="muted">{row.preview}{row.time && ` · ${row.time}`}</span>
            </span>
          </button>
        </li>)}
      </ul>}
  </ScrollMemory>;
}

/** A chat: its messages, and a box that sends through Instagram's own message box. */
export function ThreadScreen() {
  const page = usePageStatus();
  const header = useScreenWatch<ThreadHeader | null>("thread", "thread").value;
  const messages = useScreenWatch<unknown, MessageView | null>("thread", "messages");
  const openUrl = useOpenUrl();
  const here = onScreen(page, "thread");
  const rows = here ? messages.order.map(key => messages.records[key]).filter((row): row is MessageView => !!row) : [];
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [rows.length]);

  return <div className="screen-with-composer">
    <ScrollMemory className="screen chat" aria-busy={page.stale || page.status === "loading"}>
      <TopBar title={header ? <button type="button" className="chat-title" disabled={!header.user} onClick={() => header.user && openUrl(profileUrl(header.user))}>
        <Avatar src={header.avatar} size={28} name={header.title} />{header.title}
      </button> : "Chat"} />
      {rows.length === 0
        ? page.status === "error" ? <LoadError error={page.error} />
          : here && delivered(messages) && page.status === "ready" ? <Notice title="Say hi" /> : <Skeleton label="Loading chat" />
        : <ol className="messages">
          {rows.map(message => <li key={message.id} className={message.mine ? "bubble mine" : "bubble"}>
            {message.image && <img src={message.image} alt="" referrerPolicy="no-referrer" />}
            {message.text && <p dir="auto">{message.text}</p>}
          </li>)}
        </ol>}
      <div ref={end} />
    </ScrollMemory>
    {here && <Composer disabled={page.stale || page.status !== "ready"} />}
  </div>;
}

function Composer({ disabled }: { disabled: boolean }) {
  const [text, setText] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const send = useCommand<{ text: string }>("sendMessage");
  const sending = usePending().some(input => invoking(input, "sendMessage"));
  const submit = () => {
    const value = text.trim();
    if (!value) return;
    setFailed(null);
    void send({ text: value }).then(result => {
      if (result.outcome === "observed") setText("");
      else setFailed(result.outcome === "failed" ? result.message ?? "Instagram didn't send the message." : "Instagram hasn't shown the message yet.");
    });
  };
  return <form className="composer" onSubmit={event => { event.preventDefault(); submit(); }}>
    {failed && <InlineError>{failed}</InlineError>}
    <div className="composer-row">
      <input aria-label="Message" placeholder="Message…" value={text} maxLength={1000} onChange={event => setText(event.target.value)} disabled={sending} />
      <button type="submit" className="link primary-text" disabled={disabled || sending || !text.trim()}>{sending ? "Sending…" : "Send"}</button>
    </div>
  </form>;
}
