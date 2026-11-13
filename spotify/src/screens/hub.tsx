import { ScrollMemory } from "@genesis/sdk/react";
import type { Section } from "../model";
import { Shelf } from "../components/shelf";
import { BackButton, LoadError, Notice, Skeleton } from "../components/ui";
import { delivered, onScreen, usePageStatus, useScreenWatch } from "../screen";

const SECTIONS = "hub:sections";

/** A category hub from Browse all, such as Pop or Podcasts: its name and rows of tiles. */
export function HubScreen() {
  const page = usePageStatus("primary");
  const sections = useScreenWatch<unknown, Section | null>("hub", "sections");
  const heading = useScreenWatch<string | null>("hub", "heading").value;
  const here = onScreen(page, "hub");
  const keys = here ? sections.order : [];

  let body;
  if (keys.length > 0) body = keys.map(key => <Shelf key={key} watch={SECTIONS} id={key} />);
  else if (page.status === "error" || sections.status === "error") body = <LoadError error={page.error ?? sections.error} />;
  else if (page.status === "ready" && delivered(sections)) body = <Notice title="Nothing here yet"><p>Spotify shows nothing in this category right now.</p></Notice>;
  else body = <Skeleton label="Loading" />;

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <BackButton />
    <h1 className="screen-title">{(here && heading) || "Browse"}</h1>
    {body}
  </ScrollMemory>;
}
