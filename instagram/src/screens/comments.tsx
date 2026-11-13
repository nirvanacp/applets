import { useState } from "react";
import { ScrollMemory, useCommand, usePending } from "@genesis/sdk/react";
import { profileUrl, type CommentView } from "../model";
import { invoking } from "../components/post";
import { Avatar, Icon, InlineError, LoadError, Notice, RichText, Skeleton, TopBar, useOpenUrl, Verified } from "../components/ui";
import { delivered, onScreen, signedIn, usePageStatus, useScreenWatch } from "../screen";

/** A post's comments, with a box that posts through Instagram's own comment form. */
export function CommentsScreen() {
  const page = usePageStatus();
  const comments = useScreenWatch<unknown, CommentView | null>("comments", "comments");
  const here = onScreen(page, "comments");
  const shown = here ? comments.order : [];

  let body;
  if (shown.length === 0) {
    if (page.status === "ready" && here && delivered(comments)) body = <Notice title="No comments yet"><p>Start the conversation.</p></Notice>;
    else body = page.status === "error" ? <LoadError error={page.error} /> : <Skeleton label="Loading comments" />;
  } else body = <ul className="rows">
    {shown.map(key => {
      const comment = comments.records[key];
      return comment ? <li key={key}><Comment comment={comment} /></li> : null;
    })}
  </ul>;

  return <div className="screen-with-composer">
    <ScrollMemory className="screen" aria-busy={page.stale || page.status === "loading"}>
      <TopBar title="Comments" />
      {page.status === "error" && shown.length > 0 && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
      {body}
    </ScrollMemory>
    {here && signedIn(page) && <Composer disabled={page.stale || page.status !== "ready"} />}
  </div>;
}

function Comment({ comment }: { comment: CommentView }) {
  const open = useOpenUrl();
  return <div className="comment">
    <button type="button" className="avatar-button" aria-label={`Profile of ${comment.user}`} onClick={() => open(profileUrl(comment.user))}>
      <Avatar src={comment.avatar} size={36} />
    </button>
    <div className="comment-body">
      <p className="comment-head"><strong>{comment.user}</strong>{comment.verified && <Verified />} <span className="muted">{comment.time}</span></p>
      <RichText parts={comment.parts} />
      <p className="muted comment-meta">{comment.likes && <span>{comment.likes}</span>}{comment.replies && <span>{comment.replies}</span>}</p>
    </div>
    {comment.liked && <span className="liked" aria-label="You liked this"><Icon name="heart" filled /></span>}
  </div>;
}

function Composer({ disabled }: { disabled: boolean }) {
  const [text, setText] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const add = useCommand<{ text: string }>("addComment");
  const posting = usePending().some(input => invoking(input, "addComment"));
  const submit = () => {
    const value = text.trim();
    if (!value) return;
    setFailed(null);
    void add({ text: value }).then(result => {
      if (result.outcome === "observed") setText("");
      else setFailed(result.outcome === "failed" ? result.message ?? "Instagram didn't take the comment." : "Instagram hasn't shown the comment yet.");
    });
  };
  return <form className="composer" onSubmit={event => { event.preventDefault(); submit(); }}>
    {failed && <InlineError>{failed}</InlineError>}
    <div className="composer-row">
      <input aria-label="Add a comment" placeholder="Add a comment…" value={text} maxLength={2200} onChange={event => setText(event.target.value)} disabled={posting} />
      <button type="submit" className="link primary-text" disabled={disabled || posting || !text.trim()}>{posting ? "Posting…" : "Post"}</button>
    </div>
  </form>;
}
