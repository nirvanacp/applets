import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useRecord, useRouter } from "@let/sdk/react";
import { Composer } from "../components/composer";
import { failureText, useDiscordCommand, useOpenLink, usePendingCalls } from "../components/commands";
import { Lightbox } from "../components/lightbox";
import { Avatar, Icon } from "../components/ui";
import type { Embed, Message, Part, Place, Reaction } from "../model";
import { delivered, onScreen, refreshing, usePageStatus, useScreenWatch, viewOf } from "../screen";
import { ProgressBar, useToast } from "../ui/feedback";
import { RefreshButton, TopBar, useOpenUrl } from "../ui/frame";
import { reducedMotion } from "../ui/motion";
import { MessagesSkeleton } from "../ui/skeletons";
import { InlineError, LoadError, SignInNotice, useSawLoading } from "../ui/states";

const WATCH = "chat:messages";
/** Closer to the bottom than this, the list follows new messages. */
const STICK_PX = 48;
/** Further from the bottom than this, Jump to present shows. */
const JUMP_PX = 600;

const formatTime = (iso: string | null, full: boolean) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!full) return time;
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return `Today at ${time}`;
  if (same(date, yesterday)) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" })}, ${time}`;
};

/** A channel or a direct conversation: its messages, newest at the bottom, and the composer. */
export function ChatScreen() {
  const page = usePageStatus("primary");
  const here = onScreen(page, "chat");
  const placeWatch = useScreenWatch<Place | null>("chat", "place");
  const list = useScreenWatch<unknown, Message>("chat", "messages");
  const place = here ? placeWatch.value ?? null : null;
  const keys = here ? list.order : [];
  const view = viewOf(page, keys.length > 0, here && delivered(list), list.status === "error");
  const fadeIn = useSawLoading(view === "loading");
  const busy = refreshing(page);
  const { navigate } = useRouter();
  const [lightbox, setLightbox] = useState<{ url: string; video: boolean } | null>(null);

  const titleText = place ? (place.kind === "channel" ? `#${place.name}` : place.name) : "";
  const title = place?.kind === "channel"
    ? <button type="button" className="title-button" aria-label={`${titleText}, ${place.guild ?? "server"}. Show channels`}
      onClick={() => navigate({ screen: "channels" })}>
      <span className="title-main">{titleText}</span>
      {place.guild && <span className="title-sub">{place.guild}</span>}
      <Icon name="down" className="title-chevron" />
    </button>
    : titleText;

  return <div className="chat-screen">
    <TopBar title={title} back actions={view !== "auth" && <RefreshButton busy={busy} />} />
    <ProgressBar active={busy} />
    {view === "auth" ? <div className="screen"><SignInNotice /></div>
      : view === "error" ? <div className="screen"><LoadError error={page.error ?? list.error} title="Couldn't load this conversation" /></div>
      : view === "loading" ? <div className="screen" aria-busy="true"><MessagesSkeleton /></div>
      : <MessageList keys={keys} place={place} empty={view === "empty"} fadeIn={fadeIn} stale={list.status === "error"}
        onMedia={setLightbox} />}
    {view !== "auth" && here && <Composer placeholder={place ? `Message ${titleText}` : "Message"} />}
    {lightbox && <Lightbox {...lightbox} onClose={() => setLightbox(null)} />}
  </div>;
}

/**
 * The message scroller. It starts at the bottom and keeps its distance from the bottom while
 * older messages arrive above and images load; at the bottom it follows new messages.
 */
