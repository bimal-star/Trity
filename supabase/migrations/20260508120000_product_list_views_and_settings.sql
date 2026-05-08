-- Per-user saved product list views + workspace default list definition.
-- RLS: saved views owned by auth.uid(); workspace settings readable by tenant, writable by admins.

-- -----------------------------------------------------------------------------
-- 1. product_list_saved_views
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_list_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_personal_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_list_saved_views_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_product_list_saved_views_tenant_owner
  ON public.product_list_saved_views(tenant_id, owner_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS product_list_saved_views_unique_name_per_owner
  ON public.product_list_saved_views(tenant_id, owner_user_id, lower(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS product_list_saved_views_one_personal_default
  ON public.product_list_saved_views(tenant_id, owner_user_id)
  WHERE is_personal_default = true;

CREATE OR REPLACE FUNCTION public.product_list_saved_views_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_list_saved_views_before_update ON public.product_list_saved_views;
CREATE TRIGGER product_list_saved_views_before_update
  BEFORE UPDATE ON public.product_list_saved_views
  FOR EACH ROW
  EXECUTE FUNCTION public.product_list_saved_views_set_updated_at();

ALTER TABLE public.product_list_saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_list_saved_views_select ON public.product_list_saved_views;
CREATE POLICY product_list_saved_views_select ON public.product_list_saved_views
  FOR SELECT
  USING (
    (
      tenant_id IN (
        SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
      )
      AND owner_user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS product_list_saved_views_insert ON public.product_list_saved_views;
CREATE POLICY product_list_saved_views_insert ON public.product_list_saved_views
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    AND owner_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS product_list_saved_views_update ON public.product_list_saved_views;
CREATE POLICY product_list_saved_views_update ON public.product_list_saved_views
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    AND owner_user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    AND owner_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS product_list_saved_views_delete ON public.product_list_saved_views;
CREATE POLICY product_list_saved_views_delete ON public.product_list_saved_views
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    AND owner_user_id = (SELECT auth.uid())
  );

COMMENT ON TABLE public.product_list_saved_views IS
  'User-scoped named product list views (columns, filters, sort) for the Products page.';

-- -----------------------------------------------------------------------------
-- 2. tenant_products_list_settings (workspace default definition)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_products_list_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  workspace_default_definition jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION public.tenant_products_list_settings_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_products_list_settings_before_update ON public.tenant_products_list_settings;
CREATE TRIGGER tenant_products_list_settings_before_update
  BEFORE UPDATE ON public.tenant_products_list_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_products_list_settings_set_updated_at();

ALTER TABLE public.tenant_products_list_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_products_list_settings_select ON public.tenant_products_list_settings;
CREATE POLICY tenant_products_list_settings_select ON public.tenant_products_list_settings
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS tenant_products_list_settings_insert ON public.tenant_products_list_settings;
CREATE POLICY tenant_products_list_settings_insert ON public.tenant_products_list_settings
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    AND (SELECT up.role::text FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid()) LIMIT 1)
      IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS tenant_products_list_settings_update ON public.tenant_products_list_settings;
CREATE POLICY tenant_products_list_settings_update ON public.tenant_products_list_settings
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    AND (SELECT up.role::text FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid()) LIMIT 1)
      IN ('admin', 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    AND (SELECT up.role::text FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid()) LIMIT 1)
      IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS tenant_products_list_settings_delete ON public.tenant_products_list_settings;
CREATE POLICY tenant_products_list_settings_delete ON public.tenant_products_list_settings
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid())
    )
    AND (SELECT up.role::text FROM public.user_profiles up WHERE up.user_id = (SELECT auth.uid()) LIMIT 1)
      IN ('admin', 'super_admin')
  );

COMMENT ON TABLE public.tenant_products_list_settings IS
  'Workspace-level default Products list view (JSON). Writable by tenant admins only.';
