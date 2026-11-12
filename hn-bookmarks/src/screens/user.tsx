import { ScrollMemory } from "@genesis/sdk/react";
import { ORIGIN, type UserData } from "../model";
import { LoadError, Notice, RichText, Skeleton, useOpenUrl } from "../components/ui";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

/** A profile (`/user?id=`). Its lists open as feeds. */
export function UserScreen() {
  const page = usePageStatus();
  const watch = useScreenWatch<UserData>("user", "profile");
  const record = watch.value;
  const open = useOpenUrl();
  const here = onScreen(page, "user");
  const data = here ? record : null;
  if (!data) return <div className="screen" aria-busy={page.status === "loading"}>
    {page.status === "error" || (here && watch.status === "error")
      ? <LoadError error={page.error ?? watch.error} />
      : page.status === "ready" && here && delivered(watch)
        ? <Notice title="No such user"><p>Hacker News has no profile with this name.</p></Notice>
        : <Skeleton label="Loading profile" rows={4} kind="text" />}
  </div>;
  const id = encodeURIComponent(data.name);
  return <ScrollMemory className="screen" aria-busy={page.stale}>
    {page.status === "error" && <p className="inline-error" role="alert">Couldn't refresh. Showing the last copy.</p>}
    <h1 className="screen-title">{data.name}</h1>
    <dl className="facts">
      {data.karma && <><dt>Karma</dt><dd>{data.karma}</dd></>}
      {data.created && <><dt>Joined</dt><dd>{data.created}</dd></>}
    </dl>
    {data.about.length > 0 && <section className="card"><h2 className="section-title">About</h2><RichText parts={data.about} /></section>}
    <nav className="list" aria-label={`${data.name} on Hacker News`}>
      <button type="button" onClick={() => open(`${ORIGIN}/submitted?id=${id}`)}>Submissions</button>
      <button type="button" onClick={() => open(`${ORIGIN}/threads?id=${id}`)}>Comments</button>
      <button type="button" onClick={() => open(`${ORIGIN}/favorites?id=${id}`)}>Favorites</button>
    </nav>
  </ScrollMemory>;
}
