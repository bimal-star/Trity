'use client';

import Link from 'next/link';
import { useTenant } from '@/contexts/TenantContext';
import { useState } from 'react';
import { Eye, Loader2, XCircle } from 'lucide-react';

export function ImpersonationBanner() {
  const { impersonation, endTenantImpersonation, profile } = useTenant();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (profile?.role !== 'super_admin' || !impersonation) return null;

  const onExit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await endTenantImpersonation();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to exit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b border-amber-700/40 bg-amber-950/95 px-4 py-2 text-sm text-amber-100 backdrop-blur-sm"
      role="status"
    >
      <Eye className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      <span>
        Viewing tenant{' '}
        <code className="rounded bg-amber-900/60 px-1 font-mono text-xs">
          {impersonation.targetTenantId.slice(0, 8)}…
        </code>
        {impersonation.readOnly ? (
          <span className="ml-2 text-amber-200/90">(read-only)</span>
        ) : (
          <span className="ml-2 text-amber-200/90">(read/write)</span>
        )}
      </span>
      <Link
        href="/admin/tenants"
        className="text-amber-300 underline-offset-2 hover:text-white hover:underline"
      >
        Tenant admin
      </Link>
      <button
        type="button"
        onClick={onExit}
        disabled={busy}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-amber-800/80 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        Exit view
      </button>
      {err && <span className="w-full text-xs text-red-300">{err}</span>}
    </div>
  );
}
