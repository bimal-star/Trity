'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Truck } from 'lucide-react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import LogisticsRateCardList from '@/components/logistics/LogisticsRateCardList';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useLogisticsRateCards } from '@/hooks/useLogisticsRateCards';
import { pillarAccent, premiumPrimaryButton, premiumTypography } from '@/lib/premiumUi';
import type { LogisticsRateCardListRow } from '@/types/logistics';

const ac = pillarAccent('analytics');

export default function LogisticsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { rateCards, isLoading, error } = useLogisticsRateCards();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rateCards;
    return rateCards.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.provider?.toLowerCase().includes(q) ?? false)
    );
  }, [rateCards, search]);

  return (
    <ProtectedRoute>
      <PageContainer
        module="analytics"
        rootClassName="flex min-h-0 max-h-dvh flex-1 flex-col overflow-hidden bg-gray-50 px-3 pb-2 pt-4 dark:bg-gray-900 sm:px-6"
        innerClassName="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PremiumStickyHeader
            module="analytics"
            sticky={false}
            className="relative z-20 mb-3 shrink-0"
            icon={Truck}
            title="Logistics Rate Cards"
            subtitle="Inbound and outbound freight and distribution rates"
            subtitleClassName={`${premiumTypography.pageSubtitle} ${ac.subtitleTint}`}
            right={
              <Link
                href="/logistics/new"
                className={premiumPrimaryButton('analytics', 'md', 'standard')}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                New Rate Card
              </Link>
            }
          />

          <LogisticsRateCardList
            rateCards={filtered}
            isLoading={isLoading}
            error={error}
            search={search}
            onSearchChange={setSearch}
            onSelect={(c: LogisticsRateCardListRow) => router.push(`/logistics/${c.id}`)}
          />
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
