import { useEffect, useState } from "react";
import { useCommand, useRouter } from "@genesis/sdk/react";
import { ORIGIN, safeUrl, TITLE_LIMIT, type SubmitForm } from "../model";
import { InlineError } from "../components/states";
import { useBusy } from "../ui/feedback";
import { PageScroller, ScreenHead, useOpenUrl } from "../ui/frame";
import { PostFormSkeleton } from "../ui/skeletons";
import { LoadError, Notice, useSawLoading } from "../ui/states";
import { whenScreen } from "../routes";
import { delivered, onScreen, refreshing, usePageStatus, useScreenWatch } from "../screen";

type Sent = "accepted" | "unknown" | null;

/**
 * HN decides a submission: the new story, the list of new stories or an existing discussion of
 * the same link mean it took the post; its form again means it refused it.
 */
const SUBMITTED = { url: [...whenScreen("item"), ...whenScreen("feed")], notUrl: whenScreen("post") };

/**
 * HN's submit form, rebuilt (the `post` context). The values go into HN's own fields and HN's
 * own form posts them, so HN decides the outcome. Signed out, Genesis shows HN's login page.
 */
export function PostScreen() {
  const page = usePageStatus();
  const { setLeaveGuard } = useRouter();
  const formWatch = useScreenWatch<SubmitForm>("post", "form");
  const form = formWatch.value;
  const setField = useCommand<{ name: string; value: string }>("setField");
  const submit = useCommand("submit");
  const open = useOpenUrl();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, run] = useBusy();
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent>(null);
  const shown = onScreen(page, "post") && !page.stale ? form : null;
  // A rejected submission lands on `/r`, a new history entry that mounts this screen again with
  // empty fields. HN's returned form carries the draft back, so the fields start from it once.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || !shown) return;
    setSeeded(true);
    setTitle(shown.title);
    setUrl(shown.url);
    setText(shown.text);
  }, [seeded, shown]);
  const draft = sent === null && (title.trim() !== "" || url.trim() !== "" || text.trim() !== "");
  useEffect(() => setLeaveGuard(draft ? "Discard this post?" : null), [draft, setLeaveGuard]);

  const urlProblem = url.trim() && !safeUrl(url.trim()) ? "Enter a web address that starts with http or https." : null;
  const ready = title.trim() !== "" && title.trim().length <= TITLE_LIMIT && !urlProblem && !busy && form !== null;

  const post = () => void run(async () => {
    setProblem(null);
    for (const [name, value] of [["title", title.trim()], ["url", url.trim()], ["text", text]] as const) {
      const result = await setField({ name, value });
      if (result.outcome !== "observed") {
        setProblem("Couldn't fill in Hacker News's form. Try again.");
        return;
      }
    }
    const result = await submit(undefined, { navigates: true, expect: SUBMITTED });
    if (result.outcome === "observed") setSent("accepted");
    else if (result.code === "REJECTED") setProblem(null); // HN's message shows from the form.
    else if (result.outcome === "unknown") setSent("unknown");
    else setProblem("Hacker News didn't take the post. Check the form and try again.");
  });

  const reset = () => {
    setTitle(""); setUrl(""); setText(""); setSent(null);
    open(`${ORIGIN}/submit`);
  };

  const failed = page.status === "error" || (onScreen(page, "post") && formWatch.status === "error");
  // The form is missing only once its reader has read a settled submit page and found none.
  const missing = !shown && !failed && page.status === "ready" && !page.stale && onScreen(page, "post") && delivered(formWatch);
  const fadeIn = useSawLoading(!shown && !failed && !missing);
  const head = <ScreenHead title="Post" />;

  if (sent) return <>
    {head}
    <div className="screen">
      <Notice title={sent === "accepted" ? "Submitted to Hacker News" : "Check Hacker News"} role="status">
        <p>{sent === "accepted"
          ? "New posts appear under New. Hacker News may point you to an existing discussion of the same link."
          : "Hacker News went to another page, so the app can't tell whether the post went through."}</p>
        <div className="row-buttons">
          <button type="button" className="button" onClick={() => open(`${ORIGIN}/newest`)}>See New</button>
          <button type="button" className="button secondary" onClick={reset}>Post another</button>
        </div>
      </Notice>
    </div>
  </>;

  if (!shown) return <>
    {head}
    {failed ? <LoadError error={page.error ?? formWatch.error} site="Hacker News" />
      : missing ? <LoadError error={{ code: "NOT_FOUND", message: "Hacker News didn't show its submit form." }} site="Hacker News" />
      : <PostFormSkeleton />}
  </>;

  // No pull to refresh here: reloading HN's form would drop the draft.
  return <>
    {head}
    <PageScroller busy={refreshing(page)} pull={false}>
      <form className={`form${fadeIn ? " reveal" : ""}`} onSubmit={event => { event.preventDefault(); if (ready) post(); }}>
        {shown.error && <InlineError>{shown.error}</InlineError>}
        <label>Title
          <input value={title} maxLength={TITLE_LIMIT} required autoCapitalize="sentences" enterKeyHint="next"
            onChange={event => setTitle(event.target.value)} />
          <span className="meta counter">{title.trim().length} of {TITLE_LIMIT}</span>
        </label>
        <label>URL
          <input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next"
            placeholder="https://" value={url} aria-invalid={urlProblem !== null} onChange={event => setUrl(event.target.value)} />
          {urlProblem && <span className="field-error">{urlProblem}</span>}
        </label>
        <label>Text
          <textarea rows={6} value={text} autoCapitalize="sentences" onChange={event => setText(event.target.value)} />
        </label>
        <p className="meta">Leave the URL blank to ask a question. With a URL, the text appears as the first comment.</p>
        {problem && <InlineError>{problem}</InlineError>}
        <div className="form-actions">
          <button type="submit" className="button" disabled={!ready} aria-busy={busy}>
            {busy ? <><span className="spinner" aria-hidden="true" /> Posting…</> : "Post"}
          </button>
          <button type="button" className="text-button" onClick={() => open(`${ORIGIN}/newsguidelines.html`)}>Read the guidelines</button>
        </div>
      </form>
    </PageScroller>
  </>;
}
