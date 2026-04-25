/**
 * useProducts Hook
 *
 * Custom React hook for managing products data from Supabase
 * Provides CRUD operations, filtering, sorting, and category management
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Database, Json } from '@/types/database';
import { packingConfigurationInserts } from '@/lib/productPacking';
import {
  Product,
  ProductFormData,
  ProductFilters,
  ProductSortField,
  SortDirection,
} from '@/types/product';
import { useTenant } from '@/contexts/TenantContext';

type VwProductRow = Database['public']['Views']['vw_products_full']['Row'];

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  createProduct: (
    data: ProductFormData
  ) => Promise<{ success: boolean; error?: string; data?: Product }>;
  updateProduct: (
    id: string,
    data: Partial<ProductFormData>
  ) => Promise<{ success: boolean; error?: string }>;
  /** Soft-deletes the product (`is_deleted` = true). */
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  restoreProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  /** Refreshes the product list; resolves to the loaded products (after mapping). */
  refreshProducts: () => Promise<Product[]>;
}

/** When `loadProducts` is false, the product list is not fetched (e.g. create-product page). */
export interface UseProductsOptions {
  loadProducts?: boolean;
}

function normalizeCategoryNames(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const names = raw.map((x) => (typeof x === 'string' ? x.trim() : String(x))).filter(Boolean);
    return names.length > 0 ? names : null;
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t) as unknown;
      return normalizeCategoryNames(p);
    } catch {
      return [t];
    }
  }
  return null;
}

function mapViewRowToProduct(row: VwProductRow): Product {
  const { category_names: _cn, ...rest } = row;
  const names = normalizeCategoryNames(row.category_names);
  return {
    ...(rest as unknown as Product),
    id: row.id ?? '',
    sku: row.sku ?? '',
    name: row.name ?? '',
    categories: names,
  };
}

function messageForProductCreateError(err: unknown): string {
  const e =
    err && typeof err === 'object' && ('message' in err || 'code' in err)
      ? (err as { code?: string; message?: string })
      : null;
  const code = e?.code;
  const rawMessage = e?.message ?? (err instanceof Error ? err.message : '');
  const message = (rawMessage || '').trim();

  if (
    code === '42501' ||
    /row-level security|violates row-level security policy/i.test(message) ||
    /permission denied for table/i.test(message)
  ) {
    return (
      'You do not have permission to create products in this workspace. ' +
      'If you are a platform admin acting as another tenant, ensure super-admin write policies are applied for products, or add a user profile for that tenant.'
    );
  }
  if (code === '23505' || /duplicate key|already exists|unique constraint/i.test(message)) {
    return 'A product with this SKU already exists for this workspace. Use a different SKU.';
  }
  if (code === '23503' || /foreign key|violates foreign key/i.test(message)) {
    return (
      message ||
      'Invalid reference (category or related record). Check that it belongs to this workspace.'
    );
  }
  return message || 'Failed to create product';
}

export function buildProductInsertPayload(
  data: ProductFormData,
  tenantId: string,
  userId: string
): Database['public']['Tables']['products']['Insert'] {
  return {
    tenant_id: tenantId,
    sku: data.sku,
    name: data.name,
    industry_type: data.industry_type,
    product_type: data.product_type ?? 'finished_good',
    status: data.status ?? 'active',
    category_id: null,
    description: data.description ?? null,
    short_description: data.short_description ?? null,
    cost_price: data.cost_price ?? null,
    sell_price: data.sell_price ?? null,
    tracks_inventory: data.tracks_inventory ?? true,
    min_stock_level: data.min_stock_level ?? null,
    max_stock_level: data.max_stock_level ?? null,
    reorder_point: data.reorder_point ?? null,
    reorder_quantity: data.reorder_quantity ?? null,
    weight: data.weight ?? null,
    weight_unit_id: data.weight_unit_id ?? null,
    length: data.length ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    volume: data.volume ?? null,
    volume_unit_id: data.volume_unit_id ?? null,
    shelf_life_days: data.shelf_life_days ?? null,
    storage_conditions: data.storage_conditions ?? null,
    safety_rating: data.safety_rating ?? null,
    lot_controlled: data.lot_controlled ?? null,
    serial_tracked: data.serial_tracked ?? null,
    manufacturer_part_number: data.manufacturer_part_number ?? null,
    specifications_url: data.specifications_url ?? null,
    images: data.images ?? null,
    metadata: data.metadata ?? null,
    tags: data.tags ?? null,
    lead_time_days: data.lead_time_days ?? null,
    is_active: data.is_active !== false,
    image_url: data.image_url ?? null,
    created_by: userId,
    updated_by: userId,
    is_deleted: false,
    product_group_id: data.product_group_id ?? null,
    variant_attributes: (data.variant_attributes as Json | null | undefined) ?? null,
  };
}

