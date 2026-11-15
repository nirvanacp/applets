import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface Toast { id: number; text: string; action?: { label: string; run(): unknown } }
interface Toasts { toast: Toast | null; show(toast: Omit<Toast, "id">): void; clear(): void }
const ToastContext = createContext<Toasts | null>(null);
let nextToast = 1;

/** One toast at a time; a new one replaces the old. A toast with an action stays longer. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef(0);
  const clear = useCallback(() => { window.clearTimeout(timer.current); setToast(null); }, []);
  const show = useCallback((next: Omit<Toast, "id">) => {
    window.clearTimeout(timer.current);
    const shown = { ...next, id: nextToast++ };
    setToast(shown);
    timer.current = window.setTimeout(() => setToast(current => current?.id === shown.id ? null : current), next.action ? 6000 : 4000);
  }, []);
  const value = useMemo(() => ({ toast, show, clear }), [toast, show, clear]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): Toasts {
  const toasts = useContext(ToastContext);
  if (!toasts) throw new Error("useToast needs a ToastProvider");
  return toasts;
}

/** Keeps the toast mounted for its exit. A failed action says so instead of disappearing. */
export function ToastRegion() {
  const { toast, show, clear } = useToast();
  const [shown, setShown] = useState<{ toast: Toast; leaving: boolean } | null>(null);
  useEffect(() => {
    if (toast) { setShown({ toast, leaving: false }); return; }
    setShown(current => current && { ...current, leaving: true });
    const timer = window.setTimeout(() => setShown(current => current?.leaving ? null : current), 180);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const run = (action: NonNullable<Toast["action"]>) => {
    clear();
    const fail = () => show({ text: `Couldn't ${action.label.toLowerCase()}. Try again.` });
    try { Promise.resolve(action.run()).catch(fail); } catch { fail(); }
  };
  const current = shown?.toast;
  return <div className="toast-region" role="status" aria-live="polite">
    {current && <div className={`toast${shown.leaving ? " leaving" : ""}`} key={current.id}>
      <span>{current.text}</span>
      {current.action && <button type="button" disabled={shown.leaving} onClick={() => run(current.action!)}>{current.action.label}</button>}
    </div>}
  </div>;
}

/** Work on content the screen already shows: reloads, stale refreshes, commands. */
export function ProgressBar({ active, label = "Loading" }: { active: boolean; label?: string }) {
  return <div className={`progress-bar${active ? " active" : ""}`} role="progressbar" aria-label={label} aria-hidden={!active} aria-busy={active} />;
}

export const MIN_BUSY_MS = 800;
export const MAX_BUSY_MS = 4000;

/** `[busy, run]`: `run(work)` shows busy from the tap until the work settles, for at least MIN_BUSY_MS. */
export function useBusy(): [boolean, (work: () => unknown) => Promise<void>] {
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const run = useCallback(async (work: () => unknown) => {
    if (running.current) return;                       // a second tap never sends a second write
    running.current = true;
    const started = Date.now();
    setBusy(true);
    try { await work(); } finally {
      window.setTimeout(() => { running.current = false; setBusy(false); }, Math.max(0, started + MIN_BUSY_MS - Date.now()));
    }
  }, []);
  return [busy, run];
}

/** Retry for `reload()`, which resolves nothing: busy until `error` changes (at least MIN_BUSY_MS) or MAX_BUSY_MS. */
export function RetryButton({ error, onRetry, label = "Try again" }: { error: unknown; onRetry(): void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [answered, setAnswered] = useState(false);
  const tapped = useRef(0);
  useEffect(() => setAnswered(true), [error]);
  useEffect(() => {
    if (!busy) return;
    const wait = answered ? Math.max(0, tapped.current + MIN_BUSY_MS - Date.now()) : MAX_BUSY_MS;
    const timer = window.setTimeout(() => setBusy(false), wait);
    return () => window.clearTimeout(timer);
  }, [busy, answered]);
  const retry = () => { tapped.current = Date.now(); setAnswered(false); setBusy(true); onRetry(); };
  return <button type="button" className="button secondary" disabled={busy} aria-busy={busy} onClick={retry}>
    {busy ? "Trying again…" : label}
  </button>;
}
