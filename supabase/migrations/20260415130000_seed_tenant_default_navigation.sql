-- Default navigation seed for new tenants (matches lib/navigation-default.ts).
-- navigation.id is uuid with default gen_random_uuid(); rows omit id so DB assigns UUIDs.
-- Module permission keys in DB will use nav.<uuid> for rows created here (see permission_resolver).

CREATE OR REPLACE FUNCTION public.seed_tenant_navigation_rows(p_target_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  INSERT INTO public.navigation (tenant_id, label, path, "position", is_enabled, is_deleted)
  SELECT p_target_tenant_id, v.label, v.path, v.pos, true, false
  FROM (VALUES
    ('Analytics'::text, NULL::text, '1'::text),
    ('Forecast', '/analytics/forecast', '1.1'),
    ('Cost File', '/analytics/cost-file', '1.2'),
    ('Inventory', '/analytics/inventory', '1.3'),
    ('Business Core', NULL, '2'),
    ('Products', '/products', '2.1'),
    ('New product', '/products/new', '2.1.1'),
    ('Price lists', '/products/price-lists', '2.1.2'),
    ('Customers', '/customers', '2.2'),
    ('New customer', '/customers/new', '2.2.1'),
    ('Supplier', '/suppliers', '2.3'),
    ('New supplier', '/suppliers/new', '2.3.1'),
    ('Supplier pricing', '/suppliers/pricing', '2.3.2'),
    ('Warehouse', '/warehouse', '2.4'),
    ('New warehouse', '/warehouse/new', '2.4.1'),
    ('Stock Adjustments', '/stock-adjustments', '2.5'),
    ('Purchase Management', NULL, '2.6'),
    ('Purchase Orders', '/purchase-orders', '2.6.1'),
    ('Goods Receipt', '/goods-receipt', '2.6.2'),
    ('Purchase Invoices', '/purchase-invoices', '2.6.3'),
    ('Purchase reports', '/purchase-reports', '2.6.4'),
    ('Purchase Returns', '/purchase-returns', '2.6.5'),
    ('Order Management', NULL, '2.7'),
    ('Sales Orders', '/sales-orders', '2.7.1'),
    ('Order Fulfillment', '/order-fulfillment', '2.7.2'),
    ('Execution', NULL, '3'),
    ('Calendar', '/calendar', '3.1'),
    ('OKRs', '/okrs', '3.2'),
    ('Scheduler', '/scheduler', '3.4'),
    ('Administration', NULL, '4'),
    ('Users', '/users', '4.1'),
    ('Tenant Settings', '/tenant-settings', '4.3'),
    ('Tenants Hub', '/admin/tenants', '4.4'),
    ('Navigation Manager', '/navigation-manager', '4.5'),
    ('Import/Export', '/import-export', '4.6'),
    ('Access Levels', '/users/access', '4.7'),
    ('Account', NULL, '5'),
    ('Profile', '/profile', '5.1'),
    ('Founder', '/about/founder', '5.2')
  ) AS v(label, path, pos)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.navigation n WHERE n.tenant_id = p_target_tenant_id LIMIT 1
  );

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_tenant_navigation_rows(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.seed_tenant_default_navigation(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT (
    public.is_tenants_platform_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.tenant_id = p_tenant_id
    )
  ) THEN
    RAISE EXCEPTION 'not allowed to seed navigation for this tenant';
  END IF;

  RETURN public.seed_tenant_navigation_rows(p_tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_default_navigation(uuid) TO authenticated;

COMMENT ON FUNCTION public.seed_tenant_default_navigation(uuid) IS
  'Idempotent: inserts default navigation rows only when the tenant has none. Platform super admin or member of tenant.';

-- Backfill tenants that currently have no navigation rows.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.id AS tid
    FROM public.tenants t
    WHERE NOT EXISTS (SELECT 1 FROM public.navigation n WHERE n.tenant_id = t.id)
  LOOP
    PERFORM public.seed_tenant_navigation_rows(r.tid);
  END LOOP;
END $$;
