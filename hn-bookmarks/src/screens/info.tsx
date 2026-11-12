import { ScrollMemory } from "@genesis/sdk/react";
import type { InfoData } from "../model";
import { LoadError, RichText, Skeleton } from "../components/ui";
import { onScreen, usePageStatus, useScreenWatch } from "../screen";

/** HN's information pages (guidelines, FAQ, formatting, lists, leaders) as formatted text. */
export function InfoScreen() {
  const page = usePageStatus();
  const record = useScreenWatch<InfoData>("info", "sections").value;
  const data = onScreen(page, "info") ? record : null;
  if (!data) return <div className="screen" aria-busy={page.status === "loading"}>
    {page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading page" rows={6} kind="text" />}
  </div>;
  return <ScrollMemory className="screen" aria-busy={page.stale}>
    <h1 className="screen-title">{data.title}</h1>
    <div className="card"><RichText parts={data.parts} /></div>
  </ScrollMemory>;
}
