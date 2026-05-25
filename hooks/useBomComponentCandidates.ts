'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';
import type { ProductType } from '@/types/product';

type VwProductRow = Database['public']['Views']['vw_products_full']['Row'];

export interface BomComponentCandidate {
  id: string;
  sku: string;
  name: string;
  product_type: ProductType | null;
  base_unit_symbol: string | null;
  cost_price: number | null;
  category_names: string[] | null;
  tags: string[] | null;
  is_component: boolean;
}

export interface BomComponentCandidateFilters {
  search: string;
  productType: 'all' | ProductType;
  tag: string;
  categoryNodeIdsByTier: Record<number, string[]>;
  componentsOnly: boolean;
}

const DEFAULT_FILTERS: BomComponentCandidateFilters = {
  search: '',
  productType: 'all',
  tag: 'all',
  categoryNodeIdsByTier: {},
  componentsOnly: true,
};

interface UseBomComponentCandidatesReturn {
  candidates: BomComponentCandidate[];
  isLoading: boolean;
  error: string | null;
  filters: BomComponentCandidateFilters;
  setFilters: React.Dispatch<React.SetStateAction<BomComponentCandidateFilters>>;
  tagOptions: string[];
  refresh: () => Promise<void>;
}

function mapRow(row: VwProductRow): BomComponentCandidate | null {
  if (!row.id || !row.sku || !row.name) return null;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    product_type: (row.product_type as ProductType | null) ?? null,
    base_unit_symbol: row.base_unit_symbol,
    cost_price: row.cost_price,
    category_names: row.category_names,
    tags: row.tags,
    is_component: row.is_component ?? false,
  };
}

export function useBomComponentCandidates(
  excludeProductIds: string[],
  enabled = true
): UseBomComponentCandidatesReturn {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [raw, setRaw] = useState<BomComponentCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BomComponentCandidateFilters>(DEFAULT_FILTERS);

  const exclude = useMemo(() => new Set(excludeProductIds), [excludeProductIds]);

  const fetchCandidates = useCallback(async () => {
    if (!tenant_id || !enabled) {
      setRaw([]);
      return;
    }

    const { productType, tag, categoryNodeIdsByTier, componentsOnly } = filters;

    try {
      setIsLoading(true);
      setError(null);

      const activeTierFilters = Object.entries(categoryNodeIdsByTier)
        .map(([tierNumber, nodeIds]) => ({
          tierNumber: Number(tierNumber),
          nodeIds: (nodeIds ?? []).filter(Boolean),
        }))
        .filter((entry) => entry.nodeIds.length > 0);

      let tierMatchedProductIds: string[] | null = null;
      if (activeTierFilters.length > 0) {
        for (const tierFilter of activeTierFilters) {
          const { data: assignments, error: assignmentError } = await supabase
            .from('product_category_assignments')
            .select('product_id')
            .eq('tenant_id', tenant_id)
            .eq('tier_number', tierFilter.tierNumber)
            .in('category_node_id', tierFilter.nodeIds);

          if (assignmentError) throw assignmentError;

          const idsForTier = new Set(
            ((assignments ?? []) as Array<{ product_id: string | null }>)
              .map((row) => row.product_id)
              .filter((id): id is string => Boolean(id))
          );

          if (tierMatchedProductIds === null) {
            tierMatchedProductIds = Array.from(idsForTier);
          } else {
            const prevIds: string[] = tierMatchedProductIds;
            const allowed = new Set<string>(prevIds);
            tierMatchedProductIds = Array.from(idsForTier).filter((id: string) => allowed.has(id));
          }
        }

        if (!tierMatchedProductIds?.length) {
          setRaw([]);
          return;
        }
      }

      let query = supabase
        .from('vw_products_full')
        .select(
          'id, sku, name, product_type, base_unit_symbol, cost_price, category_names, tags, is_component'
        )
        .eq('tenant_id', tenant_id)
        .eq('is_deleted', false)
        .order('name', { ascending: true })
        .limit(500);

      if (tierMatchedProductIds?.length) {
        query = query.in('id', tierMatchedProductIds);
      }

      if (productType !== 'all') {
        query = query.eq('product_type', productType);
      }

      if (tag !== 'all') {
        query = query.contains('tags', [tag]);
      }

      const { data, error: err } = await query;
      if (err) throw err;

      let mapped = (data ?? [])
        .map((r) => mapRow(r as VwProductRow))
        .filter((r): r is BomComponentCandidate => r != null)
        .filter((p) => !exclude.has(p.id));

      if (componentsOnly) {
        mapped = mapped.filter((p) => p.is_component);
      }

      setRaw(mapped);
    } catch (err: unknown) {
      console.error('Error loading BOM component candidates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setRaw([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    tenant_id,
    enabled,
    filters.productType,
    filters.tag,
    filters.categoryNodeIdsByTier,
    filters.componentsOnly,
    exclude,
  ]);

  useEffect(() => {
    void fetchCandidates();
  }, [fetchCandidates]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    raw.forEach((p) => p.tags?.forEach((t) => t.trim() && set.add(t.trim())));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [raw]);

  const candidates = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category_names ?? []).some((c) => c.toLowerCase().includes(q))
    );
  }, [raw, filters.search]);

  return {
    candidates,
    isLoading,
    error,
    filters,
    setFilters,
    tagOptions,
    refresh: fetchCandidates,
  };
}

/** MIME type for dragging products from the picker onto the BOM table. */
export const BOM_PRODUCT_DRAG_TYPE = 'application/x-trity-bom-product';

export function setBomProductDragData(dt: DataTransfer, productId: string): void {
  dt.setData(BOM_PRODUCT_DRAG_TYPE, productId);
  dt.effectAllowed = 'copy';
}

export function getBomProductDragData(dt: DataTransfer): string | null {
  const id = dt.getData(BOM_PRODUCT_DRAG_TYPE);
  return id?.trim() || null;
}
