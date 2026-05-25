-- Tenant-scoped document / entity code format settings and unified code generation.
-- Replaces ad-hoc per-entity generators with configurable prefix + date + sequence.

-- -----------------------------------------------------------------------------
-- 1) Settings + sequences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_document_code_formats (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  prefix text NOT NULL,
  date_part text NOT NULL DEFAULT 'none'
    CHECK (date_part IN ('none', 'year', 'ymd')),
  sequence_pad integer NOT NULL DEFAULT 5
    CHECK (sequence_pad >= 1 AND sequence_pad <= 12),
  separator text NOT NULL DEFAULT '-'
    CHECK (char_length(separator) <= 3),
  auto_generate boolean NOT NULL DEFAULT true,
  label text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, document_type),
  CONSTRAINT tenant_document_code_formats_document_type_check CHECK (
    document_type IN (
      'product',
      'customer',
      'supplier',
      'warehouse',
      'bom',
      'purchase_order',
      'goods_receipt',
      'category'
    )
  )
);

COMMENT ON TABLE public.tenant_document_code_formats IS
  'Per-tenant format for auto-generated codes (SKU, customer_code, supplier_code, BOM code, PO/GR numbers, etc.).';

CREATE TABLE IF NOT EXISTS public.tenant_document_code_sequences (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  last_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, document_type),
  CONSTRAINT tenant_document_code_sequences_document_type_check CHECK (
    document_type IN (
      'product',
      'customer',
      'supplier',
      'warehouse',
      'bom',
      'purchase_order',
      'goods_receipt',
      'category'
    )
  )
);

CREATE OR REPLACE FUNCTION public.tenant_document_code_formats_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_document_code_formats_before_update ON public.tenant_document_code_formats;
CREATE TRIGGER tenant_document_code_formats_before_update
  BEFORE UPDATE ON public.tenant_document_code_formats
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_document_code_formats_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tenant_document_code_formats_tenant
  ON public.tenant_document_code_formats(tenant_id);

