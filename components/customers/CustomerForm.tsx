'use client';

import { useEffect, useState, FormEvent } from 'react';
import type { Customer, CustomerFormData, CustomerStatus, CustomerType } from '@/types/customer';
import { formatCustomerCode } from '@/lib/customerDisplay';
import CustomerLogoField from '@/components/customers/CustomerLogoField';
import { usePriceLists } from '@/hooks/usePriceLists';
import { useToast } from '@/lib/toast';
import { AlertCircle, ChevronDown, Loader2, Save } from 'lucide-react';

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

function customerToFormData(c: Customer): CustomerFormData {
  return {
    customer_type: c.customer_type ?? 'business',
    logo_url: c.logo_url ?? null,
    email: c.email,
    phone: c.phone,
    address_line1: c.address_line1,
    address_line2: c.address_line2,
    city: c.city,
    state: c.state,
    postcode: c.postcode,
    country: c.country,
    status: c.status,
    legal_name: c.legal_name,
    trading_name: c.trading_name,
    registration_number: c.registration_number,
    vat_number: c.vat_number,
    tax_scheme: c.tax_scheme,
    credit_rating: c.credit_rating,
    risk_category: c.risk_category,
    payment_terms: c.payment_terms,
    credit_limit: c.credit_limit,
    credit_hold: c.credit_hold ?? false,
    currency: c.currency,
    price_list_id: c.price_list_id,
    discount_rate: c.discount_rate,
    tax_inclusive: c.tax_inclusive ?? false,
    default_warehouse_id: c.default_warehouse_id,
    delivery_instructions: c.delivery_instructions,
    preferred_carrier: c.preferred_carrier,
    shipping_account_number: c.shipping_account_number,
    incoterms: c.incoterms,
    sales_rep_id: c.sales_rep_id,
    channel: c.channel,
    region: c.region,
    forecast_group: c.forecast_group,
    demand_profile: c.demand_profile,
    metadata: c.metadata ?? {},
  };
}

export interface CustomerFormProps {
  mode: 'create' | 'edit';
  /** Required when mode is edit */
  customer?: Customer | null;
  onSubmit: (data: CustomerFormData) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
  onSuccess?: () => void;
  /** Server/parent error message */
  error?: string | null;
  showCancelButton?: boolean;
}

