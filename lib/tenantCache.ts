/** localStorage key for TenantContext fast boot (must stay in sync with historical value). */
export const TENANT_CACHE_KEY = 'trity_tenant_cache';

export function getTenantCache(): { userId: string; tenant_id: string } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TENANT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string; tenant_id?: string };
    if (typeof parsed?.userId === 'string' && typeof parsed?.tenant_id === 'string')
      return parsed as { userId: string; tenant_id: string };
    return null;
  } catch {
    return null;
  }
}

export function setTenantCache(userId: string, tenant_id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(TENANT_CACHE_KEY, JSON.stringify({ userId, tenant_id }));
  } catch {
    /* ignore */
  }
}

export function clearTenantCache(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(TENANT_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidTenantId(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}
