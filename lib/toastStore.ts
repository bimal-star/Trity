/**
 * Toast store — pure logic (no React). Drives the toast UI in `lib/toast.tsx`
 * and is testable in the Node-only Vitest environment defined in
 * `vitest.config.ts`.
 */

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  createdAt: number;
  /** ms until auto-dismiss. `null` or <=0 means "keep until manually dismissed". */
  duration: number | null;
  action?: ToastAction;
}

export interface ToastStoreOptions {
  /** Default auto-dismiss durations per variant (ms). */
  defaults?: Partial<Record<ToastVariant, number>>;
  /** Hard cap on simultaneously visible toasts — oldest is trimmed first. */
  maxStack?: number;
  /** Clock source (override for tests). */
  now?: () => number;
}

export interface AddToastInput {
  variant: ToastVariant;
  message: string;
  /** Override default duration (ms). Pass `null` or 0 to require manual dismiss. */
  duration?: number | null;
  action?: ToastAction;
}

const DEFAULT_DURATIONS: Record<ToastVariant, number | null> = {
  success: 4000,
  info: 4000,
  warning: null,
  error: null,
};

const DEFAULT_MAX_STACK = 5;

type Listener = (toasts: ToastItem[]) => void;

export interface ToastStore {
  add: (input: AddToastInput) => number;
  dismiss: (id?: number) => void;
  clear: () => void;
  getToasts: () => ToastItem[];
  subscribe: (listener: Listener) => () => void;
  /** For tests: returns next scheduled auto-dismiss timestamp, or null. */
  peekNextExpiry: () => number | null;
  /** For tests / integrations that run their own timers. */
  pruneExpired: (atMs: number) => ToastItem[];
}

export function createToastStore(options: ToastStoreOptions = {}): ToastStore {
  const defaults = { ...DEFAULT_DURATIONS, ...(options.defaults ?? {}) };
  const maxStack = options.maxStack ?? DEFAULT_MAX_STACK;
  const now = options.now ?? (() => Date.now());

  let toasts: ToastItem[] = [];
  let nextId = 1;
  const listeners = new Set<Listener>();

  const notify = () => {
    for (const listener of listeners) listener(toasts);
  };

  const add = ({ variant, message, duration, action }: AddToastInput) => {
    const id = nextId++;
    const resolvedDuration = duration === undefined ? defaults[variant] : duration;
    const item: ToastItem = {
      id,
      variant,
      message,
      createdAt: now(),
      duration: resolvedDuration ?? null,
      ...(action ? { action } : {}),
    };
    const next = [...toasts, item];
    toasts = next.length > maxStack ? next.slice(next.length - maxStack) : next;
    notify();
    return id;
  };

  const dismiss = (id?: number) => {
    if (id === undefined) {
      if (toasts.length === 0) return;
      toasts = [];
    } else {
      const filtered = toasts.filter((t) => t.id !== id);
      if (filtered.length === toasts.length) return;
      toasts = filtered;
    }
    notify();
  };

  const clear = () => dismiss();

  const peekNextExpiry = (): number | null => {
    let earliest: number | null = null;
    for (const t of toasts) {
      if (t.duration === null || t.duration <= 0) continue;
      const expiresAt = t.createdAt + t.duration;
      if (earliest === null || expiresAt < earliest) earliest = expiresAt;
    }
    return earliest;
  };

  const pruneExpired = (atMs: number): ToastItem[] => {
    const expired: ToastItem[] = [];
    const remaining: ToastItem[] = [];
    for (const t of toasts) {
      if (t.duration !== null && t.duration > 0 && atMs >= t.createdAt + t.duration) {
        expired.push(t);
      } else {
        remaining.push(t);
      }
    }
    if (expired.length > 0) {
      toasts = remaining;
      notify();
    }
    return expired;
  };

  return {
    add,
    dismiss,
    clear,
    getToasts: () => toasts,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    peekNextExpiry,
    pruneExpired,
  };
}
