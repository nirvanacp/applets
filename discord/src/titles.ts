/**
 * The name of the row the user tapped, kept by URL path, so the chat header can show it while
 * Discord's page loads instead of an empty bar. The page's own reading replaces it once it arrives.
 */
export interface TitleHint { main: string; sub?: string | null }

const hints = new Map<string, TitleHint>();
const LIMIT = 50;

const pathOf = (url: string) => {
  try { return new URL(url, "https://discord.com").pathname.replace(/\/+$/, ""); } catch { return null; }
};

export function rememberTitle(url: string, hint: TitleHint) {
  const path = pathOf(url);
  if (!path || !hint.main) return;
  hints.delete(path);
  hints.set(path, hint);
  if (hints.size > LIMIT) hints.delete(hints.keys().next().value!);
}

export const titleHint = (url: string): TitleHint | null => {
  const path = pathOf(url);
  return path ? hints.get(path) ?? null : null;
};
