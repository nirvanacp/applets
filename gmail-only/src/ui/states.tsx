/**
 * Truthful states from the UI kit: notices, the load error with a busy Retry, the website cue and
 * the fade-in after a skeleton. Fallback text never stands in for content; screens show these instead.
 */
import { useRef, type ReactNode } from "react";
import { useRouter } from "@let/sdk/react";
import type { ErrorBody } from "@let/sdk";
import { Icon, type IconName } from "../components/ui";
import { RetryButton } from "./feedback";

/** True once a loading state has been shown, so content that replaces it can fade in. */
export function useSawLoading(loading: boolean): boolean {
  const saw = useRef(loading);
  if (loading) saw.current = true;
  return saw.current;
}

export function Notice({ title, children, role, icon }: { title: string; children?: ReactNode; role?: "alert" | "status"; icon?: IconName }) {
  return <section className="notice" role={role}>
    {icon && <span className="notice-icon"><Icon name={icon} size={28} /></span>}
    <h2>{title}</h2>
    {children}
  </section>;
}

/** Marks a control that leaves the applet for Gmail's own page. */
export function WebsiteCue() {
  return <svg className="website-cue" role="img" aria-label="opens website" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>;
}

/** A page that failed to load: what happened, a Retry that stays busy until Gmail answers, and the website. */
export function LoadError({ error, site = "Gmail", title }: { error: ErrorBody | null; site?: string; title?: string }) {
  const { reload, viewWebsite } = useRouter();
  const message = error?.code === "NOT_READY" || error?.code === "DEADLINE" ? `${site} did not answer in time.`
    : error?.message || "This page could not be read.";
  return <Notice title={title ?? `Couldn't load ${site}`} role="alert" icon="alert">
    <p>{message}</p>
    <div className="row-buttons">
      <RetryButton error={error} onRetry={() => reload()} />
      <button type="button" className="secondary" onClick={() => viewWebsite()}>Open in {site} <WebsiteCue /></button>
    </div>
  </Notice>;
}
