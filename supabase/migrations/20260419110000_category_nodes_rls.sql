-- RLS policies for the new unlimited-tier category tables.
-- Includes super-admin bypass so effectiveTenantId writes succeed across tenants.

-- ── category_tiers ────────────────────────────────────────────────────────────
ALTER TABLE public.category_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bc_category_tiers_select ON public.category_tiers;
DROP POLICY IF EXISTS bc_category_tiers_insert ON public.category_tiers;
DROP POLICY IF EXISTS bc_category_tiers_update ON public.category_tiers;
DROP POLICY IF EXISTS bc_category_tiers_delete ON public.category_tiers;
DROP POLICY IF EXISTS bc_category_tiers_select_super_admin ON public.category_tiers;

CREATE POLICY bc_category_tiers_select ON public.category_tiers FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_category_tiers_insert ON public.category_tiers FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_category_tiers_update ON public.category_tiers FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_category_tiers_delete ON public.category_tiers FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

-- ── category_nodes ────────────────────────────────────────────────────────────
ALTER TABLE public.category_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bc_category_nodes_select ON public.category_nodes;
DROP POLICY IF EXISTS bc_category_nodes_insert ON public.category_nodes;
DROP POLICY IF EXISTS bc_category_nodes_update ON public.category_nodes;
DROP POLICY IF EXISTS bc_category_nodes_delete ON public.category_nodes;
DROP POLICY IF EXISTS bc_category_nodes_select_super_admin ON public.category_nodes;

CREATE POLICY bc_category_nodes_select ON public.category_nodes FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_category_nodes_insert ON public.category_nodes FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_category_nodes_update ON public.category_nodes FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_category_nodes_delete ON public.category_nodes FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

-- ── product_category_assignments ──────────────────────────────────────────────
ALTER TABLE public.product_category_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bc_pca_select ON public.product_category_assignments;
DROP POLICY IF EXISTS bc_pca_insert ON public.product_category_assignments;
DROP POLICY IF EXISTS bc_pca_update ON public.product_category_assignments;
DROP POLICY IF EXISTS bc_pca_delete ON public.product_category_assignments;
DROP POLICY IF EXISTS bc_pca_select_super_admin ON public.product_category_assignments;

CREATE POLICY bc_pca_select ON public.product_category_assignments FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_pca_insert ON public.product_category_assignments FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_pca_update ON public.product_category_assignments FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_pca_delete ON public.product_category_assignments FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );
