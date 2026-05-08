-- Fix INSERT/UPDATE/DELETE RLS for product_list_saved_views:
-- Platform super-admins browse arbitrary workspaces (effectiveTenantId) while their
-- user_profiles row may point at a different tenant — the old policy only allowed
-- tenant_id IN (user_profiles), so saves failed with "violates row-level security".
-- Align with category_* policies: OR is_tenants_platform_super_admin().
-- Also block writes during read-only impersonation (same as customers / navigation).

DROP POLICY IF EXISTS product_list_saved_views_select ON public.product_list_saved_views;
CREATE POLICY product_list_saved_views_select ON public.product_list_saved_views
  FOR SELECT
  USING (
    (
      tenant_id IN (
        SELECT up.tenant_id
        FROM public.user_profiles up
        WHERE up.user_id = (SELECT auth.uid())
      )
      AND owner_user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS product_list_saved_views_insert ON public.product_list_saved_views;
CREATE POLICY product_list_saved_views_insert ON public.product_list_saved_views
  FOR INSERT
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    AND NOT (SELECT public.app_impersonation_write_blocked())
    AND (
      tenant_id IN (
        SELECT up.tenant_id
        FROM public.user_profiles up
        WHERE up.user_id = (SELECT auth.uid())
      )
      OR public.is_tenants_platform_super_admin()
    )
  );

DROP POLICY IF EXISTS product_list_saved_views_update ON public.product_list_saved_views;
CREATE POLICY product_list_saved_views_update ON public.product_list_saved_views
  FOR UPDATE
  USING (
    owner_user_id = (SELECT auth.uid())
    AND NOT (SELECT public.app_impersonation_write_blocked())
    AND (
      tenant_id IN (
        SELECT up.tenant_id
        FROM public.user_profiles up
        WHERE up.user_id = (SELECT auth.uid())
      )
      OR public.is_tenants_platform_super_admin()
    )
  )
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    AND NOT (SELECT public.app_impersonation_write_blocked())
    AND (
      tenant_id IN (
        SELECT up.tenant_id
        FROM public.user_profiles up
        WHERE up.user_id = (SELECT auth.uid())
      )
      OR public.is_tenants_platform_super_admin()
    )
  );

DROP POLICY IF EXISTS product_list_saved_views_delete ON public.product_list_saved_views;
CREATE POLICY product_list_saved_views_delete ON public.product_list_saved_views
  FOR DELETE
  USING (
    owner_user_id = (SELECT auth.uid())
    AND NOT (SELECT public.app_impersonation_write_blocked())
    AND (
      tenant_id IN (
        SELECT up.tenant_id
        FROM public.user_profiles up
        WHERE up.user_id = (SELECT auth.uid())
      )
      OR public.is_tenants_platform_super_admin()
    )
  );
