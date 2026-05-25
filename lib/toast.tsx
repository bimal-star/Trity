'use client';

/**
 * Global toast stack.
 *
 * Mount <ToastProvider> once at the app root (see providers/AppProviders.tsx).
 * Call `const { toast } = useToast();` in any client component to push
 * confirmations:
 *
 *   toast.success('Saved changes');
 *   toast.warning('Check this field');
 *   toast.error('Could not save');
 *   toast.info('Heads up');
 *   toast.dismiss();            // clear all
 *   toast.dismiss(id);          // clear one (id returned by add)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import {
  createToastStore,
  type ToastAction,
  type ToastItem,
  type ToastStore,
  type ToastVariant,
} from './toastStore';

export type { ToastVariant, ToastItem, ToastAction } from './toastStore';

export interface ToastOptions {
  duration?: number | null;
  action?: ToastAction;
}

export interface ToastAPI {
  success: (message: string, opts?: ToastOptions) => number;
  warning: (message: string, opts?: ToastOptions) => number;
  error: (message: string, opts?: ToastOptions) => number;
  info: (message: string, opts?: ToastOptions) => number;
  dismiss: (id?: number) => void;
}

interface ToastContextValue {
  toast: ToastAPI;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_ANIM_MS = 200;

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

  const requestDismiss = useCallback(
    (id: number) => {
      store.dismiss(id);
    },
    [store]
  );

  const value = useMemo<ToastContextValue>(() => {
    const push = (variant: ToastVariant) => (message: string, opts?: ToastOptions) =>
      store.add({
        variant,
        message,
        duration: opts?.duration,
        action: opts?.action,
      });
    return {
      toast: {
        success: push('success'),
        warning: push('warning'),
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
      <ToastHost toasts={toasts} onDismiss={requestDismiss} />
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
    <>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(1rem); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-fade-out {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(0.5rem); }
        }
        .toast-enter {
          animation: toast-slide-in ${TOAST_ANIM_MS}ms ease-out both;
        }
        .toast-exit {
          animation: toast-fade-out ${TOAST_ANIM_MS}ms ease-in both;
        }
      `}</style>
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex max-w-[min(100vw-2.5rem,24rem)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </div>
    </>
  );
}

const variantConfig: Record<
  ToastVariant,
  {
    label: string;
    accent: string;
    surface: string;
    icon: string;
    iconEl: typeof CheckCircle2;
  }
> = {
  success: {
    label: 'Success',
    accent: 'border-l-green-500',
    surface:
      'border-green-200/80 bg-green-50/95 text-green-950 dark:border-green-900/50 dark:bg-green-950/90 dark:text-green-50',
    icon: 'text-green-600 dark:text-green-400',
    iconEl: CheckCircle2,
  },
  warning: {
    label: 'Warning',
    accent: 'border-l-amber-500',
    surface:
      'border-amber-200/80 bg-amber-50/95 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/90 dark:text-amber-50',
    icon: 'text-amber-600 dark:text-amber-400',
    iconEl: AlertTriangle,
  },
  error: {
    label: 'Error',
    accent: 'border-l-red-500',
    surface:
      'border-red-200/80 bg-red-50/95 text-red-950 dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-50',
    icon: 'text-red-600 dark:text-red-400',
    iconEl: AlertTriangle,
  },
  info: {
    label: 'Info',
    accent: 'border-l-blue-500',
    surface:
      'border-blue-200/80 bg-blue-50/95 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/90 dark:text-blue-50',
    icon: 'text-blue-600 dark:text-blue-400',
    iconEl: Info,
  },
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: () => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const config = variantConfig[toast.variant];
  const Icon = config.iconEl;
  const role = toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status';
  const [exiting, setExiting] = useState(false);
  const exitingRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runDismiss = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    dismissTimerRef.current = setTimeout(() => {
      onDismiss();
    }, TOAST_ANIM_MS);
  }, [onDismiss]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (toast.duration === null || toast.duration <= 0) return;
    const remaining = toast.createdAt + toast.duration - Date.now();
    const handle = window.setTimeout(() => runDismiss(), Math.max(0, remaining));
    return () => window.clearTimeout(handle);
  }, [toast.id, toast.duration, toast.createdAt, runDismiss]);

  const handleAction = () => {
    toast.action?.onClick();
    runDismiss();
  };

  return (
    <div
      role={role}
      className={`pointer-events-auto flex w-full items-center gap-2.5 rounded-lg border border-l-4 py-2.5 pl-3 pr-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm ${exiting ? 'toast-exit' : 'toast-enter'} ${config.accent} ${config.surface}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${config.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{config.label}: </span>
        <p className="truncate text-sm font-medium leading-5">{toast.message}</p>
      </div>
      {toast.action ? (
        <button
          type="button"
          onClick={handleAction}
          className="shrink-0 text-xs font-semibold underline underline-offset-2 opacity-90 transition-opacity hover:opacity-100"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={runDismiss}
        aria-label="Dismiss notification"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current/70 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
