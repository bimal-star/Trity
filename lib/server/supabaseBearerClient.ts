import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';

/** Anon client scoped to the caller JWT (same project as the browser). */
export function createSupabaseBearerClient(token: string) {
  const env = getSupabaseUrlAndAnonKey();
  if (!env) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient<Database>(env.url, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
