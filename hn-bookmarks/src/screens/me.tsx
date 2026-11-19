import { useState } from "react";
import { useCommand, useGenesis, usePending, useRouter } from "@nirvanacp/sdk/react";
import { ORIGIN, userUrl, type AccountData } from "../model";
import { invoking } from "../components/story";
import { InlineError } from "../components/states";
import { useBusy, useToast } from "../ui/feedback";
import { PageScroller, RefreshButton, ScreenHead, useOpenUrl } from "../ui/frame";
import { Icon } from "../ui/icons";
import { AccountSkeleton } from "../ui/skeletons";
import { LoadError, useSawLoading } from "../ui/states";
import { onScreen, refreshing, usePageStatus, useScreenWatch } from "../screen";

/** How long a sign-out that left the page without a verdict waits for the page to show no account. */
const SIGNED_OUT_WAIT_MS = 5000;

/**
 * The Me tab (`/news?account=1`, the `me` context). The page needs an account: signed out,
 * Genesis shows HN's login page in this context and returns here after sign-in.
 */
export function MeScreen() {
  const page = usePageStatus();
  const record = useScreenWatch<AccountData>("me", "account.profile").value;
  const genesis = useGenesis();
  const signOut = useCommand("signOut");
  const pending = usePending().some(input => invoking(input, "signOut"));
  const open = useOpenUrl();
  const { navigate } = useRouter();
  const { show } = useToast();
  const [leaving, runLeave] = useBusy();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const data = onScreen(page, "me") && !page.stale ? record : null;

  const signedOutNow = () => genesis.context("me").wait({ read: { reader: "signedOut" } }, SIGNED_OUT_WAIT_MS)
    .then(() => true, () => false);

  const leave = () => void runLeave(() => {
    setFailed(false);
    return signOut(undefined, { expect: { read: { reader: "signedOut" } } }).then(async result => {
      // Signed out, HN's next page shows no account: that is the evidence. The page can also be
      // replaced while the logout loads, or the destination can be judged before it reads, so an
      // unknown outcome counts once the Me tab's page shows no account.
      const done = result.outcome === "observed" || result.code === "CONTEXT_REPLACED"
        || (result.outcome === "unknown" && await signedOutNow());
      setFailed(!done);
      if (!done) return;
      setConfirming(false);
      show({ text: "Signed out of Hacker News" });
      // HN's logout lands on its front page; the Me tab returns to its own page, which asks to sign in.
      navigate({ url: `${ORIGIN}/news?account=1`, mode: "replace" });
    }, () => setFailed(true));
  });
  const busy = refreshing(page);
  const signingOut = leaving || pending;
  const fadeIn = useSawLoading(!data && page.status !== "error");
  const row = (label: string, url: string) => <button type="button" key={label} onClick={() => open(url)}>
    <span>{label}</span><Icon name="chevron" />
  </button>;

  return <>
    <ScreenHead title="Me" actions={<RefreshButton busy={busy} />} />
    {!data && page.status === "error" ? <LoadError error={page.error} site="Hacker News" />
      : !data ? <AccountSkeleton />
      : <PageScroller busy={busy}>
        <div className={fadeIn ? "reveal" : undefined}>
          <section className="card account">
            <h2>{data.name}</h2>
            {data.karma && <p className="meta">{data.karma} karma</p>}
          </section>
          <nav className="list" aria-label="Your Hacker News">
            {row("Profile", userUrl(data.name))}
            {row("My submissions", `${ORIGIN}/submitted?id=${encodeURIComponent(data.name)}`)}
            {row("My comments", `${ORIGIN}/threads?id=${encodeURIComponent(data.name)}`)}
            {row("HN favorites", `${ORIGIN}/favorites?id=${encodeURIComponent(data.name)}`)}
            {row("Upvoted", `${ORIGIN}/upvoted?id=${encodeURIComponent(data.name)}`)}
            {row("Hidden", `${ORIGIN}/hidden?id=${encodeURIComponent(data.name)}`)}
          </nav>
          <p className="meta note">Genesis Saved stories are separate from HN favorites.</p>
          <nav className="list" aria-label="About Hacker News">
            {row("Guidelines", `${ORIGIN}/newsguidelines.html`)}
            {row("FAQ", `${ORIGIN}/newsfaq.html`)}
          </nav>
          {failed && <InlineError>Couldn't sign out. Try again.</InlineError>}
          <div className="sign-out">
            {confirming
              ? <div className="confirm" role="group" aria-label="Confirm sign out">
                  <p>Sign out of Hacker News in this app?</p>
                  <div className="row-buttons">
                    <button type="button" className="button danger" disabled={signingOut} aria-busy={signingOut} onClick={leave}>
                      {signingOut ? <><span className="spinner" aria-hidden="true" /> Signing out…</> : "Sign out"}
                    </button>
                    <button type="button" className="button secondary" disabled={signingOut} onClick={() => setConfirming(false)}>Stay signed in</button>
                  </div>
                </div>
              : <button type="button" className="button secondary" onClick={() => setConfirming(true)}>Sign out</button>}
          </div>
        </div>
      </PageScroller>}
  </>;
}
