'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { hardDeleteTenant } from '@/lib/tenantHardDelete';
import { premiumTypography } from '@/lib/premiumUi';

export type TenantHardDeleteTarget = {
  id: string;
  name: string;
  company_name?: string | null;
  user_count?: number;
};

type Step = 'warn' | 'confirm';

interface TenantHardDeleteDialogProps {
  tenant: TenantHardDeleteTarget;
  onClose: () => void;
  onDeleted: (tenantId: string) => void;
}

function confirmLabel(tenant: TenantHardDeleteTarget): string {
  return (tenant.name || tenant.company_name || '').trim();
}

export function TenantHardDeleteDialog({
  tenant,
  onClose,
  onDeleted,
}: TenantHardDeleteDialogProps) {
  const [step, setStep] = useState<Step>('warn');
  const [typed, setTyped] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = confirmLabel(tenant);
  const canSubmit = label.length > 0 && typed === label;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setIsDeleting(true);
    setError(null);
    const result = await hardDeleteTenant(tenant.id, typed);
    setIsDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeleted(result.deleted_tenant_id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-hard-delete-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-xl dark:border-red-900/50 dark:bg-gray-900"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2
              id="tenant-hard-delete-title"
              className={`${premiumTypography.pageTitle} text-lg text-gray-900 dark:text-white`}
            >
              {step === 'warn' ? 'Delete tenant permanently?' : 'Confirm deletion'}
            </h2>
            <p className={`mt-1 ${premiumTypography.helper}`}>
              {step === 'warn' ? (
                <>
                  <span className="font-medium text-gray-900 dark:text-white">{tenant.name}</span>{' '}
                  and all of its business data (products, customers, orders, navigation, access
                  grants, etc.) will be removed from the database. This cannot be undone.
                </>
              ) : (
                <>
                  Type the tenant name exactly to confirm. Supabase Auth users are not removed
                  automatically.
                </>
              )}
            </p>
          </div>
        </div>

        {tenant.user_count != null && tenant.user_count > 0 ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
            {tenant.user_count} user profile{tenant.user_count === 1 ? '' : 's'} linked to this
            tenant will be deleted.
          </p>
        ) : null}

        {step === 'confirm' ? (
          <div className="mb-4">
            <label
              htmlFor="tenant-delete-confirm"
              className={`mb-1 block ${premiumTypography.label}`}
            >
              Type <span className="font-semibold">{label}</span> to confirm
            </label>
            <input
              id="tenant-delete-confirm"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              disabled={isDeleting}
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          {step === 'warn' ? (
            <button
              type="button"
              onClick={() => setStep('confirm')}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit || isDeleting}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              Delete permanently
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
