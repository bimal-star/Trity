/**
 * Supabase project URL + anon key for server code (API routes, Route Handlers).
 * Prefer NEXT_PUBLIC_* (standard for this app’s browser client); also accept
 * non-prefixed names so deployments can supply runtime env without relying on
 * build-time inlining of NEXT_PUBLIC_ variables.
 */
export function getSupabaseUrlAndAnonKey(): { url: string; anonKey: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    '';
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
