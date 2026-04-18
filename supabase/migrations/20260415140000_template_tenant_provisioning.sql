-- Template tenant provisioning: clone config (allowlist only) from a source tenant to a new tenant.
-- Business data (products, customers, orders, etc.) is NEVER copied — only navigation + permission catalog.
--
-- ALLOWLIST (this migration): public.navigation, public.permission_resources, public.role_resource_grants,
--   public.permission_actions (when those tables exist).
-- DENYLIST / never clone: all transactional tables, user_profiles, user_resource_grants, group_resource_grants,
--   user_module_access, group_module_access, group_members, audit content, etc.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.is_template IS
  'Marks the developer/golden tenant used as default source for provision_tenant_from_template.';

CREATE INDEX IF NOT EXISTS idx_tenants_is_template ON public.tenants (is_template) WHERE is_template = true;

-- ---------------------------------------------------------------------------
-- Platform super admin: cross-tenant module / grant writes (configure tenant X from dev workspace)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_module_access'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS user_module_access_platform_super_admin ON public.user_module_access
    $p$;
    EXECUTE $p$
      CREATE POLICY user_module_access_platform_super_admin ON public.user_module_access
        FOR ALL
        USING (public.is_tenants_platform_super_admin())
        WITH CHECK (public.is_tenants_platform_super_admin())
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'group_module_access'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS group_module_access_platform_super_admin ON public.group_module_access
    $p$;
    EXECUTE $p$
      CREATE POLICY group_module_access_platform_super_admin ON public.group_module_access
        FOR ALL
        USING (public.is_tenants_platform_super_admin())
        WITH CHECK (public.is_tenants_platform_super_admin())
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_resource_grants'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS user_resource_grants_platform_super_admin ON public.user_resource_grants
    $p$;
    EXECUTE $p$
      CREATE POLICY user_resource_grants_platform_super_admin ON public.user_resource_grants
        FOR ALL
        USING (public.is_tenants_platform_super_admin())
        WITH CHECK (public.is_tenants_platform_super_admin())
    $p$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'group_resource_grants'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS group_resource_grants_platform_super_admin ON public.group_resource_grants
    $p$;
    EXECUTE $p$
      CREATE POLICY group_resource_grants_platform_super_admin ON public.group_resource_grants
        FOR ALL
        USING (public.is_tenants_platform_super_admin())
        WITH CHECK (public.is_tenants_platform_super_admin())
    $p$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Clone navigation + remap permission catalog: resource_key uses nav.<navigation.id>
