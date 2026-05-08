import type { ProductListViewDefinitionV1 } from '@/types/productListViews';
import type {
  ProductRecordVisibility,
  ProductSortField,
  ProductType,
  SortDirection,
  StatusType,
} from '@/types/product';
import {
  getDefaultProductListColumnOrder,
  getSystemDefaultHidden,
} from '@/lib/productListColumnCatalog';

export function buildSystemDefinitionV1(includeProductGroup: boolean): ProductListViewDefinitionV1 {
  return {
    v: 1,
    columns: {
      order: getDefaultProductListColumnOrder(includeProductGroup),
      hidden: [...getSystemDefaultHidden(includeProductGroup)],
    },
    filters: {
      search: '',
      statusFilter: 'all',
      productTypeFilter: 'all',
      tagFilter: 'all',
      selectedCategoryNodeIdsByTier: {},
      recordVisibility: 'active',
    },
    sort: {
      sortField: 'created_at',
      sortDirection: 'desc',
    },
  };
}

export function serializeCategoryTiers(t: Record<number, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  Object.entries(t).forEach(([k, v]) => {
    out[String(k)] = v;
  });
  return out;
}

export function deserializeCategoryTiers(t: Record<string, string[]>): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  Object.entries(t).forEach(([k, v]) => {
    out[Number(k)] = v;
  });
  return out;
}

export function buildDefinitionFromPageState(args: {
  includeProductGroup: boolean;
  search: string;
  statusFilter: 'all' | StatusType;
  productTypeFilter: 'all' | ProductType;
  tagFilter: string;
  selectedCategoryNodeIdsByTier: Record<number, string[]>;
  recordVisibility: ProductRecordVisibility;
  sortField: ProductSortField;
  sortDirection: SortDirection;
  columnOrder: string[];
  columnHidden: string[];
}): ProductListViewDefinitionV1 {
  return {
    v: 1,
    columns: {
      order: [...args.columnOrder],
      hidden: [...args.columnHidden],
    },
    filters: {
      search: args.search,
      statusFilter: args.statusFilter,
      productTypeFilter: args.productTypeFilter,
      tagFilter: args.tagFilter,
      selectedCategoryNodeIdsByTier: serializeCategoryTiers(args.selectedCategoryNodeIdsByTier),
      recordVisibility: args.recordVisibility,
    },
    sort: {
      sortField: args.sortField,
      sortDirection: args.sortDirection,
    },
  };
}
