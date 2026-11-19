import { useRef, type ReactNode } from "react";
import { useRouter } from "@nirvanacp/sdk/react";
import type { ErrorBody } from "@nirvanacp/sdk";
import { RetryButton } from "./feedback";

/** True once a loading state was shown, so the content that replaces it fades in; cached content does not. */
export function useSawLoading(loading: boolean): boolean {
  const saw = useRef(loading);
  if (loading) saw.current = true;
  return saw.current;
}

export function Notice({ title, children, role }: { title: string; children?: ReactNode; role?: "alert" | "status" }) {
  return <section className="notice" role={role}><h2>{title}</h2>{children}</section>;
}

/** The external-arrow cue on every control that shows the website. */
export function WebsiteCue() {
  return <svg className="website-cue" viewBox="0 0 24 24" role="img" aria-label="opens website"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>;
}

/** A failed load with nothing to show: the reason, Retry, and the website. */
export function LoadError({ error, title = "Couldn't load this page" }: { error: ErrorBody | null | undefined; title?: string }) {
  const { reload, viewWebsite } = useRouter();
  const message = error?.code === "NOT_READY" || error?.code === "DEADLINE" ? "Spotify did not answer in time."
    : error?.message || "Spotify's page could not be read.";
  return <Notice title={title} role="alert">
    <p>{message}</p>
    <div className="row-buttons">
      <RetryButton error={error} onRetry={() => reload("primary")} />
      <button type="button" className="button secondary" onClick={() => viewWebsite("primary")}>View website <WebsiteCue /></button>
    </div>
  </Notice>;
}

/** The confirmed empty state: what the page said, and the next useful action. */
export function EmptyNotice({ title, children }: { title: string; children?: ReactNode }) {
  const { reload } = useRouter();
  return <Notice title={title}>
    {children}
    <div className="row-buttons"><button type="button" className="button secondary" onClick={() => reload("primary")}>Refresh</button></div>
  </Notice>;
}

/** The page needs the account: Spotify's own log-in shows as the website, so the control has the cue. */
export function SignInNotice() {
  const { viewWebsite } = useRouter();
  return <Notice title="Log in to Spotify">
    <p>Log in to see your music, playlists and library.</p>
    <div className="row-buttons">
      <button type="button" className="button primary" onClick={() => viewWebsite("primary")}>Log in <WebsiteCue /></button>
    </div>
  </Notice>;
}

/** Content kept while its refresh failed. */
export function InlineError({ children }: { children: ReactNode }) {
  return <p className="inline-error" role="alert">{children}</p>;
}