-- -----------------------------------------------------------------------------
-- 2) Default format rows (per document type)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenant_document_code_format_default(
  p_document_type text
)
RETURNS TABLE (
  prefix text,
  date_part text,
  sequence_pad integer,
  separator text,
  auto_generate boolean,
  label text,
  description text
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  CASE p_document_type
    WHEN 'product' THEN
      RETURN QUERY SELECT
        'PRD'::text, 'ymd'::text, 5, '-'::text, false,
        'Product code (SKU)'::text,
        'Auto-fill SKU on new products when enabled. Often entered manually.'::text;
    WHEN 'customer' THEN
      RETURN QUERY SELECT
        'CUS'::text, 'year'::text, 6, '-'::text, true,
        'Customer code'::text,
        'Assigned when customer code is left blank on create.'::text;
    WHEN 'supplier' THEN
      RETURN QUERY SELECT
        'SUP'::text, 'year'::text, 5, '-'::text, true,
        'Supplier code'::text,
        'Assigned when supplier code is left blank on create.'::text;
    WHEN 'warehouse' THEN
      RETURN QUERY SELECT
        'WH'::text, 'ymd'::text, 5, '-'::text, true,
        'Warehouse code'::text,
        'Assigned when warehouse code is left blank on create.'::text;
    WHEN 'bom' THEN
      RETURN QUERY SELECT
        'BOM'::text, 'year'::text, 5, '-'::text, true,
        'BOM code'::text,
        'Unique identifier for a bill of materials header.'::text;
    WHEN 'purchase_order' THEN
      RETURN QUERY SELECT
        'PO'::text, 'ymd'::text, 5, '-'::text, true,
        'Purchase order number'::text,
        'PO number when left blank on create.'::text;
    WHEN 'goods_receipt' THEN
      RETURN QUERY SELECT
        'GR'::text, 'ymd'::text, 5, '-'::text, true,
        'Goods receipt number'::text,
        'GR number when left blank on create.'::text;
    WHEN 'category' THEN
      RETURN QUERY SELECT
        'CAT'::text, 'none'::text, 4, '-'::text, false,
        'Category code'::text,
        'Optional auto code for new categories when enabled.'::text;
    ELSE
      RAISE EXCEPTION 'Unknown document_type: %', p_document_type;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_tenant_document_code_formats(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_type IN ARRAY ARRAY[
    'product', 'customer', 'supplier', 'warehouse', 'bom',
    'purchase_order', 'goods_receipt', 'category'
  ] LOOP
    INSERT INTO public.tenant_document_code_formats (
      tenant_id,
      document_type,
      prefix,
      date_part,
      sequence_pad,
      separator,
      auto_generate,
      label,
      description
    )
    SELECT
      p_tenant_id,
      v_type,
      d.prefix,
      d.date_part,
      d.sequence_pad,
      d.separator,
      d.auto_generate,
      d.label,
      d.description
    FROM public.tenant_document_code_format_default(v_type) AS d
    ON CONFLICT (tenant_id, document_type) DO NOTHING;
  END LOOP;
END;
$$;

-- Seed defaults for all existing tenants
DO $$
DECLARE
  v_tid uuid;
BEGIN
  FOR v_tid IN SELECT id FROM public.tenants LOOP
    PERFORM public.ensure_tenant_document_code_formats(v_tid);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) Render + generate
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_tenant_document_sequence(
  p_tenant_id uuid,
  p_document_type text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next bigint;
BEGIN
  PERFORM public.ensure_tenant_document_code_formats(p_tenant_id);

  INSERT INTO public.tenant_document_code_sequences (tenant_id, document_type, last_value)
  VALUES (p_tenant_id, p_document_type, 0)
  ON CONFLICT (tenant_id, document_type) DO NOTHING;

  UPDATE public.tenant_document_code_sequences
  SET last_value = last_value + 1,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND document_type = p_document_type
  RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION public.render_tenant_document_code(
  p_tenant_id uuid,
  p_document_type text,
  p_sequence bigint
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fmt public.tenant_document_code_formats%ROWTYPE;
  v_sep text;
  v_code text;
BEGIN
  PERFORM public.ensure_tenant_document_code_formats(p_tenant_id);

  SELECT * INTO v_fmt
  FROM public.tenant_document_code_formats
  WHERE tenant_id = p_tenant_id
    AND document_type = p_document_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No format for tenant % type %', p_tenant_id, p_document_type;
  END IF;

  v_sep := COALESCE(v_fmt.separator, '');
  v_code := upper(btrim(v_fmt.prefix));

  IF v_fmt.date_part = 'year' THEN
    v_code := v_code || v_sep || to_char(now() AT TIME ZONE 'UTC', 'YYYY');
  ELSIF v_fmt.date_part = 'ymd' THEN
    v_code := v_code || v_sep || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
  END IF;

  IF v_fmt.date_part <> 'none' THEN
    v_code := v_code || v_sep || lpad(p_sequence::text, v_fmt.sequence_pad, '0');
  ELSE
    v_code := v_code || v_sep || lpad(p_sequence::text, v_fmt.sequence_pad, '0');
  END IF;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_document_code_exists(
  p_tenant_id uuid,
  p_document_type text,
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN false;
  END IF;

  CASE p_document_type
    WHEN 'product' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.products
        WHERE tenant_id = p_tenant_id AND sku = p_code AND is_deleted = false
      );
    WHEN 'customer' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.customers
        WHERE tenant_id = p_tenant_id AND customer_code = p_code
      );
    WHEN 'supplier' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.suppliers
        WHERE tenant_id = p_tenant_id AND supplier_code = p_code AND deleted_at IS NULL
      );
    WHEN 'warehouse' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.warehouses
        WHERE tenant_id = p_tenant_id AND warehouse_code = p_code AND deleted_at IS NULL
      );
    WHEN 'bom' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.bom_headers
        WHERE tenant_id = p_tenant_id AND bom_code = p_code AND is_deleted = false
      );
    WHEN 'purchase_order' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.purchase_orders
        WHERE tenant_id = p_tenant_id AND po_number = p_code
      );
    WHEN 'goods_receipt' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.goods_receipts
        WHERE tenant_id = p_tenant_id AND gr_number = p_code
      );
    WHEN 'category' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.categories
        WHERE tenant_id = p_tenant_id AND code = p_code AND is_deleted = false
      );
    ELSE
      RETURN false;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_tenant_document_code(
  p_tenant_id uuid,
  p_document_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fmt public.tenant_document_code_formats%ROWTYPE;
  v_seq bigint;
  v_code text;
  v_attempt integer := 0;
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id required';
  END IF;

  PERFORM public.ensure_tenant_document_code_formats(p_tenant_id);

  SELECT * INTO v_fmt
  FROM public.tenant_document_code_formats
  WHERE tenant_id = p_tenant_id
    AND document_type = p_document_type;

  IF NOT FOUND OR NOT v_fmt.auto_generate THEN
    RETURN NULL;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_seq := public.next_tenant_document_sequence(p_tenant_id, p_document_type);
    v_code := public.render_tenant_document_code(p_tenant_id, p_document_type, v_seq);

    IF NOT public.tenant_document_code_exists(p_tenant_id, p_document_type, v_code) THEN
      RETURN v_code;
    END IF;

    EXIT WHEN v_attempt >= 100;
  END LOOP;

  RETURN public.render_tenant_document_code(p_tenant_id, p_document_type, v_seq)
    || upper(substring(gen_random_uuid()::text, 1, 4));
END;
$$;

-- -----------------------------------------------------------------------------
-- 4) bom_code column
-- -----------------------------------------------------------------------------
ALTER TABLE public.bom_headers
  ADD COLUMN IF NOT EXISTS bom_code text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bom_headers_tenant_bom_code
  ON public.bom_headers (tenant_id, bom_code)
  WHERE is_deleted = false AND bom_code IS NOT NULL AND btrim(bom_code) <> '';

