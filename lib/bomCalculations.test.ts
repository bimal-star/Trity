import { describe, expect, it } from 'vitest';
import {
  bomEffectiveQuantity,
  bomHeaderTotalCost,
  bomLineTotalCost,
  bomLineUnitCost,
} from '@/lib/bomCalculations';

describe('bomCalculations', () => {
  it('bomEffectiveQuantity applies waste', () => {
    expect(bomEffectiveQuantity(10, 5)).toBeCloseTo(10.5);
    expect(bomEffectiveQuantity(10, null)).toBe(10);
  });

  it('bomLineUnitCost respects basis fallback chain', () => {
    expect(
      bomLineUnitCost('last_buy', {
        standard: 1,
        landing: 2,
        lastBuy: 3,
      })
    ).toBe(3);
    expect(
      bomLineUnitCost('landing', {
        standard: 1,
        landing: null,
        lastBuy: null,
        sell: 4,
      })
    ).toBe(1);
  });

  it('bomLineTotalCost multiplies effective qty by unit cost', () => {
    expect(bomLineTotalCost(2, 10, 5)).toBeCloseTo(11);
  });

  it('bomHeaderTotalCost sums lines and divides by output qty', () => {
    expect(bomHeaderTotalCost([10, 20], 5)).toEqual({ total: 30, costPerUnit: 6 });
    expect(bomHeaderTotalCost([10], 0).costPerUnit).toBeNull();
  });
});