-- Module identity strategy: new UUIDs per tenant; resource_key updated to nav.<new_id> in same transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_tenant_from_template(
  p_new_tenant uuid,
  p_template_tenant uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nav_inserted int := 0;
  v_pr_inserted int := 0;
  v_rrg_inserted int := 0;
  v_pa_inserted int := 0;
  v_supplemented int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT public.is_tenants_platform_super_admin() THEN
    RAISE EXCEPTION 'only platform super admin can provision from template';
  END IF;

  IF p_new_tenant = p_template_tenant THEN
    RAISE EXCEPTION 'new tenant and template tenant must differ';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_new_tenant) THEN
    RAISE EXCEPTION 'new tenant not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_template_tenant) THEN
    RAISE EXCEPTION 'template tenant not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.navigation WHERE tenant_id = p_new_tenant LIMIT 1) THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'target_tenant_already_has_navigation'
    );
  END IF;

  INSERT INTO public.navigation (
    tenant_id,
    label,
    path,
    "position",
    is_enabled,
    is_deleted,
    metadata,
    version
  )
  SELECT
    p_new_tenant,
    n.label,
    n.path,
    n."position",
    n.is_enabled,
    n.is_deleted,
    n.metadata,
    n.version
  FROM public.navigation n
  WHERE n.tenant_id = p_template_tenant;

  GET DIAGNOSTICS v_nav_inserted = ROW_COUNT;

  IF to_regclass('public.permission_resources') IS NULL THEN
    RETURN jsonb_build_object(
      'navigation_rows', v_nav_inserted,
      'permission_resources_rows', 0,
      'role_resource_grants_rows', 0,
      'permission_actions_rows', 0,
      'catalog_supplemented_nav_rows', 0,
      'note', 'permission_resources table missing; navigation only'
    );
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _provision_nav_map (
    old_id uuid NOT NULL,
    new_id uuid NOT NULL,
    PRIMARY KEY (old_id)
  ) ON COMMIT DROP;

  TRUNCATE _provision_nav_map;

  INSERT INTO _provision_nav_map (old_id, new_id)
  SELECT t.id, n.id
  FROM public.navigation t
  JOIN public.navigation n
    ON n.tenant_id = p_new_tenant
   AND t.tenant_id = p_template_tenant
   AND t."position"::text = n."position"::text
   AND t.label = n.label;

  INSERT INTO public.permission_resources (
    tenant_id,
    resource_key,
    display_name,
    resource_type
  )
  SELECT
    p_new_tenant,
    'nav.' || m.new_id::text,
    pr.display_name,
    pr.resource_type
  FROM public.permission_resources pr
  JOIN _provision_nav_map m
    ON pr.resource_key = ('nav.' || m.old_id::text)
  WHERE pr.tenant_id = p_template_tenant;

  GET DIAGNOSTICS v_pr_inserted = ROW_COUNT;

  CREATE TEMP TABLE IF NOT EXISTS _provision_res_map (
    old_res uuid NOT NULL,
    new_res uuid NOT NULL,
    PRIMARY KEY (old_res)
  ) ON COMMIT DROP;

  TRUNCATE _provision_res_map;

  INSERT INTO _provision_res_map (old_res, new_res)
  SELECT pro.id, pne.id
  FROM public.permission_resources pro
  JOIN _provision_nav_map m ON pro.resource_key = ('nav.' || m.old_id::text)
  JOIN public.permission_resources pne
    ON pne.tenant_id = p_new_tenant
   AND pne.resource_key = ('nav.' || m.new_id::text)
  WHERE pro.tenant_id = p_template_tenant;

  IF to_regclass('public.role_resource_grants') IS NOT NULL THEN
    INSERT INTO public.role_resource_grants (
      tenant_id,
      role,
      resource_id,
      allowed_actions
    )
    SELECT
      p_new_tenant,
      rrg.role,
      rm.new_res,
      rrg.allowed_actions
    FROM public.role_resource_grants rrg
    JOIN _provision_res_map rm ON rrg.resource_id = rm.old_res
    WHERE rrg.tenant_id = p_template_tenant
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_rrg_inserted = ROW_COUNT;
  END IF;

  IF to_regclass('public.permission_actions') IS NOT NULL THEN
    INSERT INTO public.permission_actions (resource_id, action_key)
    SELECT rm.new_res, pa.action_key
    FROM public.permission_actions pa
    JOIN _provision_res_map rm ON pa.resource_id = rm.old_res
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_pa_inserted = ROW_COUNT;
  END IF;

  -- Default catalog for any navigation row without a template permission_resources (sparse template)
  INSERT INTO public.permission_resources (tenant_id, resource_key, display_name, resource_type)
  SELECT
    p_new_tenant,
    'nav.' || nv.id::text,
    COALESCE(NULLIF(trim(nv.label), ''), nv.id::text),
    'module'
  FROM public.navigation nv
  WHERE nv.tenant_id = p_new_tenant
    AND NOT EXISTS (
      SELECT 1
      FROM public.permission_resources pr
      WHERE pr.tenant_id = p_new_tenant
        AND pr.resource_key = ('nav.' || nv.id::text)
    );

  GET DIAGNOSTICS v_supplemented = ROW_COUNT;

  IF to_regclass('public.role_resource_grants') IS NOT NULL THEN
    INSERT INTO public.role_resource_grants (tenant_id, role, resource_id, allowed_actions)
    SELECT p_new_tenant, r.role, pr.id, r.actions
    FROM public.permission_resources pr
    CROSS JOIN (
      VALUES
        ('member', ARRAY['read']::text[]),
        ('admin', ARRAY['read', 'write']::text[]),
        ('super_admin', ARRAY['read', 'write']::text[])
    ) AS r(role, actions)
    WHERE pr.tenant_id = p_new_tenant
      AND pr.resource_type = 'module'
      AND pr.resource_key LIKE 'nav.%'
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_resource_grants x
        WHERE x.tenant_id = p_new_tenant
          AND x.resource_id = pr.id
          AND x.role = r.role
      )
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.permission_actions') IS NOT NULL THEN
    INSERT INTO public.permission_actions (resource_id, action_key)
    SELECT pr.id, ak.action_key
    FROM public.permission_resources pr
    CROSS JOIN (VALUES ('read'), ('write')) AS ak(action_key)
    WHERE pr.tenant_id = p_new_tenant
      AND pr.resource_type = 'module'
      AND pr.resource_key LIKE 'nav.%'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'navigation_rows', v_nav_inserted,
    'permission_resources_rows', v_pr_inserted,
    'role_resource_grants_rows', v_rrg_inserted,
    'permission_actions_rows', v_pa_inserted,
    'catalog_supplemented_nav_rows', v_supplemented
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_tenant_from_template(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_tenant_from_template(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.provision_tenant_from_template(uuid, uuid) IS
  'Idempotent: copies allowlisted config from template tenant. Skips if target already has navigation.';
