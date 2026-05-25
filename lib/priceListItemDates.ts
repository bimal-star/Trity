/** Supabase select fragment for product tier price rows (includes nested tier). */
export const PRICE_LIST_ITEM_SELECT =
  'id, price_list_id, product_id, unit_price, min_quantity, max_quantity, effective_from, effective_to, created_at, price_lists(id, name, description, currency, effective_from, effective_to, is_active, is_default)';

export function normalizeDateOnly(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.slice(0, 10);
}

export function validateEffectiveDateRange(from: string | null, to: string | null): string | null {
  if (from && to && to < from) {
    return 'End date must be on or after start date.';
  }
  return null;
}

export function formatPriceItemEffectiveLabel(
  from: string | null | undefined,
  to: string | null | undefined
): string | null {
  const f = from?.slice(0, 10) ?? null;
  const t = to?.slice(0, 10) ?? null;
  if (!f && !t) return null;

  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  if (f && t) return `${fmt(f)} – ${fmt(t)}`;
  if (f) return `From ${fmt(f)}`;
  return `Until ${fmt(t!)}`;
}

export type PriceItemEffectiveStatus = 'open' | 'active' | 'upcoming' | 'expired';

export function priceItemEffectiveStatus(
  from: string | null | undefined,
  to: string | null | undefined,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): PriceItemEffectiveStatus {
  const f = from?.slice(0, 10) ?? null;
  const t = to?.slice(0, 10) ?? null;
  if (!f && !t) return 'open';
  if (f && referenceDate < f) return 'upcoming';
  if (t && referenceDate > t) return 'expired';
  return 'active';
}

export function dateInputValue(d: string | null | undefined): string {
  if (!d) return '';
  return d.slice(0, 10);
}
