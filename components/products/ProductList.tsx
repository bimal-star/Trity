'use client';

import Link from 'next/link';
import { KeyboardEvent, useMemo } from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { Product, ProductRecordVisibility, ProductType, StatusType } from '@/types/product';
import { Search, Loader2, Plus } from 'lucide-react';
import { premiumInputCompact, premiumSecondaryButton, premiumTypography } from '@/lib/premiumUi';
import { CategoryNode, CategoryTier } from '@/lib/categories';

const STATUS_FILTERS: { value: 'all' | StatusType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'planned', label: 'Planned' },
  { value: 'development', label: 'Development' },
];

const VISIBILITY_FILTERS: { value: ProductRecordVisibility; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
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
  categoryTiers: CategoryTier[];
  categoryNodesByTier: Record<number, CategoryNode[]>;
  selectedCategoryNodeIdsByTier: Record<number, string[]>;
  onToggleCategoryNode: (tierNumber: number, nodeId: string, isMultiSelect: boolean) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  tagOptions: string[];
  recordVisibility: ProductRecordVisibility;
  onRecordVisibilityChange: (value: ProductRecordVisibility) => void;
  filterActive?: boolean;
  onClearFilters?: () => void;
  /** Opens add-category modal (products list filter row). */
  onOpenAddCategory?: () => void;
  /** Grouped / matrix catalogue: show product group name column. */
  showGroupColumn?: boolean;
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
  categoryTiers,
  categoryNodesByTier,
  selectedCategoryNodeIdsByTier,
  onToggleCategoryNode,
  tagFilter,
  onTagFilterChange,
  tagOptions,
  recordVisibility,
  onRecordVisibilityChange,
  filterActive = false,
  onClearFilters,
  onOpenAddCategory,
  showGroupColumn = false,
}: ProductListProps) {
  const tagsSelectKey = useMemo(
    () => tagOptions.filter((t) => t !== 'all').join('\u0001'),
    [tagOptions]
  );
  const filterControlClass = `${premiumInputCompact} h-8 ${premiumTypography.tableCell}`;

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
          <Search
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden
          />
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | StatusType)}
            className={filterControlClass}
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
            className={filterControlClass}
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
          <select
            key={tagsSelectKey}
            value={tagFilter}
            onChange={(e) => onTagFilterChange(e.target.value)}
            className={filterControlClass}
            aria-label="Filter by tag"
          >
            <option value="all">All tags</option>
            {tagOptions
              .filter((t) => t !== 'all')
              .map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
          </select>
          <div className="flex items-center xl:justify-end xl:col-start-4">
            {onOpenAddCategory && (
              <button
                type="button"
                onClick={onOpenAddCategory}
                className={`w-full sm:w-auto ${premiumSecondaryButton('businessCore', 'sm', 'auto')}`}
                aria-label="Add new category"
                title="Add new category"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add category
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {categoryTiers.map((tier) => {
            const selectedForTier = selectedCategoryNodeIdsByTier[tier.tier_number] ?? [];
            const parentTierSelections =
              tier.tier_number > 1
                ? (selectedCategoryNodeIdsByTier[tier.tier_number - 1] ?? [])
                : [];
            const tierNodes = categoryNodesByTier[tier.tier_number] ?? [];
            const visibleNodes =
              tier.tier_number > 1 && parentTierSelections.length > 0
                ? tierNodes.filter(
                    (node) => node.parent_id && parentTierSelections.includes(node.parent_id)
                  )
                : tierNodes;
            const isTierBlocked = tier.tier_number > 1 && parentTierSelections.length === 0;

            return (
              <div
                key={tier.id}
                className="rounded-md border border-gray-200 bg-gray-50/60 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`font-medium text-gray-700 dark:text-gray-200 ${premiumTypography.tableCell}`}
                  >
                    {tier.name}
                  </span>
                  <span className={`text-gray-500 dark:text-gray-400 ${premiumTypography.helper}`}>
                    {tier.is_multi_select ? 'Multi-select' : 'Single-select'}
                  </span>
                </div>
                {isTierBlocked ? (
                  <p className={`text-gray-500 dark:text-gray-400 ${premiumTypography.helper}`}>
                    Select a parent tier value first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {visibleNodes.map((node) => {
                      const selected = selectedForTier.includes(node.id);
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() =>
                            onToggleCategoryNode(tier.tier_number, node.id, tier.is_multi_select)
                          }
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            selected
                              ? 'border-green-500 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-900/40 dark:text-green-200'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                          }`}
                          aria-pressed={selected}
                        >
                          {node.name}
                        </button>
                      );
                    })}
                    {visibleNodes.length === 0 && (
                      <p className={`text-gray-500 dark:text-gray-400 ${premiumTypography.helper}`}>
                        No options available.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
            {VISIBILITY_FILTERS.map((option) => {
              const selected = recordVisibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onRecordVisibilityChange(option.value)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                  aria-pressed={selected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              disabled={!filterActive}
              className="rounded px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear filters
            </button>
          )}
        </div>
        {categoriesError && (
          <p
            className={`mt-1.5 px-3 text-amber-700 dark:text-amber-400 ${premiumTypography.helper}`}
            role="status"
          >
            Categories could not be loaded ({categoriesError}). The filter may be incomplete.
          </p>
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
              to add your first catalog item, or use{' '}
              <span className="font-medium">New Product</span> in the header.
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
                      ? (idx === 0 || products[idx - 1]?.product_group_id !== p.product_group_id
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
                      <td
                        className={`truncate px-2 py-1.5 text-gray-900 dark:text-white ${premiumTypography.tableCell}`}
                      >
                        {p.sku}
                      </td>
                      {showGroupColumn && (
                        <td
                          className={`truncate px-2 py-1.5 text-gray-600 dark:text-gray-400 ${premiumTypography.tableCell}`}
                        >
                          {p.product_group_name?.trim() || '—'}
                        </td>
                      )}
                      <td
                        className={`truncate px-2 py-1.5 text-gray-800 dark:text-gray-100 ${premiumTypography.tableCell}`}
                      >
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
