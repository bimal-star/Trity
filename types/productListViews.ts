import type {
  ProductRecordVisibility,
  ProductSortField,
  ProductType,
  SortDirection,
  StatusType,
} from '@/types/product';

/** Saved view document stored in `product_list_saved_views.definition` / workspace JSON. */
export type ProductListViewDefinitionV1 = {
  v: 1;
  columns: {
    order: string[];
    hidden: string[];
  };
  filters: {
    search: string;
    statusFilter: 'all' | StatusType;
    productTypeFilter: 'all' | ProductType;
    tagFilter: string;
    /** JSON object keys are tier numbers as strings */
    selectedCategoryNodeIdsByTier: Record<string, string[]>;
    recordVisibility: ProductRecordVisibility;
  };
  sort: {
    sortField: ProductSortField;
    sortDirection: SortDirection;
  };
};

export type ProductListSavedViewRow = {
  id: string;
  tenant_id: string;
  owner_user_id: string;
  name: string;
  definition: ProductListViewDefinitionV1;
  is_personal_default: boolean;
  created_at: string;
  updated_at: string;
};

export type TenantProductsListSettingsRow = {
  tenant_id: string;
  workspace_default_definition: ProductListViewDefinitionV1 | null;
  updated_at: string;
  updated_by: string | null;
};

export function isProductListViewDefinitionV1(x: unknown): x is ProductListViewDefinitionV1 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.v !== 1) return false;
  if (!o.columns || typeof o.columns !== 'object') return false;
  const c = o.columns as Record<string, unknown>;
  return Array.isArray(c.order) && Array.isArray(c.hidden);
}
