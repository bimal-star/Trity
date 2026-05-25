'use client';

import Link from 'next/link';
import { KeyboardEvent } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { premiumInputCompact, premiumSecondaryButton, premiumTypography } from '@/lib/premiumUi';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import type { Supplier, SupplierRecordVisibility } from '@/types/supplier';
import { formatSupplierCode } from '@/lib/supplierDisplay';
import { Filter, Loader2, Search } from 'lucide-react';

const VISIBILITY_FILTERS: { value: SupplierRecordVisibility; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

const SUPPLIER_STATUS_MAP: Record<string, string> = {
  on_hold: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
};

export type SupplierSortOption = 'name_asc' | 'recent';

interface SupplierListProps {
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (supplier: Supplier) => void;
  recordVisibility: SupplierRecordVisibility;
  onRecordVisibilityChange: (value: SupplierRecordVisibility) => void;
  sortUiValue: SupplierSortOption;
  onSortUiChange: (value: SupplierSortOption) => void;
  filterActive?: boolean;
  filtersBadgeCount?: number;
  onClearFilters?: () => void;
  filtersDrawerOpen?: boolean;
  onOpenFilters?: () => void;
}

function formatSupplierType(type: string | null | undefined): string {
  if (!type?.trim()) return '—';
  return type.replace(/_/g, ' ');
}

export default function SupplierList({
  suppliers,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
  recordVisibility,
  onRecordVisibilityChange,
  sortUiValue,
  onSortUiChange,
  filterActive = false,
  filtersBadgeCount,
  onClearFilters,
  filtersDrawerOpen = false,
  onOpenFilters,
}: SupplierListProps) {
  const filterControlClass = `${premiumInputCompact} h-9 ${premiumTypography.tableCell}`;
  const segmented = `inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700`;

  const toolbarFiltersBadgeCount = filtersBadgeCount ?? (search.trim() ? 1 : 0);

  const showFiltersBadge = filterActive;
  const filtersButtonAriaLabel = filterActive
    ? `Open filters (${toolbarFiltersBadgeCount} filter${toolbarFiltersBadgeCount === 1 ? '' : 's'} applied)`
    : 'Open filters';

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, s: Supplier) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(s);
    }
  };

  return (
    <PremiumCard className="!p-0 flex min-h-0 min-w-0 flex-1 w-full flex-col overflow-hidden">
      <div
        className="z-30 flex shrink-0 flex-col gap-2 bg-gray-50 px-1 pb-0 dark:bg-gray-900"
        role="region"
        aria-label="Supplier list toolbar"
      >
        <div className="flex min-h-[3.5rem] min-w-0 shrink-0 flex-nowrap items-center justify-between gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto">
            <div className="relative w-[240px] shrink-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search suppliers…"
                className={`${premiumInputCompact} h-10 w-[240px] max-w-full py-2 pl-10 pr-3 ${premiumTypography.body}`}
                aria-label="Search suppliers"
              />
            </div>

            <div className={`${segmented} shrink-0`}>
              {VISIBILITY_FILTERS.map((option) => {
                const selected = recordVisibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onRecordVisibilityChange(option.value)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      selected
                        ? 'bg-green-600 text-white shadow-sm dark:bg-green-600'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span className="sr-only md:not-sr-only md:inline">Sort</span>
              <select
                value={sortUiValue}
                onChange={(e) => onSortUiChange(e.target.value as SupplierSortOption)}
                className={`${filterControlClass} min-w-[10.5rem]`}
                aria-label="Sort suppliers"
              >
                <option value="name_asc">Name A–Z</option>
                <option value="recent">Recently added</option>
              </select>
            </label>
          </div>

          <div className="relative z-[45] flex shrink-0 flex-nowrap items-center gap-2 overflow-visible border-l border-gray-200/90 pl-4 dark:border-gray-600/80">
            <span className="relative inline-flex shrink-0">
              <button
                type="button"
                aria-expanded={Boolean(filtersDrawerOpen)}
                aria-haspopup="dialog"
                aria-label={filtersButtonAriaLabel}
                title="Status and more filters"
                onClick={() => onOpenFilters?.()}
                disabled={!onOpenFilters}
                className={`inline-flex !h-8 shrink-0 items-center gap-1.5 px-2.5 text-xs ${premiumSecondaryButton('businessCore', 'sm', 'auto')} disabled:pointer-events-none disabled:opacity-50 ${premiumTypography.tableCell}`}
              >
                <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Filters
              </button>
              {showFiltersBadge && (
                <span
                  className="pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-green-600 px-0.5 text-[10px] font-bold tabular-nums leading-none text-white shadow-sm ring-2 ring-white dark:bg-green-500 dark:ring-gray-950"
                  aria-hidden
                >
                  {toolbarFiltersBadgeCount > 9 ? '9+' : toolbarFiltersBadgeCount}
                </span>
              )}
            </span>
            {onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                disabled={!filterActive}
                className={`shrink-0 whitespace-nowrap text-xs font-semibold text-gray-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50 dark:text-gray-300 ${premiumTypography.tableCell}`}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className={`flex min-h-0 flex-1 basis-0 flex-col overflow-hidden ${premiumTypography.tableCell}`}
      >
        {error && !isLoading && (
          <div className={`shrink-0 p-3 text-red-500 ${premiumTypography.helper}`} role="alert">
            {error}
          </div>
        )}
        {isLoading && (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-gray-500"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="h-6 w-6 animate-spin text-green-600 dark:text-green-500"
              aria-hidden
            />
            <span>Loading suppliers…</span>
          </div>
        )}
        {!isLoading && !error && suppliers.length === 0 && !filterActive && (
          <div className="p-3 text-gray-400">
            <p className={premiumTypography.helper}>No suppliers found.</p>
            <p className={`mt-1 ${premiumTypography.helper}`}>
              <Link
                href="/suppliers/new"
                className="font-medium text-green-700 hover:underline dark:text-green-400"
              >
                New Supplier
              </Link>{' '}
              to add your first vendor record.
            </p>
          </div>
        )}
        {!isLoading && suppliers.length === 0 && filterActive && (
          <div className={`p-3 ${premiumTypography.helper}`}>
            No suppliers match the current filters.
          </div>
        )}
        {!isLoading && suppliers.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <table className="w-full table-auto border-collapse text-left">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 shadow-[0_1px_0_0_rgba(229,231,235,0.9)] backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 dark:shadow-[0_1px_0_0_rgba(55,65,81,0.8)]">
                <tr>
                  <th
                    scope="col"
                    className={`px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 ${premiumTypography.tableCell}`}
                  >
                    Code
                  </th>
                  <th
                    scope="col"
                    className={`px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 ${premiumTypography.tableCell}`}
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className={`hidden px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 sm:table-cell ${premiumTypography.tableCell}`}
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className={`hidden px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 md:table-cell ${premiumTypography.tableCell}`}
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className={`hidden px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 lg:table-cell ${premiumTypography.tableCell}`}
                  >
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    tabIndex={0}
                    aria-label={`${s.legal_name}, code ${formatSupplierCode(s.supplier_code)}`}
                    className="cursor-pointer outline-none transition-colors hover:bg-green-50/80 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-green-800/50 dark:focus-visible:ring-offset-gray-800"
                    onClick={() => onSelect(s)}
                    onKeyDown={(e) => onRowKeyDown(e, s)}
                  >
                    <td className="truncate px-3 py-2 text-gray-900 dark:text-white">
                      {formatSupplierCode(s.supplier_code)}
                    </td>
                    <td className="truncate px-3 py-2 text-gray-800 dark:text-gray-100">
                      <span className="font-medium">{s.legal_name}</span>
                      {s.trading_name?.trim() ? (
                        <span className="mt-0.5 block truncate text-[10px] text-gray-500 dark:text-gray-400">
                          {s.trading_name}
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <EntityStatusBadge
                        status={String(s.status)}
                        statusMap={SUPPLIER_STATUS_MAP}
                      />
                    </td>
                    <td className="hidden truncate px-3 py-2 capitalize text-gray-600 dark:text-gray-400 md:table-cell">
                      {formatSupplierType(s.supplier_type)}
                    </td>
                    <td className="hidden truncate px-3 py-2 text-gray-600 dark:text-gray-400 lg:table-cell">
                      {s.email?.trim() || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PremiumCard>
  );
}
