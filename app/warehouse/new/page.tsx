'use client';

import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import WarehouseCreateForm from '@/components/warehouses/WarehouseCreateForm';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useTenant } from '@/contexts/TenantContext';
import { logWarehouseCreated } from '@/lib/auditLog';
import type { WarehouseFormData } from '@/types/warehouse';
import { pillarAccent, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { Warehouse as WarehouseIcon } from 'lucide-react';

const bc = pillarAccent('businessCore');

export default function NewWarehousePage() {
  const router = useRouter();
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { createWarehouse } = useWarehouses(undefined, { loadWarehouses: false });

  const handleCreate = async (data: WarehouseFormData) => {
    const result = await createWarehouse(data);
    if (result.success && result.id && tenant_id) {
      await logWarehouseCreated(tenant_id, result.id, data.name, user?.id ?? null);
    }
    return result;
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/warehouse"
          backLabel="Back to warehouses"
          icon={WarehouseIcon}
          title="New warehouse"
          subtitle="Add a location, default flag, and site contact details"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />
        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="flex h-[calc(100vh-168px)] min-h-[min(560px,calc(100vh-168px))] w-full flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <WarehouseCreateForm
              onCreate={handleCreate}
              onCancel={() => router.push('/warehouse')}
              onSuccess={() => router.push('/warehouse')}
            />
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
