-- BOM costing: product default waste %, purchase last-buy view, line/header costing views.
-- All views use security_invoker so underlying table RLS (tenant_id via user_profiles) applies.
-- bom_headers / bom_lines already have bc_* RLS from business_core_schema_consolidation.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Product master: default waste % (used when adding BOM components)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS waste_percentage numeric(9,4);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_waste_pct'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT chk_products_waste_pct
      CHECK (
        waste_percentage IS NULL
        OR (waste_percentage >= 0 AND waste_percentage <= 100)
      ) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.products.waste_percentage IS
  'Default manufacturing waste % for this SKU; copied to bom_lines on insert unless line waste is set.';

-- ---------------------------------------------------------------------------
-- 2) Pricing helpers (immutable math; tenant scope enforced by caller views)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.po_line_net_unit_price(
  p_qty numeric,
  p_unit_price numeric,
  p_discount_pct numeric DEFAULT 0,
  p_discount_amount numeric DEFAULT 0
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(p_qty, 0) > 0 THEN
      GREATEST(
        0::numeric,
        (
          COALESCE(p_qty, 0) * COALESCE(p_unit_price, 0)
            * (1 - COALESCE(p_discount_pct, 0) / 100)
          - COALESCE(p_discount_amount, 0)
        ) / COALESCE(p_qty, 0)
      )
    ELSE 0::numeric
  END;
$$;

COMMENT ON FUNCTION public.po_line_net_unit_price(numeric, numeric, numeric, numeric) IS
  'Net unit price after line discount; mirrors lib/purchaseLinePricing.poLineNetUnitPrice.';

CREATE OR REPLACE FUNCTION public.bom_effective_quantity(
  p_quantity numeric,
  p_waste_pct numeric DEFAULT 0
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT COALESCE(p_quantity, 0) * (1 + COALESCE(p_waste_pct, 0) / 100);
$$;

COMMENT ON FUNCTION public.bom_effective_quantity(numeric, numeric) IS
  'BOM line quantity including waste percentage.';

-- ---------------------------------------------------------------------------
-- 3) Default bom_lines.waste_percentage from component product on INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bom_lines_default_waste_from_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_waste numeric;
BEGIN
  IF NEW.waste_percentage IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.waste_percentage
  INTO v_waste
  FROM public.products p
  WHERE p.id = NEW.component_product_id
    AND p.tenant_id = NEW.tenant_id
    AND p.is_deleted = false;

  NEW.waste_percentage := v_waste;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bom_lines_default_waste_from_product_trigger ON public.bom_lines;
CREATE TRIGGER bom_lines_default_waste_from_product_trigger
  BEFORE INSERT ON public.bom_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.bom_lines_default_waste_from_product();

-- Optional backfill: lines with null waste inherit product default where set
UPDATE public.bom_lines bl
SET waste_percentage = p.waste_percentage
FROM public.products p
WHERE bl.component_product_id = p.id
  AND bl.tenant_id = p.tenant_id
  AND bl.is_deleted = false
  AND p.is_deleted = false
  AND bl.waste_percentage IS NULL
  AND p.waste_percentage IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4) Last purchase price per product (tenant-scoped; PO RLS applies via invoker)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_tenant_product_created
  ON public.purchase_order_lines (tenant_id, product_id, created_at DESC);

CREATE OR REPLACE VIEW public.vw_product_last_purchase_price
WITH (security_invoker = true) AS
SELECT DISTINCT ON (pol.tenant_id, pol.product_id)
  pol.tenant_id,
  pol.product_id,
  pol.created_at AS purchased_at,
  po.order_date AS purchase_order_date,
  po.id AS purchase_order_id,
  po.po_number,
  po.status AS purchase_order_status,
  public.po_line_net_unit_price(
    pol.quantity_ordered,
    pol.unit_price,
    pol.discount_pct,
    pol.discount_amount
  )::numeric(18, 6) AS last_buy_unit_price,
  pol.uom AS last_buy_uom,
  po.currency
FROM public.purchase_order_lines pol
JOIN public.purchase_orders po
  ON po.id = pol.purchase_order_id
 AND po.tenant_id = pol.tenant_id
WHERE po.status NOT IN ('draft', 'cancelled')
ORDER BY pol.tenant_id, pol.product_id, pol.created_at DESC;

COMMENT ON VIEW public.vw_product_last_purchase_price IS
  'Latest net purchase unit price per tenant/product (excludes draft/cancelled POs).';

