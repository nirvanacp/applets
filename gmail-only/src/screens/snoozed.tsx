import { ScrollMemory } from "@let/sdk/react";
import { byDue, dateKey, isSnoozed, timeKey, whenLabel, type Item } from "../model";
import { useItems, useNow } from "../store";
import { useToast } from "../ui/feedback";
import { Avatar, Icon, IconButton, TopBar } from "../components/ui";
import { Notice } from "../ui/states";
import { SimpleListSkeleton } from "../ui/skeletons";
import { firstSender, useMailNav } from "../components/mail";

/** Emails snoozed in Gmail Only, with when each comes back. A due snooze moves to "Back in your inbox". */
export function SnoozedScreen() {
  const { items, loading, error, save, complete } = useItems();
  const { show } = useToast();
  const nav = useMailNav();
  const now = useNow();
  const snoozed = items.filter(item => isSnoozed(item, now)).sort(byDue);

  const backNow = async (item: Item) => {
    try { await save({ ...item, dueDate: dateKey(now), dueTime: timeKey(now), returned: false }); } catch { show({ text: "Couldn't bring it back. Try again." }); return; }
    show({ text: "Back in your inbox", undo: () => save(item) });
  };
  const cancel = async (item: Item) => {
    try { await complete(item, true); } catch { show({ text: "Couldn't remove the snooze. Try again." }); return; }
    show({ text: "Snooze removed. The email stays in All mail.", undo: () => save(item) });
  };

  return <div className="screen-frame">
    <TopBar title="Snoozed" />
    <ScrollMemory className="screen">
      {!snoozed.length && loading ? <SimpleListSkeleton label="Loading snoozed emails" />
        : !snoozed.length && error ? <Notice title="Couldn't load your snoozed emails" role="alert" icon="alert"><p>Try closing and reopening Gmail Only.</p></Notice>
        : !snoozed.length ? <Notice title="Nothing snoozed" icon="clock"><p>Snooze an email from its toolbar to hide it until later.</p></Notice>
        : <ul className="plain-list card">
          {snoozed.map(item => <li key={item.id} className="snooze-row">
            <button type="button" className="list-button" onClick={() => item.link?.threadId && nav.email(item.link.threadId, item.accountId)}>
              <Avatar name={item.link?.sender ?? item.title} size={36} />
              <span>
                <strong>{item.link?.subject ?? item.title}</strong>
                <small><span className="sender">{firstSender(item.link?.sender ?? "")}</span> · <Icon name="clock" size={12} /> <span>{whenLabel(item, now)}</span></small>
              </span>
            </button>
            <IconButton icon="inbox" label="Bring back now" onClick={() => void backNow(item)} />
            <IconButton icon="close" label="Remove snooze" onClick={() => void cancel(item)} />
          </li>)}
        </ul>}
    </ScrollMemory>
  </div>;
}
