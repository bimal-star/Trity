-- Align role_resource_grants.role CHECK with app TenantRole (member, admin, super_admin).
-- Normalize template grant roles during provision_tenant_from_template (mirror lib/permissions normalizeTenantRole).

DO $$
BEGIN
  IF to_regclass('public.role_resource_grants') IS NOT NULL THEN
    ALTER TABLE public.role_resource_grants DROP CONSTRAINT IF EXISTS role_resource_grants_role_check;

    -- Backfill canonical roles so ADD CONSTRAINT succeeds (legacy casing / aliases).
    UPDATE public.role_resource_grants r
    SET role = v.canon
    FROM (
      SELECT
        ctid,
        CASE replace(regexp_replace(lower(trim(role::text)), E'\\s+', '_', 'g'), '-', '_')
          WHEN 'member' THEN 'member'
          WHEN 'admin' THEN 'admin'
          WHEN 'administrator' THEN 'admin'
          WHEN 'tenant_admin' THEN 'admin'
          WHEN 'super_admin' THEN 'super_admin'
          WHEN 'superadmin' THEN 'super_admin'
          WHEN 'super_administrator' THEN 'super_admin'
          WHEN 'platform_admin' THEN 'super_admin'
          WHEN 'global_admin' THEN 'super_admin'
          WHEN 'system_admin' THEN 'super_admin'
          ELSE 'member'
        END AS canon
      FROM public.role_resource_grants
    ) v
    WHERE r.ctid = v.ctid
      AND r.role IS DISTINCT FROM v.canon;

    -- Normalizing can merge distinct legacy rows into the same (tenant_id, resource_id, role).
    DELETE FROM public.role_resource_grants d
    USING public.role_resource_grants k
    WHERE d.tenant_id = k.tenant_id
      AND d.resource_id = k.resource_id
      AND d.role = k.role
      AND d.ctid > k.ctid;

    ALTER TABLE public.role_resource_grants ADD CONSTRAINT role_resource_grants_role_check
      CHECK (role IN ('member', 'admin', 'super_admin'));
  END IF;
END $$;

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
      mapped.role_out,
      mapped.new_res,
      mapped.allowed_actions
    FROM (
      SELECT
        rm.new_res,
        rrg.allowed_actions,
        CASE replace(regexp_replace(lower(trim(rrg.role::text)), E'\\s+', '_', 'g'), '-', '_')
          WHEN 'member' THEN 'member'
          WHEN 'admin' THEN 'admin'
          WHEN 'administrator' THEN 'admin'
          WHEN 'tenant_admin' THEN 'admin'
          WHEN 'super_admin' THEN 'super_admin'
          WHEN 'superadmin' THEN 'super_admin'
          WHEN 'super_administrator' THEN 'super_admin'
          WHEN 'platform_admin' THEN 'super_admin'
          WHEN 'global_admin' THEN 'super_admin'
          WHEN 'system_admin' THEN 'super_admin'
          ELSE NULL
        END AS role_out
      FROM public.role_resource_grants rrg
      JOIN _provision_res_map rm ON rrg.resource_id = rm.old_res
      WHERE rrg.tenant_id = p_template_tenant
    ) mapped
    WHERE mapped.role_out IS NOT NULL
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