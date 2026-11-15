import { useEffect, useState } from "react";
import { ScrollMemory, useCommand, useRouter } from "@genesis/sdk/react";
import { isDueNow, isSnoozed, LISTS, MULTI_ACCOUNT_ENABLED, type MenuEntry } from "../model";
import { useAccounts, useItems, useNow } from "../store";
import { AccountDot, Icon, IconButton, Logo, type IconName } from "../components/ui";
import { ProgressBar, RetryButton, useBusy, useToast } from "../ui/feedback";
import { DrawerSkeleton } from "../ui/skeletons";
import { CONTEXT, reportCount, useMailNav } from "../components/mail";
import { usePageWatch } from "../components/page";

/**
 * The drawer, drawn over Gmail's menu view (`#mn`). Folders with a known path navigate by URL;
 * the person's own labels open through Gmail's menu item, because their paths are Gmail's.
 */
export function DrawerScreen() {
  const menu = usePageWatch<unknown, MenuEntry>("menu");
  const accountRead = usePageWatch<{ email: string | null }>("menuAccount");
  const menuAccount = accountRead.value;
  const open = useCommand<{ arg: string }>("menu.open", CONTEXT);
  const { navigate, back, reload } = useRouter();
  const mail = useMailNav();
  const { current } = useAccounts();
  const { items } = useItems();
  const now = useNow();
  const entries = menu.order.map(key => menu.records[key]).filter((entry): entry is MenuEntry => !!entry);
  const byArg = new Map(entries.map(entry => [entry.arg, entry]));
  const labels = entries.filter(entry => entry.kind === "label");
  const due = items.filter(item => isDueNow(item, now)).length;
  const snoozed = items.filter(item => isSnoozed(item, now)).length;
  const email = current?.email ?? menuAccount?.email ?? "";
  const name = current?.name ?? "";
  const { show } = useToast();
  // A label opens through Gmail's menu; its row spins as long as the busy state lasts.
  const [opening, runOpen] = useBusy();
  const [openingArg, setOpeningArg] = useState<string | null>(null);
  useEffect(() => { if (!opening) setOpeningArg(null); }, [opening]);
  const openLabel = (arg: string) => void runOpen(async () => {
    setOpeningArg(arg);
    try {
      const result = await open({ arg });
      if (result.outcome !== "observed") show({ text: result.message ?? "Couldn't open this label. Try again." });
    } catch {
      show({ text: "Couldn't open this label. Try again." });
    }
  });

  useEffect(() => {
    for (const list of LISTS) {
      const entry = byArg.get(list.arg);
      if (entry) reportCount(list.id, entry.count ?? 0);
    }
  }, [entries, current?.id]);

  const row = (key: string, icon: IconName, label: string, count: number | null, onClick: () => void, tone?: string, busy = false) =>
    <li key={key}><button type="button" className={`drawer-row ${tone ?? ""}`} disabled={opening} aria-busy={busy} onClick={onClick}>
      <Icon name={icon} /><span>{label}</span>{busy ? <span className="spinner" aria-hidden="true" /> : count ? <span className="count">{count}</span> : null}
    </button></li>;

  return <div className="screen-frame drawer">
    <header className="top-bar">
      <Logo />
      <span className="spacer" />
      <IconButton icon="close" label="Close menu" onClick={back} />
    </header>
    <ProgressBar active={opening} label="Opening label" />
    <ScrollMemory className="screen" aria-busy={menu.status !== "ready"}>
      <button type="button" className="account-card" onClick={() => navigate({ screen: "accounts" })}>
        {current && <AccountDot color={current.color} />}
        {name || email ? <span><strong>{name || email}</strong>{name && <small>{email}</small>}</span>
          : accountRead.status === "loading" ? <span className="sk-lines" aria-label="Loading account"><span className="sk sk-line" style={{ width: "50%" }} /><span className="sk sk-line faint" style={{ width: "70%" }} /></span>
          : <span><strong>Accounts</strong></span>}
        <Icon name={MULTI_ACCOUNT_ENABLED ? "down" : "right"} />
      </button>
      <ul className="drawer-list">
        {row("todo", "todo", "To-do & reminders", due, () => navigate({ screen: "todo", mode: "root" }), "accent")}
        {row("snoozed", "clock", "Snoozed", snoozed, () => navigate({ screen: "snoozed" }))}
      </ul>
      <h2 className="section-label">Gmail</h2>
      {/* The folders are known; only their counts come from Gmail, so a failed read still lists them. */}
      {!entries.length && menu.status === "loading" ? <DrawerSkeleton />
        : <ul className="drawer-list">
          {LISTS.map(list => row(list.id, list.icon as IconName, list.title, byArg.get(list.arg)?.count ?? null, () => mail.list(list.path, "replace")))}
        </ul>}
      {labels.length > 0 && <>
        <h2 className="section-label">Labels</h2>
        <ul className="drawer-list">
          {labels.map(label => row(label.arg, "label", label.label, label.count, () => openLabel(label.arg), undefined, opening && openingArg === label.arg))}
        </ul>
      </>}
      {!labels.length && menu.status === "error" && <>
        <h2 className="section-label">Labels</h2>
        <div className="inline-error" role="alert">
          <span>Couldn't load your labels.</span>
          <RetryButton error={menu.error} onRetry={() => reload(CONTEXT)} className="link-button" />
        </div>
      </>}
      <ul className="drawer-list end">
        {row("settings", "settings", "Gmail Only settings", null, () => navigate({ screen: "settings" }))}
      </ul>
    </ScrollMemory>
  </div>;
}