export function useProducts(
  filters?: ProductFilters,
  sortField: ProductSortField = 'created_at',
  sortDirection: SortDirection = 'desc',
  options?: UseProductsOptions
): UseProductsReturn {
  const loadProducts = options?.loadProducts !== false;
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async (): Promise<Product[]> => {
    if (!tenant_id) {
      setProducts([]);
      setIsLoading(false);
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);

      const activeTierFilters = Object.entries(filters?.categoryNodeIdsByTier ?? {})
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
            const currentSet = new Set(tierMatchedProductIds);
            tierMatchedProductIds = Array.from(idsForTier).filter((id) => currentSet.has(id));
          }
        }

        if (!tierMatchedProductIds || tierMatchedProductIds.length === 0) {
          setProducts([]);
          return [];
        }
      }

      let query = supabase
        .from('vw_products_full')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (tierMatchedProductIds?.length) {
        query = query.in('id', tierMatchedProductIds);
      }

      if (filters) {
        if (filters.industry_type) {
          query = query.eq('industry_type', filters.industry_type);
        }
        if (filters.product_type) {
          query = query.eq('product_type', filters.product_type);
        }
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters.minPrice !== undefined) {
          query = query.gte('sell_price', filters.minPrice);
        }
        if (filters.maxPrice !== undefined) {
          query = query.lte('sell_price', filters.maxPrice);
        }
        if (filters.lowStock) {
          query = query.not('reorder_point', 'is', null).eq('tracks_inventory', true);
        }
        // Legacy flat category name filter kept for compatibility.
        if (filters.categories?.length) {
          query = query.overlaps('category_names', filters.categories);
        }
        if (filters.tags?.length) {
          query = query.overlaps('tags', filters.tags);
        }
        if (filters.searchQuery) {
          const safe = filters.searchQuery
            .toLowerCase()
            .replace(/[,()\[\]]/g, '')
            .replace(/[%_]/g, '')
            .trim();
          if (safe) {
            query = query.or(
              `name.ilike.%${safe}%,description.ilike.%${safe}%,sku.ilike.%${safe}%`
            );
          }
        }

        const vis = filters.recordVisibility ?? 'active';
        if (vis === 'active') {
          query = query.eq('is_deleted', false);
        } else if (vis === 'archived') {
          query = query.eq('is_deleted', true);
        }
      } else {
        query = query.eq('is_deleted', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const rows = (data || []) as VwProductRow[];
      const mapped = rows.map(mapViewRowToProduct);
      setProducts(mapped);
      return mapped;
    } catch (err: unknown) {
      console.error('Error fetching products:', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!tenant_id) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    if (loadProducts) {
      void fetchProducts();
    } else {
      setProducts([]);
      setError(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortField, sortDirection, tenant_id, loadProducts]);

  const createProduct = async (
    data: ProductFormData
  ): Promise<{ success: boolean; error?: string; data?: Product }> => {
    try {
      if (!tenant_id) {
        return {
          success: false,
          error:
            'Tenant ID not available. Please ensure you are logged in and your account is properly configured.',
        };
      }

      if (!user) {
        return {
          success: false,
          error: 'User not authenticated. Please sign in and try again.',
        };
      }

      const { packing_configurations } = data;

      const insertPayload = buildProductInsertPayload(data, tenant_id, user.id);

      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert([insertPayload])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!newProduct) {
        return { success: false, error: 'Failed to create product' };
      }

      const productId = newProduct.id;

      if (packing_configurations?.length) {
        const rows = packingConfigurationInserts(
          productId,
          tenant_id,
          user.id,
          packing_configurations
        );
        const { error: packErr } = await supabase.from('packing_configurations').insert(rows);
        if (packErr) {
          console.error('Error saving packing configurations:', packErr);
        }
      }

      await fetchProducts();
      return { success: true, data: newProduct as unknown as Product };
    } catch (err: unknown) {
      console.error('Error creating product:', err);
      return { success: false, error: messageForProductCreateError(err) };
    }
  };

  const updateProduct = async (
    id: string,
    data: Partial<ProductFormData>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const packingData = data.packing_configurations;

      const allowedFields = [
        'sku',
        'name',
        'description',
        'short_description',
        'product_type',
        'industry_type',
        'status',
        'cost_price',
        'sell_price',
        'min_stock_level',
        'max_stock_level',
        'reorder_point',
        'reorder_quantity',
        'shelf_life_days',
        'storage_conditions',
        'tags',
        'image_url',
        'images',
        'documents',
        'specifications_url',
        'tracks_inventory',
        'product_group_id',
        'variant_attributes',
      ] as const;

      const updateData: Record<string, unknown> = {};
      const nullableMedia = ['image_url', 'images', 'documents', 'specifications_url'];
      allowedFields.forEach((field) => {
        if (field in data && data[field as keyof ProductFormData] !== undefined) {
          const value = data[field as keyof ProductFormData];
          if (value === null && nullableMedia.includes(field)) {
            updateData[field] = null;
          } else if (
            typeof value === 'string' &&
            value === '' &&
            [
              'description',
              'short_description',
              'storage_conditions',
              'image_url',
              'specifications_url',
            ].includes(field)
          ) {
            updateData[field] = null;
          } else if (value !== null && value !== undefined) {
            updateData[field] = value;
          }
        }
      });

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          console.error('Product update error:', updateError);
          throw new Error(updateError.message);
        }
      }

      if (packingData !== undefined && tenant_id && user) {
        const { error: delErr } = await supabase
          .from('packing_configurations')
          .delete()
          .eq('product_id', id)
          .eq('tenant_id', tenant_id);
        if (delErr) throw new Error(delErr.message);

        if (packingData.length > 0) {
          const rows = packingConfigurationInserts(id, tenant_id, user.id, packingData);
          const { error: insErr } = await supabase.from('packing_configurations').insert(rows);
          if (insErr) throw new Error(insErr.message);
        }
      }

      await fetchProducts();
      return { success: true };
    } catch (err: unknown) {
      console.error('Error updating product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update product';
      return { success: false, error: msg };
    }
  };

  const deleteProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!tenant_id) {
        return { success: false, error: 'Tenant ID not available.' };
      }

      const { error: deleteError } = await supabase
        .from('products')
        .update({
          is_deleted: true,
          updated_by: user?.id ?? null,
        })
        .eq('id', id)
        .eq('tenant_id', tenant_id);

      if (deleteError) {
        throw deleteError;
      }

      await fetchProducts();
      return { success: true };
    } catch (err: unknown) {
      console.error('Error archiving product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to archive product';
      return { success: false, error: msg };
    }
  };

  const restoreProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!tenant_id) {
        return { success: false, error: 'Tenant ID not available.' };
      }

      const { error: restoreError } = await supabase
        .from('products')
        .update({
          is_deleted: false,
          updated_by: user?.id ?? null,
        })
        .eq('id', id)
        .eq('tenant_id', tenant_id);

      if (restoreError) {
        throw restoreError;
      }

      await fetchProducts();
      return { success: true };
    } catch (err: unknown) {
      console.error('Error restoring product:', err);
      const msg = err instanceof Error ? err.message : 'Failed to restore product';
      return { success: false, error: msg };
    }
  };

  return {
    products,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    refreshProducts: fetchProducts,
  };
}
