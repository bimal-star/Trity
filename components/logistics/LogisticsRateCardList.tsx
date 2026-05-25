'use client';

import { KeyboardEvent } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import { premiumInputCompact, premiumTypography } from '@/lib/premiumUi';
import type { LogisticsRateCardListRow } from '@/types/logistics';
import { LOGISTICS_DIRECTION_MAP, LOGISTICS_RATE_CARD_STATUS_MAP } from '@/types/logistics';
import { Loader2, Search } from 'lucide-react';

interface LogisticsRateCardListProps {
  rateCards: LogisticsRateCardListRow[];
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (card: LogisticsRateCardListRow) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function lineCount(card: LogisticsRateCardListRow): number {
  const row = card.logistics_rate_lines?.[0];
  return row?.count ?? 0;
}

export default function LogisticsRateCardList({
  rateCards,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
}: LogisticsRateCardListProps) {
  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, card: LogisticsRateCardListRow) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(card);
    }
  };

  return (
    <PremiumCard className="flex min-h-0 flex-1 flex-col !p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search rate cards…"
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
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className={`ml-3 ${premiumTypography.body}`}>Loading rate cards…</span>
        </div>
      ) : rateCards.length === 0 ? (
        <p className={`${premiumTypography.helper} px-4 py-12 text-center`}>
          No logistics rate cards yet. Create one to define freight and distribution rates.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-[1] bg-white dark:bg-gray-800">
              <tr className={premiumTypography.tableHeader}>
                <th className="px-4 py-2">Label</th>
                <th className="px-4 py-2">Provider</th>
                <th className="px-4 py-2">Direction</th>
                <th className="px-4 py-2">Effective from</th>
                <th className="px-4 py-2">Effective to</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Rate lines</th>
              </tr>
            </thead>
            <tbody>
              {rateCards.map((card) => (
                <tr
                  key={card.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => onSelect(card)}
                  onKeyDown={(e) => onRowKeyDown(e, card)}
                  className="cursor-pointer border-t border-gray-100 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:bg-blue-950/20"
                >
                  <td className={`px-4 py-2.5 ${premiumTypography.tableCell} font-medium`}>
                    {card.label}
                  </td>
                  <td className={`px-4 py-2.5 ${premiumTypography.tableCell}`}>
                    {card.provider || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <EntityStatusBadge
                      status={card.direction}
                      statusMap={LOGISTICS_DIRECTION_MAP}
                    />
                  </td>
                  <td className={`px-4 py-2.5 ${premiumTypography.tableCell}`}>
                    {formatDate(card.effective_date_from)}
                  </td>
                  <td className={`px-4 py-2.5 ${premiumTypography.tableCell}`}>
                    {formatDate(card.effective_date_to)}
                  </td>
                  <td className="px-4 py-2.5">
                    <EntityStatusBadge
                      status={card.status}
                      statusMap={LOGISTICS_RATE_CARD_STATUS_MAP}
                    />
                  </td>
                  <td className={`px-4 py-2.5 ${premiumTypography.tableCell}`}>
                    {lineCount(card)}
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
