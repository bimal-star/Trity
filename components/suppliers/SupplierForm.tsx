'use client';

import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import PremiumSectionTitle from '@/components/layout/premium/PremiumSectionTitle';
import { formatSupplierCode } from '@/lib/supplierDisplay';
import { supplierToFormData } from '@/lib/supplierForm';
import { emptySupplierFormData } from '@/lib/supplierPreview';
import { premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import type { Supplier, SupplierFormData, SupplierType } from '@/types/supplier';
import { formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';

const supplierTypes: SupplierType[] = ['manufacturer', 'distributor', 'service', 'other'];

export type SupplierFormTabId = 'details' | 'address' | 'related';

interface SupplierFormProps {
  mode: 'create' | 'edit';
  supplier?: Supplier | null;
  activeTab: SupplierFormTabId;
  onSubmit: (data: SupplierFormData) => Promise<{ success: boolean; error?: string; id?: string }>;
  onCancel?: () => void;
  onSuccess?: (createdId?: string) => void;
  onFormChange?: (data: SupplierFormData) => void;
  /** Logo/status managed in summary card — keep form in sync. */
  syncFormData?: Pick<SupplierFormData, 'logo_url' | 'status'> | null;
  showHeader?: boolean;
  /** Flat layout inside PremiumRecordPanel (no nested card chrome). */
  embedded?: boolean;
}

export default function SupplierForm({
  mode,
  supplier,
  activeTab,
  onSubmit,
  onCancel,
  onSuccess,
  onFormChange,
  syncFormData,
  showHeader = false,
  embedded = true,
}: SupplierFormProps) {
  const [formData, setFormData] = useState<SupplierFormData>(emptySupplierFormData);
  const [metadataJson, setMetadataJson] = useState('{}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (supplier) {
      setFormData(supplierToFormData(supplier));
      setMetadataJson(JSON.stringify(supplier.metadata ?? {}, null, 2));
    } else {
      setFormData(emptySupplierFormData);
      setMetadataJson('{}');
    }
    setValidationError(null);
  }, [supplier]);

  useEffect(() => {
    if (!syncFormData) return;
    setFormData((prev) => {
      if (prev.logo_url === syncFormData.logo_url && prev.status === syncFormData.status) {
        return prev;
      }
      return { ...prev, logo_url: syncFormData.logo_url, status: syncFormData.status };
    });
  }, [syncFormData?.logo_url, syncFormData?.status, syncFormData]);

  useEffect(() => {
    onFormChange?.(formData);
  }, [formData, onFormChange]);

  const setField = <K extends keyof SupplierFormData>(key: K, value: SupplierFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.legal_name.trim()) {
      setValidationError('Legal name is required.');
      return;
    }
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(metadataJson) as Record<string, unknown>;
      if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
        setValidationError('Metadata must be a JSON object.');
        return;
      }
    } catch {
      setValidationError('Invalid JSON in metadata.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    try {
      const result = await onSubmit({ ...formData, metadata });
      if (!result.success) {
        toast.error(result.error || 'Save failed');
        return;
      }
      toast.success(mode === 'edit' ? 'Supplier updated.' : 'Supplier created.');
      if (mode === 'create') {
        if (onSuccess) {
          onSuccess(result.id);
        } else {
          setFormData(emptySupplierFormData);
          setMetadataJson('{}');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const codePreview =
    mode === 'edit' && supplier
      ? formatSupplierCode(supplier.supplier_code)
      : formatSupplierCode(null);

  const shellClass = embedded
    ? 'flex min-h-0 w-full flex-1 flex-col'
    : 'flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800';

  const formClass = embedded
    ? 'flex min-h-0 flex-1 flex-col'
    : 'flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900/50';

  const fieldGrid = 'grid grid-cols-1 gap-3 sm:grid-cols-2';

  return (
    <div className={shellClass}>
      <form onSubmit={handleSubmit} className={formClass}>
        {showHeader && (
          <div className="mb-3 shrink-0 border-b border-gray-200 pb-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? 'New supplier' : 'Edit supplier'}
            </h3>
          </div>
        )}

        {validationError && (
          <div className="mb-3 shrink-0 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <PremiumSectionTitle>Primary details</PremiumSectionTitle>
              <p className={`mb-3 ${premiumTypography.helper}`}>
                Legal identity, contact, and supplier classification.
              </p>
              <div className={fieldGrid}>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Supplier code</label>
                  <input
                    type="text"
                    value={codePreview}
                    readOnly
                    disabled
                    className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400`}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Legal name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => setField('legal_name', e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className={labelClass}>Trading name</label>
                  <input
                    type="text"
                    value={formData.trading_name}
                    onChange={(e) => setField('trading_name', e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setField('email', e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    className={inputClass}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    value={formData.supplier_type}
                    onChange={(e) => setField('supplier_type', e.target.value as SupplierType)}
                    className={inputClass}
                    disabled={isSubmitting}
                  >
                    {supplierTypes.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="space-y-6">
              <div>
                <PremiumSectionTitle>Address</PremiumSectionTitle>
                <p className={`mb-3 ${premiumTypography.helper}`}>
                  Primary location for deliveries and correspondence.
                </p>
                <div className={`mt-3 ${fieldGrid}`}>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Line 1</label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => setField('address_line1', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Line 2</label>
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) => setField('address_line2', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setField('city', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>State / region</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setField('state', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Postcode</label>
                    <input
                      type="text"
                      value={formData.postcode}
                      onChange={(e) => setField('postcode', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setField('country', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div>
                <PremiumSectionTitle>Commercial terms</PremiumSectionTitle>
                <p className={`mb-3 ${premiumTypography.helper}`}>
                  Payment and tax identifiers used on purchase documents.
                </p>
                <div className={`mt-3 ${fieldGrid}`}>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Payment terms</label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setField('payment_terms', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Currency</label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setField('currency', e.target.value)}
                      className={inputClass}
                      placeholder="e.g. GBP"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tax / VAT ID</label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setField('tax_id', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div>
                <PremiumSectionTitle>Notes & metadata</PremiumSectionTitle>
                <p className={`mb-3 ${premiumTypography.helper}`}>
                  Internal notes and optional JSON metadata for integrations.
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                      rows={4}
                      className={`${inputClass} resize-none`}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Metadata (JSON)</label>
                    <textarea
                      value={metadataJson}
                      onChange={(e) => setMetadataJson(e.target.value)}
                      rows={6}
                      className={`${inputClass} resize-none font-mono text-xs`}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex h-8 min-w-[8rem] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-8 min-w-[8rem] items-center justify-center gap-2 rounded-lg bg-green-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {mode === 'create' ? (
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            {isSubmitting
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
                ? 'Create supplier'
                : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
