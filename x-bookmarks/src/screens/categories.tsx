import { useEffect, useRef, useState } from "react";
import { ScrollMemory, useRecords, useRouter, type CurrentScreen } from "@nirvanacp/sdk/react";
import { libraryMessage, useLibrary, type Bookmark } from "../library";
import { profileUrl } from "../model";
import { LibraryGate } from "../components/library";
import { SavedSegments } from "../components/saved";
import { InlineError } from "../components/states";
import { TopBar, useOpenUrl } from "../ui/frame";
import { Icon } from "../ui/icons";
import { rememberOpener } from "../ui/sheet";
import { FeedSkeleton } from "../ui/skeletons";
import { Notice } from "../ui/states";

/** The filter and search kept per library in the `preferences` collection, in the first release's shape. */
interface Preferences { query: string; categoryId: string | null; scroll: number }

type Page = { entries: Bookmark[]; cursor: string | null; loading: boolean; error: unknown };

/** Saved posts filed into the person's own categories, kept by the applet's bookmarks service. */
export function CategoriesScreen(_: { screen: CurrentScreen }) {
  const { navigate } = useRouter();
  const library = useLibrary();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<Page>({ entries: [], cursor: null, loading: true, error: null });
  const revision = library.library?.revision;
  const { service } = library;

  // The last filter and search for this library come back before the first query; changes are kept.
  const preferences = useRecords<Preferences>("preferences");
  const key = library.library ? `library:${library.library.libraryId}` : null;
  const saved = key ? (preferences.records.find(record => record.key === key)
    ?? preferences.records.find(record => record.key === "library"))?.value ?? null : null;
  const [applied, setApplied] = useState<string | null>(null);
  useEffect(() => {
    if (!key || preferences.loading || applied === key) return;
    setApplied(key);
    // Another library starts from the defaults, so the previous library's filter never carries over.
    const savedQuery = typeof saved?.query === "string" ? saved.query : "";
    setQuery(savedQuery);
    setDraft(savedQuery);
    setCategoryId(saved?.categoryId && library.categories.some(category => category.id === saved.categoryId) ? saved.categoryId : null);
  }, [key, preferences.loading, applied, saved, library.categories]);
  useEffect(() => {
    const unchanged = saved ? saved.query === query && saved.categoryId === categoryId : !query && categoryId === null;
    if (!key || applied !== key || unchanged) return;
    void preferences.put(key, { query, categoryId, scroll: saved?.scroll ?? 0 }).catch(() => {});
  }, [key, applied, query, categoryId]); // Only the person's changes write; reading `saved` back does not.
  const usable = !!library.library && !library.error && !library.pending && applied === key;

  // A new filter, search or library revision starts the list over; the shown rows stay until it
  // answers. Each start is a new generation, so a Load more from the previous list is dropped.
  const generation = useRef(0);
  useEffect(() => {
    if (!usable) return;
    let active = true;
    generation.current += 1;
    setPage(previous => ({ ...previous, loading: true, error: null }));
    service.query(categoryId, query, null).then(result => {
      if (active) setPage({ entries: result.entries, cursor: result.nextCursor, loading: false, error: null });
    }, error => {
      if (active) setPage(previous => ({ ...previous, loading: false, error }));
    });
    return () => { active = false; };
  }, [usable, service, categoryId, query, revision]);

  const more = () => {
    if (!page.cursor || page.loading) return;
    const started = generation.current;
    setPage(previous => ({ ...previous, loading: true }));
    service.query(categoryId, query, page.cursor).then(result => {
      if (started === generation.current) setPage(previous => ({ entries: [...previous.entries, ...result.entries], cursor: result.nextCursor, loading: false, error: null }));
    }, error => { if (started === generation.current) setPage(previous => ({ ...previous, loading: false, error })); });
  };

  const names = new Map(library.categories.map(category => [category.id, category.name]));
  const total = library.categories.reduce((sum, category) => sum + category.count, 0);
  const first = page.loading && page.entries.length === 0;

  return <>
    <TopBar title="Saved" actions={<button type="button" className="icon-button" aria-label="Manage categories"
      disabled={!usable} onClick={() => { rememberOpener(); navigate({ screen: "manage" }); }}><Icon name="edit" /></button>} />
    <SavedSegments active="categories" />
    <ScrollMemory className="screen" aria-busy={page.loading}>
      <LibraryGate library={library}>
        <div className="library-tools">
          <form className="search-form inset" role="search" onSubmit={event => { event.preventDefault(); setQuery(draft.trim()); }}>
            <label className="search-field"><Icon name="search" /><span className="visually-hidden">Search saved posts</span>
              <input type="search" placeholder="Search saved posts" value={draft} enterKeyHint="search"
                onChange={event => { setDraft(event.target.value); if (!event.target.value) setQuery(""); }} />
            </label>
          </form>
          <div className="chips" role="group" aria-label="Filter by category">
            <button type="button" className="chip" aria-pressed={categoryId === null} onClick={() => setCategoryId(null)}>All</button>
            {library.categories.map(category => <button type="button" key={category.id} className="chip" aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}>{category.name} <span className="chip-count">{category.count}</span></button>)}
            <button type="button" className="chip add" onClick={() => { rememberOpener(); navigate({ screen: "manage" }); }}>
              <Icon name="plus" /> New
            </button>
          </div>
        </div>
        {page.error != null && <InlineError>{libraryMessage(page.error)}</InlineError>}
        {first ? <FeedSkeleton label="Loading saved posts" rows={3} />
          : page.entries.length === 0 && !page.error ? <Notice title={query ? "No matches" : library.categories.length ? "Nothing filed here" : "No categories yet"}>
            <p>{query ? "Try other words." : library.categories.length
              ? total ? "No saved posts in this category." : "Tap the folder on any post to file it."
              : "Create a category, then tap the folder on any post to file it."}</p>
            {!library.categories.length && <div className="row-buttons">
              <button type="button" className="button primary" onClick={() => { rememberOpener(); navigate({ screen: "manage" }); }}>Create a category</button>
            </div>}
          </Notice>
          : <div className={`feed${page.loading ? " dimmed" : ""}`}>
            {page.entries.map(entry => <SavedRow key={entry.postId} entry={entry} names={names} />)}
          </div>}
        {page.cursor && <div className="more">
          <button type="button" className="button secondary" disabled={page.loading} aria-busy={page.loading} onClick={more}>
            {page.loading ? <><span className="spinner" aria-hidden="true" /> Loading…</> : "Load more"}
          </button>
        </div>}
      </LibraryGate>
    </ScrollMemory>
  </>;
}

