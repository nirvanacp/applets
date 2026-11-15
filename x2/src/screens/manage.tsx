import { useState } from "react";
import type { CurrentScreen } from "@genesis/sdk/react";
import { libraryMessage, useLibrary } from "../library";
import { CATEGORY_LIMIT, validateName, type Category } from "../model";
import { LibraryGate, type LibraryHandle } from "../components/library";
import { InlineError } from "../components/states";
import { useBusy, useToast } from "../ui/feedback";
import { Icon } from "../ui/icons";
import { Confirm, Sheet } from "../ui/sheet";

/** Create, rename and delete categories, as a sheet. A category with posts in it can't be deleted. */
export function ManageScreen(_: { screen: CurrentScreen }) {
  const library = useLibrary();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [creating, run] = useBusy();

  const create = () => run(async () => {
    const problem = validateName(name);
    if (problem) { setMessage(problem); return; }
    setMessage("");
    const id = crypto.randomUUID();
    try {
      await library.operate("category.create", { id, name }, id);
      setName("");
    } catch (error) {
      setMessage(libraryMessage(error));
    }
  });

  const count = library.categories.length;
  return <Sheet title="Manage categories">
    <LibraryGate library={library} compact>
      {count < CATEGORY_LIMIT
        ? <form className="field-row" onSubmit={event => { event.preventDefault(); void create(); }}>
          <label className="grow"><span className="visually-hidden">New category name</span>
            <input className="input" placeholder="New category" value={name} maxLength={80} enterKeyHint="done" disabled={creating}
              onChange={event => { setName(event.target.value); setMessage(""); }} />
          </label>
          <button type="submit" className="button primary" disabled={creating || !name.trim()} aria-busy={creating}>{creating ? "Creating…" : "Create"}</button>
        </form>
        : <p className="post-meta hint">You have {CATEGORY_LIMIT} categories, the most allowed.</p>}
      {message && <InlineError>{message}</InlineError>}
      <p className="post-meta hint">{count} of {CATEGORY_LIMIT} categories</p>
      <ul className="category-list">
        {library.categories.map(category => <CategoryRow key={category.id} category={category} library={library} />)}
      </ul>
    </LibraryGate>
  </Sheet>;
}

function CategoryRow({ category, library }: { category: Category; library: LibraryHandle }) {
  const { show } = useToast();
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [name, setName] = useState(category.name);
  const [problem, setProblem] = useState("");
  const [busy, run] = useBusy();

  const rename = () => run(async () => {
    const invalid = validateName(name);
    if (invalid) { setProblem(invalid); return; }
    try {
      await library.operate("category.rename", { id: category.id, expectedRevision: category.revision, name }, category.id);
      setMode("view");
    } catch (error) {
      setProblem(libraryMessage(error));
    }
  });

  // Only an empty category can be deleted, so Undo recreates it by name.
  const remove = () => run(async () => {
    try {
      await library.operate("category.delete", { id: category.id, expectedRevision: category.revision }, category.id);
      const id = crypto.randomUUID();
      show({
        text: `Deleted “${category.name}”`,
        action: { label: "Undo", run: () => library.operate("category.create", { id, name: category.name }, id).catch(error => show({ text: libraryMessage(error) })) },
      });
    } catch (error) {
      setMode("view");
      setProblem(libraryMessage(error));
    }
  });

  if (mode === "rename") return <li className="category editing">
    <form className="field-row" onSubmit={event => { event.preventDefault(); void rename(); }}>
      <label className="grow"><span className="visually-hidden">New name for {category.name}</span>
        <input className="input" value={name} maxLength={80} autoFocus enterKeyHint="done" disabled={busy}
          onChange={event => { setName(event.target.value); setProblem(""); }} />
      </label>
      <button type="button" className="button secondary" disabled={busy} onClick={() => { setName(category.name); setProblem(""); setMode("view"); }}>Cancel</button>
      <button type="submit" className="button primary" disabled={busy || !name.trim()} aria-busy={busy}>{busy ? "Saving…" : "Save"}</button>
    </form>
    {problem && <InlineError>{problem}</InlineError>}
  </li>;

  return <li className="category">
    <div className="category-head">
      <span className="category-icon" aria-hidden="true"><Icon name="folder" /></span>
      <span className="grow"><strong>{category.name}</strong><span className="post-meta">{category.count} {category.count === 1 ? "post" : "posts"}</span></span>
      <button type="button" className="icon-button" aria-label={`Rename ${category.name}`} disabled={busy} onClick={() => setMode("rename")}><Icon name="edit" /></button>
      <button type="button" className="icon-button danger-text" aria-label={`Delete ${category.name}`} disabled={busy} onClick={() => setMode("delete")}><Icon name="trash" /></button>
    </div>
    {problem && <InlineError>{problem}</InlineError>}
    {mode === "delete" && (category.count
      ? <div className="confirm" role="note">
        <p>“{category.name}” has {category.count} saved {category.count === 1 ? "post" : "posts"}. Move or remove them before deleting it.</p>
        <div className="confirm-buttons"><button type="button" className="button secondary" onClick={() => setMode("view")}>Got it</button></div>
      </div>
      : <Confirm text={`Delete “${category.name}”?`} confirm="Delete" busy={busy} onCancel={() => setMode("view")} onConfirm={() => void remove()} />)}
  </li>;
}
