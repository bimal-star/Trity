'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Plus, X } from 'lucide-react';
import LogoUrlField from '@/components/common/LogoUrlField';
import { formatSupplierCode } from '@/lib/supplierDisplay';
import { uploadSupplierLogo } from '@/lib/supplierLogoStorage';
import { useToast } from '@/lib/toast';
import type { Supplier, SupplierFormData, SupplierStatus, SupplierType } from '@/types/supplier';

const supplierTypes: SupplierType[] = ['manufacturer', 'distributor', 'service', 'other'];
const statusOptions: SupplierStatus[] = ['active', 'inactive', 'on_hold'];

import { formCardShell, formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';

function supplierToForm(s: Supplier): SupplierFormData {
  return {
    supplier_type: (s.supplier_type as SupplierType) || 'distributor',
    logo_url: s.logo_url ?? null,
    legal_name: s.legal_name || '',
    trading_name: s.trading_name || '',
    email: s.email || '',
    phone: s.phone || '',
    status: (s.status as SupplierStatus) || 'active',
    address_line1: s.address_line1 || '',
    address_line2: s.address_line2 || '',
    city: s.city || '',
    state: s.state || '',
    postcode: s.postcode || '',
    country: s.country || '',
    payment_terms: s.payment_terms || '',
    currency: s.currency || '',
    tax_id: s.tax_id || '',
    notes: s.notes || '',
    metadata: (s.metadata && typeof s.metadata === 'object' ? s.metadata : {}) as Record<
      string,
      unknown
    >,
  };
}

const emptyForm: SupplierFormData = {
  supplier_type: 'distributor',
  logo_url: null,
  legal_name: '',
  trading_name: '',
  email: '',
  phone: '',
  status: 'active',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postcode: '',
  country: '',
  payment_terms: '',
  currency: '',
  tax_id: '',
  notes: '',
  metadata: {},
};

type SectionId = 'address' | 'commercial' | 'meta';

interface SupplierFormProps {
  mode: 'create' | 'edit';
  supplier?: Supplier | null;
  onSubmit: (data: SupplierFormData) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
  showHeader?: boolean;
}

export default function SupplierForm({
  mode,
  supplier,
  onSubmit,
  onCancel,
  showHeader = true,
}: SupplierFormProps) {
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);
  const [metadataJson, setMetadataJson] = useState('{}');
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (supplier) {
      setFormData(supplierToForm(supplier));
      setMetadataJson(JSON.stringify(supplier.metadata ?? {}, null, 2));
    } else {
      setFormData(emptyForm);
      setMetadataJson('{}');
    }
    setValidationError(null);
  }, [supplier]);

  const setField = <K extends keyof SupplierFormData>(key: K, value: SupplierFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const hasAddressDetails = Boolean(
    formData.address_line1 ||
      formData.address_line2 ||
      formData.city ||
      formData.state ||
      formData.postcode ||
      formData.country
  );
  const hasCommercialDetails = Boolean(formData.payment_terms || formData.currency || formData.tax_id);
  const hasMetaDetails = Boolean(formData.notes || metadataJson.trim() !== '{}');

  const sectionBtn = (id: SectionId, label: string, hasDetails: boolean) => {
    const open = openSection === id;
    return (
      <button
        type="button"
        onClick={() => setOpenSection((p) => (p === id ? null : id))}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-colors ${
          open
            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
            : 'border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
        }`}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              hasDetails
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            }`}
          >
            {!hasDetails && <AlertCircle className="mr-1 h-3 w-3" aria-hidden />}
            {hasDetails ? 'Added' : 'Missing'}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
    );
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
        setFormData(emptyForm);
        setMetadataJson('{}');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const codePreview =
    mode === 'edit' && supplier
      ? formatSupplierCode(supplier.supplier_code)
      : formatSupplierCode(null);

  return (
    <div className={formCardShell}>
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900/50"
      >
        {showHeader && (
          <div className="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {mode === 'create' ? 'New Supplier' : 'Edit Supplier'}
              </h3>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="shrink-0 px-4 pt-3">
          {validationError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain px-4 pb-4 lg:flex-row lg:gap-6">
          <div className="flex w-full shrink-0 flex-col rounded-xl border border-gray-200/90 bg-white p-4 ring-1 ring-black/[0.04] dark:border-gray-700/90 dark:bg-gray-800/60 dark:ring-white/[0.06] lg:w-[min(42rem,52%)]">
            <h4 className="mb-3 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-700 dark:text-gray-400">
              Primary
            </h4>
            <div className="space-y-3">
              <LogoUrlField
                logoUrl={formData.logo_url}
                onLogoUrlChange={(url) => setField('logo_url', url)}
                uploadFile={(tenantId, file) => uploadSupplierLogo(tenantId, file)}
                disabled={isSubmitting}
              />
              <div>
                <label className={labelClass}>Supplier code</label>
                <input
                  type="text"
                  value={codePreview}
                  readOnly
                  disabled
                  className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400`}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setField('status', e.target.value as SupplierStatus)}
                    className={inputClass}
                    disabled={isSubmitting}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto lg:max-w-md">
            {sectionBtn('address', 'Address', hasAddressDetails)}
            {openSection === 'address' && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Line 1</label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => setField('address_line1', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Line 2</label>
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) => setField('address_line2', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                      <label className={labelClass}>State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setField('state', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
              </div>
            )}

            {sectionBtn('commercial', 'Commercial', hasCommercialDetails)}
            {openSection === 'commercial' && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Payment terms</label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setField('payment_terms', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
              </div>
            )}

            {sectionBtn('meta', 'Notes & metadata', hasMetaDetails)}
            {openSection === 'meta' && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-none`}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Metadata (JSON)</label>
                    <textarea
                      value={metadataJson}
                      onChange={(e) => setMetadataJson(e.target.value)}
                      rows={4}
                      className={`${inputClass} resize-none font-mono text-xs`}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex w-full justify-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="inline-flex min-w-[8rem] h-8 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-w-[8rem] h-8 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === 'create' ? (
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            {isSubmitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
                ? 'Create Supplier'
                : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
