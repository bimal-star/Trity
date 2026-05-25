'use client';

import { useState } from 'react';
import PremiumRecordPanel from '@/components/layout/premium/PremiumRecordPanel';
import PremiumRecordTabs from '@/components/layout/premium/PremiumRecordTabs';
import { premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import type { Customer, CustomerFormData } from '@/types/customer';
import CustomerForm, {
  type CustomerFormTabId,
  type CustomerRecordTabId,
} from '@/components/customers/CustomerForm';
import CustomerRelatedPanel from '@/components/customers/CustomerRelatedPanel';
import { useTenant } from '@/contexts/TenantContext';
import { logCustomerCreated, logCustomerStatusChanged, logCustomerUpdated } from '@/lib/auditLog';

const RECORD_TABS: { id: CustomerRecordTabId; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'address', label: 'Address' },
  { id: 'legal', label: 'Legal & tax' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'sales', label: 'Sales' },
  { id: 'related', label: 'Related' },
];

const FORM_TAB_IDS = new Set<CustomerRecordTabId>([
  'details',
  'address',
  'legal',
  'commercial',
  'logistics',
  'sales',
]);

function isFormTab(id: CustomerRecordTabId): id is CustomerFormTabId {
  return FORM_TAB_IDS.has(id);
}

type CustomerDetailsTabsEditProps = {
  mode: 'edit';
  customer: Customer;
  updateCustomer: (
    id: string,
    data: Partial<CustomerFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  onCustomerUpdated?: () => void;
  onFormChange?: (data: CustomerFormData) => void;
  syncFormData?: Pick<CustomerFormData, 'logo_url' | 'status'> | null;
};

type CustomerDetailsTabsCreateProps = {
  mode: 'create';
  onCreate: (data: CustomerFormData) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCancel?: () => void;
  onFormChange?: (data: CustomerFormData) => void;
  onSuccess?: (createdId?: string) => void;
  syncFormData?: Pick<CustomerFormData, 'logo_url' | 'status'> | null;
};

export type CustomerDetailsTabsProps =
  | CustomerDetailsTabsEditProps
  | CustomerDetailsTabsCreateProps;

function RelatedTabContent({
  createMode,
  customer,
}: {
  createMode?: boolean;
  customer?: Customer;
}) {
  if (createMode || !customer) {
    return (
      <div className={premiumSurfaces.card}>
        <p className={premiumTypography.helper}>
          Save the customer first. After creation you can manage contacts, addresses, notes, and
          attachments linked to this account.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px] overflow-hidden">
      <CustomerRelatedPanel customer={customer} />
    </div>
  );
}

export default function CustomerDetailsTabs(props: CustomerDetailsTabsProps) {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [activeTab, setActiveTab] = useState<CustomerRecordTabId>('details');
  const isCreate = props.mode === 'create';

  const handleTabChange = (id: string) => {
    if (RECORD_TABS.some((t) => t.id === id)) {
      setActiveTab(id as CustomerRecordTabId);
    }
  };

  const formActiveTab = isFormTab(activeTab) ? activeTab : 'details';

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
      <PremiumRecordTabs
        module="businessCore"
        tabs={RECORD_TABS}
        activeId={activeTab}
        onChange={handleTabChange}
        className="mb-2 shrink-0"
      />

      <PremiumRecordPanel className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'related' ? (
          <RelatedTabContent
            createMode={isCreate}
            customer={isCreate ? undefined : props.customer}
          />
        ) : isCreate ? (
          <CustomerForm
            mode="create"
            activeTab={formActiveTab}
            showHeader={false}
            embedded
            onCancel={props.onCancel}
            onFormChange={props.onFormChange}
            onSuccess={props.onSuccess}
            syncFormData={props.syncFormData}
            onSubmit={async (data) => {
              const result = await props.onCreate(data);
              if (result.success && result.id && tenant_id) {
                await logCustomerCreated(
                  tenant_id,
                  result.id,
                  data.email,
                  data.legal_name ?? null,
                  user?.id ?? null
                );
              }
              return result;
            }}
          />
        ) : (
          <CustomerForm
            mode="edit"
            customer={props.customer}
            activeTab={formActiveTab}
            showHeader={false}
            embedded
            onFormChange={props.onFormChange}
            syncFormData={props.syncFormData}
            onSubmit={async (data) => {
              const prevStatus = props.customer.status;
              const result = await props.updateCustomer(props.customer.id, data);
              if (result.success && tenant_id) {
                await logCustomerUpdated(
                  tenant_id,
                  props.customer.id,
                  props.customer,
                  data,
                  user?.id ?? null
                );
                if (data.status != null && data.status !== prevStatus) {
                  await logCustomerStatusChanged(
                    tenant_id,
                    props.customer.id,
                    prevStatus,
                    data.status,
                    user?.id ?? null
                  );
                }
                props.onCustomerUpdated?.();
              }
              return { success: result.success, error: result.error };
            }}
          />
        )}
      </PremiumRecordPanel>
    </div>
  );
}
