-- Fix hard_delete_tenant: delete product_barcodes and packing_configurations before tenant_sellable_pack_levels.

CREATE OR REPLACE FUNCTION public.hard_delete_tenant(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_is_template boolean;
  v_schema_name text;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'hard_delete_tenant: tenant id is required';
  END IF;

  SELECT t.name, COALESCE(t.is_template, false)
  INTO v_name, v_is_template
  FROM public.tenants t
  WHERE t.id = p_tenant_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'hard_delete_tenant: tenant % not found', p_tenant_id;
  END IF;

  IF v_is_template THEN
    RAISE EXCEPTION 'hard_delete_tenant: cannot delete template tenant %', p_tenant_id;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  SELECT ts.schema_name INTO v_schema_name
  FROM public.tenant_schemas ts
  WHERE ts.tenant_id = p_tenant_id;

  IF v_schema_name IS NOT NULL AND length(trim(v_schema_name)) > 0 THEN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema_name);
  END IF;

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'cost_lines');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'cost_card_product_entries');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'cost_card_versions');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'cost_card_scenarios');

  IF to_regclass('public.logistics_rate_lines') IS NOT NULL
     AND to_regclass('public.logistics_rate_cards') IS NOT NULL THEN
    DELETE FROM public.logistics_rate_lines l
    WHERE l.rate_card_id IN (
      SELECT c.id FROM public.logistics_rate_cards c WHERE c.tenant_id = p_tenant_id
    );
  END IF;

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'logistics_rate_cards');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'exchange_rates');

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'ai_usage_logs');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'ai_threads');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'feature_provisioning_log');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'tenant_schemas');
  -- tenant_sellable_pack_levels: after product_barcodes + packing_configurations (FK below)
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'tenant_catalogue_settings');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'tenant_products_list_settings');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'product_list_saved_views');

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'user_module_access');

  IF to_regclass('public.group_module_access') IS NOT NULL THEN
    DELETE FROM public.group_module_access gma
    WHERE gma.group_id IN (SELECT ug.id FROM public.user_groups ug WHERE ug.tenant_id = p_tenant_id);
  END IF;

  IF to_regclass('public.group_resource_grants') IS NOT NULL THEN
    DELETE FROM public.group_resource_grants grg
    WHERE grg.group_id IN (SELECT ug.id FROM public.user_groups ug WHERE ug.tenant_id = p_tenant_id);
  END IF;

  IF to_regclass('public.group_members') IS NOT NULL THEN
    DELETE FROM public.group_members gm
    WHERE gm.group_id IN (SELECT ug.id FROM public.user_groups ug WHERE ug.tenant_id = p_tenant_id);
  END IF;

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'tenant_invites');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'user_resource_grants');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'user_tenants');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'role_resource_grants');

  IF to_regclass('public.tenant_impersonation_audit') IS NOT NULL THEN
    DELETE FROM public.tenant_impersonation_audit a
    WHERE a.target_tenant_id = p_tenant_id;
  END IF;

  IF to_regclass('public.permission_actions') IS NOT NULL
     AND to_regclass('public.permission_resources') IS NOT NULL THEN
    DELETE FROM public.permission_actions pa
    WHERE pa.resource_id IN (
      SELECT pr.id FROM public.permission_resources pr WHERE pr.tenant_id = p_tenant_id
    );
  END IF;

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'permission_resources');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'user_profiles');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'user_groups');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'audit_logs');

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'goods_receipt_lines');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'goods_receipts');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'supplier_invoice_lines');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'supplier_invoices');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'purchase_order_lines');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'purchase_orders');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'supplier_product_prices');

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'bom_lines');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'production_plans');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'bom_headers');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'demand_forecasts');

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'product_activity_log');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'product_metrics');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'product_cost_history');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'packing_configurations');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'stock_transactions');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'stock_levels');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'product_barcodes');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'tenant_sellable_pack_levels');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'product_categories');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'price_list_items');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'products');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'product_groups');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'attribute_definitions');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'categories');

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'customer_addresses');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'customer_attachments');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'customer_contacts');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'customer_notes');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'customers');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'suppliers');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'warehouses');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'price_lists');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'unit_conversions');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'units');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'retailer_weeks');
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'calendar');

  IF to_regclass('public.navigation') IS NOT NULL THEN
    DELETE FROM public.navigation n
    WHERE n.tenant_id = p_tenant_id;
  END IF;

  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'forecast_scenarios');

  DELETE FROM public.tenants t WHERE t.id = p_tenant_id;

  RETURN jsonb_build_object(
    'deleted_tenant_id', p_tenant_id,
    'deleted_tenant_name', v_name,
    'dropped_schema', v_schema_name
  );
END;
$$;
