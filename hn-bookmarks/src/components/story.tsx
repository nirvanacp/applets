import { memo, type CSSProperties } from "react";
import { useCommand, usePending, useRouter, type PendingInput } from "@nirvanacp/sdk/react";
import { snapshotOf } from "../library";
import { itemUrl, ORIGIN, userUrl, type CommentEntry, type Story } from "../model";
import { useToast } from "../ui/feedback";
import { useOpenUrl } from "../ui/frame";
import { Icon } from "../ui/icons";
import { WebsiteCue } from "../ui/states";
import { Link, Meta, RichText } from "./ui";

/** Whether `input` is a pending `invoke` of `command`. */
export const invoking = (input: PendingInput, command: string) => input.op === "invoke" && input.args.command === command;

/** The args of a pending `invoke` of `command`, or undefined. */
export function invoked<A>(input: PendingInput, command: string): A | undefined {
  return input.op === "invoke" && input.args.command === command ? input.args.args as A : undefined;
}

interface VoteArgs { id: string; voted: boolean }

/**
 * The vote an item shows and a way to change it. A pending `setVoted` call shows its target
 * state at once until the page confirms it; the page module's `setVoted` clicks HN's own vote
 * link. A vote that fails, or whose result never shows, says so in a toast.
 */
function useVote(id: string, voted: boolean) {
  const pending = usePending();
  const setVoted = useCommand<VoteArgs>("setVoted");
  const { show } = useToast();
  const call = [...pending].reverse().map(input => invoked<VoteArgs>(input, "setVoted")).find(args => args?.id === id);
  const shown = call ? call.voted : voted;
  const toggle = () => {
    void setVoted({ id, voted: !shown }).then(result => {
      if (result.outcome === "failed") show({ text: "The vote didn't go through. Try again." });
      else if (result.outcome === "unknown") show({ text: "Hacker News didn't confirm the vote. Check it on the page." });
    }, () => show({ text: "The vote didn't go through. Try again." }));
  };
  return { shown, busy: call !== undefined, toggle };
}

type Vote = ReturnType<typeof useVote>;

/** The upvote arrow. Signed out, HN shows no arrows, and neither does the app. */
function VoteButton({ vote, canVote, title, signedIn, small = false }: {
  vote: Vote; canVote: boolean; title: string; signedIn: boolean; small?: boolean;
}) {
  const className = `vote${small ? " small" : ""}${vote.shown ? " voted" : ""}`;
  if (!signedIn || (!canVote && !vote.shown)) return <span className={className} aria-hidden="true" />;
  return <button type="button" className={className} aria-pressed={vote.shown} disabled={vote.busy}
    aria-label={vote.shown ? `Upvoted, remove upvote: ${title}` : `Upvote: ${title}`} onClick={vote.toggle}>
    <Icon name="up" filled={vote.shown} className={vote.busy && vote.shown ? "pop" : undefined} />
  </button>;
}

/** Opens the save editor for a story read from the current page. */
function useSaveStory() {
  const { navigate } = useRouter();
  return (story: Story) => navigate({ screen: "save", params: { snapshot: JSON.stringify(snapshotOf(story)), fresh: "1" } });
}

/**
 * A story title that opens its article, or its discussion for a text post. An article is another
 * website, so the title carries the website cue after its domain.
 */
export function StoryTitle({ title, articleUrl, discussionUrl, domain, heading = false }: {
  title: string; articleUrl: string | null; discussionUrl: string; domain?: string | null; heading?: boolean;
}) {
  const Title = heading ? "h1" : "h2";
  return <Title className="story-title">
    <Link url={articleUrl ?? discussionUrl}>
      {title}
      {articleUrl && <span className="domain">{domain ? ` (${domain})` : ""} <WebsiteCue /></span>}
    </Link>
  </Title>;
}

/** A story in a list or at the top of its discussion. */
export const StoryRow = memo(function StoryRow({ story, signedIn, heading = false, rank = true }: {
  story: Story; signedIn: boolean; heading?: boolean; rank?: boolean;
}) {
  const vote = useVote(story.id, story.voted);
  const save = useSaveStory();
  const discussion = itemUrl(story.id);
  return <article className={`story${heading ? " heading" : ""}`}>
    {rank && !heading && <span className="rank" aria-hidden="true">{story.rank ?? ""}</span>}
    <VoteButton vote={vote} canVote={story.canVote} title={story.title} signedIn={signedIn} />
    <div className="story-body">
      <StoryTitle heading={heading} title={story.title} articleUrl={story.articleUrl} discussionUrl={discussion} domain={story.domain} />
      <Meta parts={[
        story.score,
        story.submitter && <Link url={userUrl(story.submitter)}>{story.submitter}</Link>,
        story.age,
        story.comments && !heading && <Link url={discussion}>{story.comments}</Link>,
      ]} />
    </div>
    <button type="button" className="icon-button save-button" aria-label={`Save story: ${story.title}`} onClick={() => save(story)}>
      <Icon name="bookmark" />
    </button>
  </article>;
});

/** HN's reply page for a comment, which returns to the comment in its thread. */
const replyUrl = (id: string, storyId: string) =>
  `${ORIGIN}/reply?id=${id}&goto=${encodeURIComponent(`item?id=${storyId}#${id}`)}`;

/**
 * A comment in a thread or at the top of its own page.
 * `onLink` handles links in the text, so links to comments on the same page can reveal them.
 */
export const CommentRow = memo(function CommentRow({ entry, storyId, signedIn, collapsed, hidden, onToggle, onLink, head = false }: {
  entry: CommentEntry;
  storyId: string;
  signedIn: boolean;
  collapsed?: boolean;
  hidden?: number;
  onToggle?: (id: string) => void;
  onLink: (url: string) => void;
  head?: boolean;
}) {
  const open = useOpenUrl();
  const vote = useVote(entry.id, entry.voted);
  const author = entry.author ?? "unknown";
  return <article className={`comment${collapsed ? " collapsed" : ""}`} id={`comment-${entry.id}`}
    style={{ "--depth": Math.min(entry.depth, 8) } as CSSProperties}>
    <header className="comment-head">
      <VoteButton small vote={vote} canVote={entry.canVote} title={`comment by ${author}`} signedIn={signedIn} />
      <Meta parts={[
        entry.author && <Link url={userUrl(entry.author)} className="author">{entry.author}</Link>,
        entry.age,
        head && entry.onStory && <Link url={itemUrl(entry.onStory.id)}>on: {entry.onStory.title}</Link>,
      ]} />
      {onToggle && <button type="button" className="toggle" aria-expanded={!collapsed}
        aria-label={collapsed ? `Show comment by ${author}${hidden ? ` and ${hidden} more` : ""}` : `Hide comment by ${author}`}
        onClick={() => onToggle(entry.id)}>
        {collapsed ? `[+${hidden ? hidden + 1 : ""}]` : "[–]"}
      </button>}
    </header>
    {!collapsed && <>
      <RichText parts={entry.parts} onLink={onLink} />
      {(entry.links.length > 0 || entry.canReply) && <nav className="comment-links" aria-label="Comment links">
        {entry.links.map(link => <a key={link.label + link.url} href={link.url} onClick={event => { event.preventDefault(); onLink(link.url); }}>{link.label}</a>)}
        {entry.canReply && <a href={replyUrl(entry.id, storyId)} onClick={event => { event.preventDefault(); open(replyUrl(entry.id, storyId)); }}>
          reply <WebsiteCue />
        </a>}
      </nav>}
    </>}
  </article>;
});
