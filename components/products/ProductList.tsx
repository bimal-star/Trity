'use client';

import Link from 'next/link';
import type { TableColumnDefinition } from '@/types/tableView';
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { Product, ProductRecordVisibility, ProductType, StatusType } from '@/types/product';
import { Filter, Loader2, Package, Plus, Search, TableProperties } from 'lucide-react';
import {
  premiumInputCompact,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { downloadTableCsv } from '@/lib/csvDownload';
import {
  getProductListColumnLabel,
  isProductListColumnUserConfigurable,
} from '@/lib/productListColumnCatalog';
import { ColumnCustomiser } from '@/src/components/common/ColumnCustomiser';
import { ViewSelector, type ViewSelectorItem } from '@/src/components/common/ViewSelector';
import {
  formatMoney,
  formatProductTypeLabel,
  renderProductListTableCell,
} from '@/components/products/productListTableCells';

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

/** Stable reference for `ColumnCustomiser` (inline `[]` would reset draft state every parent render). */
const PRODUCT_LIST_ALWAYS_ON_COLUMN_IDS: string[] = ['_select', '_thumbnail'];

const PRODUCT_LIST_COLUMN_WIDTH_SAMPLE_ROWS = 30;

export type SortUiOption = 'recent' | 'name_asc' | 'price_asc';

interface ProductListProps {
  products: Product[];
  /** Used to format unit prices in the table. */
  currencyCode?: string;
  selectedProductId: string | null;
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (product: Product) => void;
  statusFilter: 'all' | StatusType;
  productTypeFilter: 'all' | ProductType;
  tagFilter: string;
  selectedCategoryNodeIdsByTier: Record<number, string[]>;
  recordVisibility: ProductRecordVisibility;
  onRecordVisibilityChange: (value: ProductRecordVisibility) => void;
  sortUiValue: SortUiOption;
  onSortUiChange: (value: SortUiOption) => void;
  filterActive?: boolean;
  onClearFilters?: () => void;
  /** Grouped / matrix catalogue: show product group name column. */
  showGroupColumn?: boolean;
  /** Soft-delete (archive) by product id — used for bulk actions. */
  archiveProducts?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onBulkArchiveComplete?: () => void;
  /** Opens the slide-in filter drawer (state lives on parent page). */
  filtersDrawerOpen?: boolean;
  onOpenFilters?: () => void;
  columnOrder: string[];
  columnHidden: string[];
  onColumnStateChange: (order: string[], hidden: string[]) => void;
  /** Merged catalog definitions (renderType, maps) — drives cell rendering for visible columns. */
  listColumnDefinitions?: TableColumnDefinition[];
  listViewsUi?: {
    views: ViewSelectorItem[];
    selection: string;
    onSelectionChange: (key: string) => void;
    onSaveView: () => void;
    onSetPersonalDefault: () => void;
    onClearPersonalDefault: () => void;
    onSaveWorkspaceDefault?: () => void;
    canWorkspaceDefault: boolean;
    loading: boolean;
    onDeleteSelectedView?: () => void;
  };
}

export default function ProductList({
  products,
  currencyCode = 'GBP',
  selectedProductId,
  isLoading,
  error,
  search,
  onSearchChange,
  onSelect,
  statusFilter,
  productTypeFilter,
  tagFilter,
  selectedCategoryNodeIdsByTier,
  recordVisibility,
  onRecordVisibilityChange,
  sortUiValue,
  onSortUiChange,
  filterActive = false,
  onClearFilters,
  showGroupColumn = false,
  archiveProducts,
  onBulkArchiveComplete,
  filtersDrawerOpen = false,
  onOpenFilters,
  columnOrder,
  columnHidden,
  onColumnStateChange,
  listColumnDefinitions,
  listViewsUi,
}: ProductListProps) {
  const filterControlClass = `${premiumInputCompact} h-9 ${premiumTypography.tableCell}`;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const columnBodyScrollRef = useRef<HTMLDivElement>(null);
  const columnBodyTableRef = useRef<HTMLTableElement>(null);

  const [syncedColumnWidths, setSyncedColumnWidths] = useState<number[] | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);

  const columnHiddenSet = useMemo(() => new Set(columnHidden), [columnHidden]);

  const listColumnDefinitionById = useMemo(() => {
    const m = new Map<string, TableColumnDefinition>();
    for (const d of listColumnDefinitions ?? []) m.set(d.id, d);
    return m;
  }, [listColumnDefinitions]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (productMap.has(id)) next.add(id);
      }
      if (next.size === prev.size) {
        let same = true;
        for (const id of prev) {
          if (!next.has(id)) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return next;
    });
  }, [productMap]);

  const activateRow = (p: Product) => {
    onSelect(p);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLElement>, p: Product) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateRow(p);
    }
  };

  const filteredSelectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  );

  const toggleSelect = useCallback((id: string, next: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (next) n.add(id);
      else n.delete(id);
      return n;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (next: boolean) => {
      if (!next) {
        setSelectedIds(new Set());
        return;
      }
      setSelectedIds(new Set(products.map((p) => p.id)));
    },
    [products]
  );

  const advancedSummary = useMemo(() => {
    const parts: string[] = [];
    if (statusFilter !== 'all')
      parts.push(STATUS_FILTERS.find((s) => s.value === statusFilter)?.label ?? statusFilter);
    if (productTypeFilter !== 'all') parts.push(formatProductTypeLabel(productTypeFilter));
    if (tagFilter !== 'all') parts.push(`Tag: ${tagFilter}`);
    const tierCount = Object.values(selectedCategoryNodeIdsByTier).reduce(
      (acc, ids) => acc + ids.length,
      0
    );
    if (tierCount > 0) parts.push(`${tierCount} category filter${tierCount === 1 ? '' : 's'}`);
    return parts.length ? parts.join(' · ') : 'More filters…';
  }, [statusFilter, productTypeFilter, tagFilter, selectedCategoryNodeIdsByTier]);

  /** Toolbar badge count: mirrors Products page `filterActive` (includes search + visibility). */
  const toolbarFiltersBadgeCount = useMemo(() => {
    let n = 0;
    if (search.trim()) n += 1;
    if (statusFilter !== 'all') n += 1;
    if (productTypeFilter !== 'all') n += 1;
    if (tagFilter !== 'all') n += 1;
    n += Object.values(selectedCategoryNodeIdsByTier).reduce((acc, ids) => acc + ids.length, 0);
    if (recordVisibility !== 'active') n += 1;
    return n;
  }, [
    search,
    statusFilter,
    productTypeFilter,
    tagFilter,
    selectedCategoryNodeIdsByTier,
    recordVisibility,
  ]);

  const showFiltersBadge = filterActive;

  const filtersButtonAriaLabel = filterActive
    ? `Open filters (${toolbarFiltersBadgeCount} filter${toolbarFiltersBadgeCount === 1 ? '' : 's'} applied)`
    : 'Open filters';

  const exportRowsForProducts = useCallback(
    (list: Product[]) => ({
      headers: [
        'sku',
        'name',
        'short_description',
        'product_type',
        'industry_type',
        'status',
        'cost_price',
        'sell_price',
      ],
      rows: list.map((p) => [
        p.sku,
        p.name,
        p.short_description ?? '',
        p.product_type,
        p.industry_type,
        p.status,
        p.cost_price ?? '',
        p.sell_price ?? '',
      ]),
    }),
    []
  );

  const runBulkArchive = async () => {
    if (!archiveProducts || filteredSelectedProducts.length === 0) return;
    const n = filteredSelectedProducts.length;
    if (
      !window.confirm(
        `Archive ${n} product${n === 1 ? '' : 's'}? They will be hidden from default catalog lists.`
      )
    ) {
      return;
    }
    setBulkWorking(true);
    try {
      for (const p of filteredSelectedProducts) {
        if (!p.is_deleted) {
          const r = await archiveProducts(p.id);
          if (!r.success) console.error(r.error ?? 'Archive failed', p.id);
        }
      }
      setSelectedIds(new Set());
      onBulkArchiveComplete?.();
    } finally {
      setBulkWorking(false);
    }
  };

  const runBulkExport = () => {
    if (filteredSelectedProducts.length === 0) return;
    const { headers, rows } = exportRowsForProducts(filteredSelectedProducts);
    downloadTableCsv(`products_selected_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const allSelectableSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = filteredSelectedProducts.length > 0;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelectableSelected;
  }, [someSelected, allSelectableSelected]);

  const segmented = `inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700`;

  const visibleColumnIds = useMemo(
    () =>
      columnOrder.filter((id) => {
        if (columnHiddenSet.has(id)) return false;
        if (id === 'product_group' && !showGroupColumn) return false;
        return true;
      }),
    [columnOrder, columnHiddenSet, showGroupColumn]
  );

  const columnsSynced =
    syncedColumnWidths != null && syncedColumnWidths.length === visibleColumnIds.length;

  const measureAndSyncColumnWidths = useCallback(() => {
    const bodyTable = columnBodyTableRef.current;
    if (!bodyTable) return;

    if (bodyTable.classList.contains('table-fixed')) {
      return;
    }

    const headCells = bodyTable.querySelectorAll('thead th');
    const colCount = headCells.length;
    if (colCount === 0) {
      setSyncedColumnWidths(null);
      return;
    }

    const rows = bodyTable.querySelectorAll('tbody tr');
    const maxWidths = new Array<number>(colCount).fill(0);
    for (let r = 0; r < rows.length && r < PRODUCT_LIST_COLUMN_WIDTH_SAMPLE_ROWS; r++) {
      const cells = rows[r].querySelectorAll('td');
      for (let i = 0; i < colCount && i < cells.length; i++) {
        maxWidths[i] = Math.max(maxWidths[i], cells[i].getBoundingClientRect().width);
      }
    }
    for (let i = 0; i < colCount; i++) {
      maxWidths[i] = Math.max(maxWidths[i], headCells[i].getBoundingClientRect().width);
    }

    const widths = maxWidths.map((w) => Math.ceil(w));
    const total = widths.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return;

    setSyncedColumnWidths(widths);
    bodyTable.style.width = '';
    bodyTable.style.minWidth = '';
  }, []);

  useLayoutEffect(() => {
    setSyncedColumnWidths(null);
  }, [visibleColumnIds]);

  useLayoutEffect(() => {
    if (isLoading || products.length === 0) {
      setSyncedColumnWidths(null);
      return;
    }
    measureAndSyncColumnWidths();
  }, [isLoading, products, visibleColumnIds, measureAndSyncColumnWidths]);

  const syncedColumnWidthPercents = useMemo(() => {
    if (!columnsSynced || !syncedColumnWidths) return null;
    const total = syncedColumnWidths.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return null;
    return syncedColumnWidths.map((w) => (w / total) * 100);
  }, [columnsSynced, syncedColumnWidths]);

  const productListTableClass = columnsSynced
    ? 'w-full max-w-full table-fixed border-collapse text-left'
    : 'w-full max-w-full table-auto border-collapse text-left';

  const renderProductListColGroup = () => (
    <colgroup>
      {visibleColumnIds.map((id, i) => (
        <col
          key={id}
          style={
            syncedColumnWidthPercents ? { width: `${syncedColumnWidthPercents[i]}%` } : undefined
          }
        />
      ))}
    </colgroup>
  );

  const headerRow = (
    <tr>
      {visibleColumnIds.map((id) => (
        <th
          key={id}
          scope="col"
          className={`whitespace-nowrap py-2 text-left text-gray-600 dark:text-gray-300 ${premiumTypography.tableCell} font-semibold ${
            id === '_thumbnail' ? 'w-11 min-w-[2.75rem] px-1' : 'px-2'
          }`}
        >
          {id === '_select' ? (
            <input
              type="checkbox"
              checked={allSelectableSelected}
              ref={selectAllRef}
              onChange={(e) => toggleSelectAll(e.target.checked)}
              aria-label="Select all visible products"
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
          ) : id === '_thumbnail' ? (
            <span className="inline-block w-11 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              Image
            </span>
          ) : (
            getProductListColumnLabel(id)
          )}
        </th>
      ))}
    </tr>
  );

  return (
    <PremiumCard className="!p-0 flex min-h-0 min-w-0 flex-1 w-full flex-col overflow-hidden">
      <div
        className="z-30 flex shrink-0 flex-col gap-2 bg-gray-50 px-1 pb-0 dark:bg-gray-900"
        role="region"
        aria-label="Product list toolbar"
      >
        {someSelected && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-green-600 px-1 py-2 text-white dark:border-gray-700 dark:bg-green-700 sm:px-0"
            role="region"
            aria-label="Bulk actions"
          >
            <span className={`font-medium ${premiumTypography.tableCell}`}>
              {filteredSelectedProducts.length} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={bulkWorking}
                className={`rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm hover:bg-white/20 disabled:opacity-60`}
                onClick={runBulkExport}
              >
                Export
              </button>
              <button
                type="button"
                disabled={bulkWorking || !archiveProducts}
                className={`rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm hover:bg-white/20 disabled:opacity-60`}
                onClick={() => void runBulkArchive()}
              >
                {bulkWorking ? 'Working…' : 'Archive'}
              </button>
              <button
                type="button"
                disabled={bulkWorking || !archiveProducts}
                className={`rounded-md border border-white/40 bg-red-600/90 px-3 py-1.5 text-xs font-semibold hover:bg-red-600 disabled:opacity-60`}
                onClick={() => void runBulkArchive()}
                title="Archives selected products (soft delete)"
              >
                Delete
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/10"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          </div>
        )}

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
                placeholder="Search products…"
                className={`${premiumInputCompact} h-10 w-[240px] max-w-full py-2 pl-10 pr-3 ${premiumTypography.body}`}
                aria-label="Search products"
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
                onChange={(e) => onSortUiChange(e.target.value as SortUiOption)}
                className={`${filterControlClass} min-w-[10.5rem]`}
                aria-label="Sort products"
              >
                <option value="name_asc">Name A–Z</option>
                <option value="price_asc">Price low–high</option>
                <option value="recent">Recently added</option>
              </select>
            </label>
          </div>

          <div className="relative z-[45] flex shrink-0 flex-nowrap items-center gap-2 overflow-visible border-l border-gray-200/90 pl-4 dark:border-gray-600/80">
            {listViewsUi && (
              <ViewSelector
                views={listViewsUi.views}
                selection={listViewsUi.selection}
                onSelectionChange={listViewsUi.onSelectionChange}
                loading={listViewsUi.loading}
                onSaveView={listViewsUi.onSaveView}
                onSetPersonalDefault={listViewsUi.onSetPersonalDefault}
                onClearPersonalDefault={listViewsUi.onClearPersonalDefault}
                onSaveWorkspaceDefault={listViewsUi.onSaveWorkspaceDefault}
                canWorkspaceDefault={listViewsUi.canWorkspaceDefault}
                onDeleteSelectedView={listViewsUi.onDeleteSelectedView}
              />
            )}
            <button
              ref={columnsBtnRef}
              type="button"
              aria-expanded={columnsOpen}
              aria-haspopup="dialog"
              onClick={() => setColumnsOpen((o) => !o)}
              className={`inline-flex !h-8 shrink-0 items-center gap-1.5 px-2.5 text-xs ${premiumSecondaryButton('businessCore', 'sm', 'auto')} ${premiumTypography.tableCell}`}
            >
              <TableProperties className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Columns
            </button>
            <ColumnCustomiser
              open={columnsOpen}
              onClose={() => setColumnsOpen(false)}
              anchorRef={columnsBtnRef}
              columnOrder={columnOrder}
              columnHidden={columnHidden}
              alwaysOnIds={PRODUCT_LIST_ALWAYS_ON_COLUMN_IDS}
              excludeColumnId={showGroupColumn ? null : 'product_group'}
              isColumnPickable={isProductListColumnUserConfigurable}
              getLabel={getProductListColumnLabel}
              onApply={(order, hidden) => onColumnStateChange(order, hidden)}
            />
            <span className="relative inline-flex shrink-0">
              <button
                type="button"
                aria-expanded={Boolean(filtersDrawerOpen)}
                aria-haspopup="dialog"
                aria-label={filtersButtonAriaLabel}
                title={advancedSummary}
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
        className={`flex min-h-0 flex-1 basis-0 flex-col overflow-hidden ${premiumTypography.body}`}
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
            <span>Loading products…</span>
          </div>
        )}
        {!isLoading && !error && products.length === 0 && !filterActive && (
          <EmptyCatalogState variant="none" />
        )}
        {!isLoading && !error && products.length === 0 && filterActive && (
          <EmptyCatalogState variant="filtered" />
        )}
        {!isLoading && products.length > 0 && (
          <div
            className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden border-t border-gray-200 dark:border-gray-700"
            role="region"
            aria-label="Product table"
          >
            <div
              ref={columnBodyScrollRef}
              className="min-h-0 min-w-0 flex-1 basis-0 overflow-auto overscroll-y-none [overflow-anchor:none] [scrollbar-gutter:stable]"
            >
              <table ref={columnBodyTableRef} className={productListTableClass}>
                {renderProductListColGroup()}
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 shadow-[0_1px_0_0_rgba(229,231,235,0.9)] backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 dark:shadow-[0_1px_0_0_rgba(55,65,81,0.8)]">
                  {headerRow}
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {products.map((p, idx) => {
                    const listed = p.id === selectedProductId;
                    const groupStripe =
                      showGroupColumn && p.product_group_id
                        ? (idx === 0 || products[idx - 1]?.product_group_id !== p.product_group_id
                            ? 'border-l-2 border-l-green-500/60'
                            : 'border-l-2 border-l-transparent') + ' pl-0.5'
                        : '';
                    const sel = selectedIds.has(p.id);
                    const cellCtx = {
                      p,
                      idx,
                      currencyCode,
                      showGroupColumn,
                      selected: sel,
                      onToggleSelect: toggleSelect,
                      onOpenRow: activateRow,
                    };

                    return (
                      <tr
                        key={p.id}
                        tabIndex={0}
                        aria-selected={listed}
                        aria-label={`${p.name}, SKU ${p.sku}. Press Enter to open product.`}
                        className={`cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500 ${groupStripe} ${
                          listed || sel
                            ? 'bg-green-50/60 dark:bg-green-950/25'
                            : 'hover:bg-gray-50/90 dark:hover:bg-gray-900/55'
                        }`}
                        onClick={() => activateRow(p)}
                        onKeyDown={(e) => onRowKeyDown(e, p)}
                      >
                        {visibleColumnIds.map((colId) =>
                          renderProductListTableCell(
                            colId,
                            cellCtx,
                            listColumnDefinitionById.get(colId)
                          )
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PremiumCard>
  );
}

function EmptyCatalogState({ variant }: { variant: 'none' | 'filtered' }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-green-400/70 bg-green-500/15 dark:bg-green-950/40">
        <div className="relative">
          <Package
            strokeWidth={1.25}
            className="h-14 w-14 text-green-700 dark:text-green-400"
            aria-hidden
          />
          <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md dark:bg-gray-800 dark:shadow-black/40">
            <Plus className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden />
          </div>
        </div>
      </div>
      <h3 className={`${premiumTypography.pageTitle} mb-2 text-xl text-gray-900 dark:text-white`}>
        {variant === 'filtered' ? 'No matches yet' : 'Build your catalog'}
      </h3>
      <p className={`mb-8 max-w-md ${premiumTypography.body} text-gray-600 dark:text-gray-400`}>
        {variant === 'filtered'
          ? 'Try clearing filters or broadening search to find products.'
          : 'Add products to tie together pricing, barcodes, and stock visibility across Business Core.'}
      </p>
      {variant === 'none' && (
        <Link
          href="/products/new"
          className={premiumPrimaryButton('businessCore', 'md', 'standard')}
        >
          Add your first product
        </Link>
      )}
      {variant === 'filtered' && (
        <p className={`${premiumTypography.helper} text-gray-500 dark:text-gray-400`}>
          Adjust filters above or{' '}
          <Link
            href="/products/new"
            className="font-semibold text-green-700 hover:underline dark:text-green-400"
          >
            create a product
          </Link>
          .
        </p>
      )}
    </div>
  );
}
