'use client';

import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { PackageX } from 'lucide-react';

export default function PurchaseReturnsPlaceholderPage() {
  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={PackageX}
          title="Purchase returns"
          subtitle="Returns workflow is not in this release"
        />
        <div className={`mb-4 ${premiumSurfaces.divider}`} />
        <p className={`${premiumTypography.body} text-gray-600 dark:text-gray-400`}>
          Schema and workflows for supplier returns are not in this release. Use purchase orders, goods
          receipt, and invoices for the active purchase-to-pay path.
        </p>
      </PageContainer>
    </ProtectedRoute>
  );
}
