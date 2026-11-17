import { HAMBURGER, PRIVATE, RAIL } from "./read";

/**
 * Whether Discord has an account in this session: false on the sign-in and registration pages,
 * true while it shows its signed-in app (the user area, the drawer, or the phone layout's menu
 * button with the inbox), null on a page that says neither, such as while it loads.
 */
export function accountEvidence(doc: Document): boolean | null {
  if (doc.readyState === "loading") return null;
  const path = doc.location.pathname;
  if (/^\/(login|register)\b/.test(path)) return false;
  if (doc.querySelector("form input[name=email][type=email], form input[name=password]")) return false;
  if (doc.querySelector('section[aria-label="User status and settings"]')) return true;
  if (doc.querySelector(`${RAIL}, ${PRIVATE}`)) return true;
  if (doc.querySelector(HAMBURGER) && doc.querySelector('[aria-label="Inbox"]')) return true;
  return null;
}
