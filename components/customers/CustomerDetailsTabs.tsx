'use client';

import { useState } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { premiumTypography } from '@/lib/premiumUi';
import type { Customer, CustomerFormData } from '@/types/customer';
import CustomerForm from '@/components/customers/CustomerForm';
import CustomerRelatedPanel from '@/components/customers/CustomerRelatedPanel';
import { useTenant } from '@/contexts/TenantContext';
import { logCustomerStatusChanged, logCustomerUpdated } from '@/lib/auditLog';

interface CustomerDetailsTabsProps {
  customer: Customer;
  updateCustomer: (
    id: string,
    data: Partial<CustomerFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  onCustomerUpdated?: () => void;
}

export default function CustomerDetailsTabs({
  customer,
  updateCustomer,
  onCustomerUpdated,
}: CustomerDetailsTabsProps) {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [activeTab, setActiveTab] = useState<'profile' | 'related'>('profile');

  const handleSubmit = async (data: CustomerFormData) => {
    const prevStatus = customer.status;
    const result = await updateCustomer(customer.id, data);
    if (result.success && tenant_id) {
      await logCustomerUpdated(tenant_id, customer.id, customer, data, user?.id ?? null);
      if (data.status != null && data.status !== prevStatus) {
        await logCustomerStatusChanged(
          tenant_id,
          customer.id,
          prevStatus,
          data.status,
          user?.id ?? null
        );
      }
      onCustomerUpdated?.();
    }
    return { success: result.success, error: result.error };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 gap-1 border-b border-gray-200 px-0 pt-0 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`rounded-t-md px-3 py-2 transition-colors ${premiumTypography.button} ${
            activeTab === 'profile'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50'
          }`}
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('related')}
          className={`rounded-t-md px-3 py-2 transition-colors ${premiumTypography.button} ${
            activeTab === 'related'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50'
          }`}
        >
          Related
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pt-2">
        {activeTab === 'profile' && (
          <PremiumCard className="h-full min-h-[280px] !p-0">
            <CustomerForm
              mode="edit"
              customer={customer}
              onSubmit={handleSubmit}
              showCancelButton={false}
            />
          </PremiumCard>
        )}
        {activeTab === 'related' && (
          <div className="h-full min-h-[200px] overflow-hidden">
            <CustomerRelatedPanel customer={customer} />
          </div>
        )}
      </div>
    </div>
  );
}
