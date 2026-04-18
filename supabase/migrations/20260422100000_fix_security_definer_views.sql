-- =============================================================================
-- Fix SECURITY DEFINER views flagged by Supabase security advisor
-- =============================================================================
--
-- Three issues resolved:
--
-- 1. orphaned_user_profiles — untracked debug view (not in any prior migration).
--    Was SECURITY DEFINER and granted to anon role, exposing auth.users.email
--    to unauthenticated requests. Dropped entirely; not used by the application.
--
-- 2. vw_products_full — created without security_invoker, so RLS was evaluated
--    for the view owner (postgres superuser) rather than the querying user,
--    bypassing tenant-scoped row-level security policies.
--
-- 3. vw_bom_costing — same issue as vw_products_full.
--
-- After applying: run `npm run generate:types` to remove the stale
-- orphaned_user_profiles entry from types/database.ts.
-- =============================================================================

-- 1. Drop the untracked debug view
DROP VIEW IF EXISTS public.orphaned_user_profiles;

-- 2. Enforce querying-user RLS on product and BOM views
ALTER VIEW public.vw_products_full SET (security_invoker = true);
ALTER VIEW public.vw_bom_costing  SET (security_invoker = true);
