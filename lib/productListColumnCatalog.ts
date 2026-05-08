import type { Database } from '@/types/database';
import type {
  TableColumnBadgeMapEntry,
  TableColumnDefinition,
  TableColumnIconStatusMapEntry,
  TableColumnRenderType,
} from '@/types/tableView';

export type ProductListColumnId = string;

/** `product_list_saved_views.page_key` value for the Products list. */
export const PRODUCT_LIST_PAGE_KEY = 'products';

type ProductRow = Database['public']['Tables']['products']['Row'];

/** Scalar / list-safe keys on `public.products` (exclude tenant scope + internal version). */
const OMIT_FROM_CATALOG: (keyof ProductRow)[] = ['tenant_id', 'version'];

/** View-backed / computed columns for the list (not all are `products` columns). */
export const PRODUCT_LIST_PSEUDO_COLUMNS = [
  '_thumbnail',
  'categories',
  'product_group',
  'stock',
  'lifecycle',
] as const;

const PSEUDO_AS_STRINGS = PRODUCT_LIST_PSEUDO_COLUMNS as readonly string[];

/**
 * DB / system fields excluded from the column picker (UUIDs, audit fields, raw FKs, etc.).
 * List columns still render if present in a saved view order until the user reapplies columns.
 */
const PRODUCT_LIST_NON_USER_PICKER_KEYS = new Set<string>([
  'id',
  'user_id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'category_id',
  'certifications',
  'specifications_url',
  'storage_conditions',
  'tracks_inventory',
  'variant_attributes',
  'integration_metadata',
  'external_id',
  'external_system',
  'last_synced_at',
  'product_group_id',
  'is_deleted',
  'image_url',
]);

/** Whether a column id may appear in the user-facing column picker (Products list). */
export function isProductListColumnUserConfigurable(columnId: string): boolean {
  if (columnId.startsWith('_')) return true;
  if (PSEUDO_AS_STRINGS.includes(columnId)) return true;
  return !PRODUCT_LIST_NON_USER_PICKER_KEYS.has(columnId);
}

/** Mirrors `Database['public']['Tables']['products']['Row']` keys (keep in sync with migrations). */
const PRODUCT_KEYS = (
  [
    'id',
    'allergens',
    'attributes',
    'base_unit_id',
    'batch_tracked',
    'category_id',
    'certifications',
    'cost_price',
    'created_at',
    'created_by',
    'currency',
    'default_supplier_id',
    'description',
    'dimension_unit_id',
    'documents',
    'external_id',
    'external_system',
    'height',
    'image_url',
    'images',
    'industry_type',
    'integration_metadata',
    'is_active',
    'is_deleted',
    'last_synced_at',
    'lead_time_days',
    'length',
    'lot_controlled',
    'manufacturer_part_number',
    'max_stock_level',
    'metadata',
    'min_stock_level',
    'name',
    'product_group_id',
    'product_type',
    'reorder_point',
    'reorder_quantity',
    'safety_rating',
    'sell_price',
    'serial_tracked',
    'shelf_life_days',
    'short_description',
    'sku',
    'specifications_url',
    'status',
    'storage_conditions',
    'tags',
    'tracks_inventory',
    'updated_at',
    'updated_by',
    'user_id',
    'variant_attributes',
    'volume',
    'volume_unit_id',
    'weight',
    'weight_unit_id',
    'weighted_avg_unit_cost',
    'width',
  ] as const satisfies readonly (keyof ProductRow)[]
).filter(
  (k) => !OMIT_FROM_CATALOG.includes(k as keyof ProductRow)
) as unknown as (keyof ProductRow)[];

/** Stable default order: selection + image, then legacy table order, then remaining keys A–Z. */
export function getDefaultProductListColumnOrder(
  includeProductGroup: boolean
): ProductListColumnId[] {
  const core: ProductListColumnId[] = [
    '_select',
    '_thumbnail',
    'sku',
    ...(includeProductGroup ? (['product_group'] as const) : []),
    'name',
    'categories',
    'product_type',
    'sell_price',
    'stock',
    'lifecycle',
  ];
  const rest = PRODUCT_KEYS.filter(
    (k) => !core.includes(k as string) && isProductListColumnUserConfigurable(k as string)
  ).sort((a, b) => String(a).localeCompare(String(b))) as ProductListColumnId[];
  return [...core, ...rest];
}

