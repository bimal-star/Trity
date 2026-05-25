import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SELLABLE_PACK_OPTIONS,
  mergeSellablePackOptions,
  slugifySellablePackCode,
} from './sellablePackLevel';

describe('sellablePackLevel', () => {
  it('slugifies labels to valid codes', () => {
    expect(slugifySellablePackCode('Half Pallet')).toBe('half_pallet');
    expect(slugifySellablePackCode(' 6-pack ')).toBe('pack_6_pack');
  });

  it('merges orphan codes from product configs', () => {
    const merged = mergeSellablePackOptions(DEFAULT_SELLABLE_PACK_OPTIONS, ['custom_tote']);
    expect(merged.some((o) => o.code === 'custom_tote')).toBe(true);
    expect(merged.some((o) => o.code === 'unit')).toBe(true);
  });
});
