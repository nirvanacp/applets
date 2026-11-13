import type { WatchValue } from "@genesis/sdk/react";
import type { GridItem } from "../model";
import { Icon, useOpenUrl } from "./ui";

/** A three-column grid of posts and reels, in page order. A tile opens the post. */
export function Grid({ items }: { items: WatchValue<unknown, GridItem | null> }) {
  const open = useOpenUrl();
  return <div className="grid">
    {items.order.map(key => {
      const item = items.records[key];
      if (!item) return null;
      return <button type="button" key={key} className="tile" aria-label={item.alt || (item.kind === "reel" ? "Reel" : "Post")}
        onClick={() => open(item.url)}>
        {item.src ? <img src={item.src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="tile-empty" />}
        {item.carousel && <span className="tile-badge"><Icon name="carousel" /></span>}
        {(item.video || item.kind === "reel") && !item.carousel && <span className="tile-badge"><Icon name="reels" /></span>}
        {item.views && <span className="tile-views"><Icon name="play" filled />{item.views}</span>}
      </button>;
    })}
  </div>;
}
