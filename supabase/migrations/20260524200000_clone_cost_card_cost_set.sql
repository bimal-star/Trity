-- Clone a cost set with all versions, product entries, and cost lines.
-- Cloned versions are created as draft/unlocked with copied labels (editable via app).

BEGIN;

-- Lineage on cost sets (optional audit trail)
ALTER TABLE public.cost_card_cost_sets
  ADD COLUMN IF NOT EXISTS cloned_from_cost_set_id uuid
  REFERENCES public.cost_card_cost_sets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cost_card_cost_sets_cloned_from
  ON public.cost_card_cost_sets (cloned_from_cost_set_id)
  WHERE cloned_from_cost_set_id IS NOT NULL;

COMMENT ON COLUMN public.cost_card_cost_sets.cloned_from_cost_set_id IS
  'Source cost set when this row was created via clone_cost_card_cost_set.';

-- ---------------------------------------------------------------------------
-- clone_cost_card_cost_set
-- Returns: { cost_set_id, versions: [{ source_version_id, new_version_id, version_number, label }] }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clone_cost_card_cost_set(
  source_cost_set_id uuid,
  new_label text,
  new_effective_date_from date DEFAULT NULL,
  new_effective_date_to date DEFAULT NULL,
  include_archived_versions boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source public.cost_card_cost_sets%ROWTYPE;
  v_new_cost_set_id uuid;
  v_src_version public.cost_card_versions%ROWTYPE;
  v_new_version_id uuid;
  v_version_rows jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF source_cost_set_id IS NULL THEN
    RAISE EXCEPTION 'source_cost_set_id is required';
  END IF;

  IF new_label IS NULL OR btrim(new_label) = '' THEN
    RAISE EXCEPTION 'new_label is required';
  END IF;

  SELECT *
  INTO v_source
  FROM public.cost_card_cost_sets
  WHERE id = source_cost_set_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'source cost set not found';
  END IF;

  IF v_source.tenant_id IS DISTINCT FROM public.app_effective_tenant_id()
     AND NOT public.is_tenants_platform_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF public.app_impersonation_write_blocked() THEN
    RAISE EXCEPTION 'writes blocked while impersonating in read-only mode';
  END IF;

  INSERT INTO public.cost_card_cost_sets (
    tenant_id,
    cost_set_type,
    label,
    effective_date_from,
    effective_date_to,
    status,
    cloned_from_cost_set_id,
    created_by
  )
  VALUES (
    v_source.tenant_id,
    v_source.cost_set_type,
    btrim(new_label),
    COALESCE(new_effective_date_from, v_source.effective_date_from),
    COALESCE(new_effective_date_to, v_source.effective_date_to),
    'active',
    source_cost_set_id,
    auth.uid()
  )
  RETURNING id INTO v_new_cost_set_id;

  FOR v_src_version IN
    SELECT *
    FROM public.cost_card_versions v
    WHERE v.cost_set_id = source_cost_set_id
      AND (
        include_archived_versions
        OR v.status <> 'archived'
      )
    ORDER BY v.version_number ASC
  LOOP
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
      v_new_cost_set_id,
      v_src_version.tenant_id,
      v_src_version.version_number,
      v_src_version.label,
      'draft',
      v_src_version.effective_date,
      false,
      v_src_version.id,
      v_src_version.notes,
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
  WHERE e.version_id = v_src_version.id;

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
   AND oe.version_id = v_src_version.id
  JOIN public.cost_card_product_entries ne
    ON ne.version_id = v_new_version_id
   AND ne.product_id = oe.product_id
   AND ne.customer_id IS NOT DISTINCT FROM oe.customer_id;

    v_version_rows := v_version_rows || jsonb_build_array(
      jsonb_build_object(
        'source_version_id', v_src_version.id,
        'new_version_id', v_new_version_id,
        'version_number', v_src_version.version_number,
        'label', v_src_version.label
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'cost_set_id', v_new_cost_set_id,
    'versions', v_version_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.clone_cost_card_cost_set(uuid, text, date, date, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_cost_card_cost_set(uuid, text, date, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_cost_card_cost_set(uuid, text, date, date, boolean) TO service_role;

COMMIT;
