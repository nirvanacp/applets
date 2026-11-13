/**
 * Whether the web player has an account: true while it shows the account's settings gear or a
 * save switch, false while it shows a log-in button or link, null on a page that says neither
 * (still loading, say).
 */
export function accountEvidence(doc: Document): boolean | null {
  if (doc.readyState === "loading") return null;
  if (doc.querySelector("[data-testid=gears-button], [data-testid=floating-now-playing-bar] [data-testid=add-button]")) return true;
  if (doc.querySelector("[data-testid=login-button], a[href*='accounts.spotify.com'][href*='login']")) return false;
  return null;
}
