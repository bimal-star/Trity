'use client';

import Link from 'next/link';
import { KeyboardEvent } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { premiumInputCompact, premiumTypography } from '@/lib/premiumUi';
import type { Supplier, SupplierRecordVisibility, SupplierStatus } from '@/types/supplier';
import { formatSupplierCode } from '@/lib/supplierDisplay';
import { Loader2, Search } from 'lucide-react';

const STATUS_FILTERS: { value: 'all' | SupplierStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_hold', label: 'Hold' },
];

const VIS_FILTERS: { value: SupplierRecordVisibility; label: string }[] = [
  { value: 'active', label: 'Active records' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All records' },
];

interface SupplierListProps {
  suppliers: Supplier[];
  selectedSupplierId: string | null;
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (supplier: Supplier) => void;
  statusFilter: 'all' | SupplierStatus;
  onStatusFilterChange: (value: 'all' | SupplierStatus) => void;
  recordVisibility: SupplierRecordVisibility;
  onRecordVisibilityChange: (value: SupplierRecordVisibility) => void;
  filterActive?: boolean;
}

export default function SupplierList({
  suppliers,
  selectedSupplierId,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  recordVisibility,
  onRecordVisibilityChange,
  filterActive = false,
}: SupplierListProps) {
  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, s: Supplier) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(s);
    }
  };

  return (
    <PremiumCard className="!p-0 flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search suppliers..."
            className={`${premiumInputCompact} py-2 pl-10 pr-4 ${premiumTypography.body}`}
            aria-label="Search suppliers"
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | SupplierStatus)}
            className={`${premiumInputCompact} ${premiumTypography.tableCell}`}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={recordVisibility}
            onChange={(e) => onRecordVisibilityChange(e.target.value as SupplierRecordVisibility)}
            className={`${premiumInputCompact} ${premiumTypography.tableCell}`}
            aria-label="Filter by record visibility"
          >
            {VIS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="hidden sm:block" aria-hidden />
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${premiumTypography.tableCell}`}>
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
        {!isLoading && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[32%]" />
                <col className="w-[68%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 shadow-[0_1px_0_0_rgba(229,231,235,0.9)] backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 dark:shadow-[0_1px_0_0_rgba(55,65,81,0.8)]">
                <tr>
                  <th
                    scope="col"
                    className={`px-2 py-2 text-gray-600 dark:text-gray-300 ${premiumTypography.tableCell} font-semibold`}
                  >
                    Code
                  </th>
                  <th
                    scope="col"
                    className={`px-2 py-2 text-gray-600 dark:text-gray-300 ${premiumTypography.tableCell} font-semibold`}
                  >
                    Name
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {suppliers.map((s) => {
                  const selected = s.id === selectedSupplierId;
                  return (
                    <tr
                      key={s.id}
                      tabIndex={0}
                      aria-selected={selected}
                      aria-label={`${s.legal_name}, code ${formatSupplierCode(s.supplier_code)}`}
                      className={`cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 ${
                        selected
                          ? 'bg-green-50/70 hover:bg-green-50/80 dark:bg-green-800/20 dark:hover:bg-green-800/50'
                          : 'hover:bg-green-50/80 dark:hover:bg-green-800/50'
                      }`}
                      onClick={() => onSelect(s)}
                      onKeyDown={(e) => onRowKeyDown(e, s)}
                    >
                      <td className="truncate px-2 py-1.5 text-gray-900 dark:text-white">
                        {formatSupplierCode(s.supplier_code)}
                      </td>
                      <td className="truncate px-2 py-1.5 text-gray-800 dark:text-gray-100">
                        {s.legal_name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PremiumCard>
  );
}
