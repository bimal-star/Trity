-- Allow platform super admins to insert/update/delete navigation for any tenant
-- (tenant detail / provisioning). SELECT already covered by navigation_select_platform_super_admin.

DROP POLICY IF EXISTS "navigation_insert_platform_super_admin" ON public.navigation;
CREATE POLICY "navigation_insert_platform_super_admin" ON public.navigation
  FOR INSERT
  WITH CHECK (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS "navigation_update_platform_super_admin" ON public.navigation;
CREATE POLICY "navigation_update_platform_super_admin" ON public.navigation
  FOR UPDATE
  USING (public.is_tenants_platform_super_admin())
  WITH CHECK (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS "navigation_delete_platform_super_admin" ON public.navigation;
CREATE POLICY "navigation_delete_platform_super_admin" ON public.navigation
  FOR DELETE
  USING (public.is_tenants_platform_super_admin());
