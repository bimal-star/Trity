/**
 * BOM line costing — mirrors SQL helpers in migration 20260525120000.
 * @see public.bom_effective_quantity, public.po_line_net_unit_price
 */

export function bomEffectiveQuantity(quantity: number, wastePercentage?: number | null): number {
  const qty = Number.isFinite(quantity) ? quantity : 0;
  const waste = wastePercentage != null && Number.isFinite(wastePercentage) ? wastePercentage : 0;
  return qty * (1 + waste / 100);
}

export type BomPriceBasis = 'standard' | 'landing' | 'last_buy';

export function bomLineUnitCost(
  basis: BomPriceBasis,
  prices: {
    standard?: number | null;
    landing?: number | null;
    lastBuy?: number | null;
    sell?: number | null;
  }
): number {
  const std = prices.standard ?? prices.sell ?? 0;
  const landing = prices.landing ?? prices.standard ?? prices.sell ?? 0;
  const lastBuy = prices.lastBuy ?? prices.landing ?? prices.standard ?? prices.sell ?? 0;
  if (basis === 'landing') return Number(landing) || 0;
  if (basis === 'last_buy') return Number(lastBuy) || 0;
  return Number(std) || 0;
}

export function bomLineTotalCost(
  quantity: number,
  wastePercentage: number | null | undefined,
  unitCost: number
): number {
  return (
    bomEffectiveQuantity(quantity, wastePercentage) * (Number.isFinite(unitCost) ? unitCost : 0)
  );
}

export function bomHeaderTotalCost(
  lineTotals: number[],
  outputQuantity: number
): { total: number; costPerUnit: number | null } {
  const total = lineTotals.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
  const out = Number(outputQuantity);
  const costPerUnit = out > 0 ? total / out : null;
  return { total, costPerUnit };
}

export function formatBomCurrency(value: number | null | undefined, currency = 'GBP'): string {
  if (value == null || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.trim() || 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

export function formatBomQty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded);
}

export function formatWastePct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value}%`;
}
