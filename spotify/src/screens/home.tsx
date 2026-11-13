import { ScrollMemory } from "@genesis/sdk/react";
import type { Section } from "../model";
import { Shelf } from "../components/shelf";
import { LoadError, Notice, Skeleton } from "../components/ui";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

const SECTIONS = "home:sections";

/** Home: the greeting and Spotify's rows of recommendations, as horizontal shelves. */
export function HomeScreen() {
  const page = usePageStatus("primary");
  const sections = useScreenWatch<unknown, Section | null>("home", "sections");
  const heading = useScreenWatch<string | null>("home", "heading").value;
  const keys = onScreen(page, "home") ? sections.order : [];

  let body;
  if (keys.length > 0) body = <>
    {(page.status === "error" || sections.status === "error") && <p className="inline-error" role="alert">Couldn't refresh. Showing the last copy.</p>}
    {keys.map(key => <Shelf key={key} watch={SECTIONS} id={key} />)}
  </>;
  else if (page.status === "error" || sections.status === "error") body = <LoadError error={page.error ?? sections.error} />;
  else if (page.status === "ready" && delivered(sections)) body = <Notice title="Nothing to show yet"><p>Spotify has no recommendations here right now.</p></Notice>;
  else body = <Skeleton label="Loading Home" />;

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <h1 className="screen-title">{heading ?? "Home"}</h1>
    {body}
  </ScrollMemory>;
}
