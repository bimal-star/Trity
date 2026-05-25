-- Per-tenant sellable pack level catalog; replaces fixed packing_level enum for app-defined packs.

-- ---------------------------------------------------------------------------
-- 1) Catalog table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_sellable_pack_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT tenant_sellable_pack_levels_code_format
    CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT tenant_sellable_pack_levels_label_nonempty
    CHECK (char_length(trim(label)) > 0),
  CONSTRAINT uq_tenant_sellable_pack_levels_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_sellable_pack_levels_tenant_id
  ON public.tenant_sellable_pack_levels (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_sellable_pack_levels_tenant_active
  ON public.tenant_sellable_pack_levels (tenant_id, sort_order)
  WHERE is_deleted = false AND is_active = true;

COMMENT ON TABLE public.tenant_sellable_pack_levels IS
  'Per-tenant catalog of sellable pack levels (unit, inner, custom breakpack, etc.).';

CREATE OR REPLACE FUNCTION public.tenant_sellable_pack_levels_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_sellable_pack_levels_before_update ON public.tenant_sellable_pack_levels;
CREATE TRIGGER tenant_sellable_pack_levels_before_update
  BEFORE UPDATE ON public.tenant_sellable_pack_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_sellable_pack_levels_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Seed helper (system levels)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_tenant_sellable_pack_levels(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.tenant_sellable_pack_levels (tenant_id, code, label, sort_order, is_system)
  SELECT p_tenant_id, v.code, v.label, v.sort_order, true
  FROM (
    VALUES
      ('unit',      'Unit',              10),
      ('inner',     'Inner (breakpack)', 20),
      ('case',      'Case',              30),
      ('pallet',    'Pallet',            40),
      ('container', 'Container',         50)
  ) AS v(code, label, sort_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.tenant_sellable_pack_levels l
    WHERE l.tenant_id = p_tenant_id
      AND l.code = v.code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.seed_tenant_sellable_pack_levels(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_tenant_sellable_pack_levels(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_tenant_sellable_pack_levels(uuid) TO service_role;

-- Backfill existing tenants
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_tenant_sellable_pack_levels(r.id);
  END LOOP;
END $$;

-- Auto-seed for new tenants
CREATE OR REPLACE FUNCTION public.trg_tenants_seed_sellable_pack_levels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_tenant_sellable_pack_levels(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_seed_sellable_pack_levels ON public.tenants;
CREATE TRIGGER tenants_seed_sellable_pack_levels
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tenants_seed_sellable_pack_levels();

-- ---------------------------------------------------------------------------
-- 3) Convert enum columns to text (values preserved)
--    vw_products_full references product_barcodes.packing_level — drop first.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.vw_products_full CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'packing_configurations'
      AND column_name = 'level'
      AND udt_name = 'packing_level'
  ) THEN
    ALTER TABLE public.packing_configurations
      ALTER COLUMN level TYPE text USING level::text,
      ALTER COLUMN previous_level TYPE text USING previous_level::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_barcodes'
      AND column_name = 'packing_level'
      AND udt_name = 'packing_level'
  ) THEN
    ALTER TABLE public.product_barcodes
      ALTER COLUMN packing_level DROP DEFAULT;
    ALTER TABLE public.product_barcodes
      ALTER COLUMN packing_level TYPE text USING packing_level::text;
    ALTER TABLE public.product_barcodes
      ALTER COLUMN packing_level SET DEFAULT 'unit';
  END IF;
END $$;

-- Recreate vw_products_full (must match 20260518120000_vw_products_full_category_assignments.sql)
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
-- 4) FK: level must exist in tenant catalog
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_packing_configurations_sellable_pack_level'
  ) THEN
    ALTER TABLE public.packing_configurations
      ADD CONSTRAINT fk_packing_configurations_sellable_pack_level
      FOREIGN KEY (tenant_id, level)
      REFERENCES public.tenant_sellable_pack_levels (tenant_id, code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_packing_configurations_previous_sellable_pack_level'
  ) THEN
    ALTER TABLE public.packing_configurations
      ADD CONSTRAINT fk_packing_configurations_previous_sellable_pack_level
      FOREIGN KEY (tenant_id, previous_level)
      REFERENCES public.tenant_sellable_pack_levels (tenant_id, code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_barcodes_sellable_pack_level'
  ) THEN
    ALTER TABLE public.product_barcodes
      ADD CONSTRAINT fk_product_barcodes_sellable_pack_level
      FOREIGN KEY (tenant_id, packing_level)
      REFERENCES public.tenant_sellable_pack_levels (tenant_id, code);
  END IF;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'tenant_sellable_pack_levels: FK skipped — orphan packing_level rows exist; fix data and re-run';
END $$;

-- ---------------------------------------------------------------------------
-- 5) RLS (tenant + platform super-admin)
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenant_sellable_pack_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bc_tenant_sellable_pack_levels_select ON public.tenant_sellable_pack_levels;
DROP POLICY IF EXISTS bc_tenant_sellable_pack_levels_insert ON public.tenant_sellable_pack_levels;
DROP POLICY IF EXISTS bc_tenant_sellable_pack_levels_update ON public.tenant_sellable_pack_levels;
DROP POLICY IF EXISTS bc_tenant_sellable_pack_levels_delete ON public.tenant_sellable_pack_levels;

CREATE POLICY bc_tenant_sellable_pack_levels_select
  ON public.tenant_sellable_pack_levels FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_tenant_sellable_pack_levels_insert
  ON public.tenant_sellable_pack_levels FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_tenant_sellable_pack_levels_update
  ON public.tenant_sellable_pack_levels FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

CREATE POLICY bc_tenant_sellable_pack_levels_delete
  ON public.tenant_sellable_pack_levels FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_tenants_platform_super_admin()
  );

-- ---------------------------------------------------------------------------
-- 6) Drop unused enum when safe
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'packing_level' AND typnamespace = 'public'::regnamespace) THEN
    -- Enum default ('unit'::packing_level) can outlive ALTER TYPE; clear before DROP TYPE.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'product_barcodes'
        AND column_name = 'packing_level'
    ) THEN
      ALTER TABLE public.product_barcodes
        ALTER COLUMN packing_level DROP DEFAULT;
      ALTER TABLE public.product_barcodes
        ALTER COLUMN packing_level SET DEFAULT 'unit';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE udt_name = 'packing_level'
        AND table_schema = 'public'
    ) THEN
      DROP TYPE public.packing_level;
    END IF;
  END IF;
END $$;
