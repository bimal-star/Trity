-- RLS policies call is_tenants_platform_super_admin() while evaluating row access.
-- As INVOKER, the profile subquery was subject to the same RLS cycle; use SECURITY DEFINER
-- so the function reads user_profiles reliably for the auth.uid() row (matches JWT branch safety).
-- Body kept in sync with 20260415120000_platform_super_admin_workspace_select.sql.

CREATE OR REPLACE FUNCTION public.is_tenants_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH jwt_row AS (SELECT (SELECT auth.jwt()) AS payload),
  norm AS (
    SELECT
      lower(replace(replace(trim(both FROM COALESCE(jwt_row.payload->'app_metadata'->>'role', '')), ' ', '_'), '-', '_')) AS app_r,
      lower(replace(replace(trim(both FROM COALESCE(jwt_row.payload->'user_metadata'->>'role', '')), ' ', '_'), '-', '_')) AS user_r
    FROM jwt_row
  ),
  profile_norm AS (
    SELECT
      lower(replace(replace(trim(both FROM COALESCE(up.role::text, '')), ' ', '_'), '-', '_')) AS r
    FROM public.user_profiles up
    WHERE up.user_id = (SELECT auth.uid())
  )
  SELECT
    EXISTS (
      SELECT 1
      FROM profile_norm pn
      WHERE pn.r IN (
        'super_admin',
        'superadmin',
        'super_administrator',
        'platform_admin',
        'global_admin',
        'system_admin'
      )
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
