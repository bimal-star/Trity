'use client';

import Link from 'next/link';
import { useState } from 'react';
import PremiumRecordPanel from '@/components/layout/premium/PremiumRecordPanel';
import PremiumRecordTabs from '@/components/layout/premium/PremiumRecordTabs';
import { premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import type { Supplier, SupplierFormData } from '@/types/supplier';
import SupplierForm, { type SupplierFormTabId } from '@/components/suppliers/SupplierForm';
import { useTenant } from '@/contexts/TenantContext';
import { logSupplierCreated, logSupplierUpdated } from '@/lib/auditLog';
import { ExternalLink, ShoppingCart, Tags } from 'lucide-react';

type SupplierDetailsTabsEditProps = {
  mode: 'edit';
  supplier: Supplier;
  updateSupplier: (
    id: string,
    data: Partial<SupplierFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  onSupplierUpdated?: () => void;
  onFormChange?: (data: SupplierFormData) => void;
  syncFormData?: Pick<SupplierFormData, 'logo_url' | 'status'> | null;
};

type SupplierDetailsTabsCreateProps = {
  mode: 'create';
  onCreate: (data: SupplierFormData) => Promise<{ success: boolean; id?: string; error?: string }>;
  onCancel?: () => void;
  onFormChange?: (data: SupplierFormData) => void;
  onSuccess?: (createdId?: string) => void;
  syncFormData?: Pick<SupplierFormData, 'logo_url' | 'status'> | null;
};

export type SupplierDetailsTabsProps =
  | SupplierDetailsTabsEditProps
  | SupplierDetailsTabsCreateProps;

function RelatedTabContent({ createMode }: { createMode?: boolean }) {
  if (createMode) {
    return (
      <div className={premiumSurfaces.card}>
        <p className={premiumTypography.helper}>
          Save the supplier first. After creation you can open supplier pricing and purchase orders
          linked to this vendor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={premiumSurfaces.card}>
        <div className="mb-2 flex items-center gap-2">
          <Tags className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
          <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Supplier pricing</h3>
        </div>
        <p className={`mb-3 ${premiumTypography.helper}`}>
          Manage negotiated unit prices and MOQs per product for this supplier (defaults PO lines).
        </p>
        <Link
          href="/suppliers/pricing"
          className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20"
        >
          Open supplier pricing
          <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Link>
      </div>
      <div className={premiumSurfaces.card}>
        <div className="mb-2 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
          <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Purchase orders</h3>
        </div>
        <p className={`mb-3 ${premiumTypography.helper}`}>
          Create or review purchase orders; select this supplier on the new PO form.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/purchase-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
          >
            New Purchase Order
          </Link>
          <Link
            href="/purchase-orders"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50"
          >
            All purchase orders
            <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SupplierDetailsTabs(props: SupplierDetailsTabsProps) {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [activeTab, setActiveTab] = useState<SupplierFormTabId>('details');
  const isCreate = props.mode === 'create';

  const handleTabChange = (id: string) => {
    if (id === 'details' || id === 'address' || id === 'related') {
      setActiveTab(id);
    }
  };

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
      <PremiumRecordTabs
        module="businessCore"
        tabs={[
          { id: 'details', label: 'Details' },
          { id: 'address', label: 'Address & terms' },
          { id: 'related', label: 'Related' },
        ]}
        activeId={activeTab}
        onChange={handleTabChange}
        className="mb-2 shrink-0"
      />

      <PremiumRecordPanel className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'related' ? (
          <RelatedTabContent createMode={isCreate} />
        ) : isCreate ? (
          <SupplierForm
            mode="create"
            activeTab={activeTab}
            showHeader={false}
            embedded
            onCancel={props.onCancel}
            onFormChange={props.onFormChange}
            onSuccess={props.onSuccess}
            syncFormData={props.syncFormData}
            onSubmit={async (data) => {
              const result = await props.onCreate(data);
              if (result.success && result.id && tenant_id) {
                await logSupplierCreated(tenant_id, result.id, data.legal_name, user?.id ?? null);
              }
              return result;
            }}
          />
        ) : (
          <SupplierForm
            mode="edit"
            supplier={props.supplier}
            activeTab={activeTab}
            showHeader={false}
            embedded
            onFormChange={props.onFormChange}
            syncFormData={props.syncFormData}
            onSubmit={async (data) => {
              const result = await props.updateSupplier(props.supplier.id, data);
              if (result.success && tenant_id) {
                await logSupplierUpdated(
                  tenant_id,
                  props.supplier.id,
                  data as unknown as Record<string, unknown>,
                  user?.id ?? null
                );
                props.onSupplierUpdated?.();
              }
              return result;
            }}
          />
        )}
      </PremiumRecordPanel>
    </div>
  );
}
