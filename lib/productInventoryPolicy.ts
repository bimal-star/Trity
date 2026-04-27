import type { Product } from '@/types/product';

/**
 * Whether this SKU participates in on-hand inventory (stock levels, MRP, etc.).
 * Defaults to true when the column is absent (older API payloads).
 */
export function productTracksInventory(product: Pick<Product, 'tracks_inventory'>): boolean {
  return product.tracks_inventory !== false;
}
