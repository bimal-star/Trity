'use client';

import { FileBarChart } from 'lucide-react';
import CostCardWorkspace from '@/components/costCard/CostCardWorkspace';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';

const bc = pillarAccent('businessCore');

export default function CostCardPage() {
  return (
    <ProtectedRoute>
      <PageContainer
        module="businessCore"
        rootClassName="flex min-h-0 max-h-dvh flex-1 flex-col overflow-hidden bg-gray-50 px-3 pb-2 pt-4 dark:bg-gray-900 sm:px-6"
        innerClassName="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PremiumStickyHeader
            module="businessCore"
            sticky={false}
            className="relative z-20 mb-3 shrink-0"
            icon={FileBarChart}
            title="Cost Card"
            subtitle="Cost set–based product costing and margin analysis"
            subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          />

          <CostCardWorkspace />
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
