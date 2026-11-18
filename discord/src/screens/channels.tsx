import { useState } from "react";
import { useRecord, useRouter, useWatch } from "@let/sdk/react";
import { useDiscordCommand, useDrawer, useShowOnWebsite } from "../components/commands";
import { ChoiceSheet } from "../components/sheet";
import { Badge, Icon, type IconName } from "../components/ui";
import type { Channel, Place } from "../model";
import { PageScroller, TopBar, useOpenUrl } from "../ui/frame";
import { rememberTitle } from "../titles";
import { ChannelsSkeleton } from "../ui/skeletons";
import { InlineError, LoadError, SignInNotice, useSawLoading, WebsiteCue } from "../ui/states";
import { delivered, failedRead, refreshing, usePageStatus } from "../screen";

const WATCH = "channels:channels";

export const ICON_OF: Record<Channel["kind"], IconName> = {
  text: "hash", voice: "voice", stage: "voice", announcement: "announce", forum: "forum", thread: "thread", other: "hash", category: "hash",
};

/** Channels open in the applet; voice, stage and forum channels open on the website. */
export const opensHere = (channel: Channel) =>
  channel.url !== null && (channel.kind === "text" || channel.kind === "announcement");

/** A server's channel list, over the chat it was opened from. */
export function ChannelsScreen() {
  const page = usePageStatus("primary");
  const onGuild = page.routeId === "channel" || page.routeId === "guild";
  const loaded = onGuild && (page.status === "ready" || page.status === "error");
  const drawer = useDrawer(loaded);
  const place = useWatch<Place | null>("channels:place", { reader: "place" }, { context: "primary" });
  const list = useWatch<unknown, Channel>(WATCH, { reader: "channels" }, { context: "primary" });
  const keys = drawer.open ? list.order.filter(key => !key.startsWith("upcoming-events")) : [];
  const busy = refreshing(page);
  const fadeIn = useSawLoading(keys.length === 0);
  const failed = failedRead(list) || drawer.failed !== null;
  const title = place.value?.guild ?? "Channels";

  const body = page.status === "auth" ? <SignInNotice />
    : keys.length === 0 && failed ? <LoadError error={list.error ?? { code: "FAILED", message: drawer.failed ?? "Discord's channel list could not be read." } as never} title="Couldn't load the channels" />
    : keys.length === 0 && drawer.open && delivered(list) ? <p className="note">This server has no channels you can see.</p>
    : keys.length === 0 ? <ChannelsSkeleton />
    : <div className={fadeIn ? "reveal" : undefined}>
      {list.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
      <ul className="channels">{keys.map(key => <ChannelRow key={key} id={key} guild={place.value?.guild ?? null} />)}</ul>
    </div>;

  return <div className="channels-screen">
    <TopBar title={title} back actions={onGuild && page.status !== "auth" && <ServerMenu guild={place.value?.guild ?? "Server"} />} />
    <PageScroller busy={busy} pull={false} className="list-screen">{body}</PageScroller>
  </div>;
}

/** The server's menu: your server profile and the server's name and icon here, the rest on Discord. */
function ServerMenu({ guild }: { guild: string }) {
  const { navigate } = useRouter();
  const openItem = useDiscordCommand<{ item: string }>("openServerItem");
  const showOnWebsite = useShowOnWebsite();
  const [open, setOpen] = useState(false);
  const website = (item: string, failed: string) => () => void showOnWebsite(() => openItem({ item }), failed);
  return <>
    <button type="button" className="icon-button" aria-label="Server options" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Icon name="more" filled />
    </button>
    {open && <ChoiceSheet title={guild} onClose={() => setOpen(false)} choices={[
      { label: "Edit server profile", icon: "person", run: () => navigate({ screen: "nickname" }) },
      { label: "Edit server", icon: "edit", run: () => navigate({ screen: "server" }) },
      { label: "Invite people", icon: "invite", website: true, run: website("invite-people", "Discord didn't offer invites here.") },
      { label: "Notification settings", icon: "bell", website: true, run: website("notifications", "Couldn't open notification settings.") },
      { label: "Server settings", icon: "settings", website: true, run: website("settings", "You can't open this server's settings.") },
    ]} />}
  </>;
}

function ChannelRow({ id, guild }: { id: string; guild: string | null }) {
  const channel = useRecord<Channel>(WATCH, id, "primary");
  const open = useOpenUrl();
  const { back, viewWebsite } = useRouter();
  if (!channel) return null;
  if (channel.kind === "category") return <li className="category"><h2>{channel.name}</h2></li>;

  const here = opensHere(channel);
  const state = channel.mentions ? `${channel.mentions} mentions` : channel.unread ? "unread" : "";
  const kind = channel.kind === "other" ? "" : `${channel.kind} channel`;
  const choose = () => {
    if (here && channel.selected) return back();
    if (here) {
      rememberTitle(channel.url!, { main: `#${channel.name}`, sub: guild });
      return open(channel.url!);
    }
    // Joining voice, a stage or a forum's posts happens on Discord's own page.
    back();
    viewWebsite("primary");
  };
  return <li>
    <button type="button" className={`channel${channel.unread ? " unread" : ""}${channel.selected ? " selected" : ""}`}
      aria-current={channel.selected ? "page" : undefined}
      aria-label={[channel.name, kind, state, here ? "" : "opens website"].filter(Boolean).join(", ")} onClick={choose}>
      <Icon name={ICON_OF[channel.kind]} className="channel-icon" />
      <span className="channel-name">{channel.name}</span>
      <Badge count={channel.mentions} label={`${channel.mentions} mentions`} />
      {!here && <WebsiteCue />}
    </button>
  </li>;
}