COMMENT ON COLUMN public.bom_headers.bom_code IS
  'Tenant-unique BOM identifier; auto-generated from tenant_document_code_formats when blank.';

-- -----------------------------------------------------------------------------
-- 5) Unified generators (backward-compatible wrappers)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.generate_customer_code();
DROP FUNCTION IF EXISTS public.generate_customer_code(uuid, text);

CREATE OR REPLACE FUNCTION public.generate_customer_code(p_tenant_id uuid, p_prefix text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_tenant_document_code(p_tenant_id, 'customer');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_supplier_code(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_tenant_document_code(p_tenant_id, 'supplier');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_warehouse_code(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_tenant_document_code(p_tenant_id, 'warehouse');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_purchase_order_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_tenant_document_code(p_tenant_id, 'purchase_order');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_goods_receipt_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_tenant_document_code(p_tenant_id, 'goods_receipt');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_product_sku(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_tenant_document_code(p_tenant_id, 'product');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_bom_code(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_tenant_document_code(p_tenant_id, 'bom');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_category_code(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.generate_tenant_document_code(p_tenant_id, 'category');
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Triggers
-- -----------------------------------------------------------------------------
-- Customers: replace legacy global-sequence trigger
DROP TRIGGER IF EXISTS trigger_generate_customer_code ON public.customers;

CREATE OR REPLACE FUNCTION public.customers_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS NULL OR btrim(NEW.customer_code) = '' THEN
    NEW.customer_code := public.generate_customer_code(NEW.tenant_id);
  END IF;
  IF NEW.status IS NULL THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_before_insert_trigger ON public.customers;
CREATE TRIGGER customers_before_insert_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.customers_before_insert();

CREATE OR REPLACE FUNCTION public.customers_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS NULL OR btrim(NEW.customer_code) = '' THEN
    IF OLD.customer_code IS NOT NULL AND btrim(OLD.customer_code) <> '' THEN
      NEW.customer_code := OLD.customer_code;
    ELSE
      NEW.customer_code := public.generate_customer_code(NEW.tenant_id);
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_before_update_trigger ON public.customers;
CREATE TRIGGER customers_before_update_trigger
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.customers_before_update();

-- Products SKU
CREATE OR REPLACE FUNCTION public.products_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sku text;
BEGIN
  IF NEW.sku IS NULL OR btrim(NEW.sku) = '' THEN
    v_sku := public.generate_product_sku(NEW.tenant_id);
    IF v_sku IS NOT NULL THEN
      NEW.sku := v_sku;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_before_insert_document_code ON public.products;
CREATE TRIGGER products_before_insert_document_code
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_before_insert();

-- BOM code
CREATE OR REPLACE FUNCTION public.bom_headers_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NEW.bom_code IS NULL OR btrim(NEW.bom_code) = '' THEN
    v_code := public.generate_bom_code(NEW.tenant_id);
    IF v_code IS NOT NULL THEN
      NEW.bom_code := v_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bom_headers_before_insert_document_code ON public.bom_headers;
CREATE TRIGGER bom_headers_before_insert_document_code
  BEFORE INSERT ON public.bom_headers
  FOR EACH ROW
  EXECUTE FUNCTION public.bom_headers_before_insert();

-- Categories (optional auto)
CREATE OR REPLACE FUNCTION public.categories_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    v_code := public.generate_category_code(NEW.tenant_id);
    IF v_code IS NOT NULL THEN
      NEW.code := v_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS categories_before_insert_document_code ON public.categories;
CREATE TRIGGER categories_before_insert_document_code
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.categories_before_insert();

-- New tenants: seed formats
CREATE OR REPLACE FUNCTION public.tenants_after_insert_document_code_formats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_tenant_document_code_formats(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_after_insert_document_code_formats ON public.tenants;
CREATE TRIGGER tenants_after_insert_document_code_formats
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.tenants_after_insert_document_code_formats();

-- -----------------------------------------------------------------------------
-- 7) vw_bom_costing: expose bom_code (requires 20260525120000 vw_bom_line_costing)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.vw_bom_costing CASCADE;

CREATE VIEW public.vw_bom_costing
WITH (security_invoker = true) AS
SELECT
  bh.id AS bom_id,
  bh.tenant_id,
  bh.product_id,
  pr.name AS product_name,
  pr.sku AS product_sku,
  bh.bom_code,
  bh.version,
  bh.output_quantity,
  bh.output_unit_id,
  ou.symbol AS output_unit_symbol,
  bh.is_active,
  count(lc.bom_line_id) AS component_count,
  COALESCE(sum(lc.line_total_cost_standard), 0::numeric)::numeric(18, 6) AS total_component_cost,
  COALESCE(sum(lc.line_total_cost_landing), 0::numeric)::numeric(18, 6) AS total_component_cost_landing,
  COALESCE(sum(lc.line_total_cost_last_buy), 0::numeric)::numeric(18, 6) AS total_component_cost_last_buy,
  CASE
    WHEN bh.output_quantity > 0 THEN
      (COALESCE(sum(lc.line_total_cost_standard), 0::numeric) / bh.output_quantity)::numeric(18, 6)
    ELSE NULL
  END AS cost_per_unit,
  CASE
    WHEN bh.output_quantity > 0 THEN
      (COALESCE(sum(lc.line_total_cost_landing), 0::numeric) / bh.output_quantity)::numeric(18, 6)
    ELSE NULL
  END AS cost_per_unit_landing,
  CASE
    WHEN bh.output_quantity > 0 THEN
      (COALESCE(sum(lc.line_total_cost_last_buy), 0::numeric) / bh.output_quantity)::numeric(18, 6)
    ELSE NULL
  END AS cost_per_unit_last_buy
FROM public.bom_headers bh
JOIN public.products pr
  ON pr.id = bh.product_id
 AND pr.tenant_id = bh.tenant_id
 AND pr.is_deleted = false
LEFT JOIN public.units ou
  ON ou.id = bh.output_unit_id
 AND ou.tenant_id = bh.tenant_id
 AND ou.is_deleted = false
LEFT JOIN public.vw_bom_line_costing lc
  ON lc.bom_header_id = bh.id
 AND lc.tenant_id = bh.tenant_id
WHERE bh.is_deleted = false
GROUP BY
  bh.id,
  bh.tenant_id,
  bh.product_id,
  pr.name,
  pr.sku,
  bh.bom_code,
  bh.version,
  bh.output_quantity,
  bh.output_unit_id,
  ou.symbol,
  bh.is_active;

-- -----------------------------------------------------------------------------
-- 8) RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenant_document_code_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_document_code_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bc_tenant_document_code_formats_select ON public.tenant_document_code_formats;
DROP POLICY IF EXISTS bc_tenant_document_code_formats_insert ON public.tenant_document_code_formats;
DROP POLICY IF EXISTS bc_tenant_document_code_formats_update ON public.tenant_document_code_formats;
DROP POLICY IF EXISTS bc_tenant_document_code_formats_select_platform_super_admin ON public.tenant_document_code_formats;

CREATE POLICY bc_tenant_document_code_formats_select ON public.tenant_document_code_formats
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_tenant_document_code_formats_insert ON public.tenant_document_code_formats
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_tenant_document_code_formats_update ON public.tenant_document_code_formats
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_tenant_document_code_formats_select_platform_super_admin
  ON public.tenant_document_code_formats
  FOR SELECT
  USING (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS bc_tenant_document_code_sequences_select ON public.tenant_document_code_sequences;
CREATE POLICY bc_tenant_document_code_sequences_select ON public.tenant_document_code_sequences
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

-- Sequences mutated only by SECURITY DEFINER functions (no direct client writes).

GRANT SELECT, INSERT, UPDATE ON public.tenant_document_code_formats TO authenticated;
GRANT SELECT ON public.tenant_document_code_sequences TO authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_tenant_document_code_formats(uuid) TO authenticated;
