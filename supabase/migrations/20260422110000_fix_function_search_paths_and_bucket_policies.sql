-- =============================================================================
-- Fix mutable search_path on functions + overly-broad public bucket policies
-- Resolves Supabase security advisor warnings (2026-04-17 scan)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Functions with fixed search_path
--
-- Without SET search_path = public, a user with CREATE on any schema could
-- shadow system or public functions via search_path injection.
-- -----------------------------------------------------------------------------

-- Tracked functions (known signatures from migrations)
ALTER FUNCTION public.assign_group_from_invite()        SET search_path = public;
ALTER FUNCTION public.create_tenant_schema(uuid, text)  SET search_path = public;

-- Untracked functions (created directly in DB — signatures resolved at runtime)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
    AND    p.proname IN (
             'navigation_set_stable_key',
             'touch_permission_updated_at',
             'update_timestamp',
             'validate_user_exists'
           )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      r.proname, r.args
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Public storage buckets — remove broad SELECT policies
--
-- Public buckets allow GET by URL without any policy. The SELECT policy only
-- adds the ability to LIST all files via the API, which exposes the full object
-- tree to any caller (including anon). The app never calls .list() on these
-- buckets so the policy provides no value and the listing risk is removed.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "product_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "customer_logos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "supplier_logos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "warehouse_logos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "tenant_logos_public_read"    ON storage.objects;

-- -----------------------------------------------------------------------------
-- Note: "Leaked Password Protection" warning must be resolved in the Supabase
-- dashboard: Authentication → Settings → toggle "Protect against leaked
-- passwords" (checks HaveIBeenPwned.org on sign-up / password change).
-- -----------------------------------------------------------------------------
