import { useState, type ReactNode } from "react";
import { libraryMessage, useLibrary } from "../library";
import { useBusy } from "../ui/feedback";
import { ChoiceSkeleton, LibrarySkeleton } from "../ui/skeletons";
import { Notice } from "../ui/states";
import { SignInNotice } from "./states";

export type LibraryHandle = ReturnType<typeof useLibrary>;

/**
 * What stands between a screen and the Categories library: sign-in, a different account, an
 * unreachable service, or a change whose outcome is unknown. Renders `children` once usable.
 */
export function LibraryGate({ library, compact = false, children }: { library: LibraryHandle; compact?: boolean; children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [checking, check] = useBusy();
  const [retrying, retry] = useBusy();
  const code = (library.error as { code?: string } | null)?.code;
  if (code === "SIGN_IN") return <SignInNotice reason="Categories belong to your X account. Sign in to use them." />;
  if (code === "ACCOUNT_UNKNOWN" || (library.loading && !library.library)) return compact ? <ChoiceSkeleton /> : <LibrarySkeleton />;
  if (library.error) return <Notice title={code === "ACCOUNT_MISMATCH" ? "Different account" : "Categories are unavailable"} role="alert">
    <p>{libraryMessage(library.error)}</p>
    {code !== "ACCOUNT_MISMATCH" && <div className="row-buttons">
      <button type="button" className="button secondary" disabled={retrying} aria-busy={retrying}
        onClick={() => void retry(() => library.reload())}>{retrying ? "Trying again…" : "Try again"}</button>
    </div>}
  </Notice>;
  if (library.pending) return <Notice title="Check the last change" role="alert">
    <p>The last change to your categories may not have finished. Check it before making another.</p>
    {message && <p className="inline-error">{message}</p>}
    <div className="row-buttons">
      <button type="button" className="button primary" disabled={checking} aria-busy={checking} onClick={() => {
        setMessage("");
        void check(() => library.check().catch(error => setMessage(libraryMessage(error))));
      }}>{checking ? "Checking…" : "Check last change"}</button>
    </div>
  </Notice>;
  return <>{children}</>;
}