-- ---------------------------------------------------------------------------
-- 5) BOM line costing (read model for BOM editor grid)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_bom_line_costing
WITH (security_invoker = true) AS
SELECT
  bl.id AS bom_line_id,
  bl.bom_header_id,
  bl.tenant_id,
  bl.sequence,
  bl.component_product_id,
  comp.sku AS component_sku,
  comp.name AS component_name,
  bl.quantity,
  bl.unit_id,
  COALESCE(lu.symbol, bu.symbol) AS uom_symbol,
  bu.symbol AS base_unit_symbol,
  bl.waste_percentage AS line_waste_percentage,
  comp.waste_percentage AS product_waste_percentage,
  public.bom_effective_quantity(bl.quantity, bl.waste_percentage)::numeric(18, 6) AS effective_quantity,
  comp.cost_price::numeric(18, 6) AS standard_unit_cost,
  comp.weighted_avg_unit_cost::numeric(18, 6) AS avg_landing_unit_cost,
  lp.last_buy_unit_price,
  lp.last_buy_uom,
  lp.currency AS last_buy_currency,
  (
    public.bom_effective_quantity(bl.quantity, bl.waste_percentage)
    * COALESCE(comp.cost_price, comp.sell_price, 0::numeric)
  )::numeric(18, 6) AS line_total_cost_standard,
  (
    public.bom_effective_quantity(bl.quantity, bl.waste_percentage)
    * COALESCE(comp.weighted_avg_unit_cost, comp.cost_price, comp.sell_price, 0::numeric)
  )::numeric(18, 6) AS line_total_cost_landing,
  (
    public.bom_effective_quantity(bl.quantity, bl.waste_percentage)
    * COALESCE(
        lp.last_buy_unit_price,
        comp.weighted_avg_unit_cost,
        comp.cost_price,
        comp.sell_price,
        0::numeric
      )
  )::numeric(18, 6) AS line_total_cost_last_buy
FROM public.bom_lines bl
JOIN public.bom_headers bh
  ON bh.id = bl.bom_header_id
 AND bh.tenant_id = bl.tenant_id
 AND bh.is_deleted = false
JOIN public.products comp
  ON comp.id = bl.component_product_id
 AND comp.tenant_id = bl.tenant_id
 AND comp.is_deleted = false
LEFT JOIN public.units lu
  ON lu.id = bl.unit_id
 AND lu.tenant_id = bl.tenant_id
 AND lu.is_deleted = false
LEFT JOIN public.units bu
  ON bu.id = comp.base_unit_id
 AND bu.tenant_id = comp.tenant_id
 AND bu.is_deleted = false
LEFT JOIN public.vw_product_last_purchase_price lp
  ON lp.tenant_id = bl.tenant_id
 AND lp.product_id = bl.component_product_id
WHERE bl.is_deleted = false;

COMMENT ON VIEW public.vw_bom_line_costing IS
  'Per-line BOM costing: qty, UOM, waste, standard/landing/last-buy unit costs and line totals.';

-- ---------------------------------------------------------------------------
-- 6) BOM header rollup (extends vw_bom_costing; keeps legacy column names)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.vw_bom_costing CASCADE;

CREATE VIEW public.vw_bom_costing
WITH (security_invoker = true) AS
SELECT
  bh.id AS bom_id,
  bh.tenant_id,
  bh.product_id,
  pr.name AS product_name,
  pr.sku AS product_sku,
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
  bh.version,
  bh.output_quantity,
  bh.output_unit_id,
  ou.symbol,
  bh.is_active;

COMMENT ON VIEW public.vw_bom_costing IS
  'BOM header rollup with waste-aware totals (standard, landing/WAC, last purchase) and per-output-unit costs.';

-- ---------------------------------------------------------------------------
-- 7) vw_products_full: expose waste_percentage on product read model
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.vw_products_full CASCADE;

