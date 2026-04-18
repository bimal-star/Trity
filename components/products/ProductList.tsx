'use client';

import Link from 'next/link';
import { KeyboardEvent, useMemo } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { Product, ProductType, StatusType } from '@/types/product';
import { Search, Loader2, Plus } from 'lucide-react';
import { premiumInputCompact, premiumSecondaryButton, premiumTypography } from '@/lib/premiumUi';

const STATUS_FILTERS: { value: 'all' | StatusType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'planned', label: 'Planned' },
  { value: 'development', label: 'Development' },
];

interface ProductListProps {
  products: Product[];
  selectedProductId: string | null;
  isLoading: boolean;
  error: string | null;
  categoriesError?: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (product: Product) => void;
  statusFilter: 'all' | StatusType;
  onStatusFilterChange: (value: 'all' | StatusType) => void;
  productTypeFilter: 'all' | ProductType;
  onProductTypeFilterChange: (value: 'all' | ProductType) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categoryOptions: string[];
  filterActive?: boolean;
  /** Opens add-category modal (products list filter row). */
  onOpenAddCategory?: () => void;
  /** Grouped / matrix catalogue: show product group name column. */
  showGroupColumn?: boolean;
  /** When true, archived (soft-deleted) products are included in the list. */
  showArchived?: boolean;
  onShowArchivedChange?: (value: boolean) => void;
}

export default function ProductList({
  products,
  selectedProductId,
  isLoading,
  error,
  categoriesError = null,
  search,
  onSearchChange,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  productTypeFilter,
  onProductTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  filterActive = false,
  onOpenAddCategory,
  showGroupColumn = false,
  showArchived = false,
  onShowArchivedChange,
}: ProductListProps) {
  const categorySelectKey = useMemo(
    () => categoryOptions.filter((c) => c !== 'all').join('\u0001'),
    [categoryOptions]
  );

  const activateRow = (p: Product) => {
    onSelect(p);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, p: Product) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateRow(p);
    }
  };

  return (
    <PremiumCard className="!p-0 flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center min-w-0 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className={`${premiumInputCompact} py-2 pl-10 pr-4 ${premiumTypography.body}`}
            aria-label="Search products"
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | StatusType)}
            className={`${premiumInputCompact} ${premiumTypography.tableCell}`}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={productTypeFilter}
            onChange={(e) => onProductTypeFilterChange(e.target.value as 'all' | ProductType)}
            className={`${premiumInputCompact} ${premiumTypography.tableCell}`}
            aria-label="Filter by product type"
          >
            <option value="all">All types</option>
            <option value="raw_material">Raw material</option>
            <option value="semi_finished">Semi finished</option>
            <option value="finished_good">Finished good</option>
            <option value="service">Service</option>
            <option value="assembly">Assembly</option>
            <option value="packaging">Packaging</option>
          </select>
          <div className="flex min-w-0 items-stretch gap-1.5">
            <select
              key={categorySelectKey}
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className={`min-w-0 flex-1 ${premiumInputCompact} ${premiumTypography.tableCell}`}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {categoryOptions
                .filter((c) => c !== 'all')
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
            {onOpenAddCategory && (
              <button
                type="button"
                onClick={onOpenAddCategory}
                className={`shrink-0 px-2 ${premiumSecondaryButton('businessCore', 'sm', 'auto')}`}
                aria-label="Add new category"
                title="Add new category"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>
        {categoriesError && (
          <p
            className={`mt-1.5 px-3 text-amber-700 dark:text-amber-400 ${premiumTypography.helper}`}
            role="status"
          >
            Categories could not be loaded ({categoriesError}). The filter may be incomplete.
          </p>
        )}
        {onShowArchivedChange && (
          <label
            className={`mt-2 flex cursor-pointer items-center gap-2 select-none ${premiumTypography.helper} text-gray-600 dark:text-gray-400`}
          >
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => onShowArchivedChange(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
            />
            Include archived
          </label>
        )}
      </div>

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${premiumTypography.body}`}>
        {error && !isLoading && (
          <div className={`shrink-0 p-3 text-red-500 ${premiumTypography.helper}`} role="alert">
            {error}
          </div>
        )}
        {isLoading && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-gray-500"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="w-6 h-6 animate-spin text-green-600 dark:text-green-500"
              aria-hidden
            />
            <span>Loading products…</span>
          </div>
        )}
        {!isLoading && !error && products.length === 0 && !filterActive && (
          <div className="p-3 text-gray-400">
            <p className={premiumTypography.helper}>No products found.</p>
            <p className={`mt-1 text-gray-500 dark:text-gray-400 ${premiumTypography.helper}`}>
              <Link
                href="/products/new"
                className="font-medium text-green-700 dark:text-green-400 hover:underline"
              >
                Create product
              </Link>{' '}
              to add your first catalog item, or use <span className="font-medium">New Product</span>{' '}
              in the header.
            </p>
          </div>
        )}
        {!isLoading && products.length === 0 && filterActive && (
          <div className={`p-3 ${premiumTypography.helper} text-gray-500 dark:text-gray-400`}>
            No products match the current filters.
          </div>
        )}
        {!isLoading && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[28%]" />
                {showGroupColumn ? <col className="w-[22%]" /> : null}
                <col className={showGroupColumn ? 'w-[50%]' : 'w-[72%]'} />
              </colgroup>
              <thead className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50/95 shadow-[0_1px_0_0_rgba(229,231,235,0.9)] backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 dark:shadow-[0_1px_0_0_rgba(55,65,81,0.8)]">
                <tr>
                  <th
                    scope="col"
                    className={`px-2 py-2 text-gray-600 dark:text-gray-300 ${premiumTypography.tableCell} font-semibold`}
                  >
                    SKU
                  </th>
                  {showGroupColumn && (
                    <th
                      scope="col"
                      className={`px-2 py-2 text-gray-600 dark:text-gray-300 ${premiumTypography.tableCell} font-semibold`}
                    >
                      Group
                    </th>
                  )}
                  <th
                    scope="col"
                    className={`px-2 py-2 text-gray-600 dark:text-gray-300 ${premiumTypography.tableCell} font-semibold`}
                  >
                    Name
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map((p, idx) => {
                  const selected = p.id === selectedProductId;
                  const groupStripe =
                    showGroupColumn && p.product_group_id
                      ? (idx === 0 ||
                          products[idx - 1]?.product_group_id !== p.product_group_id
                          ? 'border-l-2 border-l-green-500/60'
                          : 'border-l-2 border-l-transparent') + ' pl-0.5'
                      : '';
                  return (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      aria-selected={selected}
                      aria-label={`${p.name}, SKU ${p.sku}. Press Enter to view details.`}
                      className={`cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 ${groupStripe} ${
                        selected
                          ? 'bg-green-50/70 dark:bg-green-900/20 hover:bg-green-50 dark:hover:bg-green-900/25'
                          : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/50'
                      }`}
                      onClick={() => activateRow(p)}
                      onKeyDown={(e) => onRowKeyDown(e, p)}
                    >
                      <td className={`truncate px-2 py-1.5 text-gray-900 dark:text-white ${premiumTypography.tableCell}`}>
                        {p.sku}
                      </td>
                      {showGroupColumn && (
                        <td
                          className={`truncate px-2 py-1.5 text-gray-600 dark:text-gray-400 ${premiumTypography.tableCell}`}
                        >
                          {p.product_group_name?.trim() || '—'}
                        </td>
                      )}
                      <td className={`truncate px-2 py-1.5 text-gray-800 dark:text-gray-100 ${premiumTypography.tableCell}`}>
                        {p.name}
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
