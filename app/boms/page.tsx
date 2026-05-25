'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Plus } from 'lucide-react';
import BomList from '@/components/bom/BomList';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useBomHeaders } from '@/hooks/useBomHeaders';
import { pillarAccent, premiumPrimaryButton, premiumTypography } from '@/lib/premiumUi';

const bc = pillarAccent('businessCore');

export default function BomsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { boms, isLoading, error } = useBomHeaders();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return boms;
    return boms.filter(
      (b) =>
        (b.bom_code?.toLowerCase().includes(q) ?? false) ||
        (b.product_name?.toLowerCase().includes(q) ?? false) ||
        (b.product_sku?.toLowerCase().includes(q) ?? false) ||
        (b.version?.toLowerCase().includes(q) ?? false)
    );
  }, [boms, search]);

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
            icon={Layers}
            title="Bills of Materials"
            subtitle="Assembly recipes with quantity, waste, and costing"
            subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
            right={
              <button
                type="button"
                className={premiumPrimaryButton('businessCore', 'md', 'standard')}
                onClick={() => router.push('/boms/new')}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                New BOM
              </button>
            }
          />

          <BomList
            boms={filtered}
            isLoading={isLoading}
            error={error}
            search={search}
            onSearchChange={setSearch}
            onSelect={(bom) => router.push(`/boms/${bom.bom_id}`)}
          />
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
