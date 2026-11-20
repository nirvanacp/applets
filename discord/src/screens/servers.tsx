import { useCallback } from "react";
import { useRecord, useRouter, useWatch, VirtualList } from "@nirvanacp/sdk/react";
import { ORIGIN, useDrawer } from "../components/commands";
import { Avatar, Badge, Icon } from "../components/ui";
import type { Guild } from "../model";
import { PageScroller, RefreshButton, TopBar, useOpenUrl } from "../ui/frame";
import { rememberTitle } from "../titles";
import { RowsSkeleton } from "../ui/skeletons";
import { EmptyNotice, InlineError, LoadError, SignInNotice, useSawLoading, WebsiteCue } from "../ui/states";
import { delivered, failedRead, refreshing, usePageStatus } from "../screen";

const WATCH = "servers:guilds";

/** Past this many servers, the list draws only the rows near the screen. */
const LONG_LIST = 50;
/** A server row's height: a 44 px icon and 8 px padding above and below. */
const ROW_HEIGHT = 60;

/** Servers: the server rail as a list, opened at the root of the overlay from its tab. */
export function ServersScreen() {
  const page = usePageStatus("primary");
  const loaded = page.status === "ready" || page.status === "error";
  const drawer = useDrawer(loaded);
  const list = useWatch<unknown, Guild>(WATCH, { reader: "guilds" }, { context: "primary" });
  // The rail also holds Home, Add a Server, Discover and the app download; servers have numeric ids.
  const keys = drawer.open ? list.order.filter(key => /^\d+$/.test(key)) : [];
  const busy = refreshing(page);
  const fadeIn = useSawLoading(keys.length === 0);
  const { viewWebsite } = useRouter();
  const failed = failedRead(list) || drawer.failed !== null;

  const body = page.status === "auth" ? <SignInNotice />
    : keys.length === 0 && failed ? <LoadError error={list.error ?? { code: "FAILED", message: drawer.failed ?? "Discord's server list could not be read." } as never} title="Couldn't load your servers" />
    : keys.length === 0 && drawer.open && delivered(list) ? <EmptyNotice title="No servers yet"><p>Servers you join on Discord appear here.</p></EmptyNotice>
    : keys.length === 0 ? <RowsSkeleton label="Loading servers" square />
    : <div className={fadeIn ? "reveal" : undefined}>
      {list.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
      {keys.length > LONG_LIST ? <ServerList keys={keys} /> : <ul className="rows">{keys.map(key => <GuildRow key={key} id={key} />)}</ul>}
    </div>;

  return <>
    <TopBar title="Servers" actions={page.status !== "auth" && <RefreshButton busy={busy} />} />
    <PageScroller busy={busy} className="list-screen">
      {body}
      {page.status !== "auth" && <button type="button" className="row" onClick={() => viewWebsite("primary")}>
        <span className="row-icon" aria-hidden="true"><Icon name="servers" /></span>
        <span className="row-text"><strong>Add or discover servers</strong><span>Create, join or browse on Discord</span></span>
        <WebsiteCue />
      </button>}
    </PageScroller>
  </>;
}

/** A long server list, drawn through a virtual list; every row has the same height. */
function ServerList({ keys }: { keys: readonly string[] }) {
  const renderItem = useCallback((key: string) => <GuildRow id={key} as="div" />, []);
  return <div role="list" aria-label="Servers"><VirtualList className="rows" keys={keys} estimateHeight={ROW_HEIGHT} renderItem={renderItem} /></div>;
}

function GuildRow({ id, as = "li" }: { id: string; as?: "li" | "div" }) {
  const guild = useRecord<Guild>(WATCH, id, "primary");
  const open = useOpenUrl();
  if (!guild) return null;
  const state = guild.mentions ? `${guild.mentions} mentions` : guild.unread ? "unread" : "";
  const Item = as;
  return <Item role={as === "div" ? "listitem" : undefined}>
    <button type="button" className={`row guild${guild.unread ? " unread" : ""}`} aria-label={[guild.name, state].filter(Boolean).join(", ")}
      onClick={() => { rememberTitle(`/channels/${id}`, { main: guild.name }); open(`${ORIGIN}/channels/${id}`); }}>
      <Avatar src={guild.icon} name={guild.name} initials={guild.initials} square className="row-avatar" />
      <span className="row-text"><strong>{guild.name}</strong></span>
      <Badge count={guild.mentions} label={`${guild.mentions} mentions`} />
      <Icon name="chevron" className="row-chevron" />
    </button>
  </Item>;
}
