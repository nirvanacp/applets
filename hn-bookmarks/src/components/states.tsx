import type { ReactNode } from "react";
import { useRouter } from "@nirvanacp/sdk/react";
import { Notice } from "../ui/states";

/** A confirmed empty page: what it means and a Refresh, since HN lists change. */
export function EmptyNotice({ title, children }: { title: string; children?: ReactNode }) {
  const { reload } = useRouter();
  return <Notice title={title}>
    {children}
    <div className="row-buttons"><button type="button" className="button secondary" onClick={() => reload()}>Refresh</button></div>
  </Notice>;
}

/** A problem shown above content that stays: a failed refresh, rows that could not be read. */
export function InlineError({ children }: { children: ReactNode }) {
  return <p className="inline-error" role="alert">{children}</p>;
}
