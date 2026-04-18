'use client';

import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import CustomerCreateForm from '@/components/customers/CustomerCreateForm';
import { useCustomers } from '@/hooks/useCustomers';
import type { CustomerFormData } from '@/types/customer';
import { logCustomerCreated } from '@/lib/auditLog';
import { useTenant } from '@/contexts/TenantContext';
import { pillarAccent, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { Users } from 'lucide-react';

const bc = pillarAccent('businessCore');

export default function NewCustomerPage() {
  const router = useRouter();
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { createCustomer } = useCustomers(undefined, { loadCustomers: false });

  const handleCreate = async (data: CustomerFormData) => {
    const result = await createCustomer(data);
    if (result.success && result.id && tenant_id) {
      await logCustomerCreated(
        tenant_id,
        result.id,
        data.email,
        data.legal_name || null,
        user?.id || null
      );
    }
    return { success: result.success, error: result.error };
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/customers"
          backLabel="Back to customers"
          icon={Users}
          title="New customer"
          subtitle="Add a customer record with contact, commercial terms, and metadata"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />
        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        {/* Same viewport band as /customers — form scrolls inside the card */}
        <div className="flex h-[calc(100vh-168px)] min-h-[min(560px,calc(100vh-168px))] w-full flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CustomerCreateForm
              onCreate={handleCreate}
              onCancel={() => router.push('/customers')}
              onSuccess={() => router.push('/customers')}
            />
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
