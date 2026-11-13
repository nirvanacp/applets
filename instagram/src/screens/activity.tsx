import { ScrollMemory, useCommand, usePending } from "@genesis/sdk/react";
import type { ActivityRow } from "../model";
import { invoked } from "../components/post";
import { Avatar, InlineError, LoadError, Notice, RichText, Skeleton, TopBar, useOpenUrl } from "../components/ui";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

/** Notifications, grouped under Instagram's own period headings. */
export function ActivityScreen() {
  const page = usePageStatus();
  const rows = useScreenWatch<unknown, ActivityRow | null>("activity", "activity");
  const here = onScreen(page, "activity");
  const shown = here ? rows.order.map(key => rows.records[key]).filter((row): row is ActivityRow => !!row) : [];

  let body;
  if (shown.length === 0) {
    if (page.status === "ready" && here && delivered(rows)) body = <Notice title="No notifications"><p>Likes, comments and follows show up here.</p></Notice>;
    else body = page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading notifications" />;
  } else body = <ul className="rows">
    {shown.map((row, index) => <li key={row.id}>
      {row.period && row.period !== shown[index - 1]?.period && <h2 className="period">{row.period}</h2>}
      <Activity row={row} />
    </li>)}
  </ul>;

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <TopBar title="Notifications" />
    {page.status === "error" && shown.length > 0 && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
    {body}
  </ScrollMemory>;
}

function Activity({ row }: { row: ActivityRow }) {
  const open = useOpenUrl();
  return <div className="row" onClick={() => row.url && open(row.url)}>
    <Avatar src={row.avatar} size={44} name={row.user} />
    <RichText parts={row.time ? [...row.parts, { text: ` ${row.time}` }] : row.parts} className="rich row-text" />
    {row.user && row.button && <FollowButton user={row.user} label={row.button} />}
    {!row.button && row.thumb && <img className="thumb" src={row.thumb} alt="" referrerPolicy="no-referrer" />}
  </div>;
}

type FollowArgs = { user: string; following: boolean };

/** A row's Follow button. The page module clicks Instagram's own button on the row. */
export function FollowButton({ user, label }: { user: string; label: string }) {
  const follow = useCommand<FollowArgs>("followPerson");
  const pending = usePending().map(input => invoked<FollowArgs>(input, "followPerson")).find(args => args?.user === user);
  const following = /^(Following|Requested)$/.test(label);
  const shown = pending ? pending.following : following;
  if (label === "Message" || label === "Remove") return null;
  return <button type="button" className={shown ? "small secondary" : "small primary"} disabled={pending !== undefined}
    onClick={event => { event.stopPropagation(); void follow({ user, following: !shown }); }}>
    {pending ? (shown ? "Following" : "Follow") : label}
  </button>;
}