function MessageList({ keys, place, empty, fadeIn, stale, onMedia }: {
  keys: readonly string[]; place: Place | null; empty: boolean; fadeIn: boolean; stale: boolean;
  onMedia(media: { url: string; video: boolean }): void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const fromBottom = useRef(0);
  const [far, setFar] = useState(false);
  const { loading, failed, load } = useLoadOlder();
  const beginning = place?.beginning ?? false;
  const autoLoad = !beginning && !failed && keys.length > 0;

  const measure = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    fromBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight;
    setFar(fromBottom.current > JUMP_PX);
  }, []);

  const anchor = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    const keep = fromBottom.current < STICK_PX ? 0 : fromBottom.current;
    node.scrollTop = node.scrollHeight - node.clientHeight - keep;
  }, []);

  useLayoutEffect(anchor, [keys, anchor]);

  useEffect(() => {
    const node = scroller.current;
    if (!node || !content.current) return;
    const observer = new ResizeObserver(anchor);
    observer.observe(node);
    observer.observe(content.current);
    return () => observer.disconnect();
  }, [anchor]);

  // Reaching the top loads older messages, as Discord's own list does.
  useEffect(() => {
    const node = top.current;
    if (!node || !autoLoad) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) load();
    }, { root: scroller.current, rootMargin: "400px 0px 0px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [autoLoad, load]);

  const jump = () => {
    const node = scroller.current;
    node?.scrollTo({ top: node.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  return <div className="chat-body">
    <div ref={scroller} className="screen messages-scroller" onScroll={measure}>
      <div ref={content} className={`messages${fadeIn ? " reveal" : ""}`}>
        <div ref={top} className="messages-top">
          {beginning || empty ? <Beginning place={place} />
            : <button type="button" className="button secondary small" onClick={load} disabled={loading} aria-busy={loading}>
              <Icon name="older" />{loading ? "Loading older messages" : "Load older messages"}
            </button>}
        </div>
        {stale && <InlineError>Couldn't refresh. Showing the last copy.</InlineError>}
        <ol className="message-list" aria-label={place ? `Messages in ${place.name}` : "Messages"}>
          {keys.map(key => <MessageRow key={key} id={key} onMedia={onMedia} />)}
        </ol>
      </div>
    </div>
    {far && <button type="button" className="jump" onClick={jump}><Icon name="down" />Jump to present</button>}
  </div>;
}

function useLoadOlder() {
  const loadOlder = useDiscordCommand("loadOlder");
  const { show } = useToast();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  const load = useCallback(() => {
    if (running.current) return;
    running.current = true;
    setLoading(true);
    void loadOlder().then(result => {
      const text = failureText(result, "Discord didn't load older messages.");
      // A failure stops loading on scroll; the button stays to try again.
      setFailed(text !== null);
      if (text) show({ text });
    }).finally(() => { running.current = false; setLoading(false); });
  }, [loadOlder, show]);
  return { loading, failed, load };
}

function Beginning({ place }: { place: Place | null }) {
  if (!place) return null;
  return <div className="beginning">
    <span className="beginning-icon" aria-hidden="true"><Icon name={place.kind === "channel" ? "hash" : "person"} /></span>
    <h2>{place.kind === "channel" ? `Welcome to #${place.name}` : place.name}</h2>
    <p>{place.kind === "channel" ? `This is the start of the #${place.name} channel.` : `This is the beginning of your conversation with ${place.name}.`}</p>
  </div>;
}

function MessageRow({ id, onMedia }: { id: string; onMedia(media: { url: string; video: boolean }): void }) {
  const message = useRecord<Message>(WATCH, id, "primary");
  if (!message) return null;
  if (message.system) return <li className="message system">
    <Icon name="chevron" className="system-icon" />
    <p><Parts parts={message.parts} /> <time dateTime={message.time ?? undefined}>{formatTime(message.time, true)}</time></p>
  </li>;
  return <li className={`message${message.start ? " start" : ""}`}>
    {message.reply && <p className="reply-quote"><Icon name="reply" /><strong>@{message.reply.author}</strong> <span>{message.reply.text}</span></p>}
    {message.start ? <Avatar src={message.avatar} name={message.author} className="message-avatar" />
      : <time className="message-gutter" dateTime={message.time ?? undefined}>{formatTime(message.time, false)}</time>}
    <div className="message-body">
      {message.start && <header className="message-head">
        <strong>{message.author}</strong>
        <time dateTime={message.time ?? undefined}>{formatTime(message.time, true)}</time>
      </header>}
      {message.parts.length > 0 && <p className="message-text">
        <Parts parts={message.parts} />
        {message.edited && <span className="edited"> (edited)</span>}
      </p>}
      {message.stickers.map((sticker, index) => sticker.url
        ? <img key={index} className="sticker" src={sticker.url} alt={`Sticker, ${sticker.name}`} loading="lazy" referrerPolicy="no-referrer" />
        : <p key={index} className="sticker-name">Sticker: {sticker.name}</p>)}
      {message.media.length > 0 && <div className={`media-grid count-${Math.min(message.media.length, 4)}`}>
        {message.media.map((media, index) => <button type="button" key={`${media.url}:${index}`} className="media"
          style={media.ratio ? { aspectRatio: String(media.ratio) } as CSSProperties : undefined}
          aria-label={media.video ? "Play video" : "Show image"} onClick={() => onMedia(media)}>
          {media.video ? <span className="media-video"><Icon name="play" filled className="play" /></span>
            : <img src={media.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />}
        </button>)}
      </div>}
      {message.files.map((file, index) => <FileRow key={`${file.name}:${index}`} {...file} />)}
      {message.embeds.map((embed, index) => <EmbedCard key={`${embed.url}:${index}`} embed={embed} />)}
      {message.reactions.length > 0 && <Reactions message={id} reactions={message.reactions} />}
    </div>
  </li>;
}

/** Message text: plain runs keep their line breaks; links open through the route table or the browser. */
function Parts({ parts }: { parts: Part[] }) {
  const openLink = useOpenLink(useOpenUrl());
  return <>{parts.map((part, index) => {
    switch (part.kind) {
      case "link": return part.url
        ? <a key={index} href={part.url} onClick={event => { event.preventDefault(); openLink(part.url!); }}>{part.text}</a>
        : <span key={index}>{part.text}</span>;
      case "mention": return <span key={index} className="mention">{part.text}</span>;
      case "code": return <code key={index}>{part.text}</code>;
      case "block": return <pre key={index}><code>{part.text}</code></pre>;
      case "emoji": return part.image
        ? <img key={index} className="emoji" src={part.image} alt={part.text} title={part.text} referrerPolicy="no-referrer" />
        : <span key={index}>{part.text}</span>;
      default: return <span key={index}>{part.text}</span>;
    }
  })}</>;
}

function FileRow({ name, url, size }: { name: string; url: string | null; size: string | null }) {
  const openLink = useOpenLink(useOpenUrl());
  const inner = <>
    <Icon name="file" className="file-icon" />
    <span className="file-text"><strong>{name}</strong>{size && <span>{size}</span>}</span>
  </>;
  return url ? <button type="button" className="file" aria-label={`${name}, opens in browser`} onClick={() => openLink(url)}>{inner}</button>
    : <div className="file">{inner}</div>;
}

function EmbedCard({ embed }: { embed: Embed }) {
  const openLink = useOpenLink(useOpenUrl());
  if (!embed.title && !embed.description && !embed.image) return null;
  const body = <>
    {embed.provider && <span className="embed-provider">{embed.provider}</span>}
    {embed.title && <strong className="embed-title">{embed.title}</strong>}
    {embed.description && <span className="embed-text">{embed.description}</span>}
    {embed.image && <img className="embed-image" src={embed.image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
  </>;
  return embed.url
    ? <button type="button" className="embed" onClick={() => openLink(embed.url!)}>{body}</button>
    : <div className="embed">{body}</div>;
}

/** Reaction chips. A tap adds or removes the user's reaction and shows it until Discord does. */
function Reactions({ message, reactions }: { message: string; reactions: Reaction[] }) {
  const setReaction = useDiscordCommand<{ message: string; emoji: string; on: boolean }>("setReaction");
  const pending = usePendingCalls<{ message: string; emoji: string; on: boolean }>("setReaction").filter(call => call.message === message);
  const { show } = useToast();
  return <ul className="reactions" aria-label="Reactions">
    {reactions.map(reaction => {
      const wanted = pending.filter(call => call.emoji === reaction.emoji).at(-1);
      const mine = wanted ? wanted.on : reaction.mine;
      const count = reaction.count + (mine === reaction.mine ? 0 : mine ? 1 : -1);
      if (count <= 0) return null;
      const toggle = () => void setReaction({ message, emoji: reaction.emoji, on: !mine }).then(result => {
        const text = failureText(result);
        if (text) show({ text });
      });
      return <li key={reaction.emoji}>
        <button type="button" className={`reaction${mine ? " mine" : ""}`} aria-pressed={mine}
          aria-label={`${reaction.emoji}, ${count} ${count === 1 ? "reaction" : "reactions"}`} onClick={toggle}>
          {reaction.image ? <img src={reaction.image} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{reaction.emoji}</span>}
          <span aria-hidden="true">{count}</span>
        </button>
      </li>;
    })}
  </ul>;
}
