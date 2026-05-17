import type { Product } from '@/types/product';
import { productTracksInventory } from '@/lib/productInventoryPolicy';

export type ProductStockBucket = 'na' | 'out' | 'low' | 'in';

export interface ProductStockStatus {
  bucket: ProductStockBucket;
  label: string;
}

/**
 * Badge + hero border semantics aligned with `/products` and `/products/[id]`.
 */
export function getProductStockStatus(
  product: Pick<Product, 'tracks_inventory' | 'total_stock' | 'reorder_point'>
): ProductStockStatus {
  if (!productTracksInventory(product)) {
    return { bucket: 'na', label: 'N/A' };
  }

  const stock = product.total_stock == null ? null : Number(product.total_stock);
  const reorder = product.reorder_point == null ? null : Number(product.reorder_point);

  if (stock == null || Number.isNaN(stock)) {
    return { bucket: 'na', label: '—' };
  }

  if (stock <= 0) {
    return { bucket: 'out', label: 'Out' };
  }

  if (reorder != null && !Number.isNaN(reorder) && stock <= reorder) {
    return { bucket: 'low', label: 'Low' };
  }

  return { bucket: 'in', label: 'In stock' };
}

export function stockStatusBadgeClass(bucket: ProductStockBucket): string {
  switch (bucket) {
    case 'in':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'low':
      return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100';
    case 'out':
      return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-950/35 dark:text-red-200';
    default:
      return 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-300';
  }
}

/** Border color only — pair with `border-l-[5px]` on list master cards. */
export function stockHeroBorderClass(bucket: ProductStockBucket): string {
  return stockBorderColorClass(bucket);
}

/** Thin left accent for record detail headers (`PremiumRecordHeader`). */
export function stockRecordBorderClass(bucket: ProductStockBucket): string {
  return `border-l-2 ${stockBorderColorClass(bucket)}`;
}

function stockBorderColorClass(bucket: ProductStockBucket): string {
  switch (bucket) {
    case 'in':
      return 'border-l-emerald-500';
    case 'low':
      return 'border-l-amber-500';
    case 'out':
      return 'border-l-red-500';
    default:
      return 'border-l-green-600 dark:border-l-green-500';
  }
}
