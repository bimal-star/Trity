import type { Product } from '@/types/product';
import type { SupplierProductPrice } from '@/types/supplierProductPrice';

export function defaultUnitPriceFromProduct(p: Product | undefined): number {
  if (!p) return 0;
  const sell = p.sell_price != null ? Number(p.sell_price) : NaN;
  if (Number.isFinite(sell) && sell > 0) return sell;
  const cost = p.cost_price != null ? Number(p.cost_price) : NaN;
  if (Number.isFinite(cost) && cost >= 0) return cost;
  return 0;
}

/** Prefer supplier catalog row when present; else product sell/cost heuristic. */
export function resolvePoListUnitPrice(
  product: Product | undefined,
  catalog: Pick<SupplierProductPrice, 'unit_price'> | null | undefined
): number {
  if (catalog != null) {
    const u = Number(catalog.unit_price);
    if (Number.isFinite(u) && u >= 0) return u;
  }
  return defaultUnitPriceFromProduct(product);
}

export function isBelowMoq(qty: number, minOrderQty: number | null | undefined): boolean {
  const moq = minOrderQty != null ? Number(minOrderQty) : NaN;
  if (!Number.isFinite(moq) || moq <= 0) return false;
  return qty < moq;
}
