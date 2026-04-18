'use client';

import Link from 'next/link';
import { useState } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import type { Supplier, SupplierFormData } from '@/types/supplier';
import SupplierForm from '@/components/suppliers/SupplierForm';
import { useTenant } from '@/contexts/TenantContext';
import { logSupplierUpdated } from '@/lib/auditLog';
import { ExternalLink, ShoppingCart, Tags } from 'lucide-react';

interface SupplierDetailsTabsProps {
  supplier: Supplier;
  updateSupplier: (
    id: string,
    data: Partial<SupplierFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  onSupplierUpdated?: () => void;
}

export default function SupplierDetailsTabs({
  supplier,
  updateSupplier,
  onSupplierUpdated,
}: SupplierDetailsTabsProps) {
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
            <SupplierForm
              mode="edit"
              supplier={supplier}
              showHeader={false}
              onSubmit={async (data) => {
                const result = await updateSupplier(supplier.id, data);
                if (result.success && tenant_id) {
                  await logSupplierUpdated(
                    tenant_id,
                    supplier.id,
                    data as unknown as Record<string, unknown>,
                    user?.id ?? null
                  );
                  onSupplierUpdated?.();
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
                <Tags className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden />
                <h3 className={`${premiumTypography.sectionTitle} !normal-case`}>Supplier pricing</h3>
              </div>
              <p className={`mb-3 ${premiumTypography.helper}`}>
                Manage negotiated unit prices and MOQs per product for this supplier (defaults PO lines).
              </p>
              <Link
                href="/suppliers/pricing"
                className={`inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20`}
              >
                Open supplier pricing
                <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Link>
            </PremiumCard>
            <PremiumCard className={premiumSurfaces.card}>
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
                  className={`inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700`}
                >
                  New Purchase Order
                </Link>
                <Link
                  href="/purchase-orders"
                  className={`inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50`}
                >
                  All purchase orders
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </Link>
              </div>
            </PremiumCard>
          </div>
        )}
      </div>
    </div>
  );
}
