'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, GripVertical, Loader2, Search } from 'lucide-react';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import {
  setBomProductDragData,
  useBomComponentCandidates,
} from '@/hooks/useBomComponentCandidates';
import { loadCategoryStructure, type CategoryNode, type CategoryTier } from '@/lib/categories';
import { useTenant } from '@/contexts/TenantContext';
import { formatBomCurrency } from '@/lib/bomCalculations';
import { pillarAccent, premiumInputCompact, premiumTypography } from '@/lib/premiumUi';
import type { ProductType } from '@/types/product';

const bc = pillarAccent('businessCore');
const denseSelect = `${premiumInputCompact} py-0.5 text-[11px]`;

interface BomComponentPickerPanelProps {
  excludeProductIds: string[];
  /** Load and show candidate list (true on create + edit). */
  loadCandidates?: boolean;
  /** Allow drag / double-click add (edit only, after BOM saved). */
  canAdd?: boolean;
  onDoubleClickAdd?: (productId: string) => void;
}

export default function BomComponentPickerPanel({
  excludeProductIds,
  loadCandidates = true,
  canAdd = true,
  onDoubleClickAdd,
}: BomComponentPickerPanelProps) {
  const { effectiveTenantId: tenant_id } = useTenant();
  const { candidates, isLoading, error, filters, setFilters, tagOptions } =
    useBomComponentCandidates(excludeProductIds, loadCandidates);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryTiers, setCategoryTiers] = useState<CategoryTier[]>([]);
  const [categoryNodesByTier, setCategoryNodesByTier] = useState<Record<number, CategoryNode[]>>(
    {}
  );

  const activeFilterCount =
    (filters.productType !== 'all' ? 1 : 0) +
    (filters.tag !== 'all' ? 1 : 0) +
    (!filters.componentsOnly ? 1 : 0) +
    Object.values(filters.categoryNodeIdsByTier).filter((ids) => ids?.length).length;

  useEffect(() => {
    if (!tenant_id) return;
    void loadCategoryStructure(tenant_id).then((s) => {
      setCategoryTiers(s.tiers);
      setCategoryNodesByTier(s.nodesByTier);
    });
  }, [tenant_id]);

  const setTierSelection = useCallback(
    (tierNumber: number, nodeId: string) => {
      setFilters((f) => {
        const next = { ...f.categoryNodeIdsByTier };
        if (!nodeId) {
          delete next[tierNumber];
          for (const t of categoryTiers) {
            if (t.tier_number > tierNumber) delete next[t.tier_number];
          }
        } else {
          next[tierNumber] = [nodeId];
          for (const t of categoryTiers) {
            if (t.tier_number > tierNumber) delete next[t.tier_number];
          }
        }
        return { ...f, categoryNodeIdsByTier: next };
      });
    },
    [categoryTiers, setFilters]
  );

  return (
    <PremiumCard className="flex h-full min-h-0 w-[15.5rem] shrink-0 flex-col overflow-hidden !rounded-lg !p-0 ring-1 ring-green-200/50 dark:ring-green-900/40 xl:w-[17rem]">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-green-200/40 bg-green-50/60 px-2 py-1 dark:border-green-900/30 dark:bg-green-950/25">
        <span
          className={`${premiumTypography.tableHeaderDense} text-green-800 dark:text-green-300`}
        >
          Components
        </span>
        <span className="rounded bg-green-100/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-green-800 dark:bg-green-900/50 dark:text-green-200">
          {candidates.length}
        </span>
      </div>

      <div className="shrink-0 space-y-1 border-b border-green-200/30 px-1.5 py-1 dark:border-green-900/25">
        <div className="relative">
          <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="SKU or name…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className={`${premiumInputCompact} h-7 w-full py-0.5 pl-6 text-[11px]`}
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {filtersOpen ? (
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          )}
          Filters
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-green-600 px-1 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        {filtersOpen && (
          <div className="grid grid-cols-2 gap-1 pb-1">
            <select
              value={filters.productType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, productType: e.target.value as 'all' | ProductType }))
              }
              className={denseSelect}
              aria-label="Type"
              title="Product type"
            >
              <option value="all">Type: All</option>
              <option value="raw_material">Raw</option>
              <option value="semi_finished">Semi</option>
              <option value="finished_good">Finished</option>
              <option value="assembly">Assembly</option>
              <option value="packaging">Pack</option>
            </select>
            <select
              value={filters.tag}
              onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
              className={denseSelect}
              aria-label="Tag"
              title="Tag"
            >
              <option value="all">Tag: All</option>
              {tagOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="col-span-2 flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={filters.componentsOnly}
                onChange={(e) => setFilters((f) => ({ ...f, componentsOnly: e.target.checked }))}
                className={bc.formCheckboxTight}
              />
              Components only
            </label>
            {categoryTiers.map((tier) => {
              const parentSelections =
                tier.tier_number > 1
                  ? (filters.categoryNodeIdsByTier[tier.tier_number - 1] ?? [])
                  : [];
              const tierNodes = categoryNodesByTier[tier.tier_number] ?? [];
              const visible =
                tier.tier_number > 1 && parentSelections.length > 0
                  ? tierNodes.filter((n) => n.parent_id && parentSelections.includes(n.parent_id))
                  : tierNodes;
              const blocked = tier.tier_number > 1 && parentSelections.length === 0;
              const selected = filters.categoryNodeIdsByTier[tier.tier_number]?.[0] ?? '';
              const shortName = tier.name.length > 12 ? `${tier.name.slice(0, 10)}…` : tier.name;

              return (
                <select
                  key={tier.id}
                  value={selected}
                  disabled={blocked}
                  onChange={(e) => setTierSelection(tier.tier_number, e.target.value)}
                  className={denseSelect}
                  title={tier.name}
                  aria-label={tier.name}
                >
                  <option value="">{shortName}: All</option>
                  {visible.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="mx-1 shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      {loadCandidates && !canAdd && (
        <p className={`${premiumTypography.helper} shrink-0 px-2 py-1 text-[10px]`}>
          Create the BOM to add components.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className={`h-5 w-5 animate-spin ${bc.iconColor}`} />
          </div>
        ) : candidates.length === 0 ? (
          <p className={`${premiumTypography.helper} py-4 text-center text-[10px]`}>
            No matches. Clear filters or mark products as Component.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {candidates.map((p) => (
              <li
                key={p.id}
                draggable={canAdd}
                onDragStart={(e) => canAdd && setBomProductDragData(e.dataTransfer, p.id)}
                onDoubleClick={() => canAdd && onDoubleClickAdd?.(p.id)}
                className={`flex items-center gap-1 px-1 py-1 hover:bg-green-50/60 dark:hover:bg-green-950/30 ${
                  canAdd ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-80'
                }`}
                title={p.name}
              >
                <GripVertical className="h-3 w-3 shrink-0 text-gray-400" aria-hidden />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[11px] font-medium text-gray-900 dark:text-gray-100">
                    <span className="text-gray-500 dark:text-gray-400">{p.sku}</span>
                    <span className="mx-0.5">·</span>
                    {p.name}
                  </p>
                </div>
                {p.cost_price != null && (
                  <span className="shrink-0 text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
                    {formatBomCurrency(p.cost_price)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PremiumCard>
  );
}
