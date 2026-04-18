/**
 * Optional conventions for `products.metadata` (jsonb).
 * MRP/BOM layers can read these without new columns until requirements harden.
 */
export type ProductMetadataBom = {
  /** Parent assembly explodes to components only; parent SKU is not stocked. */
  phantom?: boolean;
};

export type ProductMetadataShape = {
  bom?: ProductMetadataBom;
};

export function getProductMetadataBomPhantom(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const bom = (metadata as ProductMetadataShape).bom;
  return Boolean(bom?.phantom);
}
