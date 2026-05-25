-- Add Cost Card and Logistics navigation items for existing tenants; update default seed VALUES.

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
    ('Cost Card', '/cost-card', '1.25'),
    ('Logistics', '/logistics', '1.26'),
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

-- Backfill for tenants that already have navigation.
INSERT INTO public.navigation (tenant_id, label, path, "position", is_enabled, is_deleted)
SELECT t.id, v.label, v.path, v.pos, true, false
FROM public.tenants t
CROSS JOIN (VALUES
  ('Cost Card', '/cost-card', '1.25'),
  ('Logistics', '/logistics', '1.26')
) AS v(label, path, pos)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.navigation n
  WHERE n.tenant_id = t.id
    AND n.path = v.path
    AND n.is_deleted = false
);
