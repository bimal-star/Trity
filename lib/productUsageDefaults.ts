import type { ProductType } from '@/types/product';

export interface ProductUsageFlags {
  is_sellable: boolean;
  is_purchasable: boolean;
  is_manufacturable: boolean;
  is_component: boolean;
}

/** Defaults aligned with migration backfill heuristics. */
export function defaultUsageForProductType(productType: ProductType): ProductUsageFlags {
  switch (productType) {
    case 'service':
      return {
        is_sellable: true,
        is_purchasable: false,
        is_manufacturable: false,
        is_component: false,
      };
    case 'raw_material':
    case 'packaging':
      return {
        is_sellable: false,
        is_purchasable: true,
        is_manufacturable: false,
        is_component: true,
      };
    case 'semi_finished':
      return {
        is_sellable: false,
        is_purchasable: true,
        is_manufacturable: true,
        is_component: true,
      };
    case 'assembly':
      return {
        is_sellable: true,
        is_purchasable: false,
        is_manufacturable: true,
        is_component: false,
      };
    case 'finished_good':
    default:
      return {
        is_sellable: true,
        is_purchasable: false,
        is_manufacturable: false,
        is_component: false,
      };
  }
}
