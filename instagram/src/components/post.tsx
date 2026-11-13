import { memo, useState } from "react";
import { useCommand, usePending, useRouter, type PendingInput } from "@genesis/sdk/react";
import { commentsUrl, profileUrl, type PostView } from "../model";
import { Avatar, Icon, InlineError, RichText, useOpenUrl, Verified } from "./ui";

/** Whether `input` is a pending `invoke` of `command`. */
export const invoking = (input: PendingInput, command: string) => input.op === "invoke" && input.args.command === command;

/** The args of a pending `invoke` of `command`, or undefined. */
export function invoked<A>(input: PendingInput, command: string): A | undefined {
  return input.op === "invoke" && input.args.command === command ? input.args.args as A : undefined;
}

type ToggleArgs = { code: string } & Record<string, unknown>;

/**
 * A like or save control's shown state. A pending call shows its target state until the page
 * confirms it; the page module's command clicks Instagram's own button. Both are bound to the
 * context whose page shows the post.
 */
function useToggle(code: string, name: "setLiked" | "setSaved", field: "liked" | "saved", value: boolean) {
  const context = useRouter().active;
  const pending = usePending(undefined, context);
  const act = useCommand<ToggleArgs>(name, context);
  const [failed, setFailed] = useState(false);
  const call = [...pending].reverse().map(input => invoked<ToggleArgs>(input, name)).find(args => args?.code === code);
  const shown = call ? call[field] === true : value;
  const toggle = () => {
    setFailed(false);
    void act({ code, [field]: !shown }).then(result => setFailed(result.outcome === "failed"));
  };
  return { shown, busy: call !== undefined, failed, toggle };
}

/** A post in the feed or on its own page. `actionable` is false signed out or on a stale copy. */
export const PostCard = memo(function PostCard({ post, actionable, focus = false }: { post: PostView; actionable: boolean; focus?: boolean }) {
  const open = useOpenUrl();
  const { viewWebsite } = useRouter();
  const [slide, setSlide] = useState(0);
  const like = useToggle(post.code, "setLiked", "liked", post.liked);
  const save = useToggle(post.code, "setSaved", "saved", post.saved);
  // Videos play on Instagram's page (decision-0006): open the post there and show the website.
  const play = () => {
    if (!focus) open(post.url);
    viewWebsite();
  };
  const images = post.images.length > 0 ? post.images : post.poster ? [{ src: post.poster, alt: "" }] : [];
  const shown = images[Math.min(slide, images.length - 1)];
  const comments = post.allComments?.url ?? commentsUrl(post.code);

  return <article className="post" aria-label={`Post by ${post.user}`}>
    <header className="post-head">
      <button type="button" className="avatar-button" aria-label={`Profile of ${post.user}`} onClick={() => open(profileUrl(post.user))}>
        <Avatar src={post.avatar} size={32} />
      </button>
      <div className="post-who">
        <a className="username" href={profileUrl(post.user)} onClick={event => { event.preventDefault(); open(profileUrl(post.user)); }}>
          {post.user}{post.verified && <Verified />}
        </a>
        {post.subtitle && (post.subtitleUrl
          ? <a className="subtitle" href={post.subtitleUrl} onClick={event => { event.preventDefault(); open(post.subtitleUrl!); }}>{post.subtitle}</a>
          : <span className="subtitle">{post.subtitle}</span>)}
      </div>
      <button type="button" className="icon-button" aria-label="More options on Instagram" onClick={() => { if (!focus) open(post.url); viewWebsite(); }}>
        <Icon name="more" />
      </button>
    </header>

    <div className="media" onDoubleClick={() => { if (actionable && !like.shown) like.toggle(); }}>
      {shown ? <img src={shown.src} alt={shown.alt} loading="lazy" referrerPolicy="no-referrer"
        onClick={() => { if (post.video) play(); else if (!focus) open(post.url); }} />
        : <button type="button" className="media-empty" onClick={play}>{post.video ? "Play on Instagram" : "Open on Instagram"}</button>}
      {post.video && <button type="button" className="play-badge" aria-label="Play on Instagram" onClick={play}><Icon name="play" filled /></button>}
      {post.slides > 1 && <span className="slide-count" aria-label={`Slide ${slide + 1} of ${post.slides}`}>{slide + 1}/{post.slides}</span>}
      {post.slides > 1 && images.length > 1 && <>
        {slide > 0 && <button type="button" className="slide-nav prev" aria-label="Previous slide" onClick={() => setSlide(slide - 1)}><Icon name="left" /></button>}
        {slide < images.length - 1 && <button type="button" className="slide-nav next" aria-label="Next slide" onClick={() => setSlide(slide + 1)}><Icon name="left" /></button>}
      </>}
    </div>
    {post.slides > 1 && <div className="dots" aria-hidden="true">
      {Array.from({ length: Math.min(post.slides, 10) }, (_, index) => <span key={index} className={index === slide ? "dot on" : "dot"} />)}
    </div>}

    <div className="post-actions">
      <button type="button" className={like.shown ? "action liked" : "action"} aria-pressed={like.shown} disabled={!actionable || like.busy}
        aria-label={like.shown ? "Unlike" : "Like"} onClick={like.toggle}><Icon name="heart" filled={like.shown} /></button>
      {post.likes && <span className="count">{post.likes}</span>}
      <button type="button" className="action" aria-label="Comments" onClick={() => open(comments)}><Icon name="comment" /></button>
      {post.comments && <span className="count">{post.comments}</span>}
      <button type="button" className="action" aria-label="Share on Instagram" onClick={() => { if (!focus) open(post.url); viewWebsite(); }}><Icon name="share" /></button>
      {post.shares && <span className="count">{post.shares}</span>}
      <span className="spacer" />
      <button type="button" className={save.shown ? "action saved" : "action"} aria-pressed={save.shown} disabled={!actionable || save.busy}
        aria-label={save.shown ? "Remove from saved" : "Save"} onClick={save.toggle}><Icon name="save" filled={save.shown} /></button>
    </div>
    {(like.failed || save.failed) && <InlineError>That didn't go through on Instagram. Try again.</InlineError>}

    {post.caption.length > 0 && <div className="caption" onClick={() => { if (post.excerpt && !focus) open(post.url); }}>
      <RichText parts={post.caption} className={focus ? "rich" : "rich clamp"} lead={<strong className="username">{post.user} </strong>} />
      {post.excerpt && !focus && <span className="muted">more</span>}
    </div>}
    {post.allComments && <button type="button" className="link muted" onClick={() => open(comments)}>{post.allComments.text}</button>}
    {post.time && <p className="time muted"><time dateTime={post.dateTime ?? undefined}>{post.time}</time></p>}
  </article>;
});
