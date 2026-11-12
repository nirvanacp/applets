import { one } from "@genesis/sdk/page";
import type { AccountData } from "../model.ts";
import { account, clean, type CommandResult } from "./read.ts";

/** The Me tab's page (`/news?account=1`): the front page, read only for its top bar. */
function accountOf(main: Element): AccountData | null {
  const name = clean(main.querySelector("#me")?.textContent, 64);
  if (!name) return null;
  return { name, karma: clean(main.querySelector("#karma")?.textContent, 20) || null };
}

export const accountProfile = one({ root: "#hnmain", read: accountOf });

/**
 * Follows HN's own logout link, which carries the session's token. HN returns to the Me page,
 * which then shows no account: the caller's `expect` reads `signedOut` as the evidence.
 */
export function signOut(doc: Document): CommandResult {
  if (account(doc) === null) return { satisfied: true };
  if (!doc.querySelector("a#logout")) throw new Error("Hacker News shows no logout link");
  return { steps: [{ op: "click", target: { css: "a#logout" } }], navigates: true };
}