/** A saved post from the service's snapshot: it opens on the applet's post screen, and Edit opens the save sheet. */
function SavedRow({ entry, names }: { entry: Bookmark; names: Map<string, string> }) {
  const open = useOpenUrl();
  const { navigate } = useRouter();
  const { snapshot } = entry;
  const author = profileUrl(snapshot.authorHandle);
  const media = snapshot.media.count ? `${snapshot.media.count} ${snapshot.media.kind === "video" ? (snapshot.media.count > 1 ? "videos" : "video") : snapshot.media.count > 1 ? "photos" : "photo"}` : "";
  return <article className="saved-post">
    <header className="post-head">
      <a className="post-name" href={author} onClick={event => { event.preventDefault(); open(author); }}><strong>{snapshot.authorName}</strong></a>
      <span className="post-meta">@{snapshot.authorHandle}</span>
    </header>
    {/* A button by role, so the text keeps its paragraph layout. */}
    <div className="post-content tappable" role="button" tabIndex={0} onClick={() => open(entry.url)}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(entry.url); } }}>
      <p className="post-text clamp" dir="auto">{snapshot.text || media || "Post"}</p>
      {snapshot.text && media && <p className="post-meta"><Icon name="photo" /> {media}</p>}
    </div>
    <div className="pills">
      {entry.categoryIds.map(id => names.has(id) && <span key={id} className="pill">{names.get(id)}</span>)}
      <button type="button" className="text-button" onClick={() => {
        rememberOpener();
        navigate({ screen: "save", params: { post: JSON.stringify({ postId: entry.postId, url: entry.url, snapshot }) } });
      }}>Edit</button>
    </div>
  </article>;
}
