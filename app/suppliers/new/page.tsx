'use client';

import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import SupplierCreateForm from '@/components/suppliers/SupplierCreateForm';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useTenant } from '@/contexts/TenantContext';
import { logSupplierCreated } from '@/lib/auditLog';
import type { SupplierFormData } from '@/types/supplier';
import { pillarAccent, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { Truck } from 'lucide-react';

const bc = pillarAccent('businessCore');

export default function NewSupplierPage() {
  const router = useRouter();
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { createSupplier } = useSuppliers(undefined, { loadSuppliers: false });

  const handleCreate = async (data: SupplierFormData) => {
    const result = await createSupplier(data);
    if (result.success && result.id && tenant_id) {
      await logSupplierCreated(tenant_id, result.id, data.legal_name, user?.id ?? null);
    }
    return result;
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/suppliers"
          backLabel="Back to suppliers"
          icon={Truck}
          title="New supplier"
          subtitle="Add a vendor with address, payment terms, and metadata"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />
        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="flex h-[calc(100vh-168px)] min-h-[min(560px,calc(100vh-168px))] w-full flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SupplierCreateForm
              onCreate={handleCreate}
              onCancel={() => router.push('/suppliers')}
              onSuccess={() => router.push('/suppliers')}
            />
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
