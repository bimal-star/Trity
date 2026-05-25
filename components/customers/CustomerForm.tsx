'use client';

import { useEffect, useState, FormEvent } from 'react';
import type { Customer, CustomerFormData, CustomerStatus, CustomerType } from '@/types/customer';
import { formatCustomerCode } from '@/lib/customerDisplay';
import { customerToFormData } from '@/lib/customerForm';
import { emptyCustomerFormData } from '@/lib/customerPreview';
import PremiumSectionTitle from '@/components/layout/premium/PremiumSectionTitle';
import CustomerLogoField from '@/components/customers/CustomerLogoField';
import { usePriceLists } from '@/hooks/usePriceLists';
import { premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import { AlertCircle, Loader2, Save } from 'lucide-react';

export type CustomerFormTabId =
  | 'details'
  | 'address'
  | 'legal'
  | 'commercial'
  | 'logistics'
  | 'sales';

export type CustomerRecordTabId = CustomerFormTabId | 'related';

export interface CustomerFormProps {
  mode: 'create' | 'edit';
  /** Required when mode is edit */
  customer?: Customer | null;
  activeTab?: CustomerFormTabId;
  onSubmit: (data: CustomerFormData) => Promise<{ success: boolean; error?: string; id?: string }>;
  onCancel?: () => void;
  onSuccess?: (createdId?: string) => void;
  onFormChange?: (data: CustomerFormData) => void;
  /** Logo/status managed in summary card — keep form in sync. */
  syncFormData?: Pick<CustomerFormData, 'logo_url' | 'status'> | null;
  showHeader?: boolean;
  /** Flat layout inside PremiumRecordPanel (no nested card chrome). */
  embedded?: boolean;
  /** Server/parent error message */
  error?: string | null;
  showCancelButton?: boolean;
}

export default function CustomerForm({
  mode,
  customer,
  activeTab,
  onSubmit,
  onCancel,
  onSuccess,
  onFormChange,
  syncFormData,
  showHeader = false,
  embedded = false,
  error: externalError,
  showCancelButton,
}: CustomerFormProps) {
  const isEditMode = mode === 'edit';
  const showCancel = showCancelButton ?? (mode === 'create' && !embedded);
  const { lists: priceTiers } = usePriceLists();
  const showTab = (tab: CustomerFormTabId) => !activeTab || activeTab === tab;
  const summaryManagedFields = embedded;

  const [formData, setFormData] = useState<CustomerFormData>(
    isEditMode && customer ? customerToFormData(customer) : emptyCustomerFormData
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isEditMode && customer) {
      setFormData(customerToFormData(customer));
    } else if (!isEditMode) {
      setFormData(emptyCustomerFormData);
    }
    setLocalError(null);
  }, [isEditMode, customer]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.legal_name?.trim() || !formData.email.trim()) {
      setLocalError('Legal name and email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        ...formData,
        metadata: formData.metadata ?? {},
      });
      if (result.success) {
        toast.success(isEditMode ? 'Customer updated.' : 'Customer created.');
        if (!isEditMode) {
          if (onSuccess) {
            onSuccess(result.id);
          } else {
            setFormData(emptyCustomerFormData);
          }
        } else {
          onSuccess?.();
        }
      } else {
        toast.error(result.error ?? `Failed to ${isEditMode ? 'update' : 'create'} customer.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting;
  const displayError = localError || externalError;

  const shellClass = embedded
    ? 'flex min-h-0 w-full flex-1 flex-col'
    : 'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800';

  const formClass = embedded
    ? 'flex min-h-0 flex-1 flex-col'
    : 'flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900/50';

  return (
    <div className={shellClass}>
      <form onSubmit={handleSubmit} className={formClass}>
        {showHeader && (
          <div className="mb-3 shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? 'New customer' : 'Edit customer'}
            </h3>
          </div>
        )}
        <div
          className={
            embedded
              ? 'min-h-0 flex-1 overflow-y-auto'
              : 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4'
          }
        >
          {showTab('details') && (
            <div className="space-y-4">
              <PremiumSectionTitle>Primary details</PremiumSectionTitle>
              <p className={`${premiumTypography.helper} -mt-2`}>
                Legal identity and contact information.
              </p>

              <div
                className={`grid gap-3 ${summaryManagedFields ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-3'}`}
              >
                {!summaryManagedFields && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Customer Code{' '}
                      <span className="text-[10px] text-gray-500">(Auto-generated)</span>
                    </label>
                    <input
                      type="text"
                      value={formatCustomerCode(isEditMode ? customer?.customer_code : null)}
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    />
                  </div>
                )}
                {!summaryManagedFields && (
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
                )}
                {!summaryManagedFields && (
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
                )}
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
              {!summaryManagedFields && (
                <div className="max-w-md pt-1">
                  <CustomerLogoField
                    logoUrl={formData.logo_url}
                    onLogoUrlChange={(url) => setFormData({ ...formData, logo_url: url })}
                    disabled={busy}
                  />
                </div>
              )}
            </div>
          )}

          {showTab('address') && (
            <div className="space-y-4">
              <PremiumSectionTitle>Address</PremiumSectionTitle>
              <p className={`${premiumTypography.helper} -mt-2`}>
                Primary location for deliveries and correspondence.
              </p>
              <div className="space-y-2.5">
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
            </div>
          )}

          {showTab('legal') && (
            <div className="space-y-4">
              <PremiumSectionTitle>Legal & tax</PremiumSectionTitle>
              <p className={`${premiumTypography.helper} -mt-2`}>
                Registration, VAT, and credit risk identifiers.
              </p>
              <div className="space-y-2.5">
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
            </div>
          )}

          {showTab('commercial') && (
            <div className="space-y-4">
              <PremiumSectionTitle>Commercial terms</PremiumSectionTitle>
              <p className={`${premiumTypography.helper} -mt-2`}>
                Payment terms, credit limits, and pricing tier.
              </p>
              <div className="space-y-2.5">
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
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        Tax Inclusive
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={!!formData.credit_hold}
                        onChange={(e) =>
                          setFormData({ ...formData, credit_hold: e.target.checked })
                        }
                        className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        disabled={busy}
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Credit Hold</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showTab('logistics') && (
            <div className="space-y-4">
              <PremiumSectionTitle>Logistics & delivery</PremiumSectionTitle>
              <p className={`${premiumTypography.helper} -mt-2`}>
                Warehouses, carriers, and delivery instructions.
              </p>
              <div className="space-y-2.5">
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
            </div>
          )}

          {showTab('sales') && (
            <div className="space-y-4">
              <PremiumSectionTitle>Sales profile</PremiumSectionTitle>
              <p className={`${premiumTypography.helper} -mt-2`}>
                Channel, region, and demand planning attributes.
              </p>
              <div className="space-y-2.5">
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
            </div>
          )}

          {displayError && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />
              <p className="text-xs text-red-700 dark:text-red-300">{displayError}</p>
            </div>
          )}
        </div>

        <div
          className={
            embedded
              ? 'mt-3 flex shrink-0 justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700'
              : 'flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900'
          }
        >
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
