import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Service-role client for server routes only. Never import in client components.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function impersonationDefaultReadOnly(): boolean {
  const v = process.env.IMPERSONATION_DEFAULT_READ_ONLY;
  if (v === 'false') return false;
  if (v === 'true') return true;
  return process.env.NODE_ENV === 'production';
}
