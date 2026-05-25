import type {
  CostCardEntryMetrics,
  CostCardProductEntryWithRelations,
  CostLine,
  CostLineBlockType,
  MarginStatus,
} from '@/types/costCard';
import { COST_LINE_BLOCK_ORDER } from '@/types/costCard';

export const MARGIN_AMBER_THRESHOLD_PP = 5;

export function lineCost(line: CostLine): number {
  if (line.converted_cost != null && Number.isFinite(line.converted_cost)) {
    return line.converted_cost;
  }
  const qty = line.quantity ?? 0;
  const unit = line.resolved_unit_cost ?? 0;
  const rate = line.exchange_rate ?? 1;
  return qty * unit * rate;
}

export function blockSubtotals(
  lines: CostLine[]
): { block_type: CostLineBlockType; subtotal: number }[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const key = line.block_type;
    totals.set(key, (totals.get(key) ?? 0) + lineCost(line));
  }
  return COST_LINE_BLOCK_ORDER.filter((b) => totals.has(b)).map((block_type) => ({
    block_type,
    subtotal: totals.get(block_type) ?? 0,
  }));
}

export function totalCogsForLines(lines: CostLine[]): number {
  return lines.reduce((sum, line) => sum + lineCost(line), 0);
}

export function marginStatus(
  grossMarginPct: number | null,
  targetMarginPct: number | null
): MarginStatus {
  if (grossMarginPct == null || targetMarginPct == null) return 'none';
  if (grossMarginPct >= targetMarginPct) return 'green';
  if (grossMarginPct >= targetMarginPct - MARGIN_AMBER_THRESHOLD_PP) return 'amber';
  return 'red';
}

export function computeEntryMetrics(
  entry: CostCardProductEntryWithRelations
): CostCardEntryMetrics {
  const totalCogs = totalCogsForLines(entry.cost_lines ?? []);
  const selling = entry.selling_price_resolved;
  const grossMarginAmount =
    selling != null && Number.isFinite(selling) ? selling - totalCogs : null;
  const grossMarginPct =
    grossMarginAmount != null && selling != null && selling > 0
      ? (grossMarginAmount / selling) * 100
      : null;
  const baseCurrency = (entry.base_currency ?? 'GBP').trim().toUpperCase();
  const hasFxExposure = (entry.cost_lines ?? []).some(
    (line) => (line.source_currency ?? 'GBP').trim().toUpperCase() !== baseCurrency
  );

  return {
    totalCogs,
    grossMarginAmount,
    grossMarginPct,
    marginStatus: marginStatus(grossMarginPct, entry.target_margin_pct),
    hasFxExposure,
  };
}

export function formatCurrency(value: number | null | undefined, currency = 'GBP'): string {
  if (value == null || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.trim() || 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export function formatDateRange(from: string, to: string | null): string {
  const fmt = (d: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(d));
    } catch {
      return d;
    }
  };
  if (!to) return `${fmt(from)} → ongoing`;
  return `${fmt(from)} – ${fmt(to)}`;
}
