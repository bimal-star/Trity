import { defaultUsageForProductType } from '@/lib/productUsageDefaults';
import type {
  IndustryType,
  Product,
  ProductFormData,
  ProductType,
  StatusType,
} from '@/types/product';

export type ProductKeyDetailsDraft = {
  sku: string;
  name: string;
  short_description: string;
  description: string;
  industry_type: IndustryType;
  product_type: ProductType;
  status: StatusType;
};

export const emptyProductKeyDetailsDraft: ProductKeyDetailsDraft = {
  sku: '',
  name: '',
  short_description: '',
  description: '',
  industry_type: 'manufacturing',
  product_type: 'finished_good',
  status: 'active',
};

export function productToKeyDetailsDraft(product: Product): ProductKeyDetailsDraft {
  return {
    sku: product.sku ?? '',
    name: product.name ?? '',
    short_description: product.short_description ?? '',
    description: product.description ?? '',
    industry_type: product.industry_type ?? 'manufacturing',
    product_type: product.product_type ?? 'finished_good',
    status: product.status ?? 'active',
  };
}

export function keyDetailsToCreateFormData(draft: ProductKeyDetailsDraft): ProductFormData {
  const usage = defaultUsageForProductType(draft.product_type);
  return {
    sku: draft.sku.trim(),
    name: draft.name.trim(),
    short_description: draft.short_description.trim() || undefined,
    description: draft.description.trim() || undefined,
    industry_type: draft.industry_type,
    product_type: draft.product_type,
    status: draft.status,
    is_active: true,
    tracks_inventory: draft.product_type === 'service' ? false : true,
    is_sellable: usage.is_sellable,
    is_purchasable: usage.is_purchasable,
    is_manufacturable: usage.is_manufacturable,
    is_component: usage.is_component,
  };
}

/** Display-only product for create-mode summary (not persisted). */
export function keyDetailsToProductPreview(
  draft: ProductKeyDetailsDraft,
  tenantId: string = ''
): Product {
  const now = new Date().toISOString();
  const usage = defaultUsageForProductType(draft.product_type);
  return {
    id: '',
    user_id: null,
    sku: draft.sku.trim() || '—',
    name: draft.name.trim() || 'New product',
    description: draft.description.trim() || null,
    short_description: draft.short_description.trim() || null,
    product_type: draft.product_type,
    industry_type: draft.industry_type,
    category_id: null,
    base_unit_id: null,
    status: draft.status,
    cost_price: null,
    sell_price: null,
    currency: 'GBP',
    weight: null,
    weight_unit_id: null,
    length: null,
    width: null,
    height: null,
    dimension_unit_id: null,
    volume: null,
    volume_unit_id: null,
    tracks_inventory: draft.product_type === 'service' ? false : true,
    is_sellable: usage.is_sellable,
    is_purchasable: usage.is_purchasable,
    is_manufacturable: usage.is_manufacturable,
    is_component: usage.is_component,
    min_stock_level: null,
    max_stock_level: null,
    reorder_point: null,
    reorder_quantity: null,
    lead_time_days: null,
    shelf_life_days: null,
    storage_conditions: null,
    allergens: null,
    certifications: null,
    safety_rating: null,
    default_supplier_id: null,
    manufacturer_part_number: null,
    batch_tracked: null,
    serial_tracked: null,
    lot_controlled: null,
    image_url: null,
    images: null,
    documents: null,
    specifications_url: null,
    attributes: null,
    metadata: null,
    tags: null,
    categories: [],
    is_active: true,
    is_deleted: false,
    created_at: now,
    updated_at: now,
    created_by: null,
    updated_by: null,
  };
}
