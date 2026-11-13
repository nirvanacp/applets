import { memo } from "react";
import { record } from "@genesis/sdk";
import { mount, useGenesis, usePending, useRecord, useRouter, useWatch, ScrollMemory } from "@genesis/sdk/react";
import type { Link } from "./page";
import { HOME_PAGES, ROUTES } from "./routes";
import "./theme.css";

const LINKS = "home:links";

/** One row; it re-renders only when its own record or its pending inputs change. */
const LinkRow = memo(function LinkRow({ id }: { id: string }) {
  const genesis = useGenesis();
  const link = useRecord<Link>(LINKS, id);
  const target = record(LINKS, id);
  const pending = usePending(target, "primary").length > 0;
  if (!link) return null;
  // A click on the website's own link; the destination's route decides what shows.
  const open = () => void genesis.context("primary").click(target, { navigates: true });
  return (
    <li>
      <button type="button" disabled={pending} onClick={open}>{link.text || link.url}</button>
    </li>
  );
});

function Home() {
  const links = useWatch<never, Link>(LINKS, { reader: "links" }, { context: "primary", when: HOME_PAGES });
  if (links.status === "error") return <p role="alert" className="notice">This page couldn't be read. {links.error?.message}</p>;
  if (links.status === "loading") return <p role="status" className="notice">Loading…</p>;
  if (links.order.length === 0) return <p role="status" className="notice">No links on this page.</p>;
  return (
    <ScrollMemory className="screen">
      <h1>Links</h1>
      <ul className="links">
        {links.order.map(key => <LinkRow key={key} id={key} />)}
      </ul>
    </ScrollMemory>
  );
}

/** A URL without a route shows the website itself, so only routed screens render here. */
function App() {
  const { screen } = useRouter();
  return screen?.id === "home" ? <Home /> : null;
}

void mount(<App />, { router: { routes: ROUTES } });
