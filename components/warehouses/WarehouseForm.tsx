'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, ChevronDown, Plus, X } from 'lucide-react';
import LogoUrlField from '@/components/common/LogoUrlField';
import { uploadWarehouseLogo } from '@/lib/warehouseLogoStorage';
import { formatWarehouseCode } from '@/lib/warehouseDisplay';
import { useToast } from '@/lib/toast';
import type { Warehouse, WarehouseFormData, WarehouseStatus, WarehouseType } from '@/types/warehouse';

const warehouseTypes: WarehouseType[] = ['distribution', 'manufacturing', 'retail', '3pl', 'other'];
const statusOptions: WarehouseStatus[] = ['active', 'inactive', 'closed'];

import { formCardShell, formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';

function warehouseToForm(w: Warehouse): WarehouseFormData {
  return {
    logo_url: w.logo_url ?? null,
    name: w.name || '',
    warehouse_type: (w.warehouse_type as WarehouseType) || 'distribution',
    status: (w.status as WarehouseStatus) || 'active',
    is_default: Boolean(w.is_default),
    address_line1: w.address_line1 || '',
    address_line2: w.address_line2 || '',
    city: w.city || '',
    state: w.state || '',
    postcode: w.postcode || '',
    country: w.country || '',
    contact_name: w.contact_name || '',
    contact_email: w.contact_email || '',
    contact_phone: w.contact_phone || '',
    notes: w.notes || '',
    metadata: (w.metadata && typeof w.metadata === 'object' ? w.metadata : {}) as Record<
      string,
      unknown
    >,
  };
}

const emptyForm: WarehouseFormData = {
  logo_url: null,
  name: '',
  warehouse_type: 'distribution',
  status: 'active',
  is_default: false,
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postcode: '',
  country: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  notes: '',
  metadata: {},
};

type SectionId = 'address' | 'contact' | 'meta';

interface WarehouseFormProps {
  mode: 'create' | 'edit';
  warehouse?: Warehouse | null;
  onSubmit: (data: WarehouseFormData) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
  showHeader?: boolean;
}

export default function WarehouseForm({
  mode,
  warehouse,
  onSubmit,
  onCancel,
  showHeader = true,
}: WarehouseFormProps) {
  const [formData, setFormData] = useState<WarehouseFormData>(emptyForm);
  const [metadataJson, setMetadataJson] = useState('{}');
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (warehouse) {
      setFormData(warehouseToForm(warehouse));
      setMetadataJson(JSON.stringify(warehouse.metadata ?? {}, null, 2));
    } else {
      setFormData(emptyForm);
      setMetadataJson('{}');
    }
    setValidationError(null);
  }, [warehouse]);

  const setField = <K extends keyof WarehouseFormData>(key: K, value: WarehouseFormData[K]) => {
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
  const hasContactDetails = Boolean(formData.contact_name || formData.contact_email || formData.contact_phone);
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
    if (!formData.name.trim()) {
      setValidationError('Warehouse name is required.');
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
      toast.success(mode === 'edit' ? 'Warehouse updated.' : 'Warehouse created.');
      if (mode === 'create') {
        setFormData(emptyForm);
        setMetadataJson('{}');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const codePreview =
    mode === 'edit' && warehouse
      ? formatWarehouseCode(warehouse.warehouse_code)
      : formatWarehouseCode(null);

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
                {mode === 'create' ? 'New warehouse' : 'Edit warehouse'}
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
                uploadFile={(tenantId, file) => uploadWarehouseLogo(tenantId, file)}
                disabled={isSubmitting}
              />
              <div>
                <label className={labelClass}>Warehouse code</label>
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
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className={inputClass}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    value={formData.warehouse_type}
                    onChange={(e) => setField('warehouse_type', e.target.value as WarehouseType)}
                    className={inputClass}
                    disabled={isSubmitting}
                  >
                    {warehouseTypes.map((t) => (
                      <option key={t} value={t}>
                        {t === '3pl' ? '3PL' : t.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setField('status', e.target.value as WarehouseStatus)}
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
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setField('is_default', e.target.checked)}
                  disabled={isSubmitting}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                Default warehouse for this tenant
              </label>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Only one default is kept; choosing this clears the previous default.
              </p>
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

            {sectionBtn('contact', 'Site contact', hasContactDetails)}
            {openSection === 'contact' && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Contact name</label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setField('contact_name', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setField('contact_email', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact phone</label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setField('contact_phone', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
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
                ? 'Create Warehouse'
                : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
