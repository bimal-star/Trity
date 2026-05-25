import { describe, expect, it } from 'vitest';
import { DEFAULT_SELLABLE_PACK_OPTIONS } from '@/lib/sellablePackLevel';
import { formatBarcodePackLabel, resolveBarcodePackingLevel } from './productBarcodePacking';

describe('productBarcodePacking', () => {
  const catalog = DEFAULT_SELLABLE_PACK_OPTIONS;

  it('formats unit as label without multiplier', () => {
    expect(formatBarcodePackLabel('unit', 1, catalog)).toBe('Unit');
  });

  it('formats case with quantity', () => {
    expect(formatBarcodePackLabel('case', 12, catalog)).toBe('Case × 12');
  });

  it('labels inner as breakpack', () => {
    expect(formatBarcodePackLabel('inner', 6, catalog)).toBe('Inner (breakpack) × 6');
  });

  it('falls back to unit for invalid level', () => {
    expect(resolveBarcodePackingLevel('invalid', catalog)).toBe('unit');
  });

  it('uses custom catalog label', () => {
    const custom = [...catalog, { code: 'half_pallet', label: 'Half pallet', sort_order: 35 }];
    expect(formatBarcodePackLabel('half_pallet', 2, custom)).toBe('Half pallet × 2');
  });
});
