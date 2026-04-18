'use client';

import { useState } from 'react';
import { X, Plus, ChevronDown, AlertCircle } from 'lucide-react';
import type { CustomerFormData, CustomerStatus, CustomerType } from '@/types/customer';
import { formatCustomerCode } from '@/lib/customerDisplay';
import CustomerLogoField from '@/components/customers/CustomerLogoField';
import { usePriceLists } from '@/hooks/usePriceLists';
import { useToast } from '@/lib/toast';

const defaultFormData: CustomerFormData = {
  customer_type: 'business',
  logo_url: null,
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postcode: '',
  country: '',
  status: 'active',
  legal_name: '',
  trading_name: '',
  registration_number: '',
  vat_number: '',
  tax_scheme: '',
  credit_rating: '',
  risk_category: '',
  payment_terms: '',
  credit_limit: undefined,
  credit_hold: false,
  currency: '',
  price_list_id: '',
  discount_rate: undefined,
  tax_inclusive: false,
  default_warehouse_id: '',
  delivery_instructions: '',
  preferred_carrier: '',
  shipping_account_number: '',
  incoterms: '',
  sales_rep_id: '',
  channel: '',
  region: '',
  forecast_group: '',
  demand_profile: '',
  metadata: {},
};

const customerTypeOptions: CustomerType[] = [
  'individual',
  'business',
  'distributor',
  'internal',
];

const statusOptions: CustomerStatus[] = ['active', 'inactive', 'on_hold', 'prospect'];

function formatTypeLabel(t: CustomerType): string {
  return t.replace(/_/g, ' ');
}

function formatStatusLabel(s: CustomerStatus): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type RightSectionId = 'address' | 'legal' | 'commercial' | 'logistics' | 'metadata';

