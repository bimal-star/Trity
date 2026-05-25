-- Template-first sync: upsert navigation from template (insert missing + update matched rows).

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
  v_nav_updated int := 0;
  v_nav_updated_batch int := 0;
  v_pr_inserted int := 0;
  v_pr_display_updated int := 0;
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

  -- Update routable items matched by path (label, position, enabled state, metadata).
  UPDATE public.navigation n
  SET
    label = t.label,
    "position" = t."position",
    is_enabled = t.is_enabled,
    metadata = t.metadata,
    version = t.version,
    updated_at = now()
  FROM public.navigation t
  WHERE n.tenant_id = p_target_tenant
    AND t.tenant_id = p_template_tenant
    AND COALESCE(n.is_deleted, false) = false
    AND COALESCE(t.is_deleted, false) = false
    AND t.path IS NOT NULL
    AND n.path = t.path
    AND (
      n.label IS DISTINCT FROM t.label
      OR n."position"::text IS DISTINCT FROM t."position"::text
      OR n.is_enabled IS DISTINCT FROM t.is_enabled
      OR n.metadata IS DISTINCT FROM t.metadata
      OR n.version IS DISTINCT FROM t.version
    );

  GET DIAGNOSTICS v_nav_updated = ROW_COUNT;

  -- Update section headers (no path) matched by label + position.
  UPDATE public.navigation n
  SET
    label = t.label,
    "position" = t."position",
    is_enabled = t.is_enabled,
    metadata = t.metadata,
    version = t.version,
    updated_at = now()
  FROM public.navigation t
  WHERE n.tenant_id = p_target_tenant
    AND t.tenant_id = p_template_tenant
    AND COALESCE(n.is_deleted, false) = false
    AND COALESCE(t.is_deleted, false) = false
    AND t.path IS NULL
    AND n.path IS NULL
    AND n.label = t.label
    AND n."position"::text = t."position"::text
    AND (
      n.is_enabled IS DISTINCT FROM t.is_enabled
      OR n.metadata IS DISTINCT FROM t.metadata
      OR n.version IS DISTINCT FROM t.version
    );

  GET DIAGNOSTICS v_nav_updated_batch = ROW_COUNT;
  v_nav_updated := v_nav_updated + v_nav_updated_batch;

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

  IF to_regclass('public.permission_resources') IS NOT NULL THEN
    CREATE TEMP TABLE IF NOT EXISTS _sync_nav_map (
      old_id uuid NOT NULL,
      new_id uuid NOT NULL,
      PRIMARY KEY (old_id)
    ) ON COMMIT DROP;

    TRUNCATE _sync_nav_map;

    INSERT INTO _sync_nav_map (old_id, new_id)
    SELECT t.id, n.id
    FROM public.navigation t
    JOIN public.navigation n
      ON n.tenant_id = p_target_tenant
     AND COALESCE(n.is_deleted, false) = false
     AND COALESCE(t.is_deleted, false) = false
     AND t.tenant_id = p_template_tenant
     AND (
       (t.path IS NOT NULL AND n.path = t.path)
       OR (
         t.path IS NULL
         AND n.path IS NULL
         AND n.label = t.label
         AND n."position"::text = t."position"::text
       )
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
    JOIN _sync_missing_template_nav m ON m.template_nav_id = sm.old_id
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
    JOIN _sync_missing_template_nav m ON m.template_nav_id = sm.old_id
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

    INSERT INTO public.permission_resources (tenant_id, resource_key, display_name, resource_type)
    SELECT
      p_target_tenant,
      'nav.' || nv.id::text,
      COALESCE(NULLIF(trim(nv.label), ''), nv.id::text),
      'module'
    FROM public.navigation nv
    JOIN _sync_nav_map sm ON nv.id = sm.new_id
    JOIN _sync_missing_template_nav m ON m.template_nav_id = sm.old_id
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
      JOIN _sync_missing_template_nav m ON m.template_nav_id = sm.old_id
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
      JOIN _sync_missing_template_nav m ON m.template_nav_id = sm.old_id
      CROSS JOIN (VALUES ('read'), ('write')) AS ak(action_key)
      WHERE pr.tenant_id = p_target_tenant
        AND pr.resource_type = 'module'
      ON CONFLICT DO NOTHING;
    END IF;

    -- Align permission display names with template for path-matched nav rows.
    UPDATE public.permission_resources pr
    SET display_name = src.display_name
    FROM (
      SELECT
        n.id AS target_nav_id,
        COALESCE(
          NULLIF(trim(tpr.display_name), ''),
          NULLIF(trim(tn.label), ''),
          NULLIF(trim(n.label), '')
        ) AS display_name
      FROM public.navigation tn
      JOIN public.navigation n
        ON n.tenant_id = p_target_tenant
       AND COALESCE(n.is_deleted, false) = false
       AND (
         (tn.path IS NOT NULL AND n.path = tn.path)
         OR (
           tn.path IS NULL
           AND n.path IS NULL
           AND n.label = tn.label
           AND n."position"::text = tn."position"::text
         )
       )
      LEFT JOIN public.permission_resources tpr
        ON tpr.tenant_id = p_template_tenant
       AND tpr.resource_key = ('nav.' || tn.id::text)
      WHERE tn.tenant_id = p_template_tenant
        AND COALESCE(tn.is_deleted, false) = false
    ) src
    WHERE pr.tenant_id = p_target_tenant
      AND pr.resource_key = ('nav.' || src.target_nav_id::text)
      AND pr.display_name IS DISTINCT FROM src.display_name;

    GET DIAGNOSTICS v_pr_display_updated = ROW_COUNT;
  END IF;

  IF v_nav_inserted = 0 AND v_nav_updated = 0 THEN
    RETURN jsonb_build_object(
      'navigation_rows_inserted', 0,
      'navigation_rows_updated', 0,
      'permission_resources_rows', 0,
      'permission_display_names_updated', v_pr_display_updated,
      'role_resource_grants_rows', 0,
      'permission_actions_rows', 0,
      'catalog_supplemented_nav_rows', 0,
      'note', 'target tenant navigation is already in sync with template'
    );
  END IF;

  RETURN jsonb_build_object(
    'navigation_rows_inserted', v_nav_inserted,
    'navigation_rows_updated', v_nav_updated,
    'permission_resources_rows', v_pr_inserted + v_supplemented,
    'permission_display_names_updated', v_pr_display_updated,
    'role_resource_grants_rows', v_rrg_inserted,
    'permission_actions_rows', v_pa_inserted,
    'catalog_supplemented_nav_rows', v_supplemented
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_tenant_navigation_from_template(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_tenant_navigation_from_template(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.sync_tenant_navigation_from_template(uuid, uuid) IS
  'Template-first merge: updates matched navigation rows (by path, or label+position for section headers), inserts missing rows, and syncs permission catalog for new items.';
