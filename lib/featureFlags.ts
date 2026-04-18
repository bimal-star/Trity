/**
 * Feature Flags utilities for per-tenant feature control
 * 
 * Allows enabling/disabling features per tenant
 * Stores flags in tenants.settings JSON field
 */

import { TenantDetails } from '@/types/profile';

export type FeatureFlag =
  | 'advanced_calendar'
  | 'product_management'
  | 'okrs'
  | 'workstreams'
  | 'team_groups'
  | 'audit_logs'
  | 'api_access'
  | 'sso'
  | 'custom_domain'
  | 'ai_lab';

export interface FeatureFlagInfo {
  flag: FeatureFlag;
  label: string;
  description: string;
  defaultEnabled: boolean;
  requiresRole?: 'admin' | 'super_admin';
}

// Default feature configurations
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlag, FeatureFlagInfo> = {
  advanced_calendar: {
    flag: 'advanced_calendar',
    label: 'Advanced Calendar',
    description: 'Multi-person scheduling and resource management',
    defaultEnabled: true,
  },
  product_management: {
    flag: 'product_management',
    label: 'Product Management',
    description: 'Product catalog and inventory management',
    defaultEnabled: true,
  },
  okrs: {
    flag: 'okrs',
    label: 'OKRs',
    description: 'Objectives and Key Results tracking',
    defaultEnabled: false,
  },
  workstreams: {
    flag: 'workstreams',
    label: 'Workstreams',
    description: 'Project and workstream management',
    defaultEnabled: true,
  },
  team_groups: {
    flag: 'team_groups',
    label: 'Team Groups',
    description: 'Create and manage user groups for better organization',
    defaultEnabled: true,
  },
  audit_logs: {
    flag: 'audit_logs',
    label: 'Audit Logs',
    description: 'Track all changes and user actions',
    defaultEnabled: true,
    requiresRole: 'admin',
  },
  api_access: {
    flag: 'api_access',
    label: 'API Access',
    description: 'REST and GraphQL APIs for integrations',
    defaultEnabled: false,
    requiresRole: 'super_admin',
  },
  sso: {
    flag: 'sso',
    label: 'Single Sign-On (SSO)',
    description: 'SAML/OIDC authentication',
    defaultEnabled: false,
    requiresRole: 'super_admin',
  },
  custom_domain: {
    flag: 'custom_domain',
    label: 'Custom Domain',
    description: 'Use custom domain for tenant',
    defaultEnabled: false,
    requiresRole: 'super_admin',
  },
  ai_lab: {
    flag: 'ai_lab',
    label: 'AI Lab',
    description: 'Access to AI assistant and chat features',
    defaultEnabled: true,
  },
};

/** Subscription tiers stored on `tenants.subscription_tier`. */
export type SubscriptionTier = 'basic' | 'professional' | 'enterprise';

const KNOWN_TIERS = new Set<SubscriptionTier>(['basic', 'professional', 'enterprise']);

/**
 * Maps DB `subscription_tier` to a known tier; unknown or empty → `basic`.
 */
export function normalizeSubscriptionTier(
  raw: string | null | undefined
): SubscriptionTier {
  if (raw == null || typeof raw !== 'string') return 'basic';
  const t = raw.trim().toLowerCase() as SubscriptionTier;
  return KNOWN_TIERS.has(t) ? t : 'basic';
}

/**
 * Per-tier defaults (partial). Any flag omitted falls through to `FEATURE_FLAG_DEFAULTS`.
 * Tenants without an explicit key in `settings` inherit tier defaults here.
 */
export const TIER_FEATURE_DEFAULTS: Record<
  SubscriptionTier,
  Partial<Record<FeatureFlag, boolean>>
> = {
  basic: {
    okrs: false,
    api_access: false,
    sso: false,
    custom_domain: false,
  },
  professional: {
    okrs: true,
    api_access: false,
    sso: false,
    custom_domain: false,
  },
  enterprise: {
    okrs: true,
    api_access: true,
    sso: true,
    custom_domain: true,
  },
};

export function tierDefaultForFlag(
  tier: SubscriptionTier,
  flag: FeatureFlag
): boolean | undefined {
  const v = TIER_FEATURE_DEFAULTS[tier]?.[flag];
  return typeof v === 'boolean' ? v : undefined;
}

/**
 * All defined feature flag keys (stable iteration order).
 */
export const ALL_FEATURE_FLAGS = Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlag[];

/**
 * Explicit value from settings JSON, or `undefined` if the key is absent (inherit tier / global).
 */
export function getFeatureFlagExplicitOverride(
  settings: Record<string, unknown> | null | undefined,
  flag: FeatureFlag
): boolean | undefined {
  if (!settings || typeof settings !== 'object') return undefined;
  if (!(flag in settings)) return undefined;
  return Boolean(settings[flag]);
}

/**
 * Resolved value when ignoring per-tenant settings (tier + global defaults only).
 */
export function resolveFeatureFlagForTier(
  subscriptionTier: string | null | undefined,
  flag: FeatureFlag
): boolean {
  const tier = normalizeSubscriptionTier(subscriptionTier);
  const fromTier = tierDefaultForFlag(tier, flag);
  if (typeof fromTier === 'boolean') return fromTier;
  return FEATURE_FLAG_DEFAULTS[flag]?.defaultEnabled ?? false;
}

/** Explicit `{ flag: enabled }` map for the tier (e.g. seed `tenants.settings` on create). */
export function buildTierFeatureSettingsSnapshot(
  subscriptionTier: string | null | undefined
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const flag of ALL_FEATURE_FLAGS) {
    out[flag] = resolveFeatureFlagForTier(subscriptionTier, flag);
  }
  return out;
}

/**
 * Check if a feature is enabled for a tenant.
 * Precedence: explicit `settings[flag]` → tier default (if mapped) → `FEATURE_FLAG_DEFAULTS`.
 */
export function isFeatureEnabled(tenant: TenantDetails | null | undefined, flag: FeatureFlag): boolean {
  if (!tenant) return false;

  if (tenant.settings && typeof tenant.settings === 'object') {
    const settings = tenant.settings as Record<string, unknown>;
    if (flag in settings) {
      return Boolean(settings[flag]);
    }
  }

  const fromTier = tierDefaultForFlag(normalizeSubscriptionTier(tenant.subscription_tier), flag);
  if (typeof fromTier === 'boolean') return fromTier;

  return FEATURE_FLAG_DEFAULTS[flag]?.defaultEnabled ?? false;
}

/**
 * Get feature flag info
 */
export function getFeatureFlagInfo(flag: FeatureFlag): FeatureFlagInfo {
  return FEATURE_FLAG_DEFAULTS[flag] || {
    flag,
    label: flag,
    description: `Feature: ${flag}`,
    defaultEnabled: false,
  };
}

/**
 * Get all available feature flags with their current status
 */
export function getAllFeatureFlags(tenant: TenantDetails | null | undefined): Array<FeatureFlagInfo & { enabled: boolean }> {
  return Object.entries(FEATURE_FLAG_DEFAULTS).map(([, info]) => ({
    ...info,
    enabled: isFeatureEnabled(tenant, info.flag),
  }));
}
