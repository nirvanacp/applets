/**
 * Categories for saved posts, kept by the applet's `bookmarks` service, a servelet on the phone. The
 * service checks every write against the record revisions it was given and refuses stale ones. Its
 * library belongs to the first X account that opens it.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { serviceMessage } from "@nirvanacp/sdk";
import { useAppResume, useRecords, useRouter, useService, useWatch } from "@nirvanacp/sdk/react";
import {
  isObject, validBookmark, validCategory, validLibrary, validMembership, validReceipt,
  type AccountData, type Bookmark, type BookmarkPage, type Category, type Library, type Membership, type PostView, type Receipt, type Snapshot,
} from "./model";

export class LibraryError extends Error {
  constructor(readonly code: string, message: string, readonly uncertain = false) {
    super(message);
    this.name = "LibraryError";
  }
}

const MESSAGES: Record<string, string> = {
  CONFLICT: "This item changed. Refresh before saving again.",
  CATEGORY_NAME_EXISTS: "A category with this name already exists.",
  CATEGORY_NOT_EMPTY: "Move or remove its saved posts before deleting this category.",
  CATEGORY_MISSING: "A selected category no longer exists. Review your choices.",
  CURSOR_STALE: "The list changed while loading. Refresh to see it.",
  LIMIT_REACHED: "This would go over a library limit.",
  ACCOUNT_MISMATCH: "These categories belong to a different X account. Switch accounts on X to use them.",
  SIGN_IN: "Sign in to X to use your categories.",
  UNCERTAIN: "The last change may not have finished. Check it before making another.",
};

/** True when a change's outcome is unknown; the library gate then asks to check it. */
export const isUncertain = (error: unknown) => (error as { code?: string } | null)?.code === "UNCERTAIN";

export function libraryMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (error instanceof LibraryError) return error.message;
  return serviceMessage(error);
}

/** A pending-change marker: written before a change is sent, cleared once its outcome is known. */
interface PendingOperation { operationId: string; kind: string; libraryId: string; createdAtMs: number; recordId: string }

export interface LibraryState {
  library: Library | null;
  categories: Category[];
  pending: PendingOperation | null;
  loading: boolean;
  error: unknown;
  reload(): void;
}

/** The service client. Each call throws a `LibraryError` with the service's code. */
export function useBookmarksService() {
  const request = useService("bookmarks");
  return useMemo(() => {
    /** Sends one request and returns the `result` of the service's `{ result }` envelope. */
    async function call(path: string, body?: unknown): Promise<unknown> {
      const response = await request<{ result?: unknown; error?: { code?: string; message?: string } }>(path, body === undefined ? {} : { method: "POST", body });
      if (response.status >= 200 && response.status < 300) return response.body?.result;
      const failure = response.body?.error;
      throw new LibraryError(failure?.code ?? "SERVICE_FAILURE", failure?.message ?? "The bookmarks service refused the request.", response.status >= 500);
    }
    const valid = <T>(value: unknown, check: (value: unknown) => boolean): T => {
      if (!check(value)) throw new LibraryError("SERVICE_FAILURE", "The bookmarks service sent an invalid answer.");
      return value as T;
    };
    return {
      /** The library, created for this handle when there is none yet; an existing one keeps its own handle. */
      open: async (handle: string) => valid<Library>(await call("/v1/library", { expectedHandle: handle }), validLibrary),
      categories: async () => {
        const result = await call("/v1/categories");
        return valid<Category[]>(isObject(result) ? result.categories : undefined, value => Array.isArray(value) && value.every(validCategory));
      },
      lookup: async (postId: string) => {
        const result = await call("/v1/bookmarks/lookup", { postIds: [postId] });
        const records = valid<Membership[]>(isObject(result) ? result.records : undefined, value => Array.isArray(value) && value.every(validMembership));
        return records.find(record => record.postId === postId) ?? null;
      },
      query: async (categoryId: string | null, query: string, cursor: string | null) =>
        valid<BookmarkPage>(await call("/v1/bookmarks/query", { categoryId, query, cursor, limit: 20 }),
          value => isObject(value) && Array.isArray(value.entries) && value.entries.every(validBookmark)),
      operate: async (operationId: string, kind: string, payload: unknown) =>
        valid<Receipt>(await call("/v1/operations", { operationId, kind, payload }), validReceipt),
      receipt: async (operationId: string) => valid<Receipt>(await call(`/v1/operations/${operationId}`), validReceipt),
    };
  }, [request]);
}

export type BookmarksService = ReturnType<typeof useBookmarksService>;

/**
 * The handle the Profile tab's context last showed, kept across its pages: X's own pages there,
 * such as the Following list, show no route but keep the same account. It is forgotten when the
 * person is signed out and on resume or Done, when the account page loads again, since the
 * website sheet or time away may have changed the account.
 */
const known = { handle: null as string | null, listeners: new Set<() => void>() };

function setKnownHandle(handle: string | null) {
  if (known.handle === handle) return;
  known.handle = handle;
  for (const listener of [...known.listeners]) listener();
}

const subscribeKnown = (listener: () => void) => {
  known.listeners.add(listener);
  return () => { known.listeners.delete(listener); };
};

