-- Flexible product catalogue: tenant mode, product groups, variants as product rows.
-- Replaces legacy product_variants (child rows under one parent) with product_group_id + variant_attributes.

-- -----------------------------------------------------------------------------
-- 1.1 Tenant catalogue mode
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS catalogue_mode text NOT NULL DEFAULT 'simple'
    CHECK (catalogue_mode IN ('simple', 'grouped', 'matrix'));

COMMENT ON COLUMN public.tenants.catalogue_mode IS
  'simple: flat product list, no groups or variants. '
  'grouped: products may belong to product_groups for catalogue organisation. '
  'matrix: products belong to groups with attribute dimensions (e.g. size x colour).';

-- -----------------------------------------------------------------------------
-- 1.2 product_groups
-- No shared set_updated_at() exists in this repo; masters use per-table BEFORE UPDATE
-- triggers (e.g. suppliers_before_update). Same pattern here.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  attribute_dimensions jsonb,
  image_url text,
  tags text[],
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.product_groups_set_updated_at()
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

DROP TRIGGER IF EXISTS product_groups_before_update ON public.product_groups;
CREATE TRIGGER product_groups_before_update
  BEFORE UPDATE ON public.product_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.product_groups_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_product_groups_tenant_id
  ON public.product_groups(tenant_id);

CREATE INDEX IF NOT EXISTS idx_product_groups_tenant_active
  ON public.product_groups(tenant_id)
  WHERE is_deleted = false AND is_active = true;

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bc_product_groups_select ON public.product_groups;
DROP POLICY IF EXISTS bc_product_groups_insert ON public.product_groups;
DROP POLICY IF EXISTS bc_product_groups_update ON public.product_groups;
DROP POLICY IF EXISTS bc_product_groups_delete ON public.product_groups;
DROP POLICY IF EXISTS bc_product_groups_select_platform_super_admin ON public.product_groups;

CREATE POLICY bc_product_groups_select ON public.product_groups FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_product_groups_insert ON public.product_groups FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_product_groups_update ON public.product_groups FOR UPDATE
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

CREATE POLICY bc_product_groups_delete ON public.product_groups FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY bc_product_groups_select_platform_super_admin ON public.product_groups FOR SELECT
  USING (public.is_tenants_platform_super_admin());

-- -----------------------------------------------------------------------------
-- 1.3 products: group + variant attributes (each variant is a full product row)
-- -----------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_group_id uuid REFERENCES public.product_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb;

CREATE INDEX IF NOT EXISTS idx_products_product_group_id
  ON public.products(product_group_id);

-- -----------------------------------------------------------------------------
-- 1.4 Drop legacy product_variants (replaced by product rows in a group)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.product_variants;

-- -----------------------------------------------------------------------------
-- Recreate list view (column order: append group fields after tracks_inventory)
-- -----------------------------------------------------------------------------
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
