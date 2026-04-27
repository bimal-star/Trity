-- =============================================================================
-- Fix Supabase Performance Advisor Lint Warnings
-- Covers: auth_rls_initplan, multiple_permissive_policies, duplicate_index
-- =============================================================================

-- =============================================================================
-- PART 1: duplicate_index — group_module_access
-- =============================================================================
-- group_module_access_group_id_module_id_key (unique constraint) and
-- group_module_access_group_module_unique are identical. Drop the manual one.
ALTER TABLE public.group_module_access
  DROP CONSTRAINT IF EXISTS group_module_access_group_module_unique;


-- =============================================================================
-- PART 2: auth_rls_initplan — wrap bare auth.uid() in (SELECT auth.uid())
-- =============================================================================

-- 2a: user_module_access
--   - Drop user_module_access_write (uses wrong column: user_profiles.id vs .user_id,
--     AND has bare auth.uid()). user_module_access_insert from 20260131160000 is correct.
--   - This also fixes the multiple_permissive_policies INSERT conflict (2a → Part 3N).
DROP POLICY IF EXISTS user_module_access_write ON public.user_module_access;

-- 2b: feature_provisioning_log "Super admins can view all provisioning logs"
--   (Also fixes the multiple_permissive SELECT — handled together in Part 3L)
DROP POLICY IF EXISTS "Super admins can view all provisioning logs" ON public.feature_provisioning_log;
DROP POLICY IF EXISTS "Users can view their tenant provisioning logs" ON public.feature_provisioning_log;
CREATE POLICY feature_provisioning_log_select ON public.feature_provisioning_log
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) = 'super_admin'
  );

-- 2c: permission_resources, permission_actions, role_resource_grants,
--     user_resource_grants, group_resource_grants
--   Policies on these tables were created outside tracked migrations.
--   Dynamically find any policy containing bare auth.uid() and rebuild it
--   with (SELECT auth.uid()) substituted.
DO $$
DECLARE
  rec      RECORD;
  new_qual TEXT;
  new_wc   TEXT;
  sql_cmd  TEXT;
  tbl      TEXT;
  tbls     TEXT[] := ARRAY[
    'permission_resources', 'permission_actions',
    'role_resource_grants', 'user_resource_grants', 'group_resource_grants'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN CONTINUE; END IF;
    FOR rec IN
      SELECT policyname,
             pg_policies.cmd AS operation,
             permissive,
             roles,
             qual,
             with_check
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      -- Skip policies that already use (SELECT auth.uid())
      IF position('(SELECT auth.uid())' IN
           COALESCE(rec.qual, '') || COALESCE(rec.with_check, '')) > 0
      THEN CONTINUE; END IF;

      -- Skip policies that don't mention auth.uid() at all
      IF position('auth.uid()' IN
           COALESCE(rec.qual, '') || COALESCE(rec.with_check, '')) = 0
      THEN CONTINUE; END IF;

      new_qual := replace(rec.qual,       'auth.uid()', '(SELECT auth.uid())');
      new_wc   := replace(rec.with_check, 'auth.uid()', '(SELECT auth.uid())');

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, tbl);

      sql_cmd := format(
        'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
        rec.policyname, tbl,
        rec.permissive,
        rec.operation,
        array_to_string(rec.roles, ', ')
      );
      IF new_qual IS NOT NULL THEN
        sql_cmd := sql_cmd || ' USING (' || new_qual || ')';
      END IF;
      IF new_wc IS NOT NULL THEN
        sql_cmd := sql_cmd || ' WITH CHECK (' || new_wc || ')';
      END IF;

      EXECUTE sql_cmd;
      RAISE NOTICE 'Fixed auth_rls_initplan: policy % on public.%', rec.policyname, tbl;
    END LOOP;
  END LOOP;
END $$;


-- =============================================================================
-- PART 3: multiple_permissive_policies — consolidate duplicate policies
-- =============================================================================

-- =============================================================================
-- 3A: bc_* core tables — consolidate bc_*_select + bc_*_select_platform_super_admin
-- =============================================================================
DO $$
DECLARE
  t      TEXT;
  tables TEXT[] := ARRAY[
    'forecast_scenarios',
    'attribute_definitions',
    'bom_headers',
    'bom_lines',
    'demand_forecasts',
    'packing_configurations',
    'price_list_items',
    'price_lists',
    'product_activity_log',
    'product_barcodes',
    'product_categories',
    'product_cost_history',
    'product_metrics',
    'product_variants',
    'production_plans',
    'products',
    'retailer_weeks',
    'stock_levels',
    'stock_transactions',
    'unit_conversions',
    'units'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;

    -- Drop both the tenant-only and super-admin SELECT variants
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_select_platform_super_admin', t);

    -- Recreate as single consolidated SELECT policy
    EXECUTE format($pol$
      CREATE POLICY %I ON public.%I FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
        )
        OR public.is_tenants_platform_super_admin()
      )
    $pol$, 'bc_' || t || '_select', t);

    -- Drop any pre-bc legacy policy with the plain table-name prefix
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
  END LOOP;
