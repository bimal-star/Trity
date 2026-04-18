import { describe, expect, it } from 'vitest';
import {
  buildTierFeatureSettingsSnapshot,
  isFeatureEnabled,
  normalizeSubscriptionTier,
  resolveFeatureFlagForTier,
  type FeatureFlag,
} from '@/lib/featureFlags';
import type { TenantDetails } from '@/types/profile';

function tenant(partial: Partial<TenantDetails> & Pick<TenantDetails, 'id'>): TenantDetails {
  return {
    name: 'T',
    company_name: null,
    slug: null,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('normalizeSubscriptionTier', () => {
  it('maps known tiers', () => {
    expect(normalizeSubscriptionTier('enterprise')).toBe('enterprise');
    expect(normalizeSubscriptionTier('Professional')).toBe('professional');
  });
  it('falls back to basic for unknown', () => {
    expect(normalizeSubscriptionTier('platinum')).toBe('basic');
    expect(normalizeSubscriptionTier(null)).toBe('basic');
  });
});

describe('isFeatureEnabled', () => {
  it('returns false without tenant', () => {
    expect(isFeatureEnabled(null, 'okrs')).toBe(false);
  });

  it('uses explicit settings over tier', () => {
    const t = tenant({
      id: '1',
      subscription_tier: 'basic',
      settings: { okrs: true },
    });
    expect(isFeatureEnabled(t, 'okrs')).toBe(true);
  });

  it('basic tier disables okrs when not overridden', () => {
    const t = tenant({ id: '1', subscription_tier: 'basic', settings: {} });
    expect(isFeatureEnabled(t, 'okrs')).toBe(false);
  });

  it('professional tier enables okrs when not overridden', () => {
    const t = tenant({ id: '1', subscription_tier: 'professional', settings: {} });
    expect(isFeatureEnabled(t, 'okrs')).toBe(true);
  });

  it('enterprise enables api_access when not overridden', () => {
    const t = tenant({ id: '1', subscription_tier: 'enterprise', settings: {} });
    expect(isFeatureEnabled(t, 'api_access')).toBe(true);
  });

  it('basic keeps api_access off', () => {
    const t = tenant({ id: '1', subscription_tier: 'basic', settings: {} });
    expect(isFeatureEnabled(t, 'api_access')).toBe(false);
  });

  it('uses FEATURE_FLAG_DEFAULTS when tier has no entry for flag', () => {
    const t = tenant({ id: '1', subscription_tier: 'basic', settings: {} });
    // product_management not in TIER_FEATURE_DEFAULTS.basic → global default true
    expect(isFeatureEnabled(t, 'product_management')).toBe(true);
  });

  it('explicit false in settings is honored', () => {
    const t = tenant({
      id: '1',
      subscription_tier: 'enterprise',
      settings: { api_access: false },
    });
    expect(isFeatureEnabled(t, 'api_access')).toBe(false);
  });

  it('tolerates malformed settings as empty', () => {
    const t = tenant({
      id: '1',
      subscription_tier: 'professional',
      settings: null as unknown as Record<string, unknown>,
    });
    expect(isFeatureEnabled(t, 'okrs')).toBe(true);
  });
});

describe('resolveFeatureFlagForTier', () => {
  it('matches tier defaults without settings', () => {
    expect(resolveFeatureFlagForTier('basic', 'okrs' as FeatureFlag)).toBe(false);
    expect(resolveFeatureFlagForTier('enterprise', 'api_access' as FeatureFlag)).toBe(true);
  });
});

describe('buildTierFeatureSettingsSnapshot', () => {
  it('includes every flag key', () => {
    const snap = buildTierFeatureSettingsSnapshot('professional');
    expect(typeof snap.okrs).toBe('boolean');
    expect(typeof snap.product_management).toBe('boolean');
  });
});
