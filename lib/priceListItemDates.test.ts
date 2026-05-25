import { describe, expect, it } from 'vitest';
import {
  formatPriceItemEffectiveLabel,
  normalizeDateOnly,
  priceItemEffectiveStatus,
  validateEffectiveDateRange,
} from './priceListItemDates';

describe('priceListItemDates', () => {
  it('normalizeDateOnly trims and nulls empty', () => {
    expect(normalizeDateOnly('')).toBeNull();
    expect(normalizeDateOnly('  2026-05-01T00:00:00Z  ')).toBe('2026-05-01');
  });

  it('validateEffectiveDateRange rejects inverted range', () => {
    expect(validateEffectiveDateRange('2026-06-01', '2026-05-01')).toMatch(/End date/);
    expect(validateEffectiveDateRange('2026-05-01', '2026-06-01')).toBeNull();
    expect(validateEffectiveDateRange(null, '2026-06-01')).toBeNull();
  });

  it('formatPriceItemEffectiveLabel formats partial ranges', () => {
    expect(formatPriceItemEffectiveLabel(null, null)).toBeNull();
    expect(formatPriceItemEffectiveLabel('2026-01-15', null)).toMatch(/^From /);
    expect(formatPriceItemEffectiveLabel(null, '2026-12-31')).toMatch(/^Until /);
    expect(formatPriceItemEffectiveLabel('2026-01-01', '2026-12-31')).toContain('–');
  });

  it('priceItemEffectiveStatus classifies relative to reference date', () => {
    expect(priceItemEffectiveStatus(null, null, '2026-06-15')).toBe('open');
    expect(priceItemEffectiveStatus('2026-07-01', null, '2026-06-15')).toBe('upcoming');
    expect(priceItemEffectiveStatus(null, '2026-05-01', '2026-06-15')).toBe('expired');
    expect(priceItemEffectiveStatus('2026-01-01', '2026-12-31', '2026-06-15')).toBe('active');
  });
});
