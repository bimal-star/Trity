'use client';

/**
 * Global toast stack.
 *
 * Mount <ToastProvider> once at the app root (see providers/AppProviders.tsx).
 * Call `const { toast } = useToast();` in any client component to push
 * confirmations:
 *
 *   toast.success('Saved changes');
 *   toast.error('Could not save');
 *   toast.info('Heads up');
 *   toast.dismiss();            // clear all
 *   toast.dismiss(id);          // clear one (id returned by add)
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { createToastStore, type ToastItem, type ToastStore, type ToastVariant } from './toastStore';

export type { ToastVariant, ToastItem } from './toastStore';

export interface ToastAPI {
  success: (message: string, opts?: { duration?: number | null }) => number;
  error: (message: string, opts?: { duration?: number | null }) => number;
  info: (message: string, opts?: { duration?: number | null }) => number;
  dismiss: (id?: number) => void;
}

interface ToastContextValue {
  toast: ToastAPI;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const storeRef = useRef<ToastStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createToastStore();
  }
  const store = storeRef.current;

  const [toasts, setToasts] = useState<ToastItem[]>(() => store.getToasts());

  useEffect(() => {
    return store.subscribe((next) => setToasts(next));
  }, [store]);

  useEffect(() => {
    const next = store.peekNextExpiry();
    if (next === null) return;
    const delay = Math.max(0, next - Date.now());
    const handle = window.setTimeout(() => {
      store.pruneExpired(Date.now());
    }, delay + 10);
    return () => window.clearTimeout(handle);
  }, [store, toasts]);

  const value = useMemo<ToastContextValue>(() => {
    const push =
      (variant: ToastVariant) => (message: string, opts?: { duration?: number | null }) =>
        store.add({
          variant,
          message,
          duration: opts?.duration,
        });
    return {
      toast: {
        success: push('success'),
        error: push('error'),
        info: push('info'),
        dismiss: (id?: number) => store.dismiss(id),
      },
      toasts,
    };
  }, [store, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={(id) => store.dismiss(id)} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

interface ToastHostProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:top-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const variantStyles: Record<
  ToastVariant,
  { surface: string; icon: string; iconEl: typeof CheckCircle2 }
> = {
  success: {
    surface:
      'border-green-200 bg-green-50 text-green-900 dark:border-green-800/60 dark:bg-green-950/70 dark:text-green-100',
    icon: 'text-green-600 dark:text-green-400',
    iconEl: CheckCircle2,
  },
  error: {
    surface:
      'border-red-200 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/70 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-400',
    iconEl: AlertTriangle,
  },
  info: {
    surface:
      'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/70 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400',
    iconEl: Info,
  },
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: () => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const style = variantStyles[toast.variant];
  const Icon = style.iconEl;
  const role = toast.variant === 'error' ? 'alert' : 'status';
  return (
    <div
      role={role}
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur transition-all ${style.surface}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${style.icon}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 whitespace-pre-line break-words text-sm font-medium leading-5">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-mr-1 ml-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-current/70 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
