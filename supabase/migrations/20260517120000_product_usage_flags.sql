-- Product usage flags (sell / purchase / manufacture / BOM component) + vw_products_full refresh.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_sellable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_purchasable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_manufacturable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_component boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_sellable IS 'Product may be sold in sales-facing workflows.';
COMMENT ON COLUMN public.products.is_purchasable IS 'Product may be purchased on purchase orders / supplier pricing.';
COMMENT ON COLUMN public.products.is_manufacturable IS 'Product may be produced (BOM output / production).';
COMMENT ON COLUMN public.products.is_component IS 'Product may be used as a BOM line component.';

-- Heuristic backfill from product_type (existing rows only).
UPDATE public.products
SET
  is_sellable = CASE
    WHEN product_type IN ('raw_material', 'packaging') THEN false
    ELSE true
  END,
  is_purchasable = CASE
    WHEN product_type = 'service' THEN false
    WHEN product_type IN ('finished_good', 'assembly') THEN false
    ELSE true
  END,
  is_manufacturable = CASE
    WHEN product_type IN ('semi_finished', 'assembly') THEN true
    ELSE false
  END,
  is_component = CASE
    WHEN product_type IN ('raw_material', 'semi_finished', 'packaging') THEN true
    ELSE false
  END
WHERE true;

DROP VIEW IF EXISTS public.vw_products_full CASCADE;

CREATE VIEW public.vw_products_full WITH (security_invoker = true) AS
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
      SELECT array_agg(cat.name ORDER BY cat.name)
      FROM public.product_categories pc
      JOIN public.categories cat ON cat.id = pc.category_id AND cat.is_deleted = false
      WHERE pc.product_id = p.id
        AND pc.tenant_id = p.tenant_id
        AND pc.is_deleted = false
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
