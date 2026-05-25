import { describe, expect, it } from 'vitest';
import {
  TENANT_INACTIVE_MESSAGE,
  evaluateTenantAccess,
  isTenantInactiveError,
} from '@/lib/tenantAccess';

describe('evaluateTenantAccess', () => {
  it('allows platform super admins when tenant is inactive', () => {
    expect(evaluateTenantAccess(false, true)).toEqual({ allowed: true });
  });

  it('blocks regular users when tenant is inactive', () => {
    expect(evaluateTenantAccess(false, false)).toEqual({
      allowed: false,
      message: TENANT_INACTIVE_MESSAGE,
    });
  });

  it('allows regular users when tenant is active or unknown', () => {
    expect(evaluateTenantAccess(true, false)).toEqual({ allowed: true });
    expect(evaluateTenantAccess(null, false)).toEqual({ allowed: true });
    expect(evaluateTenantAccess(undefined, false)).toEqual({ allowed: true });
  });
});

describe('isTenantInactiveError', () => {
  it('matches inactive tenant message only', () => {
    expect(isTenantInactiveError(TENANT_INACTIVE_MESSAGE)).toBe(true);
    expect(isTenantInactiveError('other')).toBe(false);
    expect(isTenantInactiveError(null)).toBe(false);
  });
});
