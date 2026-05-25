-- Rename Cost Card "scenarios" → "cost sets" (UI term: Cost Sets).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Table + column renames
-- ---------------------------------------------------------------------------
ALTER TABLE public.cost_card_scenarios RENAME TO cost_card_cost_sets;

ALTER TABLE public.cost_card_cost_sets
  RENAME COLUMN scenario_type TO cost_set_type;

ALTER TABLE public.cost_card_versions
  RENAME COLUMN scenario_id TO cost_set_id;

-- ---------------------------------------------------------------------------
-- 2) Constraints
-- ---------------------------------------------------------------------------
ALTER TABLE public.cost_card_cost_sets
  RENAME CONSTRAINT chk_cost_card_scenarios_scenario_type
  TO chk_cost_card_cost_sets_cost_set_type;

ALTER TABLE public.cost_card_cost_sets
  RENAME CONSTRAINT chk_cost_card_scenarios_status
  TO chk_cost_card_cost_sets_status;

ALTER TABLE public.cost_card_versions
  RENAME CONSTRAINT uq_cost_card_versions_scenario_version
  TO uq_cost_card_versions_cost_set_version;

ALTER TABLE public.cost_card_versions
  RENAME CONSTRAINT cost_card_versions_scenario_id_fkey
  TO cost_card_versions_cost_set_id_fkey;

-- ---------------------------------------------------------------------------
-- 3) Indexes
-- ---------------------------------------------------------------------------
ALTER INDEX IF EXISTS idx_cost_card_scenarios_tenant_id
  RENAME TO idx_cost_card_cost_sets_tenant_id;

ALTER INDEX IF EXISTS idx_cost_card_scenarios_tenant_type
  RENAME TO idx_cost_card_cost_sets_tenant_type;

ALTER INDEX IF EXISTS idx_cost_card_versions_scenario_id
  RENAME TO idx_cost_card_versions_cost_set_id;

ALTER INDEX IF EXISTS uq_cost_card_versions_one_active_per_scenario
  RENAME TO uq_cost_card_versions_one_active_per_cost_set;

-- ---------------------------------------------------------------------------
-- 4) Trigger function + trigger
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.cost_card_scenarios_set_updated_at()
  RENAME TO cost_card_cost_sets_set_updated_at;

ALTER TRIGGER cost_card_scenarios_before_update
  ON public.cost_card_cost_sets
  RENAME TO cost_card_cost_sets_before_update;

-- ---------------------------------------------------------------------------
-- 5) Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.cost_card_cost_sets IS
  'Cost card cost sets (live, budget, quarterly, etc.).';

COMMENT ON TABLE public.cost_card_versions IS
  'Versioned cost card snapshots within a cost set; one active version per cost set.';

-- ---------------------------------------------------------------------------
-- 6) RLS policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS cost_card_scenarios_select ON public.cost_card_cost_sets;
DROP POLICY IF EXISTS cost_card_scenarios_insert ON public.cost_card_cost_sets;
DROP POLICY IF EXISTS cost_card_scenarios_update ON public.cost_card_cost_sets;
DROP POLICY IF EXISTS cost_card_scenarios_delete ON public.cost_card_cost_sets;

CREATE POLICY cost_card_cost_sets_select ON public.cost_card_cost_sets
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

CREATE POLICY cost_card_cost_sets_insert ON public.cost_card_cost_sets
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_card_cost_sets_update ON public.cost_card_cost_sets
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_card_cost_sets_delete ON public.cost_card_cost_sets
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

-- ---------------------------------------------------------------------------
-- 7) clone_cost_card_version — use cost_set_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clone_cost_card_version(
  source_version_id uuid,
  new_label text,
  new_effective_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.cost_card_versions%ROWTYPE;
  v_new_version_id uuid;
  v_next_version_number integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF source_version_id IS NULL THEN
    RAISE EXCEPTION 'source_version_id is required';
  END IF;

  IF new_effective_date IS NULL THEN
    RAISE EXCEPTION 'new_effective_date is required';
  END IF;

  SELECT *
  INTO v_source
  FROM public.cost_card_versions
  WHERE id = source_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'source version not found';
  END IF;

  IF v_source.tenant_id IS DISTINCT FROM public.app_effective_tenant_id()
     AND NOT public.is_tenants_platform_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF public.app_impersonation_write_blocked() THEN
    RAISE EXCEPTION 'writes blocked while impersonating in read-only mode';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version_number
  FROM public.cost_card_versions
  WHERE cost_set_id = v_source.cost_set_id;

  INSERT INTO public.cost_card_versions (
    cost_set_id,
    tenant_id,
    version_number,
    label,
    status,
    effective_date,
    locked,
    cloned_from_version_id,
    notes,
    created_by
  )
  VALUES (
    v_source.cost_set_id,
    v_source.tenant_id,
    v_next_version_number,
    new_label,
    'draft',
    new_effective_date,
    false,
    source_version_id,
    v_source.notes,
    auth.uid()
  )
  RETURNING id INTO v_new_version_id;

  INSERT INTO public.cost_card_product_entries (
    version_id,
    tenant_id,
    product_id,
    customer_id,
    base_currency,
    selling_price_resolved,
    target_margin_pct,
    notes
  )
  SELECT
    v_new_version_id,
    e.tenant_id,
    e.product_id,
    e.customer_id,
    e.base_currency,
    e.selling_price_resolved,
    e.target_margin_pct,
    e.notes
  FROM public.cost_card_product_entries e
  WHERE e.version_id = source_version_id;

  INSERT INTO public.cost_lines (
    entry_id,
    tenant_id,
    block_type,
    component_product_id,
    supplier_id,
    logistics_rate_card_id,
    logistics_rate_line_id,
    description,
    quantity,
    uom,
    resolved_unit_cost,
    source_currency,
    exchange_rate,
    exchange_rate_date,
    converted_cost,
    is_manual_override,
    is_locked,
    sort_order,
    notes
  )
  SELECT
    ne.id,
    cl.tenant_id,
    cl.block_type,
    cl.component_product_id,
    cl.supplier_id,
    cl.logistics_rate_card_id,
    cl.logistics_rate_line_id,
    cl.description,
    cl.quantity,
    cl.uom,
    cl.resolved_unit_cost,
    cl.source_currency,
    cl.exchange_rate,
    cl.exchange_rate_date,
    cl.converted_cost,
    cl.is_manual_override,
    cl.is_locked,
    cl.sort_order,
    cl.notes
  FROM public.cost_lines cl
  JOIN public.cost_card_product_entries oe
    ON oe.id = cl.entry_id
   AND oe.version_id = source_version_id
  JOIN public.cost_card_product_entries ne
    ON ne.version_id = v_new_version_id
   AND ne.product_id = oe.product_id
   AND ne.customer_id IS NOT DISTINCT FROM oe.customer_id;

  RETURN v_new_version_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_cost_card_version(uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_cost_card_version(uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_cost_card_version(uuid, text, date) TO service_role;

-- ---------------------------------------------------------------------------
-- 8) hard_delete_tenant — reference new table name
-- ---------------------------------------------------------------------------
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
  PERFORM public._hard_delete_tenant_rows(p_tenant_id, 'cost_card_cost_sets');

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

COMMIT;
