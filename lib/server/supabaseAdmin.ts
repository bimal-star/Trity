import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';
import { getSupabaseServiceRoleKey } from '@/lib/server/loadServerSecrets';

/**
 * Service-role client for server routes only. Never import in client components.
 */
export function createSupabaseAdmin() {
  const pub = getSupabaseUrlAndAnonKey();
  const url = pub?.url;
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      'Missing Supabase service role: set SUPABASE_SERVICE_ROLE_KEY in .env.local or .env.credentials, then restart `npm run dev`.'
    );
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
