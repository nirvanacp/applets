import { useState } from "react";
import type { StoredDocument } from "@genesis/sdk";
import { libraryMessage, useLibrary, useRepositories, type CategorySnapshot, type CategoryV1 } from "../library";
import { InlineError } from "../components/states";
import { RetryButton, useBusy, useToast } from "../ui/feedback";
import { PageScroller, RefreshButton, ScreenHead } from "../ui/frame";
import { CategoriesSkeleton } from "../ui/skeletons";
import { Notice, useSawLoading } from "../ui/states";

/** Creates, renames and deletes Saved categories. Opened from Saved; Back closes it. */
export function CategoriesScreen() {
  const library = useLibrary();
  const [refreshing, runRefresh] = useBusy();
  const fadeIn = useSawLoading(!library.categories && !library.error);
  const head = <ScreenHead eyebrow="Saved stories" title="Categories"
    actions={<RefreshButton busy={refreshing} onRefresh={() => void runRefresh(() => library.retry())} />} />;
  if (!library.categories && library.error) return <>
    {head}
    <div className="screen">
      <Notice title="Couldn't load categories" role="alert">
        <p>{libraryMessage(library.error)}</p>
        <div className="row-buttons"><RetryButton error={library.error} onRetry={library.retry} /></div>
      </Notice>
    </div>
  </>;
  if (!library.categories) return <>{head}<CategoriesSkeleton /></>;
  // No pull to refresh: a reread would replace names being typed.
  return <>
    {head}
    <PageScroller busy={refreshing} pull={false}>
      <div className={fadeIn ? "reveal" : undefined}><CategoryManager categories={library.categories} /></div>
    </PageScroller>
  </>;
}

function CategoryManager({ categories }: { categories: CategorySnapshot }) {
  const { categoryRepository, storage } = useRepositories();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [busy, run] = useBusy();
  const [problem, setProblem] = useState("");
  const perform = (operation: () => Promise<unknown>, done: string) => void run(async () => {
    setProblem("");
    try {
      await operation();
      show({ text: done });
    } catch (error) {
      storage.refresh();
      setProblem(`${libraryMessage(error)} The list has been reread; review it before retrying.`);
    }
  });
  return <section className="manager" aria-busy={busy} aria-label="Manage categories">
    <p className="meta">Changes save immediately. Deleting a category keeps its stories, which become Uncategorized.</p>
    {problem && <InlineError>{problem}</InlineError>}
    <form className="field-row" onSubmit={event => {
      event.preventDefault();
      if (name.trim()) perform(async () => { await categoryRepository.create(name); setName(""); }, "Category created");
    }}>
      <label className="grow"><span className="visually-hidden">New category name</span>
        <input placeholder="New category" value={name} disabled={busy} enterKeyHint="done" autoCapitalize="sentences"
          onChange={event => setName(event.target.value)} />
      </label>
      <button type="submit" className="button" disabled={busy || !name.trim()}>Create</button>
    </form>
    <p className="meta">{categories.categories.length} of 50 categories</p>
    {categories.categories.length === 0 && <p className="meta empty-line">No categories yet. Saved stories stay Uncategorized until you add one.</p>}
    {categories.categories.map(record => <CategoryRow key={`${record.value.id}:${record.revision}`} record={record} busy={busy}
      rename={value => perform(() => categoryRepository.rename(record, value), "Category renamed")}
      remove={() => perform(() => categoryRepository.remove(record), `Deleted “${record.value.name}”`)} />)}
  </section>;
}

function CategoryRow({ record, busy, rename, remove }: {
  record: StoredDocument<CategoryV1>; busy: boolean; rename(value: string): void; remove(): void;
}) {
  const [name, setName] = useState(record.value.name);
  const [confirming, setConfirming] = useState(false);
  const changed = name.trim() !== "" && name !== record.value.name;
  return <div className="category">
    <form className="field-row" onSubmit={event => { event.preventDefault(); if (changed) rename(name); }}>
      <label className="grow"><span className="visually-hidden">Rename {record.value.name}</span>
        <input value={name} disabled={busy} enterKeyHint="done" autoCapitalize="sentences" onChange={event => setName(event.target.value)} />
      </label>
      {changed
        ? <button type="submit" className="button secondary" disabled={busy}>Rename</button>
        : <button type="button" className="text-button danger-text" disabled={busy} onClick={() => setConfirming(true)}>Delete</button>}
    </form>
    {confirming && <div className="confirm" role="group" aria-label={`Delete ${record.value.name}`}>
      <p>Delete “{record.value.name}”? Its stories stay saved.</p>
      <div className="row-buttons">
        <button type="button" className="button danger" disabled={busy} onClick={remove}>Delete category</button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => setConfirming(false)}>Keep category</button>
      </div>
    </div>}
  </div>;
}
