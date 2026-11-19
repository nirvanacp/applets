import { useState } from "react";
import { useRouter, useWatch } from "@nirvanacp/sdk/react";
import { failureText, useDiscordCommand, useDrawer, useShowOnWebsite } from "../components/commands";
import { ChoiceSheet } from "../components/sheet";
import { Avatar, Icon } from "../components/ui";
import type { Me, Presence } from "../model";
import { useToast } from "../ui/feedback";
import { PageScroller, TopBar } from "../ui/frame";
import { RowsSkeleton } from "../ui/skeletons";
import { LoadError, SignInNotice, WebsiteCue } from "../ui/states";
import { refreshing, usePageStatus } from "../screen";

export const PRESENCE_LABEL: Record<Presence, string> = {
  online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible",
};

export const PresenceDot = ({ presence }: { presence: Presence | null }) =>
  <span className={`presence ${presence ?? "unknown"}`} aria-hidden="true" />;

/** You: the signed-in account from Discord's user area, with its profile, status and settings. */
export function YouScreen() {
  const page = usePageStatus("primary");
  const loaded = page.status === "ready" || page.status === "error";
  const drawer = useDrawer(loaded);
  const me = useWatch<Me | null>("you:me", { reader: "me" }, { context: "primary" });
  const setStatus = useDiscordCommand<{ status: Presence }>("setStatus");
  const openSettings = useDiscordCommand("openSettings");
  const showOnWebsite = useShowOnWebsite();
  const { navigate } = useRouter();
  const { show } = useToast();
  const [sheet, setSheet] = useState(false);
  const [asked, setAsked] = useState<Presence | null>(null);
  const [opening, setOpening] = useState(false);
  const account = drawer.open ? me.value : null;
  const presence = asked ?? account?.presence ?? null;

  async function choose(status: Presence) {
    setAsked(status);
    const result = await setStatus({ status });
    setAsked(null);
    const failed = failureText(result, "Discord didn't confirm your status.");
    if (failed) show({ text: failed });
  }

  async function settings() {
    if (opening) return;
    setOpening(true);
    await showOnWebsite(openSettings, "Couldn't open Discord's settings.");
    setOpening(false);
  }

  const body = page.status === "auth" ? <SignInNotice />
    : !account && (drawer.failed || me.status === "error")
      ? <LoadError error={me.error ?? { code: "FAILED", message: drawer.failed ?? "Discord's account area could not be read." } as never} title="Couldn't load your account" />
    : !account ? <RowsSkeleton label="Loading your account" rows={4} />
    : <>
      <div className="me">
        <span className="me-avatar">
          <Avatar src={account.avatar} name={account.name} className="row-avatar" />
          <PresenceDot presence={presence} />
        </span>
        <span className="row-text">
          <strong>{account.name}</strong>
          {account.username && <span>{account.username}</span>}
        </span>
      </div>
      <ul className="rows">
        <li><button type="button" className="row" onClick={() => navigate({ screen: "profile" })}>
          <span className="row-icon" aria-hidden="true"><Icon name="edit" /></span>
          <span className="row-text"><strong>Edit profile</strong><span>Picture, display name, pronouns and bio</span></span>
          <Icon name="chevron" className="row-chevron" />
        </button></li>
        <li><button type="button" className="row" aria-busy={asked !== null} onClick={() => setSheet(true)}>
          <span className="row-icon" aria-hidden="true"><PresenceDot presence={presence} /></span>
          <span className="row-text"><strong>Status</strong>
            <span>{account.custom ?? (presence ? PRESENCE_LABEL[presence] : "Set your status")}</span></span>
          <Icon name="chevron" className="row-chevron" />
        </button></li>
        <li><button type="button" className="row" aria-busy={opening} onClick={() => void settings()}>
          <span className="row-icon" aria-hidden="true"><Icon name="settings" className={opening ? "pulsing" : undefined} /></span>
          <span className="row-text"><strong>Settings</strong><span>{opening ? "Opening Discord's settings…" : "Account, privacy, notifications and more"}</span></span>
          <WebsiteCue />
        </button></li>
      </ul>
    </>;

  return <>
    <TopBar title="You" />
    <PageScroller busy={refreshing(page)} pull={false} className="list-screen">{body}</PageScroller>
    {sheet && <ChoiceSheet title="Set your status" onClose={() => setSheet(false)}
      choices={(Object.keys(PRESENCE_LABEL) as Presence[]).map(status => ({
        label: PRESENCE_LABEL[status], mark: <PresenceDot presence={status} />, current: status === presence,
        run: () => void choose(status),
      }))} />}
  </>;
}
