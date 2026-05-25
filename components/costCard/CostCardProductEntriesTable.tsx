'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import CostCardPanelHeader from '@/components/costCard/CostCardPanelHeader';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import CostCardEntryExpanded from '@/components/costCard/CostCardEntryExpanded';
import { computeEntryMetrics, formatCurrency, formatPercent } from '@/lib/costCardCalculations';
import { pillarAccent, premiumPrimaryButton, premiumTypography } from '@/lib/premiumUi';
import type { CostCardProductEntryWithRelations, MarginStatus } from '@/types/costCard';

const MODULE = 'businessCore' as const;
const bc = pillarAccent(MODULE);

function marginDot(status: MarginStatus): string {
  if (status === 'green') return 'bg-green-500';
  if (status === 'amber') return 'bg-amber-500';
  if (status === 'red') return 'bg-red-500';
  return 'bg-gray-300 dark:bg-gray-600';
}

interface CostCardProductEntriesTableProps {
  entries: CostCardProductEntryWithRelations[];
  isLoading: boolean;
  error: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onAddProduct: () => void;
  readOnly?: boolean;
  productCount?: number;
  averageMarginPct?: number | null;
  belowTargetCount?: number;
  fxExposureCount?: number;
}

function SummaryChip({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <span
      className={`hidden shrink-0 rounded-md border px-2 py-0.5 sm:inline-flex sm:items-center sm:gap-1.5 ${
        alert
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
          : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-300'
      }`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </span>
  );
}

export default function CostCardProductEntriesTable({
  entries,
  isLoading,
  error,
  expandedIds,
  onToggleExpand,
  onAddProduct,
  readOnly = false,
  productCount,
  averageMarginPct,
  belowTargetCount = 0,
  fxExposureCount = 0,
}: CostCardProductEntriesTableProps) {
  const count = productCount ?? entries.length;

  return (
    <PremiumCard className="flex min-h-0 flex-1 flex-col overflow-hidden !rounded-xl !p-0 ring-1 ring-green-200/50 dark:ring-green-900/40">
      <CostCardPanelHeader
        title="Products"
        count={count}
        action={
          <button
            type="button"
            className={`${premiumPrimaryButton(MODULE, 'sm', 'auto')} !min-w-0 shrink-0`}
            onClick={onAddProduct}
            disabled={readOnly}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Add
          </button>
        }
      />
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-green-200/40 bg-green-50/50 px-2 py-1 dark:border-green-900/30 dark:bg-green-950/25">
        <SummaryChip label="Count" value={String(count)} />
        <SummaryChip label="Avg margin" value={formatPercent(averageMarginPct)} />
        <SummaryChip
          label="Below target"
          value={String(belowTargetCount)}
          alert={belowTargetCount > 0}
        />
        <SummaryChip label="FX" value={String(fxExposureCount)} alert={fxExposureCount > 0} />
      </div>

      {error && (
        <p className="mx-2 mt-1 shrink-0 rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <Loader2 className={`h-6 w-6 animate-spin ${bc.iconColor}`} aria-hidden />
          <span className="sr-only">Loading product entries…</span>
        </div>
      ) : entries.length === 0 ? (
        <p className={`${premiumTypography.helper} px-2 py-6 text-center`}>
          No products in this version yet.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className={`min-w-full text-left ${premiumTypography.tableCell}`}>
            <thead className="sticky top-0 z-[1] border-b border-green-200/40 bg-green-50/90 dark:border-green-900/30 dark:bg-green-950/40">
              <tr className={premiumTypography.tableHeaderDense}>
                <th className="w-7 px-1 py-1" />
                <th className="px-1.5 py-1">Product</th>
                <th className="hidden px-1.5 py-1 md:table-cell">Customer</th>
                <th className="w-12 px-1 py-1">CCY</th>
                <th className="px-1.5 py-1">Sell</th>
                <th className="hidden w-14 px-1 py-1 lg:table-cell">Tgt%</th>
                <th className="px-1.5 py-1">COGS</th>
                <th className="px-1.5 py-1">Margin</th>
                <th className="w-8 px-1 py-1" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const metrics = computeEntryMetrics(entry);
                const expanded = expandedIds.has(entry.id);
                const productLabel =
                  [entry.product?.sku, entry.product?.name].filter(Boolean).join(' — ') || '—';
                const customerLabel =
                  entry.customer?.trading_name || entry.customer?.legal_name || '—';
                const marginLabel = [
                  formatCurrency(metrics.grossMarginAmount, entry.base_currency),
                  formatPercent(metrics.grossMarginPct),
                ]
                  .filter((s) => s && s !== '—')
                  .join(' / ');

                return (
                  <Fragment key={entry.id}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50/80 dark:border-gray-700 dark:hover:bg-gray-800/80">
                      <td className="px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => onToggleExpand(entry.id)}
                          className="rounded p-0.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          aria-expanded={expanded}
                          aria-label={expanded ? 'Collapse' : 'Expand'}
                        >
                          {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="max-w-[180px] truncate px-1.5 py-0.5">
                        {entry.product?.id ? (
                          <Link
                            href={`/products/${entry.product.id}`}
                            className={`${bc.titleText} hover:underline`}
                          >
                            {productLabel}
                          </Link>
                        ) : (
                          productLabel
                        )}
                      </td>
                      <td className="hidden max-w-[120px] truncate px-1.5 py-0.5 md:table-cell">
                        {entry.customer?.id ? (
                          <Link
                            href={`/customers/${entry.customer.id}`}
                            className={`${bc.titleText} hover:underline`}
                          >
                            {customerLabel}
                          </Link>
                        ) : (
                          customerLabel
                        )}
                      </td>
                      <td className="px-1 py-0.5">{entry.base_currency}</td>
                      <td className="whitespace-nowrap px-1.5 py-0.5">
                        {formatCurrency(entry.selling_price_resolved, entry.base_currency)}
                      </td>
                      <td className="hidden whitespace-nowrap px-1 py-0.5 lg:table-cell">
                        {formatPercent(entry.target_margin_pct)}
                      </td>
                      <td className="whitespace-nowrap px-1.5 py-0.5">
                        {formatCurrency(metrics.totalCogs, entry.base_currency)}
                      </td>
                      <td className="whitespace-nowrap px-1.5 py-0.5">{marginLabel || '—'}</td>
                      <td className="px-1 py-0.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${marginDot(metrics.marginStatus)}`}
                          title={metrics.marginStatus}
                        />
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${entry.id}-expanded`}>
                        <td colSpan={9} className="p-0">
                          <CostCardEntryExpanded entry={entry} readOnly={readOnly} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PremiumCard>
  );
}
