import { useRef, type ReactNode } from "react";
import { useRouter } from "@let/sdk/react";
import type { ErrorBody } from "@let/sdk";
import { RetryButton } from "./feedback";

/** A list placeholder: avatar and text rows. Build other shapes from the same .sk classes. */
export function Skeleton({ label, rows = 7, avatar = true }: { label: string; rows?: number; avatar?: boolean }) {
  return <div className="skeleton" role="status" aria-busy="true" aria-label={label}>
    {Array.from({ length: rows }, (_, index) => <div key={index} className="skeleton-row" aria-hidden="true">
      {avatar && <span className="sk sk-avatar" />}
      <div><span className="sk sk-line" style={{ width: "40%" }} /><span className="sk sk-line" /><span className="sk sk-line" style={{ width: index % 3 === 2 ? "55%" : "75%" }} /></div>
    </div>)}
  </div>;
}

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
export function LoadError({ error, site }: { error: ErrorBody | null | undefined; site: string }) {
  const { reload, viewWebsite } = useRouter();
  const message = error?.code === "NOT_READY" || error?.code === "DEADLINE" ? `${site} did not answer in time.`
    : error?.message || "This page could not be read.";
  return <Notice title={`Couldn't load ${site}`} role="alert">
    <p>{message}</p>
    <div className="row-buttons">
      <RetryButton error={error} onRetry={() => reload()} />
      <button type="button" className="button secondary" onClick={() => viewWebsite()}>View website <WebsiteCue /></button>
    </div>
  </Notice>;
}
