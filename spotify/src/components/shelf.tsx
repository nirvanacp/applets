import { memo } from "react";
import { record } from "@genesis/sdk";
import { useGenesis, usePending, useRecord } from "@genesis/sdk/react";
import type { Card, Section } from "../model";
import { Artwork, useOpenUrl } from "./ui";

/** One row of tiles. It re-renders only when its own record changes. */
export const Shelf = memo(function Shelf({ watch, id }: { watch: string; id: string }) {
  const section = useRecord<Section>(watch, id);
  if (!section || section.cards.length === 0) return null;
  return <section className="shelf">
    {section.title && <h2 className="shelf-title">{section.title}</h2>}
    <ul className="shelf-row">
      {section.cards.map(card => <li key={card.key}><Tile card={card} watch={watch} section={id} /></li>)}
    </ul>
  </section>;
});

function Tile({ card, watch, section }: { card: Card; watch: string; section: string }) {
  const genesis = useGenesis();
  const open = useOpenUrl();
  // A card without a link opens with a real tap on it on the website; Spotify ignores synthetic clicks.
  const target = card.clickId ? record(watch, section, `[aria-labelledby="${CSS.escape(card.clickId)}"]`) : undefined;
  const pending = usePending(target, "primary").length > 0 && target !== undefined;
  const choose = () => {
    if (card.url) open(card.url);
    else if (target) void genesis.context("primary").click(target, { navigates: true, input: "trusted" });
  };
  return <button type="button" className="tile" disabled={pending} onClick={choose}>
    <Artwork src={card.image} round={card.kind === "artist"} />
    <span className="tile-title">{card.title}</span>
    {card.subtitle && <span className="tile-subtitle">{card.subtitle}</span>}
  </button>;
}
