import { useEffect, useState } from "react";
import { ScrollMemory, useRouter } from "@genesis/sdk/react";
import { profileUrl, type PersonRow } from "../model";
import { Avatar, LoadError, ModeTabs, Notice, Skeleton, TopBar, useOpenUrl, Verified } from "../components/ui";
import { FollowButton } from "./activity";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

/** Followers and following of a profile. */
export function FollowsScreen() {
  const { navigate } = useRouter();
  const page = usePageStatus();
  const people = useScreenWatch<unknown, PersonRow | null>("follows", "people");
  const here = onScreen(page, "follows");
  const user = page.params.user ?? "";
  const which = page.routeId === "following" ? "following" : "followers";
  // The website takes a while to switch lists, so the tab moves at once and the old list hides.
  const [asked, setAsked] = useState<string | null>(null);
  useEffect(() => setAsked(null), [which, user]);
  const switching = asked !== null && asked !== which;
  const shown = here && !switching ? people.order : [];
  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <TopBar title={user} />
    <ModeTabs label="Connections" active={asked ?? which} options={["followers", "following"].map(id => ({
      id, label: id === "followers" ? "Followers" : "Following", go: () => {
        setAsked(id);
        navigate({ url: `${profileUrl(user)}${id}/`, mode: "replace" });
      },
    }))} />
    {shown.length === 0
      ? !switching && page.status === "ready" && here && delivered(people) ? <Notice title={which === "followers" ? "No followers yet" : "Not following anyone yet"} />
        : page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label={`Loading ${asked ?? which}`} />
      : <PeopleList people={shown.map(key => people.records[key]).filter((row): row is PersonRow => !!row && row.user !== user)} />}
  </ScrollMemory>;
}

export function PeopleList({ people }: { people: PersonRow[] }) {
  const open = useOpenUrl();
  return <ul className="rows">
    {people.map(person => <li key={person.user} className="row" onClick={() => open(profileUrl(person.user))}>
      <Avatar src={person.avatar} size={44} name={person.user} />
      <div className="row-text">
        <p className="username">{person.user}{person.verified && <Verified />}</p>
        {person.name && <p className="muted">{person.name}</p>}
      </div>
      {person.button && <FollowButton user={person.user} label={person.button} />}
    </li>)}
  </ul>;
}
