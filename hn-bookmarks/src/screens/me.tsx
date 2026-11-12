import { useState } from "react";
import { ScrollMemory, useCommand, usePending, useRouter } from "@genesis/sdk/react";
import { ORIGIN, userUrl, type AccountData } from "../model";
import { invoking } from "../components/story";
import { LoadError, Skeleton, useOpenUrl } from "../components/ui";
import { onScreen, usePageStatus, useScreenWatch } from "../screen";

/**
 * The Me tab (`/news?account=1`, the `me` context). The page needs an account: signed out,
 * Genesis shows HN's login page in this context and returns here after sign-in.
 */
export function MeScreen() {
  const page = usePageStatus();
  const record = useScreenWatch<AccountData>("me", "account.profile").value;
  const signOut = useCommand("signOut");
  const pending = usePending().some(input => invoking(input, "signOut"));
  const open = useOpenUrl();
  const { navigate } = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const data = onScreen(page, "me") && !page.stale ? record : null;

  const leave = () => {
    setFailed(false);
    void signOut(undefined, { expect: { read: { reader: "signedOut" } } }).then(result => {
      // Signed out, HN's next page shows no account: that is the evidence.
      const done = result.outcome === "observed" || result.code === "AUTH_REQUIRED";
      setFailed(!done);
      if (!done) return;
      setConfirming(false);
      // HN's logout lands on its front page; the Me tab returns to its own page, which asks to sign in.
      navigate({ url: `${ORIGIN}/news?account=1`, mode: "replace" });
    });
  };

  let body;
  if (!data) body = page.status === "error"
    ? <LoadError error={page.error} />
    : <Skeleton label="Loading account" rows={4} kind="text" />;
  else {
    const id = encodeURIComponent(data.name);
    body = <>
      <section className="card account">
        <h2>{data.name}</h2>
        {data.karma && <p className="meta">{data.karma} karma</p>}
      </section>
      <nav className="list" aria-label="Your Hacker News">
        <button type="button" onClick={() => open(userUrl(data.name))}>Profile</button>
        <button type="button" onClick={() => open(`${ORIGIN}/submitted?id=${id}`)}>My submissions</button>
        <button type="button" onClick={() => open(`${ORIGIN}/threads?id=${id}`)}>My comments</button>
        <button type="button" onClick={() => open(`${ORIGIN}/favorites?id=${id}`)}>HN favorites</button>
        <button type="button" onClick={() => open(`${ORIGIN}/upvoted?id=${id}`)}>Upvoted</button>
        <button type="button" onClick={() => open(`${ORIGIN}/hidden?id=${id}`)}>Hidden</button>
      </nav>
      <p className="meta">Genesis Saved stories are separate from HN favorites.</p>
      {failed && <p className="inline-error" role="alert">Couldn't sign out. Try again.</p>}
      {confirming
        ? <div className="confirm" role="group" aria-label="Confirm sign out">
            <p>Sign out of Hacker News in this app?</p>
            <button type="button" className="danger" disabled={pending} onClick={leave}>Sign out</button>
            <button type="button" className="secondary" disabled={pending} onClick={() => setConfirming(false)}>Stay signed in</button>
          </div>
        : <button type="button" className="secondary" onClick={() => setConfirming(true)}>Sign out</button>}
    </>;
  }

  return <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
    <h1 className="screen-title">Me</h1>
    {body}
    <nav className="list" aria-label="About Hacker News">
      <button type="button" onClick={() => open(`${ORIGIN}/newsguidelines.html`)}>Guidelines</button>
      <button type="button" onClick={() => open(`${ORIGIN}/newsfaq.html`)}>FAQ</button>
    </nav>
  </ScrollMemory>;
}