END $$;

-- =============================================================================
-- 3B: products — also consolidate INSERT / UPDATE / DELETE platform_super_admin
-- =============================================================================
DROP POLICY IF EXISTS bc_products_insert ON public.products;
DROP POLICY IF EXISTS bc_products_insert_platform_super_admin ON public.products;
CREATE POLICY bc_products_insert ON public.products FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS bc_products_update ON public.products;
DROP POLICY IF EXISTS bc_products_update_platform_super_admin ON public.products;
CREATE POLICY bc_products_update ON public.products FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS bc_products_delete ON public.products;
DROP POLICY IF EXISTS bc_products_delete_platform_super_admin ON public.products;
CREATE POLICY bc_products_delete ON public.products FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

-- =============================================================================
-- 3C: product_categories — consolidate INSERT / UPDATE / DELETE platform_super_admin
-- =============================================================================
DROP POLICY IF EXISTS bc_product_categories_insert ON public.product_categories;
DROP POLICY IF EXISTS bc_product_categories_insert_platform_super_admin ON public.product_categories;
CREATE POLICY bc_product_categories_insert ON public.product_categories FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS bc_product_categories_update ON public.product_categories;
DROP POLICY IF EXISTS bc_product_categories_update_platform_super_admin ON public.product_categories;
CREATE POLICY bc_product_categories_update ON public.product_categories FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS bc_product_categories_delete ON public.product_categories;
DROP POLICY IF EXISTS bc_product_categories_delete_platform_super_admin ON public.product_categories;
CREATE POLICY bc_product_categories_delete ON public.product_categories FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

-- =============================================================================
-- 3D: categories — consolidate bc_categories_select + bc_categories_select_platform_super_admin
-- =============================================================================
DROP POLICY IF EXISTS bc_categories_select ON public.categories;
DROP POLICY IF EXISTS bc_categories_select_platform_super_admin ON public.categories;
CREATE POLICY bc_categories_select ON public.categories FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );
DROP POLICY IF EXISTS "Users can view own tenant categories" ON public.categories;
DROP POLICY IF EXISTS categories_select ON public.categories;

-- =============================================================================
-- 3E: product_groups — consolidate bc_product_groups_select + bc_product_groups_select_platform_super_admin
-- =============================================================================
DROP POLICY IF EXISTS bc_product_groups_select ON public.product_groups;
DROP POLICY IF EXISTS bc_product_groups_select_platform_super_admin ON public.product_groups;
CREATE POLICY bc_product_groups_select ON public.product_groups FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

-- =============================================================================
-- 3F: Standard tenant tables — consolidate <table>_select + <table>_select_platform_super_admin
-- =============================================================================
DO $$
DECLARE
  t      TEXT;
  tables TEXT[] := ARRAY[
    'calendar',
    'suppliers',
    'warehouses',
    'supplier_product_prices',
    'purchase_orders',
    'purchase_order_lines',
    'goods_receipts',
    'goods_receipt_lines',
    'supplier_invoices',
    'supplier_invoice_lines',
    'customers'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_platform_super_admin', t);
    EXECUTE format($pol$
      CREATE POLICY %I ON public.%I FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
        )
        OR public.is_tenants_platform_super_admin()
      )
    $pol$, t || '_select', t);
  END LOOP;
END $$;

-- =============================================================================
-- 3G: customer satellite tables — drop ALL duplicate SELECT / INSERT / UPDATE policies
--     then recreate clean consolidated set
-- =============================================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'customer_addresses',
    'customer_contacts',
    'customer_notes',
    'customer_attachments'
  ];
  view_map TEXT[] := ARRAY[
    'Tenants can view own customer addresses',
    'Tenants can view own customer contacts',
    'Tenants can view own customer notes',
    'Tenants can view own customer attachments'
  ];
  ins_map TEXT[] := ARRAY[
    'Tenants can insert own customer addresses',
    'Tenants can insert own customer contacts',
    'Tenants can insert own customer notes',
    'Tenants can insert own customer attachments'
  ];
  upd_map TEXT[] := ARRAY[
    'Tenants can update own customer addresses',
    'Tenants can update own customer contacts',
    'Tenants can update own customer notes',
    'Tenants can update own customer attachments'
  ];
  i INT;
