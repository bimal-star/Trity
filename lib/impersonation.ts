'use client';

import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/profile';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidTenantId(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Effective tenant for RLS and UI: super_admin JWT impersonation overrides home tenant.
 */
export function getEffectiveTenantIdFromSession(
  user: User,
  profile: UserProfile | null
): string | null {
  if (profile?.role === 'super_admin') {
    const imp = user.app_metadata?.impersonate_tenant_id;
    if (isValidTenantId(imp)) return imp;
  }
  let tid: unknown = user.user_metadata?.tenant_id;
  if (isValidTenantId(tid)) return tid;
  tid = user.app_metadata?.tenant_id;
  if (isValidTenantId(tid)) return tid;
  if (profile?.tenant_id && isValidTenantId(profile.tenant_id)) return profile.tenant_id;
  return null;
}

export function getImpersonationFromSession(user: User): {
  targetTenantId: string;
  readOnly: boolean;
} | null {
  const tid = user.app_metadata?.impersonate_tenant_id;
  if (!isValidTenantId(tid)) return null;
  const ro = user.app_metadata?.impersonate_read_only;
  const readOnly = ro !== 'false';
  return { targetTenantId: tid, readOnly };
}

async function authHeader(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return `Bearer ${session.access_token}`;
}

export async function startTenantImpersonation(
  tenantId: string,
  options?: { readOnly?: boolean }
): Promise<void> {
  const hdr = await authHeader();
  const res = await fetch('/api/impersonation/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: hdr,
    },
    body: JSON.stringify({
      tenantId,
      readOnly: options?.readOnly,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error || res.statusText || 'Failed to start impersonation');
  }
  const { error } = await supabase.auth.refreshSession();
  if (error) throw error;
}

export async function endTenantImpersonation(): Promise<void> {
  const hdr = await authHeader();
  const res = await fetch('/api/impersonation/end', {
    method: 'POST',
    headers: { Authorization: hdr },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error || res.statusText || 'Failed to end impersonation');
  }
  const { error } = await supabase.auth.refreshSession();
  if (error) throw error;
}

export function isDevAutoImpersonateEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTO_IMPERSONATE === 'true';
}
