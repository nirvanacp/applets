import { ORIGIN, type UserData } from "../model";
import { InlineError } from "../components/states";
import { RichText } from "../components/ui";
import { PageScroller, RefreshButton, ScreenHead, useOpenUrl } from "../ui/frame";
import { Icon } from "../ui/icons";
import { ProfileSkeleton } from "../ui/skeletons";
import { LoadError, Notice, useSawLoading } from "../ui/states";
import { delivered, onScreen, refreshing, usePageStatus, useScreenWatch } from "../screen";

/** A profile (`/user?id=`). Its lists open as feeds. */
export function UserScreen() {
  const page = usePageStatus();
  const watch = useScreenWatch<UserData>("user", "profile");
  const open = useOpenUrl();
  const here = onScreen(page, "user");
  const data = here ? watch.value : null;
  const busy = refreshing(page);
  const failed = page.status === "error" || (here && watch.status === "error");
  // "No such user" only once the profile reader has read this page and found nothing.
  const missing = !data && !failed && page.status === "ready" && !page.stale && here && delivered(watch);
  const fadeIn = useSawLoading(!data && !failed && !missing);
  const name = data?.name ?? page.params.id ?? "Profile";

  return <>
    <ScreenHead eyebrow="Profile" title={name} actions={<RefreshButton busy={busy} />} />
    {!data ? (failed ? <LoadError error={page.error ?? watch.error} site="Hacker News" />
      : missing ? <div className="screen"><Notice title="No such user"><p>Hacker News has no profile with this name.</p></Notice></div>
      : <ProfileSkeleton />)
      : <PageScroller busy={busy}>
        <div className={fadeIn ? "reveal" : undefined}>
          {page.status === "error" && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
          <dl className="facts">
            {data.karma && <div><dt>Karma</dt><dd>{data.karma}</dd></div>}
            {data.created && <div><dt>Joined</dt><dd>{data.created}</dd></div>}
          </dl>
          {data.about.length > 0 && <section className="card"><h2 className="section-title">About</h2><RichText parts={data.about} /></section>}
          <nav className="list" aria-label={`${data.name} on Hacker News`}>
            {[["Submissions", "submitted"], ["Comments", "threads"], ["Favorites", "favorites"]].map(([label, path]) =>
              <button type="button" key={path} onClick={() => open(`${ORIGIN}/${path}?id=${encodeURIComponent(data.name)}`)}>
                <span>{label}</span><Icon name="chevron" />
              </button>)}
          </nav>
        </div>
      </PageScroller>}
  </>;
}