BEGIN
  FOR i IN 1..array_length(tables, 1) LOOP
    t := tables[i];
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;

    -- Drop snake_case + human-named + platform_super_admin SELECT
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_platform_super_admin', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', view_map[i], t);
    -- Drop snake_case + human-named INSERT
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', ins_map[i], t);
    -- Drop snake_case + human-named UPDATE
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', upd_map[i], t);

    -- Recreate clean consolidated policies
    EXECUTE format($pol$
      CREATE POLICY %I ON public.%I FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
        )
        OR public.is_tenants_platform_super_admin()
      )
    $pol$, t || '_select', t);

    EXECUTE format($pol$
      CREATE POLICY %I ON public.%I FOR INSERT
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
        )
      )
    $pol$, t || '_insert', t);

    EXECUTE format($pol$
      CREATE POLICY %I ON public.%I FOR UPDATE
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
        )
      )
    $pol$, t || '_update', t);
  END LOOP;
END $$;

-- =============================================================================
-- 3H: user_profiles — consolidate select + select_platform_super_admin
-- =============================================================================
DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_select_platform_super_admin ON public.user_profiles;
CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_tenants_platform_super_admin()
  );

-- =============================================================================
-- 3I: navigation — consolidate all 4 actions (tenant + platform_super_admin)
-- =============================================================================
DROP POLICY IF EXISTS navigation_select ON public.navigation;
DROP POLICY IF EXISTS navigation_select_platform_super_admin ON public.navigation;
CREATE POLICY navigation_select ON public.navigation
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS navigation_insert ON public.navigation;
DROP POLICY IF EXISTS navigation_insert_platform_super_admin ON public.navigation;
CREATE POLICY navigation_insert ON public.navigation
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS navigation_update ON public.navigation;
DROP POLICY IF EXISTS navigation_update_platform_super_admin ON public.navigation;
CREATE POLICY navigation_update ON public.navigation
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS navigation_delete ON public.navigation;
DROP POLICY IF EXISTS navigation_delete_platform_super_admin ON public.navigation;
CREATE POLICY navigation_delete ON public.navigation
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

-- =============================================================================
-- 3J: tenants — consolidate select, update (with super_admin variant)
--     INSERT is platform_super_admin-only (keep one INSERT policy)
-- =============================================================================
DROP POLICY IF EXISTS tenants_select ON public.tenants;
DROP POLICY IF EXISTS "tenants_select_super_admin" ON public.tenants;
CREATE POLICY tenants_select ON public.tenants
  FOR SELECT
  USING (
    id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS tenants_update ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_super_admin" ON public.tenants;
CREATE POLICY tenants_update ON public.tenants
  FOR UPDATE
  USING (
    id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  )
  WITH CHECK (
    id IN (SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid()))
    OR public.is_tenants_platform_super_admin()
  );

-- INSERT: the only policy is the super_admin one — rename it to standard form
DROP POLICY IF EXISTS tenants_insert ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_super_admin" ON public.tenants;
CREATE POLICY tenants_insert ON public.tenants
  FOR INSERT
  WITH CHECK (public.is_tenants_platform_super_admin());

-- =============================================================================
-- 3K: audit_logs — consolidate if a second SELECT policy exists (e.g. from dashboard)
-- =============================================================================
DO $$
DECLARE
  n INT;
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO n
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'audit_logs' AND cmd = 'SELECT';
  IF n > 1 THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs
    $p$;
    EXECUTE $p$
      DROP POLICY IF EXISTS audit_logs_select_platform_super_admin ON public.audit_logs
    $p$;
    EXECUTE $p$
      DROP POLICY IF EXISTS bc_audit_logs_select_platform_super_admin ON public.audit_logs
    $p$;
    RAISE NOTICE 'Cleaned up duplicate audit_logs SELECT policies';
  END IF;
END $$;

-- =============================================================================
-- 3L: feature_provisioning_log — already handled in Part 2b above
-- =============================================================================

