-- Merge missing navigation (and permission catalog) from template tenant into an existing tenant.
-- Used when provision_tenant_from_template skips because the target already has navigation rows.

CREATE OR REPLACE FUNCTION public.sync_tenant_navigation_from_template(
  p_target_tenant uuid,
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
    RAISE EXCEPTION 'only platform super admin can sync navigation from template';
  END IF;

  IF p_target_tenant = p_template_tenant THEN
    RAISE EXCEPTION 'target tenant and template tenant must differ';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_target_tenant) THEN
    RAISE EXCEPTION 'target tenant not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_template_tenant) THEN
    RAISE EXCEPTION 'template tenant not found';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _sync_missing_template_nav (
    template_nav_id uuid NOT NULL PRIMARY KEY,
    label text NOT NULL,
    path text,
    position text NOT NULL,
    is_enabled boolean NOT NULL,
    is_deleted boolean NOT NULL,
    metadata jsonb,
    version integer
  ) ON COMMIT DROP;

  TRUNCATE _sync_missing_template_nav;

  INSERT INTO _sync_missing_template_nav (
    template_nav_id,
    label,
    path,
    position,
    is_enabled,
    is_deleted,
    metadata,
    version
  )
  SELECT
    t.id,
    t.label,
    t.path,
    t."position"::text,
    t.is_enabled,
    COALESCE(t.is_deleted, false),
    t.metadata,
    t.version
  FROM public.navigation t
  WHERE t.tenant_id = p_template_tenant
    AND COALESCE(t.is_deleted, false) = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.navigation n
      WHERE n.tenant_id = p_target_tenant
        AND COALESCE(n.is_deleted, false) = false
        AND (
          (t.path IS NOT NULL AND n.path = t.path)
          OR (
            t.path IS NULL
            AND n.path IS NULL
            AND n.label = t.label
            AND n."position"::text = t."position"::text
          )
        )
    );

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
    p_target_tenant,
    m.label,
    m.path,
    m.position,
    m.is_enabled,
    m.is_deleted,
    m.metadata,
    m.version
  FROM _sync_missing_template_nav m;

  GET DIAGNOSTICS v_nav_inserted = ROW_COUNT;

  IF v_nav_inserted = 0 THEN
    RETURN jsonb_build_object(
      'navigation_rows_inserted', 0,
      'permission_resources_rows', 0,
      'role_resource_grants_rows', 0,
      'permission_actions_rows', 0,
      'catalog_supplemented_nav_rows', 0,
      'note', 'target tenant navigation is already in sync with template'
    );
  END IF;

  IF to_regclass('public.permission_resources') IS NULL THEN
    RETURN jsonb_build_object(
      'navigation_rows_inserted', v_nav_inserted,
      'permission_resources_rows', 0,
      'role_resource_grants_rows', 0,
      'permission_actions_rows', 0,
      'catalog_supplemented_nav_rows', 0,
      'note', 'permission_resources table missing; navigation only'
    );
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _sync_nav_map (
    old_id uuid NOT NULL,
    new_id uuid NOT NULL,
    PRIMARY KEY (old_id)
  ) ON COMMIT DROP;

  TRUNCATE _sync_nav_map;

  INSERT INTO _sync_nav_map (old_id, new_id)
  SELECT m.template_nav_id, n.id
  FROM _sync_missing_template_nav m
  JOIN public.navigation n
    ON n.tenant_id = p_target_tenant
   AND n.label = m.label
   AND n."position"::text = m.position
   AND (
     (m.path IS NOT NULL AND n.path = m.path)
     OR (m.path IS NULL AND n.path IS NULL)
   );

  INSERT INTO public.permission_resources (
    tenant_id,
    resource_key,
    display_name,
    resource_type
  )
  SELECT
    p_target_tenant,
    'nav.' || sm.new_id::text,
    pr.display_name,
    pr.resource_type
  FROM public.permission_resources pr
  JOIN _sync_nav_map sm ON pr.resource_key = ('nav.' || sm.old_id::text)
  WHERE pr.tenant_id = p_template_tenant
    AND NOT EXISTS (
      SELECT 1
      FROM public.permission_resources existing
      WHERE existing.tenant_id = p_target_tenant
        AND existing.resource_key = ('nav.' || sm.new_id::text)
    );

  GET DIAGNOSTICS v_pr_inserted = ROW_COUNT;

  CREATE TEMP TABLE IF NOT EXISTS _sync_res_map (
    old_res uuid NOT NULL,
    new_res uuid NOT NULL,
    PRIMARY KEY (old_res)
  ) ON COMMIT DROP;

  TRUNCATE _sync_res_map;

  INSERT INTO _sync_res_map (old_res, new_res)
  SELECT pro.id, pne.id
  FROM public.permission_resources pro
  JOIN _sync_nav_map sm ON pro.resource_key = ('nav.' || sm.old_id::text)
  JOIN public.permission_resources pne
    ON pne.tenant_id = p_target_tenant
   AND pne.resource_key = ('nav.' || sm.new_id::text)
  WHERE pro.tenant_id = p_template_tenant;

  IF to_regclass('public.role_resource_grants') IS NOT NULL THEN
    INSERT INTO public.role_resource_grants (
      tenant_id,
      role,
      resource_id,
      allowed_actions
    )
    SELECT
      p_target_tenant,
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
      JOIN _sync_res_map rm ON rrg.resource_id = rm.old_res
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
    JOIN _sync_res_map rm ON pa.resource_id = rm.old_res
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_pa_inserted = ROW_COUNT;
  END IF;

  -- Default catalog for any newly inserted navigation row without a template permission_resources row.
  INSERT INTO public.permission_resources (tenant_id, resource_key, display_name, resource_type)
  SELECT
    p_target_tenant,
    'nav.' || nv.id::text,
    COALESCE(NULLIF(trim(nv.label), ''), nv.id::text),
    'module'
  FROM public.navigation nv
  JOIN _sync_nav_map sm ON nv.id = sm.new_id
  WHERE nv.tenant_id = p_target_tenant
    AND NOT EXISTS (
      SELECT 1
      FROM public.permission_resources pr
      WHERE pr.tenant_id = p_target_tenant
        AND pr.resource_key = ('nav.' || nv.id::text)
    );

  GET DIAGNOSTICS v_supplemented = ROW_COUNT;

  IF to_regclass('public.role_resource_grants') IS NOT NULL THEN
    INSERT INTO public.role_resource_grants (tenant_id, role, resource_id, allowed_actions)
    SELECT p_target_tenant, r.role, pr.id, r.actions
    FROM public.permission_resources pr
    JOIN _sync_nav_map sm ON pr.resource_key = ('nav.' || sm.new_id::text)
    CROSS JOIN (
      VALUES
        ('member', ARRAY['read']::text[]),
        ('admin', ARRAY['read', 'write']::text[]),
        ('super_admin', ARRAY['read', 'write']::text[])
    ) AS r(role, actions)
    WHERE pr.tenant_id = p_target_tenant
      AND pr.resource_type = 'module'
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_resource_grants x
        WHERE x.tenant_id = p_target_tenant
          AND x.resource_id = pr.id
          AND x.role = r.role
      )
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.permission_actions') IS NOT NULL THEN
    INSERT INTO public.permission_actions (resource_id, action_key)
    SELECT pr.id, ak.action_key
    FROM public.permission_resources pr
    JOIN _sync_nav_map sm ON pr.resource_key = ('nav.' || sm.new_id::text)
    CROSS JOIN (VALUES ('read'), ('write')) AS ak(action_key)
    WHERE pr.tenant_id = p_target_tenant
      AND pr.resource_type = 'module'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'navigation_rows_inserted', v_nav_inserted,
    'permission_resources_rows', v_pr_inserted + v_supplemented,
    'role_resource_grants_rows', v_rrg_inserted,
    'permission_actions_rows', v_pa_inserted,
    'catalog_supplemented_nav_rows', v_supplemented
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_tenant_navigation_from_template(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_tenant_navigation_from_template(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.sync_tenant_navigation_from_template(uuid, uuid) IS
  'Non-destructive merge: inserts navigation rows present on the template tenant but missing on the target, then copies permission catalog for those rows.';