/** The signed-in X account as the pages last showed it; X shows the same account in every context. */
export function useAccount(): { account: AccountData | null; signedOut: boolean } {
  const status = useRouter().status("account");
  // The handle the page module's `account` reader sees on the Profile tab's current page.
  const watch = useWatch<string | false | null>("library:account", { reader: "account" }, { context: "account" });
  const fresh = watch.status === "ready" && !watch.stale && !watch.idle;
  const signedOut = status.status === "auth";
  const seen = fresh && watch.value !== null ? watch.value : null;
  useEffect(() => {
    if (signedOut || seen === false) setKnownHandle(null);
    else if (typeof seen === "string") setKnownHandle(seen);
  }, [signedOut, seen]);
  useAppResume(() => setKnownHandle(null));
  const handle = useSyncExternalStore(subscribeKnown, () => known.handle);
  return { account: handle && !signedOut ? { handle, name: null } : null, signedOut };
}

/**
 * A count of library reloads shared by every screen, so a change made in a sheet also refreshes
 * the screen behind it, which reads its own copy of the library.
 */
const libraryReads = { count: 0, listeners: new Set<() => void>() };

function readLibraryAgain() {
  libraryReads.count += 1;
  for (const listener of [...libraryReads.listeners]) listener();
}

const subscribeReads = (listener: () => void) => {
  libraryReads.listeners.add(listener);
  return () => { libraryReads.listeners.delete(listener); };
};

/** The library, its categories and any change left pending, checked against the signed-in account. */
export function useLibrary(): LibraryState & { service: BookmarksService; operate(kind: string, payload: Record<string, unknown>, recordId: string): Promise<Receipt>; check(): Promise<void> } {
  const service = useBookmarksService();
  const { account, signedOut } = useAccount();
  const operations = useRecords<PendingOperation>("operations");
  const [state, setState] = useState<{ library: Library | null; categories: Category[]; loading: boolean; error: unknown }>(
    { library: null, categories: [], loading: true, error: null });
  const reads = useSyncExternalStore(subscribeReads, () => libraryReads.count);
  const reload = useCallback(readLibraryAgain, []);
  useAppResume(reload);
  const handle = account?.handle ?? null;

  // The library is opened only once the signed-in account is known, since the first account to
  // open it claims it.
  useEffect(() => {
    if (!handle) return;
    let active = true;
    setState(previous => ({ ...previous, loading: true }));
    service.open(handle).then(async library => {
      const categories = await service.categories();
      if (active) setState({ library, categories, loading: false, error: null });
    }).catch(error => {
      if (active) setState(previous => ({ ...previous, loading: false, error }));
    });
    return () => { active = false; };
  }, [service, reads, handle]);

  const library = state.library;
  const pending = library ? operations.records.find(record => record.key === `pending:${library.libraryId}`)?.value ?? null : null;
  let error = state.error;
  if (!error && !account) error = new LibraryError(signedOut ? "SIGN_IN" : "ACCOUNT_UNKNOWN", signedOut ? MESSAGES.SIGN_IN : "Checking your X account…");
  if (!error && library && account && account.handle!.toLowerCase() !== library.expectedHandle.toLowerCase()) {
    error = new LibraryError("ACCOUNT_MISMATCH", MESSAGES.ACCOUNT_MISMATCH);
  }

  /** Sends one change. A change with an unknown outcome stays marked until `check` reads its receipt. */
  const operate = async (kind: string, payload: Record<string, unknown>, recordId: string) => {
    if (!library || error) throw error ?? new LibraryError("SERVICE_FAILURE", "The library isn't loaded.");
    if (pending) throw new LibraryError("UNCERTAIN", MESSAGES.UNCERTAIN);
    const marker = `pending:${library.libraryId}`;
    const operationId = crypto.randomUUID();
    await operations.put(marker, { operationId, kind, libraryId: library.libraryId, createdAtMs: Date.now(), recordId });
    try {
      const receipt = await service.operate(operationId, kind, payload);
      await operations.remove(marker);
      return receipt;
    } catch (failure) {
      const uncertain = !(failure instanceof LibraryError) || failure.uncertain;
      if (!uncertain) await operations.remove(marker);
      throw uncertain ? new LibraryError("UNCERTAIN", MESSAGES.UNCERTAIN, true) : failure;
    } finally {
      reload();
    }
  };

  /** Resolves a pending change: a receipt means it committed; OPERATION_NOT_FOUND means it never did. */
  const check = async () => {
    if (!library || !pending) return;
    try {
      await service.receipt(pending.operationId);
    } catch (failure) {
      if ((failure as LibraryError).code !== "OPERATION_NOT_FOUND") throw failure;
    }
    await operations.remove(`pending:${library.libraryId}`);
    reload();
  };

  return { ...state, error, pending, reload, service, operate, check, loading: state.loading || operations.loading };
}

/** What the service keeps about a post when it is first saved. */
export function snapshotOf(post: PostView): Snapshot {
  const text = post.parts.map(part => part.text).join("");
  const media = post.photos.length && post.videos ? "mixed" : post.videos ? "video" : post.photos.length ? "photo" : "none";
  const links = post.parts.filter(part => part.href).map(part => ({ text: part.text.slice(0, 300), href: part.href! })).slice(0, 8);
  return {
    authorHandle: post.handle.toLowerCase(),
    authorName: post.name,
    text,
    textState: post.textState,
    capturedAtMs: Date.now(),
    media: { kind: media, count: Math.min(16, post.photos.length + post.videos) },
    links,
  };
}

export type { Bookmark };
