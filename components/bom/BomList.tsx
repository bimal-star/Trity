'use client';

import { KeyboardEvent } from 'react';
import { Loader2, Search } from 'lucide-react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { formatBomCurrency } from '@/lib/bomCalculations';
import { pillarAccent, premiumInputCompact, premiumTypography } from '@/lib/premiumUi';
import type { BomHeaderListRow } from '@/hooks/useBomHeaders';

const bc = pillarAccent('businessCore');

interface BomListProps {
  boms: BomHeaderListRow[];
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (bom: BomHeaderListRow) => void;
}

export default function BomList({
  boms,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
}: BomListProps) {
  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, bom: BomHeaderListRow) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(bom);
    }
  };

  return (
    <PremiumCard className="flex min-h-0 flex-1 flex-col overflow-hidden !rounded-xl !p-0 ring-1 ring-green-200/50 dark:ring-green-900/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-green-200/40 bg-green-50/50 px-4 py-3 dark:border-green-900/30 dark:bg-green-950/25">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search BOM code, SKU, product, version…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`${premiumInputCompact} h-9 pl-8 ${premiumTypography.tableCell}`}
          />
        </div>
      </div>

      {error && (
        <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className={`h-8 w-8 animate-spin ${bc.iconColor}`} />
          <span className={`ml-3 ${premiumTypography.body}`}>Loading bills of materials…</span>
        </div>
      ) : boms.length === 0 ? (
        <p className={`${premiumTypography.helper} px-4 py-12 text-center`}>
          No bills of materials yet. Create one for a manufacturable product.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-[1] bg-white dark:bg-gray-800">
              <tr className={premiumTypography.tableHeader}>
                <th className="px-4 py-2">BOM code</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Version</th>
                <th className="px-4 py-2">Components</th>
                <th className="px-4 py-2 text-right">Total (landing)</th>
                <th className="px-4 py-2 text-right">Per unit</th>
                <th className="px-4 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {boms.map((bom) => (
                <tr
                  key={bom.bom_id}
                  tabIndex={0}
                  role="button"
                  onClick={() => onSelect(bom)}
                  onKeyDown={(e) => onRowKeyDown(e, bom)}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-green-50/60 dark:border-gray-800 dark:hover:bg-green-950/20"
                >
                  <td className={`px-4 py-2.5 font-mono text-xs ${premiumTypography.tableCell}`}>
                    {bom.bom_code ?? '—'}
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${premiumTypography.tableCell}`}>
                    {bom.product_name ?? '—'}
                  </td>
                  <td
                    className={`px-4 py-2.5 ${premiumTypography.tableCell} text-gray-600 dark:text-gray-400`}
                  >
                    {bom.product_sku ?? '—'}
                  </td>
                  <td className={`px-4 py-2.5 ${premiumTypography.tableCell}`}>
                    {bom.version ?? '—'}
                  </td>
                  <td className={`px-4 py-2.5 ${premiumTypography.tableCell}`}>
                    {bom.component_count ?? 0}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${premiumTypography.tableCell}`}
                  >
                    {formatBomCurrency(bom.total_component_cost_landing)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular-nums ${premiumTypography.tableCell}`}
                  >
                    {formatBomCurrency(bom.cost_per_unit_landing)}
                  </td>
                  <td className={`px-4 py-2.5 ${premiumTypography.tableCell}`}>
                    {bom.is_active ? (
                      <span className="text-green-700 dark:text-green-400">Yes</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PremiumCard>
  );
}
