import { useRecord, useRouter } from "@let/sdk/react";
import { useDrawer } from "../components/commands";
import { Avatar, Badge, Icon } from "../components/ui";
import type { Conversation } from "../model";
import { PageScroller, RefreshButton, TopBar, useOpenUrl } from "../ui/frame";
import { rememberTitle } from "../titles";
import { RowsSkeleton } from "../ui/skeletons";
import { EmptyNotice, InlineError, LoadError, SignInNotice, useSawLoading, WebsiteCue } from "../ui/states";
import { delivered, failedRead, onScreen, refreshing, usePageStatus, useScreenWatch, viewOf } from "../screen";

const WATCH = "messages:conversations";

/** Messages: the direct and group conversations, newest first as Discord lists them. */
export function MessagesScreen() {
  const page = usePageStatus("primary");
  const here = onScreen(page, "messages");
  const loaded = here && page.status === "ready";
  const drawer = useDrawer(loaded);
  const list = useScreenWatch<unknown, Conversation>("messages", "conversations");
  const keys = here && drawer.open ? list.order : [];
  const failed = failedRead(list) || drawer.failed !== null;
  const view = viewOf(page, keys.length > 0, here && drawer.open && delivered(list), failed);
  const fadeIn = useSawLoading(view === "loading");
  const busy = refreshing(page);
  const { viewWebsite } = useRouter();

  return <>
    <TopBar title="Messages" actions={view !== "auth" && <RefreshButton busy={busy} />} />
    <PageScroller busy={busy} className="list-screen">
      {view === "auth" ? <SignInNotice />
        : view === "error" ? <LoadError error={page.error ?? list.error ?? (drawer.failed ? { code: "FAILED", message: drawer.failed } as never : null)} title="Couldn't load your messages" />
        : view === "loading" ? <RowsSkeleton label="Loading messages" />
        : <div className={fadeIn ? "reveal" : undefined}>
          <button type="button" className="row" onClick={() => viewWebsite("primary")}>
            <span className="row-icon" aria-hidden="true"><Icon name="person" /></span>
            <span className="row-text"><strong>Friends</strong><span>Requests, online friends and add friend</span></span>
            <WebsiteCue />
          </button>
          {list.status === "error" && keys.length > 0 && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          <h2 className="caption">Direct messages</h2>
          {view === "empty"
            ? <EmptyNotice title="No messages yet"><p>Conversations you start on Discord appear here.</p></EmptyNotice>
            : <ul className="rows">{keys.map(key => <ConversationRow key={key} id={key} />)}</ul>}
        </div>}
    </PageScroller>
  </>;
}

function ConversationRow({ id }: { id: string }) {
  const item = useRecord<Conversation>(WATCH, id, "primary");
  const open = useOpenUrl();
  if (!item) return null;
  const state = [item.unread ? "unread" : "", item.mentions ? `${item.mentions} new` : ""].filter(Boolean).join(", ");
  return <li>
    <button type="button" className={`row conversation${item.unread ? " unread" : ""}`} onClick={() => { rememberTitle(item.url, { main: item.name }); open(item.url); }}
      aria-label={[item.name, item.group ? "group" : "", item.detail ?? "", state].filter(Boolean).join(", ")}>
      <Avatar src={item.avatar} name={item.name} className="row-avatar" />
      <span className="row-text">
        <strong>{item.name}</strong>
        {item.detail && <span>{item.detail}</span>}
      </span>
      <Badge count={item.mentions} label={`${item.mentions} mentions`} />
    </button>
  </li>;
}
