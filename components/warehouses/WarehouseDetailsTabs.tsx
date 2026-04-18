'use client';

import Link from 'next/link';
import { useState } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import type { Warehouse, WarehouseFormData } from '@/types/warehouse';
import WarehouseForm from '@/components/warehouses/WarehouseForm';
import { useTenant } from '@/contexts/TenantContext';
import { logWarehouseUpdated } from '@/lib/auditLog';
import { ClipboardList, ExternalLink, Package } from 'lucide-react';

interface WarehouseDetailsTabsProps {
  warehouse: Warehouse;
  updateWarehouse: (
    id: string,
    data: Partial<WarehouseFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  onWarehouseUpdated?: () => void;
}

export default function WarehouseDetailsTabs({
  warehouse,
  updateWarehouse,
  onWarehouseUpdated,
}: WarehouseDetailsTabsProps) {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [activeTab, setActiveTab] = useState<'profile' | 'related'>('profile');

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
            <WarehouseForm
              mode="edit"
              warehouse={warehouse}
              showHeader={false}
              onSubmit={async (data) => {
                const result = await updateWarehouse(warehouse.id, data);
                if (result.success && tenant_id) {
                  await logWarehouseUpdated(
                    tenant_id,
                    warehouse.id,
                    data as unknown as Record<string, unknown>,
                    user?.id ?? null
                  );
                  onWarehouseUpdated?.();
                }
                return result;
              }}
            />
          </PremiumCard>
        )}
        {activeTab === 'related' && (
          <div className="flex h-full min-h-[200px] flex-col gap-4 overflow-y-auto pr-1">
            <PremiumCard className={premiumSurfaces.card}>
              <div className="mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
                <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Goods receipt</h3>
              </div>
              <p className={`mb-3 ${premiumTypography.helper}`}>
                Record inbound stock against purchase orders for this site.
              </p>
              <Link
                href="/goods-receipt"
                className={`inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20`}
              >
                Open goods receipt
                <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Link>
            </PremiumCard>
            <PremiumCard className={premiumSurfaces.card}>
              <div className="mb-2 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
                <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Purchase flow</h3>
              </div>
              <p className={`mb-3 ${premiumTypography.helper}`}>
                Choose this warehouse as the delivery site when creating purchase orders.
              </p>
              <Link
                href="/purchase-orders/new"
                className={`inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700`}
              >
                New Purchase Order
              </Link>
            </PremiumCard>
          </div>
        )}
      </div>
    </div>
  );
}
