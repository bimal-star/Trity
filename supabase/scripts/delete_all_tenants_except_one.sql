-- =============================================================================
-- DANGER: DESTRUCTIVE — NOT A MIGRATION
-- =============================================================================
-- Removes every tenant except the one UUID set in v_keep below:
--   1) Deletes all public rows scoped by tenant_id (and group/invite rows tied
--      to other tenants).
--   2) Deletes other rows from public.tenants.
--
-- Does NOT delete auth.users, subscription_packages, or global permission tables.
-- Users who only had profiles on removed tenants will lose those profiles; they
-- remain in Supabase Auth until you remove them there.
--
-- Run as postgres in Supabase SQL Editor. If a DELETE fails on FK, extend this
-- script using the error detail (your DB may have extra tenant-scoped tables).
-- =============================================================================

DO $$
DECLARE
  v_keep uuid := '1972e6d9-5fd0-4ef5-8527-87392e36ffc3'::uuid;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = v_keep) THEN
    RAISE EXCEPTION 'delete_all_tenants_except_one: keep id % not found in public.tenants', v_keep;
  END IF;

  -- ---------------------------------------------------------------------------
  -- AI & tenant infra (CASCADE from tenants, but cleared explicitly)
  -- ---------------------------------------------------------------------------
  DELETE FROM public.ai_usage_logs u WHERE u.tenant_id <> v_keep;
  DELETE FROM public.ai_threads t WHERE t.tenant_id <> v_keep;
  DELETE FROM public.feature_provisioning_log f WHERE f.tenant_id <> v_keep;
  DELETE FROM public.tenant_schemas s WHERE s.tenant_id <> v_keep;

  -- ---------------------------------------------------------------------------
  -- Access control & profiles (order: children of user_groups, then profiles)
  -- ---------------------------------------------------------------------------
  DELETE FROM public.user_module_access m WHERE m.tenant_id <> v_keep;

  DELETE FROM public.group_module_access gma
  WHERE gma.group_id IN (SELECT id FROM public.user_groups ug WHERE ug.tenant_id <> v_keep);

  DELETE FROM public.group_resource_grants grg
  WHERE grg.group_id IN (SELECT id FROM public.user_groups ug WHERE ug.tenant_id <> v_keep);

  DELETE FROM public.group_members gm
  WHERE gm.group_id IN (SELECT id FROM public.user_groups ug WHERE ug.tenant_id <> v_keep);

  DELETE FROM public.tenant_invites ti WHERE ti.tenant_id <> v_keep;

  DELETE FROM public.user_resource_grants urg WHERE urg.tenant_id <> v_keep;
  DELETE FROM public.user_tenants ut WHERE ut.tenant_id <> v_keep;
  DELETE FROM public.role_resource_grants rrg WHERE rrg.tenant_id <> v_keep;

  DELETE FROM public.tenant_impersonation_audit a WHERE a.target_tenant_id <> v_keep;

  DELETE FROM public.user_profiles up WHERE up.tenant_id <> v_keep;
  DELETE FROM public.user_groups ug WHERE ug.tenant_id <> v_keep;

  DELETE FROM public.audit_logs al WHERE al.tenant_id <> v_keep;

  -- ---------------------------------------------------------------------------
  -- Purchase-to-pay
  -- ---------------------------------------------------------------------------
  DELETE FROM public.goods_receipt_lines x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.goods_receipts x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.supplier_invoice_lines x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.supplier_invoices x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.purchase_order_lines x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.purchase_orders x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.supplier_product_prices x WHERE x.tenant_id <> v_keep;

  -- ---------------------------------------------------------------------------
  -- BOM & planning
  -- ---------------------------------------------------------------------------
  DELETE FROM public.bom_lines x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.production_plans x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.bom_headers x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.demand_forecasts x WHERE x.tenant_id <> v_keep;

  -- ---------------------------------------------------------------------------
  -- Product stack
  -- ---------------------------------------------------------------------------
  DELETE FROM public.product_activity_log x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.product_metrics x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.product_cost_history x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.packing_configurations x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.stock_transactions x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.stock_levels x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.product_barcodes x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.product_categories x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.price_list_items x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.products x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.product_groups x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.attribute_definitions x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.categories x WHERE x.tenant_id <> v_keep;

  -- ---------------------------------------------------------------------------
  -- Customers & suppliers & warehouses
  -- ---------------------------------------------------------------------------
  DELETE FROM public.customer_addresses x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.customer_attachments x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.customer_contacts x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.customer_notes x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.customers x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.suppliers x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.warehouses x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.price_lists x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.unit_conversions x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.units x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.retailer_weeks x WHERE x.tenant_id <> v_keep;
  DELETE FROM public.calendar x WHERE x.tenant_id <> v_keep;

  DELETE FROM public.navigation n
  WHERE n.tenant_id IS NOT NULL AND n.tenant_id <> v_keep;

  DELETE FROM public.forecast_scenarios x WHERE x.tenant_id <> v_keep;

  -- ---------------------------------------------------------------------------
  -- Tenant rows (last)
  -- ---------------------------------------------------------------------------
  DELETE FROM public.tenants t WHERE t.id <> v_keep;

  RAISE NOTICE 'delete_all_tenants_except_one: finished; kept tenant_id=%', v_keep;
END $$;

-- Verification:
-- SELECT id, slug, name FROM public.tenants;
-- SELECT COUNT(*) FROM public.tenants;
