'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { useCustomers } from '@/hooks/useCustomers';
import { usePermissions } from '@/hooks/usePermissions';
import type { Customer, CustomerFormData, CustomerFilters } from '@/types/customer';
import {
  logCustomerCreated,
  logCustomerUpdated,
  logCustomerStatusChanged,
  logCustomerArchived,
} from '@/lib/auditLog';
import {
  Users,
  Loader2,
  AlertCircle,
  Plus,
  Archive,
  X,
  Save,
  ChevronDown,
  Edit2,
  Settings,
  TrendingUp,
  DollarSign,
  CheckCircle,
  UserCheck,
  Mail,
  FileDown,
  Search,
} from 'lucide-react';

// Helper function to format customer code
const formatCustomerCode = (code: string | null | undefined): string => {
  if (!code) return "Will be generated on save";
  // If already formatted with CUS- prefix, return as is
  if (code.startsWith("CUS-")) return code;
  // Otherwise format: CUS-YYYY-XXXXXX
  // Extract the year from current date or from code if available
  const year = new Date().getFullYear().toString();
  const numStr = code.replace(/\D/g, '');
  const sequence = numStr.padStart(6, '0');
  return `CUS-${year}-${sequence}`;
};

function CustomerCreateModal({
  isOpen,
  onClose,
  onCreate,
  isLoading,
  error,
  initialData = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CustomerFormData) => Promise<{ success: boolean; id?: string; error?: string }>;
  isLoading: boolean;
  error: string | null;
  initialData?: Customer | null;
}) {
  const defaultFormData: CustomerFormData = {
    customer_type: 'business',
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

  const isEditMode = !!initialData;
  
  const [formData, setFormData] = useState<CustomerFormData>(
    initialData
      ? {
          customer_type: initialData.customer_type,
          email: initialData.email,
          phone: initialData.phone,
          address_line1: initialData.address_line1,
          address_line2: initialData.address_line2,
          city: initialData.city,
          state: initialData.state,
          postcode: initialData.postcode,
          country: initialData.country,
          status: initialData.status,
          legal_name: initialData.legal_name,
          trading_name: initialData.trading_name,
          registration_number: initialData.registration_number,
          vat_number: initialData.vat_number,
          tax_scheme: initialData.tax_scheme,
          credit_rating: initialData.credit_rating,
          risk_category: initialData.risk_category,
          payment_terms: initialData.payment_terms,
          credit_limit: initialData.credit_limit,
          credit_hold: initialData.credit_hold,
          currency: initialData.currency,
          price_list_id: initialData.price_list_id,
          discount_rate: initialData.discount_rate,
          tax_inclusive: initialData.tax_inclusive,
          default_warehouse_id: initialData.default_warehouse_id,
          delivery_instructions: initialData.delivery_instructions,
          preferred_carrier: initialData.preferred_carrier,
          shipping_account_number: initialData.shipping_account_number,
          incoterms: initialData.incoterms,
          sales_rep_id: initialData.sales_rep_id,
          channel: initialData.channel,
          region: initialData.region,
          forecast_group: initialData.forecast_group,
          demand_profile: initialData.demand_profile,
          metadata: initialData.metadata,
        }
      : defaultFormData
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [metadataJson, setMetadataJson] = useState(
    initialData ? JSON.stringify(initialData.metadata, null, 2) : '{}'
  );

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        customer_type: initialData.customer_type,
        email: initialData.email,
        phone: initialData.phone,
        address_line1: initialData.address_line1,
        address_line2: initialData.address_line2,
        city: initialData.city,
        state: initialData.state,
        postcode: initialData.postcode,
        country: initialData.country,
        status: initialData.status,
        legal_name: initialData.legal_name,
        trading_name: initialData.trading_name,
        registration_number: initialData.registration_number,
        vat_number: initialData.vat_number,
        tax_scheme: initialData.tax_scheme,
        credit_rating: initialData.credit_rating,
        risk_category: initialData.risk_category,
        payment_terms: initialData.payment_terms,
        credit_limit: initialData.credit_limit,
        credit_hold: initialData.credit_hold,
        currency: initialData.currency,
        price_list_id: initialData.price_list_id,
        discount_rate: initialData.discount_rate,
        tax_inclusive: initialData.tax_inclusive,
        default_warehouse_id: initialData.default_warehouse_id,
        delivery_instructions: initialData.delivery_instructions,
        preferred_carrier: initialData.preferred_carrier,
        shipping_account_number: initialData.shipping_account_number,
        incoterms: initialData.incoterms,
        sales_rep_id: initialData.sales_rep_id,
        channel: initialData.channel,
        region: initialData.region,
        forecast_group: initialData.forecast_group,
        demand_profile: initialData.demand_profile,
        metadata: initialData.metadata,
      });
      setMetadataJson(JSON.stringify(initialData.metadata, null, 2));
    } else {
      setFormData(defaultFormData);
      setMetadataJson('{}');
    }
    setLocalError(null);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.legal_name?.trim() || !formData.email.trim()) {
      setLocalError('Legal name and email are required.');
      return;
    }

    let metadata = {};
    try {
      metadata = JSON.parse(metadataJson);
    } catch {
      setLocalError('Invalid JSON in metadata field.');
      return;
    }

    const result = await onCreate({ ...formData, metadata });
    if (result.success) {
      setFormData(defaultFormData);
      setMetadataJson('{}');
      onClose();
    } else {
      setLocalError(result.error ?? `Failed to ${isEditMode ? 'update' : 'create'} customer.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 z-10">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit Customer' : 'Create Customer'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {/* Basic Information - Always visible */}
          <div className="mb-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Basic Information
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Code <span className="text-gray-500 text-[10px]">(Auto-generated)</span>
                </label>
                <input
                  type="text"
                  value={formatCustomerCode(initialData?.customer_code)}
                  readOnly
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Type
                </label>
                <select
                  value={formData.customer_type || 'business'}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                  <option value="distributor">Distributor</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Legal Name *
                </label>
                <input
                  type="text"
                  value={formData.legal_name || ''}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trading Name
                </label>
                <input
                  type="text"
                  value={formData.trading_name || ''}
                  onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Address Details - Expandable */}
          <details className="mb-3 group" open>
            <summary className="flex items-center justify-between cursor-pointer px-3 py-2 bg-green-50/50 dark:bg-green-900/10 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-100 dark:border-green-900/30">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Address Information</h4>
              <ChevronDown className="w-4 h-4 text-green-600 dark:text-green-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.address_line1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.address_line2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={formData.postcode || ''}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Legal & Tax - Expandable */}
          <details className="mb-3 group">
            <summary className="flex items-center justify-between cursor-pointer px-3 py-2 bg-green-50/50 dark:bg-green-900/10 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-100 dark:border-green-900/30">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Legal & Tax Information</h4>
              <ChevronDown className="w-4 h-4 text-green-600 dark:text-green-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.registration_number || ''}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.vat_number || ''}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tax Scheme
                  </label>
                  <input
                    type="text"
                    value={formData.tax_scheme || ''}
                    onChange={(e) => setFormData({ ...formData, tax_scheme: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Credit Rating
                  </label>
                  <input
                    type="text"
                    value={formData.credit_rating || ''}
                    onChange={(e) => setFormData({ ...formData, credit_rating: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Risk Category
                  </label>
                  <input
                    type="text"
                    value={formData.risk_category || ''}
                    onChange={(e) => setFormData({ ...formData, risk_category: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Commercial Terms - Expandable */}
          <details className="mb-3 group">
            <summary className="flex items-center justify-between cursor-pointer px-3 py-2 bg-green-50/50 dark:bg-green-900/10 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-100 dark:border-green-900/30">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Commercial Terms</h4>
              <ChevronDown className="w-4 h-4 text-green-600 dark:text-green-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.payment_terms || ''}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g., Net 30"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.credit_limit ?? ''}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={formData.currency || ''}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="USD, EUR, GBP"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price List ID
                  </label>
                  <input
                    type="text"
                    value={formData.price_list_id || ''}
                    onChange={(e) => setFormData({ ...formData, price_list_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Discount Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_rate ?? ''}
                    onChange={(e) => setFormData({ ...formData, discount_rate: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.tax_inclusive}
                      onChange={(e) => setFormData({ ...formData, tax_inclusive: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      disabled={isLoading}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Tax Inclusive</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.credit_hold}
                      onChange={(e) => setFormData({ ...formData, credit_hold: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      disabled={isLoading}
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Credit Hold</span>
                  </label>
                </div>
              </div>
            </div>
          </details>

          {/* Logistics & Delivery - Expandable */}
          <details className="mb-3 group">
            <summary className="flex items-center justify-between cursor-pointer px-3 py-2 bg-green-50/50 dark:bg-green-900/10 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-100 dark:border-green-900/30">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Logistics & Delivery</h4>
              <ChevronDown className="w-4 h-4 text-green-600 dark:text-green-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Warehouse ID
                  </label>
                  <input
                    type="text"
                    value={formData.default_warehouse_id || ''}
                    onChange={(e) => setFormData({ ...formData, default_warehouse_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Carrier
                  </label>
                  <input
                    type="text"
                    value={formData.preferred_carrier || ''}
                    onChange={(e) => setFormData({ ...formData, preferred_carrier: e.target.value })}
                    placeholder="FedEx, UPS, DHL"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Shipping Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.shipping_account_number || ''}
                    onChange={(e) => setFormData({ ...formData, shipping_account_number: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Incoterms
                  </label>
                  <input
                    type="text"
                    value={formData.incoterms || ''}
                    onChange={(e) => setFormData({ ...formData, incoterms: e.target.value })}
                    placeholder="FOB, CIF, EXW"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Instructions
                </label>
                <textarea
                  value={formData.delivery_instructions || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                  disabled={isLoading}
                />
              </div>
            </div>
          </details>

          {/* Sales Profile - Expandable */}
          <details className="mb-3 group">
            <summary className="flex items-center justify-between cursor-pointer px-3 py-2 bg-green-50/50 dark:bg-green-900/10 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-100 dark:border-green-900/30">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Sales Profile</h4>
              <ChevronDown className="w-4 h-4 text-green-600 dark:text-green-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-2.5 px-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sales Rep ID
                  </label>
                  <input
                    type="text"
                    value={formData.sales_rep_id || ''}
                    onChange={(e) => setFormData({ ...formData, sales_rep_id: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Channel
                  </label>
                  <input
                    type="text"
                    value={formData.channel || ''}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    placeholder="Direct, Retail, Online"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="North America, EMEA, APAC"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Forecast Group
                  </label>
                  <input
                    type="text"
                    value={formData.forecast_group || ''}
                    onChange={(e) => setFormData({ ...formData, forecast_group: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Demand Profile
                  </label>
                  <input
                    type="text"
                    value={formData.demand_profile || ''}
                    onChange={(e) => setFormData({ ...formData, demand_profile: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Metadata - Expandable */}
          <details className="mb-4 group">
            <summary className="flex items-center justify-between cursor-pointer px-3 py-2 bg-green-50/50 dark:bg-green-900/10 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-100 dark:border-green-900/30">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Additional Metadata</h4>
              <ChevronDown className="w-4 h-4 text-green-600 dark:text-green-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 px-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Metadata (JSON)
              </label>
              <textarea
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                rows={3}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500 font-mono"
                placeholder='{"custom_field": "value"}'
                disabled={isLoading}
              />
            </div>
          </details>

          {(localError || error) && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{localError || error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-xs font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Customer' : 'Create Customer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const { user, tenant_id } = useTenant();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const { customers, isLoading, error, createCustomer, updateCustomer, archiveCustomer } =
    useCustomers();
  const { can } = usePermissions();
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showCustomizeDropdown, setShowCustomizeDropdown] = useState(false);
  const [expandedViews, setExpandedViews] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    core: true,
    contact: true,
    address: false,
    financial: false,
    logistics: false,
    sales: false,
  });
  const [newViewName, setNewViewName] = useState('');
  const [savedViews, setSavedViews] = useState<Record<string, Record<string, boolean>>>({});
  const [currentViewName, setCurrentViewName] = useState('Default');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    customer_code: true,
    customer_type: false,
    email: true,
    phone: true,
    legal_name: true,
    trading_name: false,
    address_line1: false,
    address_line2: false,
    city: false,
    state: false,
    postcode: false,
    country: false,
    status: true,
    registration_number: false,
    vat_number: false,
    tax_scheme: false,
    credit_rating: false,
    risk_category: false,
    payment_terms: false,
    credit_limit: false,
    credit_hold: false,
    currency: false,
    price_list_id: false,
    discount_rate: false,
    tax_inclusive: false,
    default_warehouse_id: false,
    delivery_instructions: false,
    preferred_carrier: false,
    shipping_account_number: false,
    incoterms: false,
    sales_rep_id: false,
    channel: false,
    region: false,
    forecast_group: false,
    demand_profile: false,
    created_at: true,
    actions: true,
  });
  
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const canManageCustomers = can('manage_users'); // Reuse users permission for now

  useEffect(() => {
    if (profileLoading || !user) return;
    if (profile && !canManageCustomers) {
      router.replace('/');
    }
  }, [profileLoading, user, profile, canManageCustomers, router]);

  // Load saved views from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customerViews');
    if (saved) {
      try {
        const views = JSON.parse(saved);
        setSavedViews(views);
        // Load last used view
        const lastView = localStorage.getItem('customerCurrentView') || 'Default';
        if (views[lastView]) {
          setVisibleColumns(views[lastView]);
          setCurrentViewName(lastView);
        }
      } catch (err) {
        console.error('Failed to load saved views:', err);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomizeDropdown(false);
      }
    };

    if (showCustomizeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCustomizeDropdown]);

  const saveView = () => {
    if (!newViewName.trim()) return;
    const updated = { ...savedViews, [newViewName]: visibleColumns };
    setSavedViews(updated);
    localStorage.setItem('customerViews', JSON.stringify(updated));
    setNewViewName('');
  };

  const loadView = (viewName: string) => {
    if (savedViews[viewName]) {
      setVisibleColumns(savedViews[viewName]);
      setCurrentViewName(viewName);
      localStorage.setItem('customerCurrentView', viewName);
    }
  };

  const deleteView = (viewName: string) => {
    if (viewName === 'Default') return;
    const updated = { ...savedViews };
    delete updated[viewName];
    setSavedViews(updated);
    localStorage.setItem('customerViews', JSON.stringify(updated));
    if (currentViewName === viewName) {
      loadView('Default');
    }
  };

  const handleCreateCustomer = async (data: CustomerFormData) => {
    setModalLoading(true);
    setModalError(null);
    try {
      const result = await createCustomer(data);
      if (result.success) {
        if (result.id) {
          await logCustomerCreated(
            tenant_id ?? '',
            result.id,
            data.email,
            data.legal_name || null,
            user?.id ?? null
          );
        }
        setModalOpen(false);
        return { success: true };
      }
      return result;
    } finally {
      setModalLoading(false);
    }
  };

  const handleArchiveCustomer = async (customerId: string) => {
    if (!confirm('Archive this customer?')) return;
    const result = await archiveCustomer(customerId);
    if (result.success) {
      await logCustomerArchived(tenant_id ?? '', customerId, user?.id ?? null);
    }
  };

  const handleStatusChange = async (customer: Customer, newStatus: string) => {
    const result = await updateCustomer(customer.id, { status: newStatus as any });
    if (result.success) {
      await logCustomerStatusChanged(tenant_id ?? '', customer.id, customer.status, newStatus, user?.id ?? null);
    }
  };

  // Filter and search logic
  const filteredCustomers = customers.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch = !searchQuery || 
      c.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    inactive: customers.filter(c => c.status === 'inactive').length,
    onHold: customers.filter(c => c.status === 'on_hold').length,
    prospect: customers.filter(c => c.status === 'prospect').length,
    totalCredit: customers.reduce((sum, c) => sum + (c.credit_limit || 0), 0),
    newThisMonth: customers.filter(c => {
      const created = new Date(c.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const toggleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const isReady = profile && canManageCustomers;
  const isRedirecting = profile && !canManageCustomers;

  if (!isReady) {
    return (
      <ProtectedRoute>
        <PageContainer title="Customers">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRedirecting ? 'Redirecting…' : 'Loading…'}
            </p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        {/* Two-Tier Header */}
        <div className="mb-6 -mt-1">
          {/* Primary Row - Title with Icon + Action Buttons */}
          <div className="flex items-center justify-between gap-4 mb-2">
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="p-2">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">
                Customers
              </h1>
            </div>
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Customer
              </button>
              <button
                onClick={() => {
                  // Create CSV with headers - excluding UUIDs and system timestamps
                  const headers = [
                    'customer_code',
                    'legal_name',
                    'trading_name',
                    'email',
                    'phone',
                    'customer_type',
                    'status',
                    'address_line1',
                    'address_line2',
                    'city',
                    'state',
                    'postcode',
                    'country',
                    'registration_number',
                    'vat_number',
                    'tax_scheme',
                    'credit_rating',
                    'risk_category',
                    'payment_terms',
                    'credit_limit',
                    'credit_hold',
                    'currency',
                    'discount_rate',
                    'tax_inclusive',
                    'delivery_instructions',
                    'preferred_carrier',
                    'incoterms',
                    'channel',
                    'region'
                  ];
                  
                  const rows = customers.map(c => [
                    c.customer_code || '',
                    c.legal_name || '',
                    c.trading_name || '',
                    c.email || '',
                    c.phone || '',
                    c.customer_type || '',
                    c.status || '',
                    c.address_line1 || '',
                    c.address_line2 || '',
                    c.city || '',
                    c.state || '',
                    c.postcode || '',
                    c.country || '',
                    c.registration_number || '',
                    c.vat_number || '',
                    c.tax_scheme || '',
                    c.credit_rating || '',
                    c.risk_category || '',
                    c.payment_terms || '',
                    c.credit_limit || '',
                    c.credit_hold || false,
                    c.currency || '',
                    c.discount_rate || '',
                    c.tax_inclusive || false,
                    c.delivery_instructions || '',
                    c.preferred_carrier || '',
                    c.incoterms || '',
                    c.channel || '',
                    c.region || ''
                  ]);
                  
                  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded text-xs font-medium transition-colors border border-gray-300 dark:border-gray-600"
                title="Export all customers to CSV (excludes system fields like IDs and timestamps)"
              >
                <FileDown className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>
          {/* Secondary Row - Supporting Text */}
          <p className="text-sm text-green-700 dark:text-green-500 ml-11">
            Manage customer records and business relationships
          </p>
        </div>

        {/* Subtle Divider */}
        <div className="h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent mb-4" />

        <div className="space-y-2">
          {error && (
            <div className="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-6 h-6 animate-spin text-green-600 dark:text-green-400 mb-3" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Loading customers…</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <Users className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                No customers yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Create your first customer to get started.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Customer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                    </div>
                    <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                      <Users className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Active</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
                    </div>
                    <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">On Hold</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.onHold}</p>
                    </div>
                    <div className="p-2 bg-orange-200 dark:bg-orange-800/50 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">New</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.newThisMonth}</p>
                    </div>
                    <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex items-center gap-2">
                <div className="w-64 relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or code..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-1">
                  {[
                    { value: 'all', label: 'All', count: stats.total },
                    { value: 'active', label: 'Active', count: stats.active },
                    { value: 'inactive', label: 'Inactive', count: stats.inactive },
                    { value: 'on_hold', label: 'Hold', count: stats.onHold },
                    { value: 'prospect', label: 'Prospect', count: stats.prospect },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        statusFilter === filter.value
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter.label} ({filter.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {selectedCustomers.size > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-green-900 dark:text-green-100">
                      {selectedCustomers.size} selected
                    </span>
                    <div className="flex gap-1">
                      <button className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Change Status
                      </button>
                      <button className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </button>
                      <button className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <FileDown className="w-3 h-3" /> Export
                      </button>
                      <button className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center gap-1">
                        <Archive className="w-3 h-3" /> Archive
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomers(new Set())}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Table Controls and Data */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 relative">
                  <div className="relative">
                  <button
                    onClick={() => setShowCustomizeDropdown(!showCustomizeDropdown)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded text-xs font-medium transition-colors"
                    title="Customize columns"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {currentViewName}
                  </button>

                  {/* Column Dropdown */}
                  {showCustomizeDropdown && (
                    <div ref={dropdownRef} className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-2 flex flex-col overflow-hidden max-h-96">
                      <div className="space-y-1 flex-1 overflow-y-auto overflow-x-hidden">
                        {/* Views Section */}
                        <button
                          onClick={() => setExpandedViews(!expandedViews)}
                          className="w-full flex items-center justify-between px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs font-bold text-gray-700 dark:text-gray-300"
                        >
                          <span>Views</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedViews ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedViews && (
                          <div className="space-y-0.5 pl-1 border-l border-gray-300 dark:border-gray-600">
                            {['Default', ...Object.keys(savedViews).filter(v => v !== 'Default')].map((view) => (
                              <div key={view} className="flex items-center justify-between gap-1">
                                <button
                                  onClick={() => loadView(view)}
                                  className={`flex-1 text-left truncate px-1 py-0.5 rounded text-xs ${
                                    currentViewName === view
                                      ? 'font-bold text-green-600 bg-green-50 dark:bg-green-900/30'
                                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  {view}
                                </button>
                                {view !== 'Default' && (
                                  <button
                                    onClick={() => deleteView(view)}
                                    className="text-gray-400 hover:text-red-600 flex-shrink-0 text-xs leading-none hover:bg-gray-100 dark:hover:bg-gray-700 px-0.5 py-0.5 rounded"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                            <div className="flex gap-0.5 pt-0.5">
                              <input
                                type="text"
                                value={newViewName}
                                onChange={(e) => setNewViewName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && saveView()}
                                placeholder="New"
                                className="flex-1 min-w-0 px-1 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500 focus:outline-none"
                              />
                              <button
                                onClick={saveView}
                                className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold"
                                title="Add new view"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Column Groups */}
                        {[
                          {
                            group: 'core',
                            label: 'Core',
                            fields: [
                              { key: 'customer_code', label: 'Code' },
                              { key: 'legal_name', label: 'Name' },
                              { key: 'status', label: 'Status' },
                              { key: 'created_at', label: 'Created' },
                              { key: 'actions', label: 'Actions' },
                            ],
                          },
                          {
                            group: 'contact',
                            label: 'Contact',
                            fields: [
                              { key: 'email', label: 'Email' },
                              { key: 'phone', label: 'Phone' },
                              { key: 'customer_type', label: 'Type' },
                            ],
                          },
                          {
                            group: 'address',
                            label: 'Address',
                            fields: [
                              { key: 'address_line1', label: 'Line 1' },
                              { key: 'address_line2', label: 'Line 2' },
                              { key: 'city', label: 'City' },
                              { key: 'state', label: 'State' },
                              { key: 'postcode', label: 'Postcode' },
                              { key: 'country', label: 'Country' },
                            ],
                          },
                          {
                            group: 'financial',
                            label: 'Financial',
                            fields: [
                              { key: 'credit_limit', label: 'Limit' },
                              { key: 'credit_hold', label: 'Hold' },
                              { key: 'credit_rating', label: 'Rating' },
                              { key: 'vat_number', label: 'VAT' },
                              { key: 'registration_number', label: 'Reg' },
                            ],
                          },
                          {
                            group: 'logistics',
                            label: 'Logistics',
                            fields: [
                              { key: 'default_warehouse_id', label: 'Warehouse' },
                              { key: 'preferred_carrier', label: 'Carrier' },
                              { key: 'incoterms', label: 'Incoterms' },
                            ],
                          },
                          {
                            group: 'sales',
                            label: 'Sales',
                            fields: [
                              { key: 'sales_rep_id', label: 'Rep' },
                              { key: 'channel', label: 'Channel' },
                              { key: 'region', label: 'Region' },
                            ],
                          },
                        ].map((groupData) => (
                          <div key={groupData.group} className="mt-0.5">
                            <button
                              onClick={() =>
                                setExpandedGroups({
                                  ...expandedGroups,
                                  [groupData.group]: !expandedGroups[groupData.group],
                                })
                              }
                              className="w-full flex items-center justify-between px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xs font-bold text-gray-700 dark:text-gray-300"
                            >
                              <span>{groupData.label}</span>
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                  expandedGroups[groupData.group] ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {expandedGroups[groupData.group] && (
                              <div className="space-y-0.5 pl-1 border-l border-gray-300 dark:border-gray-600">
                                {groupData.fields.map((field) => (
                                  <label
                                    key={field.key}
                                    className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1.5 py-0.5 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={visibleColumns[field.key]}
                                      onChange={(e) => {
                                        const updated = { ...visibleColumns, [field.key]: e.target.checked };
                                        setVisibleColumns(updated);
                                        const views = { ...savedViews, [currentViewName]: updated };
                                        setSavedViews(views);
                                        localStorage.setItem('customerViews', JSON.stringify(views));
                                      }}
                                      className="h-3 w-3 rounded border-gray-300 text-green-600 focus:ring-1 focus:ring-green-500 cursor-pointer flex-shrink-0"
                                    />
                                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{field.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Data Table */}
              <div className="bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-xs text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 font-bold">
                        <th className="px-2 py-1.5 w-8">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                            onChange={toggleSelectAll}
                            className="h-3 w-3 rounded border-gray-300 text-green-600 focus:ring-1 focus:ring-green-500 cursor-pointer"
                          />
                        </th>
                        {visibleColumns.customer_code && <th className="px-2 py-1.5">Customer Code</th>}
                        {visibleColumns.legal_name && <th className="px-2 py-1.5">Legal Name</th>}
                        {visibleColumns.email && <th className="px-2 py-1.5">Email</th>}
                        {visibleColumns.phone && <th className="px-2 py-1.5">Phone</th>}
                        {visibleColumns.customer_type && <th className="px-2 py-1.5">Customer Type</th>}
                        {visibleColumns.status && <th className="px-2 py-1.5">Status</th>}
                        {visibleColumns.created_at && <th className="px-2 py-1.5">Date Created</th>}
                        {visibleColumns.address_line1 && <th className="px-2 py-1.5">Street Address</th>}
                        {visibleColumns.country && <th className="px-2 py-1.5">Country</th>}
                        {visibleColumns.credit_limit && <th className="px-2 py-1.5">Credit Limit</th>}
                        {visibleColumns.vat_number && <th className="px-2 py-1.5">VAT Number</th>}
                        {visibleColumns.registration_number && <th className="px-2 py-1.5">Registration #</th>}
                        {visibleColumns.actions && <th className="px-2 py-1.5 w-20">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-green-200 dark:border-green-800 last:border-0 hover:bg-green-100 dark:hover:bg-green-800/30 text-xs bg-white dark:bg-gray-800 even:bg-green-50 dark:even:bg-green-900/20"
                        >
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              checked={selectedCustomers.has(c.id)}
                              onChange={() => toggleSelectCustomer(c.id)}
                              className="h-3 w-3 rounded border-gray-300 text-green-600 focus:ring-1 focus:ring-green-500 cursor-pointer"
                            />
                          </td>
                          {visibleColumns.customer_code && (
                            <td className="px-2 py-1 text-gray-900 dark:text-white font-medium">
                              {formatCustomerCode(c.customer_code)}
                            </td>
                          )}
                          {visibleColumns.legal_name && (
                            <td className="px-2 py-1 text-gray-900 dark:text-white font-medium">
                              {c.legal_name || c.email}
                            </td>
                          )}
                          {visibleColumns.email && (
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-300">
                              {c.email}
                            </td>
                          )}
                          {visibleColumns.phone && (
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-300">
                              {c.phone || '—'}
                            </td>
                          )}
                          {visibleColumns.customer_type && (
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-300 capitalize">
                              {c.customer_type || '—'}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-2 py-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                                c.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                c.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
                                c.status === 'on_hold' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {c.status?.replace('_', ' ')}
                              </span>
                            </td>
                          )}
                          {visibleColumns.created_at && (
                            <td className="px-2 py-1 text-gray-500 dark:text-gray-400">
                              {new Date(c.created_at).toLocaleDateString()}
                            </td>
                          )}
                          {visibleColumns.address_line1 && (
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-300">
                              {c.address_line1 || '—'}
                            </td>
                          )}
                          {visibleColumns.country && (
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-300">
                              {c.country || '—'}
                            </td>
                          )}
                          {visibleColumns.credit_limit && (
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-300">
                              {c.credit_limit ? `${c.currency || 'USD'} ${c.credit_limit.toLocaleString()}` : '—'}
                            </td>
                          )}
                          {visibleColumns.vat_number && (
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-300">
                              {c.vat_number || '—'}
                            </td>
                          )}
                          {visibleColumns.registration_number && (
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-300">
                              {c.registration_number || '—'}
                            </td>
                          )}
                          {visibleColumns.actions && (
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => setEditingCustomer(c)}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0.5"
                                  title="Edit customer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveCustomer(c.id);
                                  }}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0.5"
                                  title="Archive customer"
                                >
                                  <Archive className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>

        <CustomerCreateModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreateCustomer}
          isLoading={modalLoading}
          error={modalError}
        />

        <CustomerCreateModal
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onCreate={async (data) => {
            setModalLoading(true);
            setModalError(null);
            try {
              const result = await updateCustomer(editingCustomer!.id, data);
              if (result.success) {
                await logCustomerUpdated(
                  tenant_id ?? '',
                  editingCustomer!.id,
                  editingCustomer!,
                  data,
                  user?.id ?? null
                );
                setEditingCustomer(null);
                return { success: true };
              }
              return result;
            } finally {
              setModalLoading(false);
            }
          }}
          isLoading={modalLoading}
          error={modalError}
          initialData={editingCustomer}
        />
      </PageContainer>
    </ProtectedRoute>
  );
}