export default function CustomerForm({
  mode,
  customer,
  onSubmit,
  onCancel,
  onSuccess,
  error: externalError,
  showCancelButton,
}: CustomerFormProps) {
  const isEditMode = mode === 'edit';
  const showCancel = showCancelButton ?? mode === 'create';
  const { lists: priceTiers } = usePriceLists();

  const [formData, setFormData] = useState<CustomerFormData>(
    isEditMode && customer ? customerToFormData(customer) : defaultFormData
  );
  const [metadataJson, setMetadataJson] = useState(
    isEditMode && customer ? JSON.stringify(customer.metadata ?? {}, null, 2) : '{}'
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isEditMode && customer) {
      setFormData(customerToFormData(customer));
      setMetadataJson(JSON.stringify(customer.metadata ?? {}, null, 2));
    } else if (!isEditMode) {
      setFormData(defaultFormData);
      setMetadataJson('{}');
    }
    setLocalError(null);
  }, [isEditMode, customer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.legal_name?.trim() || !formData.email.trim()) {
      setLocalError('Legal name and email are required.');
      return;
    }

    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    } catch {
      setLocalError('Invalid JSON in metadata field.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit({ ...formData, metadata });
      if (result.success) {
        if (!isEditMode) {
          setFormData(defaultFormData);
          setMetadataJson('{}');
        }
        toast.success(isEditMode ? 'Customer updated.' : 'Customer created.');
        onSuccess?.();
      } else {
        toast.error(result.error ?? `Failed to ${isEditMode ? 'update' : 'create'} customer.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting;
  const displayError = localError || externalError;
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
    formData.tax_inclusive ||
    formData.credit_hold
  );
  const hasLogisticsDetails = Boolean(
    formData.default_warehouse_id ||
    formData.delivery_instructions ||
    formData.preferred_carrier ||
    formData.shipping_account_number ||
    formData.incoterms
  );
  const hasSalesDetails = Boolean(
    formData.sales_rep_id ||
    formData.channel ||
    formData.region ||
    formData.forecast_group ||
    formData.demand_profile
  );
  const hasMetadataDetails = metadataJson.trim() !== '{}';

  const sectionIndicator = (hasDetails: boolean) => (
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
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900/50"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="mb-4 space-y-3">
            <h4 className="border-b border-gray-200 pb-2 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
              Basic Information
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Customer Code <span className="text-[10px] text-gray-500">(Auto-generated)</span>
                </label>
                <input
                  type="text"
                  value={formatCustomerCode(isEditMode ? customer?.customer_code : null)}
                  readOnly
                  disabled
                  className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Customer Type
                </label>
                <select
                  value={formData.customer_type || 'business'}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_type: e.target.value as CustomerType })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                  <option value="distributor">Distributor</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as CustomerStatus })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_hold">On Hold</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Legal Name *
                </label>
                <input
                  type="text"
                  value={formData.legal_name || ''}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Trading Name
                </label>
                <input
                  type="text"
                  value={formData.trading_name || ''}
                  onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                />
              </div>
            </div>
            <div className="max-w-md pt-1">
              <CustomerLogoField
                logoUrl={formData.logo_url}
                onLogoUrlChange={(url) => setFormData({ ...formData, logo_url: url })}
                disabled={busy}
              />
            </div>
          </div>

          <details className="group mb-3">
            <summary className="flex cursor-pointer items-center justify-between rounded-md border border-green-100 bg-green-50/50 px-3 py-2 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 dark:hover:bg-green-900/20">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Address Information
                </h4>
                {sectionIndicator(hasAddressDetails)}
              </div>
              <ChevronDown className="h-4 w-4 text-green-600 transition-transform group-open:rotate-180 dark:text-green-400" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.address_line1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.address_line2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                />
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={formData.postcode || ''}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
              </div>
            </div>
          </details>

          <details className="group mb-3">
            <summary className="flex cursor-pointer items-center justify-between rounded-md border border-green-100 bg-green-50/50 px-3 py-2 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 dark:hover:bg-green-900/20">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Legal & Tax Information
                </h4>
                {sectionIndicator(hasLegalDetails)}
              </div>
              <ChevronDown className="h-4 w-4 text-green-600 transition-transform group-open:rotate-180 dark:text-green-400" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.registration_number || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_number: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.vat_number || ''}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Tax Scheme
                  </label>
                  <input
                    type="text"
                    value={formData.tax_scheme || ''}
                    onChange={(e) => setFormData({ ...formData, tax_scheme: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Credit Rating
                  </label>
                  <input
                    type="text"
                    value={formData.credit_rating || ''}
                    onChange={(e) => setFormData({ ...formData, credit_rating: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Risk Category
                  </label>
                  <input
                    type="text"
                    value={formData.risk_category || ''}
                    onChange={(e) => setFormData({ ...formData, risk_category: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
              </div>
            </div>
          </details>

          <details className="group mb-3">
            <summary className="flex cursor-pointer items-center justify-between rounded-md border border-green-100 bg-green-50/50 px-3 py-2 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 dark:hover:bg-green-900/20">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Commercial Terms
                </h4>
                {sectionIndicator(hasCommercialDetails)}
              </div>
              <ChevronDown className="h-4 w-4 text-green-600 transition-transform group-open:rotate-180 dark:text-green-400" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms || ''}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g., Net 30"
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.credit_limit ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        credit_limit: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={formData.currency || ''}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="USD, EUR, GBP"
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Price tier
                  </label>
                  <select
                    value={formData.price_list_id || ''}
                    onChange={(e) => setFormData({ ...formData, price_list_id: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  >
                    <option value="">None</option>
                    {(() => {
                      const active = priceTiers.filter((pl) => !pl.is_deleted);
                      const cur = formData.price_list_id || '';
                      const missing = cur && !active.some((t) => t.id === cur);
                      return (
                        <>
                          {missing ? (
                            <option value={cur}>Unknown tier ({cur.slice(0, 8)}…)</option>
                          ) : null}
                          {active.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.name}
                            </option>
                          ))}
                        </>
                      );
                    })()}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Discount Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_rate ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_rate: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={!!formData.tax_inclusive}
                      onChange={(e) =>
                        setFormData({ ...formData, tax_inclusive: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      disabled={busy}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Tax Inclusive</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={!!formData.credit_hold}
                      onChange={(e) => setFormData({ ...formData, credit_hold: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      disabled={busy}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Credit Hold</span>
                  </label>
                </div>
              </div>
            </div>
          </details>

          <details className="group mb-3">
            <summary className="flex cursor-pointer items-center justify-between rounded-md border border-green-100 bg-green-50/50 px-3 py-2 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 dark:hover:bg-green-900/20">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Logistics & Delivery
                </h4>
                {sectionIndicator(hasLogisticsDetails)}
              </div>
              <ChevronDown className="h-4 w-4 text-green-600 transition-transform group-open:rotate-180 dark:text-green-400" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Default Warehouse ID
                  </label>
                  <input
                    type="text"
                    value={formData.default_warehouse_id || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, default_warehouse_id: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Preferred Carrier
                  </label>
                  <input
                    type="text"
                    value={formData.preferred_carrier || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, preferred_carrier: e.target.value })
                    }
                    placeholder="FedEx, UPS, DHL"
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Shipping Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.shipping_account_number || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, shipping_account_number: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Incoterms
                  </label>
                  <input
                    type="text"
                    value={formData.incoterms || ''}
                    onChange={(e) => setFormData({ ...formData, incoterms: e.target.value })}
                    placeholder="FOB, CIF, EXW"
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Delivery Instructions
                </label>
                <textarea
                  value={formData.delivery_instructions || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_instructions: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  disabled={busy}
                />
              </div>
            </div>
          </details>

          <details className="group mb-3">
            <summary className="flex cursor-pointer items-center justify-between rounded-md border border-green-100 bg-green-50/50 px-3 py-2 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 dark:hover:bg-green-900/20">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Sales Profile</h4>
                {sectionIndicator(hasSalesDetails)}
              </div>
              <ChevronDown className="h-4 w-4 text-green-600 transition-transform group-open:rotate-180 dark:text-green-400" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Sales Rep ID
                  </label>
                  <input
                    type="text"
                    value={formData.sales_rep_id || ''}
                    onChange={(e) => setFormData({ ...formData, sales_rep_id: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Channel
                  </label>
                  <input
                    type="text"
                    value={formData.channel || ''}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    placeholder="Direct, Retail, Online"
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Region
                  </label>
                  <input
                    type="text"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="North America, EMEA, APAC"
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Forecast Group
                  </label>
                  <input
                    type="text"
                    value={formData.forecast_group || ''}
                    onChange={(e) => setFormData({ ...formData, forecast_group: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Demand Profile
                  </label>
                  <input
                    type="text"
                    value={formData.demand_profile || ''}
                    onChange={(e) => setFormData({ ...formData, demand_profile: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    disabled={busy}
                  />
                </div>
              </div>
            </div>
          </details>

          <details className="group mb-4">
            <summary className="flex cursor-pointer items-center justify-between rounded-md border border-green-100 bg-green-50/50 px-3 py-2 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 dark:hover:bg-green-900/20">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Additional Metadata
                </h4>
                {sectionIndicator(hasMetadataDetails)}
              </div>
              <ChevronDown className="h-4 w-4 text-green-600 transition-transform group-open:rotate-180 dark:text-green-400" />
            </summary>
            <div className="mt-3 px-1">
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Metadata (JSON)
              </label>
              <textarea
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                rows={3}
                placeholder='{"custom_field": "value"}'
                className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                disabled={busy}
              />
            </div>
          </details>

          {displayError && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />
              <p className="text-xs text-red-700 dark:text-red-300">{displayError}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          {showCancel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={busy}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="inline-flex min-w-[8rem] h-8 items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {busy
              ? isEditMode
                ? 'Saving…'
                : 'Creating…'
              : isEditMode
                ? 'Save Changes'
                : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
