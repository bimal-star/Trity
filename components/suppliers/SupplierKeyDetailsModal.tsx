'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatSupplierCode } from '@/lib/supplierDisplay';
import { supplierToFormData } from '@/lib/supplierForm';
import { formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';
import type { Supplier, SupplierFormData, SupplierType } from '@/types/supplier';

const supplierTypes: SupplierType[] = ['manufacturer', 'distributor', 'service', 'other'];

export type SupplierKeyDetailsDraft = Pick<
  SupplierFormData,
  'legal_name' | 'trading_name' | 'email' | 'phone' | 'supplier_type'
>;

function supplierToKeyDraft(s: Supplier): SupplierKeyDetailsDraft {
  const f = supplierToFormData(s);
  return {
    legal_name: f.legal_name,
    trading_name: f.trading_name,
    email: f.email,
    phone: f.phone,
    supplier_type: f.supplier_type,
  };
}

export interface SupplierKeyDetailsModalProps {
  open: boolean;
  isCreateMode: boolean;
  supplierCode: string | null;
  initial: SupplierKeyDetailsDraft;
  onClose: () => void;
  onSave: (draft: SupplierKeyDetailsDraft) => void | Promise<void>;
}

export default function SupplierKeyDetailsModal({
  open,
  isCreateMode,
  supplierCode,
  initial,
  onClose,
  onSave,
}: SupplierKeyDetailsModalProps) {
  const [draft, setDraft] = useState<SupplierKeyDetailsDraft>({
    legal_name: '',
    trading_name: '',
    email: '',
    phone: '',
    supplier_type: 'distributor',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  const setField = <K extends keyof SupplierKeyDetailsDraft>(
    key: K,
    value: SupplierKeyDetailsDraft[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.legal_name.trim()) {
      setError('Legal name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const codeLabel = isCreateMode ? 'Assigned on save' : formatSupplierCode(supplierCode);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-key-details-title"
        className="flex max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2
            id="supplier-key-details-title"
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            {isCreateMode ? 'Supplier details' : 'Edit supplier details'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}
            <div>
              <label className={labelClass}>Supplier code</label>
              <input
                type="text"
                value={codeLabel}
                readOnly
                disabled
                className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400`}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Supplier code cannot be changed; it is generated when the record is created.
              </p>
            </div>
            <div>
              <label className={labelClass}>
                Legal name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={draft.legal_name}
                onChange={(e) => setField('legal_name', e.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>Trading name</label>
              <input
                type="text"
                value={draft.trading_name}
                onChange={(e) => setField('trading_name', e.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={inputClass}
                  disabled={saving}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  className={inputClass}
                  disabled={saving}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={draft.supplier_type}
                onChange={(e) => setField('supplier_type', e.target.value as SupplierType)}
                className={inputClass}
                disabled={saving}
              >
                {supplierTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {isCreateMode ? 'Apply' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { supplierToKeyDraft };
