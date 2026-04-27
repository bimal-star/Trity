-- Workspace / "Open workspace" mode: platform super admins act as another tenant but still
-- use the anon key + their JWT. Standard RLS only allows rows where tenant_id is in the
-- user's profile tenant(s), so cross-tenant queries return empty (blank sidebar, home, etc.).
--
-- 1) Harden is_tenants_platform_super_admin(): normalize user_profiles.role like the app
--    (spacing/casing variants), not only exact 'super_admin'.
-- 2) Add permissive SELECT policies using that function for tenant-scoped tables (OR'd with
--    existing tenant policies). Mirrors navigation_select_platform_super_admin.

CREATE OR REPLACE FUNCTION public.is_tenants_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH jwt_row AS (SELECT (SELECT auth.jwt()) AS payload),
  norm AS (
    SELECT
      lower(replace(replace(trim(both FROM COALESCE(jwt_row.payload->'app_metadata'->>'role', '')), ' ', '_'), '-', '_')) AS app_r,
      lower(replace(replace(trim(both FROM COALESCE(jwt_row.payload->'user_metadata'->>'role', '')), ' ', '_'), '-', '_')) AS user_r
    FROM jwt_row
  ),
  profile_norm AS (
    SELECT
      lower(replace(replace(trim(both FROM COALESCE(up.role::text, '')), ' ', '_'), '-', '_')) AS r
    FROM public.user_profiles up
    WHERE up.user_id = (SELECT auth.uid())
  )
  SELECT
    EXISTS (
      SELECT 1
      FROM profile_norm pn
      WHERE pn.r IN (
        'super_admin',
        'superadmin',
        'super_administrator',
        'platform_admin',
        'global_admin',
        'system_admin'
      )
    )
    OR EXISTS (
      SELECT 1
      FROM norm
      WHERE norm.app_r IN (
        'super_admin',
        'superadmin',
        'super_administrator',
        'platform_admin',
        'global_admin',
        'system_admin'
      )
      OR norm.user_r IN (
        'super_admin',
        'superadmin',
        'super_administrator',
        'platform_admin',
        'global_admin',
        'system_admin'
      )
    );
$$;

-- Business core tables (same set as 20260405103000 business_core_schema_consolidation RLS)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
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
  pol text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    pol := 'bc_' || t || '_select_platform_super_admin';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_tenants_platform_super_admin())',
      pol,
      t
    );
  END LOOP;
END $$;

-- Calendar + masters + purchase stack + customers (non-bc policy names)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
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
    'customers',
    'customer_addresses',
    'customer_contacts',
    'customer_notes',
    'customer_attachments'
  ];
  pol text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    pol := t || '_select_platform_super_admin';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_tenants_platform_super_admin())',
      pol,
      t
    );
  END LOOP;
END $$;

-- List workspace users / invites while impersonating (standard policy is only own row)
DROP POLICY IF EXISTS user_profiles_select_platform_super_admin ON public.user_profiles;
CREATE POLICY user_profiles_select_platform_super_admin ON public.user_profiles
  FOR SELECT
  USING (public.is_tenants_platform_super_admin());
