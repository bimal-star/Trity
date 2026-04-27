'use client';

/**
 * TODO(perf): This page uses N+1 queries (one fetchGroupProducts per group). Replace with a single
 * RPC or aggregated SQL query (e.g. group id → count, sum(stock)) in a future performance pass.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useCatalogueMode } from '@/hooks/useCatalogueMode';
import { useProductGroups, type ProductGroupRow } from '@/hooks/useProductGroups';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import { Package2, Loader2 } from 'lucide-react';

const bc = pillarAccent('businessCore');

type RowStats = { count: number; stock: number };

export default function ProductGroupsListPage() {
  const { supportsGroups } = useCatalogueMode();
  const { fetchGroups, fetchGroupProducts } = useProductGroups();
  const [groups, setGroups] = useState<ProductGroupRow[]>([]);
  const [stats, setStats] = useState<Record<string, RowStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchGroups();
      setGroups(list);
      const next: Record<string, RowStats> = {};
      for (const g of list) {
        const products = await fetchGroupProducts(g.id);
        const stock = products.reduce(
          (s, p) => s + (Number((p as { total_stock?: number }).total_stock) || 0),
          0
        );
        next[g.id] = { count: products.length, stock };
      }
      setStats(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load groups');
      setGroups([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, [fetchGroups, fetchGroupProducts]);

  useEffect(() => {
    if (!supportsGroups) return;
    void load();
  }, [supportsGroups, load]);

  if (!supportsGroups) {
    notFound();
  }

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/products"
          backLabel="Back to products"
          icon={Package2}
          title="Product groups"
          subtitle="Organise catalogue items into groups and matrix variants"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 py-8">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading groups…
          </div>
        )}
        {error && <p className="text-red-600 text-sm py-4">{error}</p>}

        {!loading && !error && groups.length === 0 && (
          <p className={`${premiumTypography.helper} text-gray-500 py-6`}>
            No groups yet. Create one from a product&apos;s group section or open a group from the
            new-product form.
          </p>
        )}

        {!loading && groups.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className={`text-left px-3 py-2 ${premiumTypography.tableHeader}`}>Name</th>
                  <th className={`text-right px-3 py-2 ${premiumTypography.tableHeader}`}>
                    Products
                  </th>
                  <th className={`text-right px-3 py-2 ${premiumTypography.tableHeader}`}>
                    Total stock
                  </th>
                  <th className={`text-left px-3 py-2 ${premiumTypography.tableHeader}`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {groups.map((g) => {
                  const s = stats[g.id] ?? { count: 0, stock: 0 };
                  return (
                    <tr key={g.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                      <td className="px-3 py-2">
                        <Link
                          href={`/products/groups/${g.id}`}
                          className="font-medium text-green-700 dark:text-green-400 hover:underline"
                        >
                          {g.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.stock} units</td>
                      <td className="px-3 py-2">
                        {g.is_active && !g.is_deleted ? 'Active' : 'Inactive'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