CREATE VIEW public.vw_products_full
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.user_id,
  p.sku,
  p.name,
  p.description,
  p.short_description,
  p.product_type,
  p.industry_type,
  p.category_id,
  p.base_unit_id,
  p.status,
  p.cost_price,
  p.sell_price,
  p.currency,
  p.weight,
  p.weight_unit_id,
  p.length,
  p.width,
  p.height,
  p.dimension_unit_id,
  p.volume,
  p.volume_unit_id,
  p.min_stock_level,
  p.max_stock_level,
  p.reorder_point,
  p.reorder_quantity,
  p.lead_time_days,
  p.weighted_avg_unit_cost,
  p.waste_percentage,
  p.shelf_life_days,
  p.storage_conditions,
  p.allergens,
  p.certifications,
  p.safety_rating,
  p.default_supplier_id,
  p.manufacturer_part_number,
  p.batch_tracked,
  p.serial_tracked,
  p.lot_controlled,
  p.image_url,
  p.images,
  p.documents,
  p.specifications_url,
  p.attributes,
  p.metadata,
  p.tags,
  p.is_active,
  p.created_at,
  p.updated_at,
  p.created_by,
  p.updated_by,
  p.external_system,
  p.external_id,
  p.integration_metadata,
  p.last_synced_at,
  p.tenant_id,
  p.is_deleted,
  p.tracks_inventory,
  p.is_sellable,
  p.is_purchasable,
  p.is_manufacturable,
  p.is_component,
  p.product_group_id,
  p.variant_attributes,
  pg.name AS product_group_name,
  pg.attribute_dimensions AS product_group_attribute_dimensions,
  c.name AS category_name,
  c.code AS category_code,
  bu.symbol AS base_unit_symbol,
  wu.symbol AS weight_unit_symbol,
  du.symbol AS dimension_unit_symbol,
  vu.symbol AS volume_unit_symbol,
  COALESCE(
    (
      SELECT array_agg(combined.name ORDER BY combined.name)
      FROM (
        SELECT cn.name
        FROM public.product_category_assignments pca
        JOIN public.category_nodes cn
          ON cn.id = pca.category_node_id
          AND cn.tenant_id = pca.tenant_id
          AND cn.is_active = true
        WHERE pca.product_id = p.id
          AND pca.tenant_id = p.tenant_id
        UNION
        SELECT cat.name
        FROM public.product_categories pc
        JOIN public.categories cat ON cat.id = pc.category_id AND cat.is_deleted = false
        WHERE pc.product_id = p.id
          AND pc.tenant_id = p.tenant_id
          AND pc.is_deleted = false
      ) AS combined(name)
    ),
    ARRAY[]::text[]
  ) AS category_names,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pb.id,
          'barcode', pb.barcode,
          'barcode_type', pb.barcode_type,
          'is_primary', pb.is_primary,
          'packing_level', pb.packing_level,
          'quantity', pb.quantity
        )
        ORDER BY pb.is_primary DESC NULLS LAST, pb.created_at NULLS LAST
      )
      FROM public.product_barcodes pb
      WHERE pb.product_id = p.id AND pb.is_deleted = false
    ),
    '[]'::jsonb
  ) AS barcodes,
  COALESCE(
    (
      SELECT sum(sl.quantity)
      FROM public.stock_levels sl
      WHERE sl.product_id = p.id AND sl.is_deleted = false
    ),
    0::numeric
  ) AS total_stock
FROM public.products p
LEFT JOIN public.product_groups pg
  ON pg.id = p.product_group_id
  AND pg.tenant_id = p.tenant_id
  AND pg.is_deleted = false
LEFT JOIN public.categories c ON c.id = p.category_id AND c.is_deleted = false
LEFT JOIN public.units bu ON bu.id = p.base_unit_id AND bu.is_deleted = false
LEFT JOIN public.units wu ON wu.id = p.weight_unit_id AND wu.is_deleted = false
LEFT JOIN public.units du ON du.id = p.dimension_unit_id AND du.is_deleted = false
LEFT JOIN public.units vu ON vu.id = p.volume_unit_id AND vu.is_deleted = false;

-- ---------------------------------------------------------------------------
-- 8) Navigation: Bills of Materials under Business Core (existing tenants + seed)
-- ---------------------------------------------------------------------------
INSERT INTO public.navigation (tenant_id, label, path, "position", is_enabled, is_deleted)
SELECT t.id, v.label, v.path, v.pos, true, false
FROM public.tenants t
CROSS JOIN (VALUES
  ('Bills of Materials', '/boms', '2.1.4')
) AS v(label, path, pos)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.navigation n
  WHERE n.tenant_id = t.id
    AND n.path = v.path
    AND n.is_deleted = false
);

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
    ('Logistics', '/logistics', '1.26'),
    ('Inventory', '/analytics/inventory', '1.3'),
    ('Business Core', NULL, '2'),
    ('Products', '/products', '2.1'),
    ('New product', '/products/new', '2.1.1'),
    ('Price lists', '/products/price-lists', '2.1.2'),
    ('Cost Card', '/cost-card', '2.1.3'),
    ('Bills of Materials', '/boms', '2.1.4'),
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

COMMIT;
