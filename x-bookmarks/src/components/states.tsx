import type { ReactNode } from "react";
import { useRouter } from "@let/sdk/react";
import { ORIGIN } from "../model";
import { Notice, WebsiteCue } from "../ui/states";

/** Shown while a page needs the account: X's own sign-in opens as the website, so it has the cue. */
export function SignInNotice({ reason }: { reason: string }) {
  const { navigate } = useRouter();
  return <Notice title="Sign in to X">
    <p>{reason}</p>
    <div className="row-buttons">
      <button type="button" className="button primary" onClick={() => navigate({ url: `${ORIGIN}/i/flow/login` })}>Sign in <WebsiteCue /></button>
    </div>
  </Notice>;
}

/** The confirmed empty state: what the page said, and the next useful action. `website` adds View on X. */
export function EmptyNotice({ title, children, contextId, website }: { title: string; children?: ReactNode; contextId?: string; website?: boolean }) {
  const { reload, viewWebsite } = useRouter();
  return <Notice title={title}>
    {children}
    <div className="row-buttons">
      <button type="button" className="button secondary" onClick={() => reload(contextId)}>Refresh</button>
      {website && <button type="button" className="button secondary" onClick={() => viewWebsite()}>View on X <WebsiteCue /></button>}
    </div>
  </Notice>;
}

/** Content shown while its refresh failed, or rows the page could not read. */
export function InlineError({ children }: { children: ReactNode }) {
  return <p className="inline-error" role="alert">{children}</p>;
}
