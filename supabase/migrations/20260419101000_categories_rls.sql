-- Tenant-scoped RLS for categories (was missing from business_core batch).

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bc_categories_select ON public.categories;
DROP POLICY IF EXISTS bc_categories_insert ON public.categories;
DROP POLICY IF EXISTS bc_categories_update ON public.categories;
DROP POLICY IF EXISTS bc_categories_delete ON public.categories;
DROP POLICY IF EXISTS bc_categories_select_platform_super_admin ON public.categories;

CREATE POLICY bc_categories_select ON public.categories FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_categories_insert ON public.categories FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_categories_update ON public.categories FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_categories_delete ON public.categories FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_categories_select_platform_super_admin ON public.categories FOR SELECT
  USING (public.is_tenants_platform_super_admin());
