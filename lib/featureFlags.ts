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
  | 'custom_domain';

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
};

/**
 * Check if a feature is enabled for a tenant
 * @param tenant - Tenant details with settings
 * @param flag - Feature flag to check
 * @returns true if feature is enabled
 */
export function isFeatureEnabled(tenant: TenantDetails | null | undefined, flag: FeatureFlag): boolean {
  if (!tenant) return false;

  // Check tenant settings for feature flag
  if (tenant.settings && typeof tenant.settings === 'object') {
    const settings = tenant.settings as Record<string, unknown>;
    if (flag in settings) {
      return Boolean(settings[flag]);
    }
  }

  // Fall back to default
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
