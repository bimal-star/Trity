-- Allow platform super admins to read navigation for any tenant (workspace / "view as" mode).
-- Requires public.is_tenants_platform_super_admin() from migration 20260412100000_tenants_super_admin_rls.sql.
-- Other tenant-scoped tables still use normal RLS; extend with similar policies if queries fail while impersonating.

DROP POLICY IF EXISTS "navigation_select_platform_super_admin" ON public.navigation;

CREATE POLICY "navigation_select_platform_super_admin" ON public.navigation
  FOR SELECT
  USING (public.is_tenants_platform_super_admin());
