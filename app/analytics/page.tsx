'use client';

import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { pillarAccent, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import { BarChart3 } from 'lucide-react';

const an = pillarAccent('analytics');

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <PageContainer module="analytics">
        <PremiumStickyHeader
          module="analytics"
          icon={BarChart3}
          title="Analytics"
          subtitle="View insights and metrics across your workspace"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${an.subtitleTint}`}
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />
      </PageContainer>
    </ProtectedRoute>
  );
}
