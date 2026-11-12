import { one } from "@genesis/sdk/page";
import { clean, richText } from "./read.ts";
import type { UserData } from "../model.ts";

/** A profile (`/user?id=`): a two-column table of labels such as "user:", "karma:" and "about:". */
function profileOf(box: Element): UserData | null {
  const cells = new Map<string, Element>();
  for (const row of box.querySelectorAll("tr")) {
    const [label, value] = row.querySelectorAll(":scope > td");
    const name = clean(label?.textContent, 20).replace(/:$/, "").toLowerCase();
    if (name && value && !cells.has(name)) cells.set(name, value);
  }
  const name = clean(cells.get("user")?.textContent, 64);
  if (!name) return null;
  return {
    name,
    created: clean(cells.get("created")?.textContent, 40) || null,
    karma: clean(cells.get("karma")?.textContent, 20) || null,
    about: richText(cells.get("about") ?? null, 6_000),
  };
}

export const profile = one({ root: "#bigbox", read: profileOf });
