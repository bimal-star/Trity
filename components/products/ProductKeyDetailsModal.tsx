'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { emptyProductKeyDetailsDraft, type ProductKeyDetailsDraft } from '@/lib/productKeyDetails';
import { formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';
import type { IndustryType, ProductType } from '@/types/product';

const industryOptions: IndustryType[] = [
  'bakery',
  'ready_meals',
  'pizza',
  'construction',
  'manufacturing',
  'retail',
  'other',
];

const productTypeOptions: ProductType[] = [
  'raw_material',
  'semi_finished',
  'finished_good',
  'service',
  'assembly',
  'packaging',
];

export interface ProductKeyDetailsModalProps {
  open: boolean;
  isCreateMode: boolean;
  initial: ProductKeyDetailsDraft;
  onClose: () => void;
  onSave: (draft: ProductKeyDetailsDraft) => void | Promise<void>;
}

export default function ProductKeyDetailsModal({
  open,
  isCreateMode,
  initial,
  onClose,
  onSave,
}: ProductKeyDetailsModalProps) {
  const [draft, setDraft] = useState<ProductKeyDetailsDraft>(emptyProductKeyDetailsDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  const setField = <K extends keyof ProductKeyDetailsDraft>(
    key: K,
    value: ProductKeyDetailsDraft[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.sku.trim() || !draft.name.trim()) {
      setError('SKU and name are required.');
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
        aria-labelledby="product-key-details-title"
        className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2
            id="product-key-details-title"
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            {isCreateMode ? 'Product details' : 'Edit product details'}
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
              <label className={labelClass}>
                SKU {!isCreateMode ? '' : <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={draft.sku}
                onChange={(e) => setField('sku', e.target.value)}
                readOnly={!isCreateMode}
                disabled={!isCreateMode || saving}
                className={`${inputClass} ${!isCreateMode ? 'cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400' : ''}`}
                placeholder="e.g. PROD-001"
              />
              {!isCreateMode ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  SKU cannot be changed after creation because it is linked to inventory and other
                  records.
                </p>
              ) : null}
            </div>
            <div>
              <label className={labelClass}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setField('name', e.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>Short description</label>
              <input
                type="text"
                value={draft.short_description}
                onChange={(e) => setField('short_description', e.target.value)}
                className={inputClass}
                disabled={saving}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={draft.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Industry</label>
                <select
                  value={draft.industry_type}
                  onChange={(e) => setField('industry_type', e.target.value as IndustryType)}
                  className={inputClass}
                  disabled={saving}
                >
                  {industryOptions.map((o) => (
                    <option key={o} value={o}>
                      {o.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Product type</label>
                <select
                  value={draft.product_type}
                  onChange={(e) => setField('product_type', e.target.value as ProductType)}
                  className={inputClass}
                  disabled={saving}
                >
                  {productTypeOptions.map((o) => (
                    <option key={o} value={o}>
                      {o.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
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