-- =============================================================================
-- 3M: group_resource_grants + user_resource_grants
--     The FOR ALL platform_super_admin policy conflicts with each individual
--     action policy. Drop the FOR ALL policy and fold the super-admin check
--     into each existing action policy via OR.
-- =============================================================================
DO $$
DECLARE
  rec      RECORD;
  new_qual TEXT;
  new_wc   TEXT;
  sql_cmd  TEXT;
  tbl      TEXT;
  tbls     TEXT[] := ARRAY['user_resource_grants', 'group_resource_grants'];
  sa_pol   TEXT;
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN CONTINUE; END IF;

    sa_pol := tbl || '_platform_super_admin';

    -- Update each non-super-admin policy to include OR is_tenants_platform_super_admin()
    FOR rec IN
      SELECT policyname, pg_policies.cmd AS operation, permissive, roles, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
        AND policyname != sa_pol
    LOOP
      -- Only modify if not already super-admin aware
      IF position('is_tenants_platform_super_admin' IN
           COALESCE(rec.qual, '') || COALESCE(rec.with_check, '')) = 0 THEN

        new_qual := CASE WHEN rec.qual IS NOT NULL
          THEN '((' || rec.qual || ') OR public.is_tenants_platform_super_admin())'
          ELSE NULL END;
        new_wc := CASE WHEN rec.with_check IS NOT NULL
          THEN '((' || rec.with_check || ') OR public.is_tenants_platform_super_admin())'
          ELSE NULL END;

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, tbl);

        sql_cmd := format(
          'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
          rec.policyname, tbl,
          rec.permissive, rec.operation,
          array_to_string(rec.roles, ', ')
        );
        IF new_qual IS NOT NULL THEN sql_cmd := sql_cmd || ' USING (' || new_qual || ')'; END IF;
        IF new_wc  IS NOT NULL THEN sql_cmd := sql_cmd || ' WITH CHECK (' || new_wc  || ')'; END IF;
        EXECUTE sql_cmd;
        RAISE NOTICE 'Updated % on % with platform_super_admin OR', rec.policyname, tbl;
      END IF;
    END LOOP;

    -- Drop the now-redundant FOR ALL super-admin policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', sa_pol, tbl);
    RAISE NOTICE 'Dropped % on %', sa_pol, tbl;
  END LOOP;
END $$;

-- =============================================================================
-- 3N: user_module_access — INSERT conflict already resolved by dropping
--     user_module_access_write in Part 2a.
--     Also check for any unexpected duplicate SELECT policies.
-- =============================================================================
DO $$
DECLARE n INT;
BEGIN
  IF to_regclass('public.user_module_access') IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO n
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_module_access' AND cmd = 'SELECT';
  IF n > 1 THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS user_module_access_select_platform_super_admin
        ON public.user_module_access
    $p$;
    RAISE NOTICE 'Cleaned up duplicate user_module_access SELECT policies';
  END IF;
END $$;

-- =============================================================================
-- 3O: user_groups, group_module_access — dynamic cleanup if duplicates exist
-- =============================================================================
DO $$
DECLARE
  rec RECORD;
  tbl TEXT;
  tbls TEXT[] := ARRAY['user_groups', 'group_module_access'];
  cnt INT;
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN CONTINUE; END IF;
    FOR rec IN
      SELECT pg_policies.cmd AS operation, count(*) AS n
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
      GROUP BY pg_policies.cmd
      HAVING count(*) > 1
    LOOP
      -- Drop any _platform_super_admin variant (these created the duplicates)
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl || '_select_platform_super_admin', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl || '_insert_platform_super_admin', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl || '_update_platform_super_admin', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl || '_delete_platform_super_admin', tbl);
      RAISE NOTICE 'Cleaned up platform_super_admin policies on %', tbl;
    END LOOP;
  END LOOP;
END $$;

-- =============================================================================
-- 3P: Tenant schema navigation + calendar
--     Tenant schema: tenant_1972e6d9_5fd0_4ef5_8527_87392e36ffc3
-- =============================================================================
DO $$
DECLARE
  tenant_schema TEXT := 'tenant_1972e6d9_5fd0_4ef5_8527_87392e36ffc3';
  tbl TEXT;
  tbls TEXT[] := ARRAY['navigation', 'calendar'];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schemata.schema_name = tenant_schema
  ) THEN RETURN; END IF;

  FOREACH tbl IN ARRAY tbls LOOP
    IF to_regclass(tenant_schema || '.' || tbl) IS NULL THEN CONTINUE; END IF;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      tbl || '_select_platform_super_admin', tenant_schema, tbl
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      'bc_' || tbl || '_select_platform_super_admin', tenant_schema, tbl
    );
    RAISE NOTICE 'Cleaned tenant schema policies on %.%', tenant_schema, tbl;
  END LOOP;
END $$;