const LABEL_OVERRIDES: Partial<Record<string, string>> = {
  _select: 'Select',
  _thumbnail: 'Image',
  categories: 'Categories',
  product_group: 'Product group',
  stock: 'Stock',
  lifecycle: 'Catalog status',
  sku: 'SKU',
  short_description: 'Short description',
  product_type: 'Type',
  industry_type: 'Industry',
  cost_price: 'Cost price',
  sell_price: 'Unit price',
  weighted_avg_unit_cost: 'Avg unit cost',
  min_stock_level: 'Min stock',
  max_stock_level: 'Max stock',
  reorder_point: 'Reorder point',
  reorder_quantity: 'Reorder qty',
  lead_time_days: 'Lead time (days)',
  shelf_life_days: 'Shelf life (days)',
  manufacturer_part_number: 'MPN',
  default_supplier_id: 'Default supplier',
  base_unit_id: 'Base unit',
  weight_unit_id: 'Weight unit',
  dimension_unit_id: 'Dimension unit',
  volume_unit_id: 'Volume unit',
  category_id: 'Category ID',
  product_group_id: 'Product group ID',
  integration_metadata: 'Integration metadata',
  variant_attributes: 'Variant attributes',
};

export function getProductListColumnLabel(id: ProductListColumnId): string {
  if (LABEL_OVERRIDES[id]) return LABEL_OVERRIDES[id]!;
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Columns that are off by default until the user enables them (wide JSON / noisy). */
export const PRODUCT_LIST_HEAVY_JSON_COLUMNS: ReadonlySet<string> = new Set([
  'attributes',
  'documents',
  'images',
  'metadata',
  'integration_metadata',
  'variant_attributes',
]);

/** Columns visible on first load when no saved view applies (plus `_select` / `_thumbnail`). */
const SYSTEM_DEFAULT_VISIBLE_IDS = new Set<string>([
  '_select',
  '_thumbnail',
  'sku',
  'name',
  'categories',
  'product_type',
  'sell_price',
  'stock',
  'status',
]);

/** Hidden column ids for the system default view (everything not in `SYSTEM_DEFAULT_VISIBLE_IDS`). */
export function getSystemDefaultHidden(includeProductGroup: boolean): string[] {
  const order = getDefaultProductListColumnOrder(includeProductGroup);
  return order.filter((id) => !SYSTEM_DEFAULT_VISIBLE_IDS.has(id));
}

/** Per-column UI metadata (renderType, maps). Omitted keys default to plain `text`. */
const PRODUCT_LIST_COLUMN_UI: Record<
  string,
  {
    renderType: TableColumnRenderType;
    statusMap?: Record<string, TableColumnIconStatusMapEntry>;
    badgeMap?: Record<string, TableColumnBadgeMapEntry>;
  }
> = {
  stock: {
    renderType: 'icon-status',
    statusMap: {
      na: { dotClass: 'bg-gray-400', label: 'Not applicable' },
      in: { dotClass: 'bg-emerald-500', label: 'In stock' },
      low: { dotClass: 'bg-amber-500', label: 'Low stock' },
      out: { dotClass: 'bg-red-500', label: 'Out of stock' },
    },
  },
  lifecycle: {
    renderType: 'icon-status',
    statusMap: {
      active: { dotClass: 'bg-emerald-500', label: 'Active' },
      archived: { dotClass: 'bg-gray-400', label: 'Archived' },
    },
  },
  status: {
    renderType: 'badge',
    badgeMap: {
      active: {
        label: 'Active',
        className:
          'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200',
      },
      inactive: {
        label: 'Inactive',
        className:
          'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
      },
      discontinued: {
        label: 'Discontinued',
        className:
          'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100',
      },
      planned: {
        label: 'Planned',
        className:
          'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/35 dark:text-blue-100',
      },
      development: {
        label: 'Development',
        className:
          'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/35 dark:text-violet-100',
      },
    },
  },
  batch_tracked: { renderType: 'boolean' },
  serial_tracked: { renderType: 'boolean' },
  lot_controlled: { renderType: 'boolean' },
  tracks_inventory: { renderType: 'boolean' },
  is_active: { renderType: 'boolean' },
  cost_price: { renderType: 'currency' },
  weighted_avg_unit_cost: { renderType: 'currency' },
};

/** Resolved UI for a column id (defaults to `text`). */
export function getProductListColumnUi(columnId: string): {
  renderType: TableColumnRenderType;
  statusMap?: Record<string, TableColumnIconStatusMapEntry>;
  badgeMap?: Record<string, TableColumnBadgeMapEntry>;
} {
  return PRODUCT_LIST_COLUMN_UI[columnId] ?? { renderType: 'text' };
}

export function getProductListTableColumnDefinitions(
  includeProductGroup: boolean
): TableColumnDefinition[] {
  const order = getDefaultProductListColumnOrder(includeProductGroup);
  const alwaysOn = new Set(['_select', '_thumbnail']);
  return order.map((id) => {
    const ui = getProductListColumnUi(id);
    const def: TableColumnDefinition = {
      id,
      label: getProductListColumnLabel(id),
      defaultVisible: SYSTEM_DEFAULT_VISIBLE_IDS.has(id),
      alwaysOn: alwaysOn.has(id),
      renderType: ui.renderType,
    };
    if (ui.statusMap) def.statusMap = ui.statusMap;
    if (ui.badgeMap) def.badgeMap = ui.badgeMap;
    return def;
  });
}
