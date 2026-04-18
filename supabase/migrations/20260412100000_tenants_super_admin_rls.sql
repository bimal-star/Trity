-- Super admins manage all tenant rows (admin UI: list / create / update).
-- tenants_insert was dropped in 20260131110000_consolidate_duplicate_policies.sql and never replaced,
-- so INSERT always failed under RLS for everyone.
--
-- Aligns with app isSuperAdminSession(): user_profiles.role and/or JWT app_metadata / user_metadata role.

DROP POLICY IF EXISTS "tenants_select_super_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_super_admin" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_super_admin" ON public.tenants;

CREATE OR REPLACE FUNCTION public.is_tenants_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH jwt_row AS (SELECT (SELECT auth.jwt()) AS payload),
  norm AS (
    SELECT
      lower(replace(replace(trim(both FROM COALESCE(jwt_row.payload->'app_metadata'->>'role', '')), ' ', '_'), '-', '_')) AS app_r,
      lower(replace(replace(trim(both FROM COALESCE(jwt_row.payload->'user_metadata'->>'role', '')), ' ', '_'), '-', '_')) AS user_r
    FROM jwt_row
  )
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM norm
      WHERE norm.app_r IN (
        'super_admin',
        'superadmin',
        'super_administrator',
        'platform_admin',
        'global_admin',
        'system_admin'
      )
      OR norm.user_r IN (
        'super_admin',
        'superadmin',
        'super_administrator',
        'platform_admin',
        'global_admin',
        'system_admin'
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_tenants_platform_super_admin() TO authenticated;

CREATE POLICY "tenants_select_super_admin" ON public.tenants
  FOR SELECT
  USING (public.is_tenants_platform_super_admin());

CREATE POLICY "tenants_insert_super_admin" ON public.tenants
  FOR INSERT
  WITH CHECK (public.is_tenants_platform_super_admin());

CREATE POLICY "tenants_update_super_admin" ON public.tenants
  FOR UPDATE
  USING (public.is_tenants_platform_super_admin())
  WITH CHECK (public.is_tenants_platform_super_admin());
