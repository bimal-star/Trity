import type { PurchaseOrderLine } from '@/types/purchase';

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

export function getPoLineDiscountPct(line: Pick<PurchaseOrderLine, 'discount_pct'>): number {
  return clampMin(toNum(line.discount_pct, 0), 0);
}

export function getPoLineDiscountAmount(line: Pick<PurchaseOrderLine, 'discount_amount'>): number {
  return clampMin(toNum(line.discount_amount, 0), 0);
}

export function poLineNetExtended(
  quantityOrdered: number,
  unitPrice: number,
  discountPct = 0,
  discountAmount = 0
): number {
  const qty = clampMin(toNum(quantityOrdered, 0), 0);
  const list = clampMin(toNum(unitPrice, 0), 0);
  const pct = clampMin(toNum(discountPct, 0), 0);
  const amt = clampMin(toNum(discountAmount, 0), 0);
  const discountedUnit = list * (1 - pct / 100);
  const net = qty * discountedUnit - amt;
  return clampMin(net, 0);
}

export function poLineNetUnitPrice(
  quantityOrdered: number,
  unitPrice: number,
  discountPct = 0,
  discountAmount = 0
): number {
  const qty = clampMin(toNum(quantityOrdered, 0), 0);
  if (qty <= 0) return 0;
  return poLineNetExtended(qty, unitPrice, discountPct, discountAmount) / qty;
}

export function poLineTaxAmount(
  quantityOrdered: number,
  unitPrice: number,
  discountPct = 0,
  discountAmount = 0,
  taxRatePct = 0
): number {
  const net = poLineNetExtended(quantityOrdered, unitPrice, discountPct, discountAmount);
  const taxPct = clampMin(toNum(taxRatePct, 0), 0);
  return net * (taxPct / 100);
}

export function poLineNetUnitFromRow(
  line: Pick<
    PurchaseOrderLine,
    'quantity_ordered' | 'unit_price' | 'discount_pct' | 'discount_amount'
  >
): number {
  return poLineNetUnitPrice(
    toNum(line.quantity_ordered, 0),
    toNum(line.unit_price, 0),
    getPoLineDiscountPct(line),
    getPoLineDiscountAmount(line)
  );
}