import { formCardShell, formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';

export interface CustomerCreateFormProps {
  onCreate: (data: CustomerFormData) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function CustomerCreateForm({ onCreate, onCancel, onSuccess }: CustomerCreateFormProps) {
  const { lists: priceTiers } = usePriceLists();
  const [formData, setFormData] = useState<CustomerFormData>(defaultFormData);
  const [metadataJson, setMetadataJson] = useState('{}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<RightSectionId | null>(null);
  const { toast } = useToast();

  const setField = <K extends keyof CustomerFormData>(key: K, value: CustomerFormData[K]) => {
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
  const hasLegalDetails = Boolean(
    formData.registration_number ||
      formData.vat_number ||
      formData.tax_scheme ||
      formData.credit_rating ||
      formData.risk_category
  );
  const hasCommercialDetails = Boolean(
    formData.payment_terms ||
      formData.credit_limit != null ||
      formData.currency ||
      formData.price_list_id ||
      formData.discount_rate != null ||
      formData.credit_hold ||
      formData.tax_inclusive
  );
  const hasLogisticsDetails = Boolean(
    formData.default_warehouse_id ||
      formData.delivery_instructions ||
      formData.preferred_carrier ||
      formData.shipping_account_number ||
      formData.incoterms ||
      formData.sales_rep_id ||
      formData.channel ||
      formData.region ||
      formData.forecast_group ||
      formData.demand_profile
  );
  const hasMetadataDetails = metadataJson.trim() !== '{}';

  const sectionBtn = (id: RightSectionId, label: string, hasDetails: boolean) => {
    const isOpenSec = openSection === id;
    return (
      <button
        type="button"
        onClick={() => setOpenSection((prev) => (prev === id ? null : id))}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-colors ${
          isOpenSec
            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
            : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
        }`}
        aria-expanded={isOpenSec}
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
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${isOpenSec ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>
    );
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setMetadataJson('{}');
    setValidationError(null);
    setOpenSection(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.legal_name?.trim() || !formData.email.trim()) {
      setValidationError('Legal name and email are required.');
      return;
    }

    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    } catch {
      setValidationError('Invalid JSON in metadata.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const result = await onCreate({ ...formData, metadata });
      if (!result.success) {
        toast.error(result.error || 'Failed to create customer');
        return;
      }
      toast.success('Customer created.');
      resetForm();
      onSuccess?.();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={formCardShell}>
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900/50"
      >
        <div className="shrink-0 px-4 pt-4">
          {validationError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain px-4 pb-4 lg:flex-row lg:gap-6 lg:overflow-hidden">
          <div className="flex w-full shrink-0 flex-col rounded-xl border border-gray-200/90 bg-white p-4 ring-1 ring-black/[0.04] dark:border-gray-700/90 dark:bg-gray-800/60 dark:ring-white/[0.06] lg:w-[min(45rem,54%)]">
            <h3 className="mb-3 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-700 dark:text-gray-400">
              Identity & contact
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Legal name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.legal_name || ''}
                    onChange={(e) => setField('legal_name', e.target.value)}
                    className={inputClass}
                    placeholder="Registered or primary name"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>
                <div className="min-w-0 sm:col-span-1">
                  <label className={labelClass}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setField('email', e.target.value)}
                    className={inputClass}
                    placeholder="contact@company.com"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Trading name</label>
                <input
                  type="text"
                  value={formData.trading_name || ''}
                  onChange={(e) => setField('trading_name', e.target.value)}
                  className={inputClass}
                  placeholder="Name shown on invoices and orders"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setField('phone', e.target.value)}
                  className={inputClass}
                  placeholder="Primary phone number"
                  disabled={isSubmitting}
                />
              </div>

              <div className="max-w-md">
                <CustomerLogoField
                  logoUrl={formData.logo_url}
                  onLogoUrlChange={(url) => setField('logo_url', url)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Customer code is generated automatically when you save (e.g. CUS-2026-000001).
                </p>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="min-w-0">
                    <label className={labelClass}>Customer code</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={formatCustomerCode(null)}
                      className={`${inputClass} cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400`}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={labelClass}>Customer type</label>
                    <select
                      value={formData.customer_type || 'business'}
                      onChange={(e) => setField('customer_type', e.target.value as CustomerType)}
                      className={inputClass}
                      disabled={isSubmitting}
                    >
                      {customerTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {formatTypeLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className={labelClass}>Status</label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setField('status', e.target.value as CustomerStatus)}
                      className={inputClass}
                      disabled={isSubmitting}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {formatStatusLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[10rem] min-w-0 flex-1 flex-col overflow-hidden border-gray-200 dark:border-gray-700 lg:min-h-0 lg:border-l lg:pl-3">
            <div className="min-h-0 min-w-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {sectionBtn('address', 'Address & delivery', hasAddressDetails)}
              {openSection === 'address' && (
                <div className="space-y-3 border-b border-gray-200 pb-3 pt-1 dark:border-gray-700">
                  <div>
                    <label className={labelClass}>Address line 1</label>
                    <input
                      type="text"
                      value={formData.address_line1 || ''}
                      onChange={(e) => setField('address_line1', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Address line 2</label>
                    <input
                      type="text"
                      value={formData.address_line2 || ''}
                      onChange={(e) => setField('address_line2', e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className={labelClass}>City</label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => setField('city', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>State</label>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={(e) => setField('state', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Postcode</label>
                      <input
                        type="text"
                        value={formData.postcode || ''}
                        onChange={(e) => setField('postcode', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <input
                        type="text"
                        value={formData.country || ''}
                        onChange={(e) => setField('country', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Delivery instructions</label>
                    <textarea
                      value={formData.delivery_instructions || ''}
                      onChange={(e) => setField('delivery_instructions', e.target.value)}
                      className={`${inputClass} resize-none`}
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {sectionBtn('legal', 'Legal & tax', hasLegalDetails)}
              {openSection === 'legal' && (
                <div className="space-y-3 border-b border-gray-200 pb-3 pt-1 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Registration number</label>
                      <input
                        type="text"
                        value={formData.registration_number || ''}
                        onChange={(e) => setField('registration_number', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>VAT number</label>
                      <input
                        type="text"
                        value={formData.vat_number || ''}
                        onChange={(e) => setField('vat_number', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Tax scheme</label>
                      <input
                        type="text"
                        value={formData.tax_scheme || ''}
                        onChange={(e) => setField('tax_scheme', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Credit rating</label>
                      <input
                        type="text"
                        value={formData.credit_rating || ''}
                        onChange={(e) => setField('credit_rating', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Risk category</label>
                      <input
                        type="text"
                        value={formData.risk_category || ''}
                        onChange={(e) => setField('risk_category', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              )}

              {sectionBtn('commercial', 'Commercial terms', hasCommercialDetails)}
              {openSection === 'commercial' && (
                <div className="space-y-3 border-b border-gray-200 pb-3 pt-1 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Payment terms</label>
                      <input
                        type="text"
                        value={formData.payment_terms || ''}
                        onChange={(e) => setField('payment_terms', e.target.value)}
                        className={inputClass}
                        placeholder="e.g., Net 30"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Credit limit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.credit_limit ?? ''}
                        onChange={(e) =>
                          setField(
                            'credit_limit',
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Currency</label>
                      <input
                        type="text"
                        value={formData.currency || ''}
                        onChange={(e) => setField('currency', e.target.value)}
                        className={inputClass}
                        placeholder="USD, EUR…"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Price tier</label>
                      <select
                        value={formData.price_list_id || ''}
                        onChange={(e) => setField('price_list_id', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      >
                        <option value="">None</option>
                        {priceTiers
                          .filter((pl) => !pl.is_deleted)
                          .map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Discount rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.discount_rate ?? ''}
                        onChange={(e) =>
                          setField(
                            'discount_rate',
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                    <div className="flex flex-wrap gap-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!formData.tax_inclusive}
                          onChange={(e) => setField('tax_inclusive', e.target.checked)}
                          className="rounded text-green-600 focus:ring-green-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Tax inclusive</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!formData.credit_hold}
                          onChange={(e) => setField('credit_hold', e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-500"
                          disabled={isSubmitting}
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Credit hold</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {sectionBtn('logistics', 'Logistics & sales', hasLogisticsDetails)}
              {openSection === 'logistics' && (
                <div className="space-y-3 border-b border-gray-200 pb-3 pt-1 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Default warehouse ID</label>
                      <input
                        type="text"
                        value={formData.default_warehouse_id || ''}
                        onChange={(e) => setField('default_warehouse_id', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Preferred carrier</label>
                      <input
                        type="text"
                        value={formData.preferred_carrier || ''}
                        onChange={(e) => setField('preferred_carrier', e.target.value)}
                        className={inputClass}
                        placeholder="FedEx, UPS…"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Shipping account number</label>
                      <input
                        type="text"
                        value={formData.shipping_account_number || ''}
                        onChange={(e) => setField('shipping_account_number', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Incoterms</label>
                      <input
                        type="text"
                        value={formData.incoterms || ''}
                        onChange={(e) => setField('incoterms', e.target.value)}
                        className={inputClass}
                        placeholder="FOB, CIF…"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Sales rep ID</label>
                      <input
                        type="text"
                        value={formData.sales_rep_id || ''}
                        onChange={(e) => setField('sales_rep_id', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Channel</label>
                      <input
                        type="text"
                        value={formData.channel || ''}
                        onChange={(e) => setField('channel', e.target.value)}
                        className={inputClass}
                        placeholder="Direct, retail…"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>Region</label>
                      <input
                        type="text"
                        value={formData.region || ''}
                        onChange={(e) => setField('region', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Forecast group</label>
                      <input
                        type="text"
                        value={formData.forecast_group || ''}
                        onChange={(e) => setField('forecast_group', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Demand profile</label>
                      <input
                        type="text"
                        value={formData.demand_profile || ''}
                        onChange={(e) => setField('demand_profile', e.target.value)}
                        className={inputClass}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              )}

              {sectionBtn('metadata', 'Additional metadata', hasMetadataDetails)}
              {openSection === 'metadata' && (
                <div className="space-y-2 pt-1 pb-2">
                  <label className={labelClass}>Metadata (JSON)</label>
                  <textarea
                    value={metadataJson}
                    onChange={(e) => setMetadataJson(e.target.value)}
                    className={`${inputClass} resize-none font-mono text-xs`}
                    rows={5}
                    placeholder='{"custom_field": "value"}'
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex min-w-[8rem] h-8 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            disabled={isSubmitting}
          >
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex min-w-[8rem] h-8 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {isSubmitting ? 'Creating…' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
