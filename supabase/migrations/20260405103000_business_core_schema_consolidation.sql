-- Business Core schema consolidation (Architect spec)
-- Source: types/Supabase Snippet Public Schema Column Catalog.csv + schema audit docs
-- Idempotent where possible; requires public.tenants and business tables to exist.

-- =============================================================================
-- 0) Optional: forecast scenarios (supports demand_forecasts.forecast_scenario_id)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.forecast_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1
);

DO $$
BEGIN
  IF to_regclass('public.forecast_scenarios') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_forecast_scenarios_tenant_code'
  ) THEN
    ALTER TABLE public.forecast_scenarios
      ADD CONSTRAINT uq_forecast_scenarios_tenant_code UNIQUE (tenant_id, code);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 1) calendar.tenant_id NOT NULL (backfill then enforce)
-- =============================================================================
DO $$
DECLARE
  v_tenant uuid;
BEGIN
  IF to_regclass('public.calendar') IS NULL THEN
    RETURN;
  END IF;
  SELECT id INTO v_tenant FROM public.tenants ORDER BY created_at ASC NULLS LAST LIMIT 1;
  IF v_tenant IS NOT NULL THEN
    UPDATE public.calendar SET tenant_id = v_tenant WHERE tenant_id IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calendar'
      AND column_name = 'tenant_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.calendar ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- 2) attribute_definitions.created_at NOT NULL
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.attribute_definitions') IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.attribute_definitions SET created_at = now() WHERE created_at IS NULL;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attribute_definitions'
      AND column_name = 'created_at' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.attribute_definitions
      ALTER COLUMN created_at SET DEFAULT now(),
      ALTER COLUMN created_at SET NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- 3) categories.metadata NOT NULL
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.categories') IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.categories SET metadata = '{}'::jsonb WHERE metadata IS NULL;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories'
      AND column_name = 'metadata' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.categories
      ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
      ALTER COLUMN metadata SET NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- 4) Integration columns (masters)
-- =============================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS external_system text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS external_system text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS external_system text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.packing_configurations ADD COLUMN IF NOT EXISTS external_system text;
ALTER TABLE public.packing_configurations ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.packing_configurations ADD COLUMN IF NOT EXISTS integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.packing_configurations ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.product_barcodes ADD COLUMN IF NOT EXISTS external_system text;
ALTER TABLE public.product_barcodes ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.product_barcodes ADD COLUMN IF NOT EXISTS integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.product_barcodes ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.bom_headers ADD COLUMN IF NOT EXISTS external_system text;
ALTER TABLE public.bom_headers ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.bom_headers ADD COLUMN IF NOT EXISTS integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.bom_headers ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- =============================================================================
-- 5) Forecasting: demand_forecasts + retailer_weeks
-- =============================================================================
ALTER TABLE public.demand_forecasts ADD COLUMN IF NOT EXISTS scenario_code text NOT NULL DEFAULT 'default';
ALTER TABLE public.demand_forecasts ADD COLUMN IF NOT EXISTS time_grain text NOT NULL DEFAULT 'month';
ALTER TABLE public.demand_forecasts ADD COLUMN IF NOT EXISTS unit_id uuid;
ALTER TABLE public.demand_forecasts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.demand_forecasts ADD COLUMN IF NOT EXISTS supersedes_forecast_id uuid;
ALTER TABLE public.demand_forecasts ADD COLUMN IF NOT EXISTS customer_ref uuid;
ALTER TABLE public.demand_forecasts ADD COLUMN IF NOT EXISTS location_ref uuid;
ALTER TABLE public.demand_forecasts ADD COLUMN IF NOT EXISTS forecast_scenario_id uuid;

DO $$
BEGIN
  IF to_regclass('public.demand_forecasts') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_demand_forecasts_time_grain'
  ) THEN
    ALTER TABLE public.demand_forecasts ADD CONSTRAINT chk_demand_forecasts_time_grain
      CHECK (time_grain IN ('day', 'week', 'month', 'quarter')) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_demand_forecasts_status'
  ) THEN
    ALTER TABLE public.demand_forecasts ADD CONSTRAINT chk_demand_forecasts_status
      CHECK (status IN ('draft', 'submitted', 'approved', 'superseded')) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_demand_forecasts_period'
  ) THEN
    ALTER TABLE public.demand_forecasts ADD CONSTRAINT chk_demand_forecasts_period
      CHECK (period_end >= period_start) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_demand_forecasts_qty_nonneg'
  ) THEN
    ALTER TABLE public.demand_forecasts ADD CONSTRAINT chk_demand_forecasts_qty_nonneg
      CHECK (forecast_quantity >= 0) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.retailer_weeks ADD COLUMN IF NOT EXISTS sales_channel text;
ALTER TABLE public.retailer_weeks ADD COLUMN IF NOT EXISTS external_customer_code text;

-- =============================================================================
-- 6) Financial: price_lists / price_list_items / product_cost_history + precision
-- =============================================================================
ALTER TABLE public.price_lists ADD COLUMN IF NOT EXISTS rounding_mode text;
ALTER TABLE public.price_lists ADD COLUMN IF NOT EXISTS tax_inclusive boolean NOT NULL DEFAULT false;

ALTER TABLE public.price_list_items ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.product_cost_history ADD COLUMN IF NOT EXISTS effective_to date;

DO $$
BEGIN
  IF to_regclass('public.product_cost_history') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_cost_history_effective'
  ) THEN
    ALTER TABLE public.product_cost_history ADD CONSTRAINT chk_product_cost_history_effective
      CHECK (effective_to IS NULL OR effective_to >= effective_from) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.price_list_items') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_price_list_items_min_qty'
  ) THEN
    ALTER TABLE public.price_list_items ADD CONSTRAINT chk_price_list_items_min_qty
      CHECK (min_quantity > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_price_list_items_max_qty'
  ) THEN
    ALTER TABLE public.price_list_items ADD CONSTRAINT chk_price_list_items_max_qty
      CHECK (max_quantity IS NULL OR max_quantity >= min_quantity) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_cost_nonneg'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_cost_nonneg
      CHECK (cost_price IS NULL OR cost_price >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_sell_nonneg'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_sell_nonneg
      CHECK (sell_price IS NULL OR sell_price >= 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.product_cost_history') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_cost_history_cost_nonneg'
  ) THEN
    ALTER TABLE public.product_cost_history ADD CONSTRAINT chk_product_cost_history_cost_nonneg
      CHECK (cost_price >= 0) NOT VALID;
  END IF;
END $$;

-- Money precision (single standard: numeric(18,6))
DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RETURN;
  END IF;
  BEGIN
    ALTER TABLE public.products
      ALTER COLUMN cost_price TYPE numeric(18,6) USING cost_price::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.products
      ALTER COLUMN sell_price TYPE numeric(18,6) USING sell_price::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF to_regclass('public.price_list_items') IS NULL THEN
    RETURN;
  END IF;
  BEGIN
    ALTER TABLE public.price_list_items
      ALTER COLUMN unit_price TYPE numeric(18,6) USING unit_price::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.price_list_items
      ALTER COLUMN min_quantity TYPE numeric(18,6) USING min_quantity::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.price_list_items
      ALTER COLUMN max_quantity TYPE numeric(18,6) USING max_quantity::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF to_regclass('public.product_cost_history') IS NULL THEN
    RETURN;
  END IF;
  BEGIN
    ALTER TABLE public.product_cost_history
      ALTER COLUMN cost_price TYPE numeric(18,6) USING cost_price::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF to_regclass('public.bom_headers') IS NULL THEN
    RETURN;
  END IF;
  BEGIN
    ALTER TABLE public.bom_headers
      ALTER COLUMN standard_cost TYPE numeric(18,6) USING standard_cost::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.bom_headers
      ALTER COLUMN output_quantity TYPE numeric(18,6) USING output_quantity::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF to_regclass('public.stock_transactions') IS NULL THEN
    RETURN;
  END IF;
  BEGIN
    ALTER TABLE public.stock_transactions
      ALTER COLUMN cost_per_unit TYPE numeric(18,6) USING cost_per_unit::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.stock_transactions
      ALTER COLUMN total_cost TYPE numeric(18,6) USING total_cost::numeric(18,6);
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
END $$;

-- =============================================================================
-- 7) Execution / ATP: stock_levels + stock_transactions
-- =============================================================================
ALTER TABLE public.stock_transactions ADD COLUMN IF NOT EXISTS allocation_id uuid;

DROP VIEW IF EXISTS public.vw_products_full CASCADE;
DROP VIEW IF EXISTS public.vw_bom_costing CASCADE;

DO $$
BEGIN
  IF to_regclass('public.stock_levels') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_levels'
      AND column_name = 'available_quantity'
      AND is_generated = 'NO'
  ) THEN
    ALTER TABLE public.stock_levels DROP COLUMN available_quantity;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_levels'
      AND column_name = 'available_quantity'
  ) THEN
    ALTER TABLE public.stock_levels
      ADD COLUMN available_quantity numeric
      GENERATED ALWAYS AS (quantity - COALESCE(reserved_quantity, 0::numeric)) STORED;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.stock_levels') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_levels_qty_nonneg'
  ) THEN
    ALTER TABLE public.stock_levels ADD CONSTRAINT chk_stock_levels_qty_nonneg
      CHECK (quantity >= 0 AND COALESCE(reserved_quantity, 0) >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_levels_reserved_lte_qty'
  ) THEN
    ALTER TABLE public.stock_levels ADD CONSTRAINT chk_stock_levels_reserved_lte_qty
      CHECK (COALESCE(reserved_quantity, 0) <= quantity) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.bom_lines') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_bom_lines_quantity_pos'
  ) THEN
    ALTER TABLE public.bom_lines ADD CONSTRAINT chk_bom_lines_quantity_pos
      CHECK (quantity > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_bom_lines_waste_pct'
  ) THEN
    ALTER TABLE public.bom_lines ADD CONSTRAINT chk_bom_lines_waste_pct
      CHECK (
        waste_percentage IS NULL
        OR (waste_percentage >= 0 AND waste_percentage <= 100)
      ) NOT VALID;
  END IF;
END $$;

-- =============================================================================
-- 8) Governance Option A: production_plans
-- =============================================================================
ALTER TABLE public.production_plans ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.production_plans ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.production_plans ADD COLUMN IF NOT EXISTS approved_at timestamptz;

DO $$
BEGIN
  IF to_regclass('public.production_plans') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_production_plans_approval_status'
  ) THEN
    ALTER TABLE public.production_plans ADD CONSTRAINT chk_production_plans_approval_status
      CHECK (approval_status IN ('pending', 'approved', 'rejected')) NOT VALID;
  END IF;
END $$;

-- =============================================================================
-- 9) Uniqueness: products SKU, product_variants, product_categories, demand_forecasts
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_products_tenant_sku'
  ) THEN
    ALTER TABLE public.products ADD CONSTRAINT uq_products_tenant_sku UNIQUE (tenant_id, sku);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.product_variants') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_product_variants_tenant_variant_sku'
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT uq_product_variants_tenant_variant_sku UNIQUE (tenant_id, variant_sku);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_categories_alive
  ON public.product_categories (tenant_id, product_id, category_id)
  WHERE is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_demand_forecasts_period_scenario
  ON public.demand_forecasts (tenant_id, product_id, period_start, period_end, scenario_code)
  WHERE is_deleted = false;

-- Partial unique external id (products)
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tenant_external
  ON public.products (tenant_id, external_system, external_id)
  WHERE external_id IS NOT NULL AND is_deleted = false AND external_system IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_tenant_external_system
  ON public.products (tenant_id, external_system)
  WHERE is_deleted = false;

-- =============================================================================
-- 10) Foreign keys: tenant_id → tenants; demand_forecasts; forecast_scenarios
-- =============================================================================
DO $$
DECLARE
  t text;
  v_fk_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'forecast_scenarios',
    'attribute_definitions',
    'bom_headers',
    'bom_lines',
    'calendar',
    'categories',
    'demand_forecasts',
    'navigation',
    'packing_configurations',
    'price_list_items',
    'price_lists',
    'product_activity_log',
    'product_barcodes',
    'product_categories',
    'product_cost_history',
    'product_metrics',
    'product_variants',
    'production_plans',
    'products',
    'retailer_weeks',
    'stock_levels',
    'stock_transactions',
    'unit_conversions',
    'units'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    v_fk_name := 'fk_' || t || '_tenant_id';
    IF EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = v_fk_name) THEN
      CONTINUE;
    END IF;
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT',
        t,
        v_fk_name
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_column THEN NULL;
    END;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.demand_forecasts') IS NULL OR to_regclass('public.units') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_demand_forecasts_unit_id') THEN
    ALTER TABLE public.demand_forecasts
      ADD CONSTRAINT fk_demand_forecasts_unit_id
      FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.demand_forecasts') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_demand_forecasts_supersedes') THEN
    ALTER TABLE public.demand_forecasts
      ADD CONSTRAINT fk_demand_forecasts_supersedes
      FOREIGN KEY (supersedes_forecast_id) REFERENCES public.demand_forecasts(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.demand_forecasts') IS NULL
     OR to_regclass('public.forecast_scenarios') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_demand_forecasts_forecast_scenario_id') THEN
    ALTER TABLE public.demand_forecasts
      ADD CONSTRAINT fk_demand_forecasts_forecast_scenario_id
      FOREIGN KEY (forecast_scenario_id) REFERENCES public.forecast_scenarios(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Optional: suppliers FK on products (only if suppliers table exists)
DO $$
BEGIN
  IF to_regclass('public.products') IS NULL OR to_regclass('public.suppliers') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_default_supplier_id') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT fk_products_default_supplier_id
      FOREIGN KEY (default_supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 11) Indexes (tenant + hot paths + forecasting workflow)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_tenant_status
  ON public.demand_forecasts (tenant_id, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_product_metrics_tenant_product_date
  ON public.product_metrics (tenant_id, product_id, metric_date DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_tenant_period
  ON public.demand_forecasts (tenant_id, period_start)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_stock_levels_tenant_product_location
  ON public.stock_levels (tenant_id, product_id, location_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_stock_transactions_tenant_product
  ON public.stock_transactions (tenant_id, product_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_product
  ON public.product_categories (tenant_id, product_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_product_cost_history_tenant_product
  ON public.product_cost_history (tenant_id, product_id)
  WHERE is_deleted = false;

-- Standard tenant_id indexes (from schema audit list) — skip if already present
CREATE INDEX IF NOT EXISTS idx_attribute_definitions_tenant_id ON public.attribute_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_headers_tenant_id ON public.bom_headers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_tenant_id ON public.bom_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_tenant_id ON public.demand_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packing_configurations_tenant_id ON public.packing_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_tenant_id ON public.price_list_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_tenant_id ON public.price_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_activity_log_tenant_id ON public.product_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_tenant_id ON public.product_barcodes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON public.product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_cost_history_tenant_id ON public.product_cost_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_metrics_tenant_id ON public.product_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant_id ON public.product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_plans_tenant_id ON public.production_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_retailer_weeks_tenant_id ON public.retailer_weeks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_tenant_id ON public.stock_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_tenant_id ON public.stock_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_conversions_tenant_id ON public.unit_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant_id ON public.units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forecast_scenarios_tenant_id ON public.forecast_scenarios(tenant_id);

-- =============================================================================
-- 12) Views: vw_products_full, vw_bom_costing (recreated after stock_levels change)
-- =============================================================================
CREATE OR REPLACE VIEW public.vw_products_full WITH (security_invoker = true) AS
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
  c.name AS category_name,
  c.code AS category_code,
  bu.symbol AS base_unit_symbol,
  wu.symbol AS weight_unit_symbol,
  du.symbol AS dimension_unit_symbol,
  vu.symbol AS volume_unit_symbol,
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
LEFT JOIN public.categories c ON c.id = p.category_id AND c.is_deleted = false
LEFT JOIN public.units bu ON bu.id = p.base_unit_id AND bu.is_deleted = false
LEFT JOIN public.units wu ON wu.id = p.weight_unit_id AND wu.is_deleted = false
LEFT JOIN public.units du ON du.id = p.dimension_unit_id AND du.is_deleted = false
LEFT JOIN public.units vu ON vu.id = p.volume_unit_id AND vu.is_deleted = false
WHERE p.is_deleted = false;

CREATE OR REPLACE VIEW public.vw_bom_costing WITH (security_invoker = true) AS
SELECT
  bh.id AS bom_id,
  bh.product_id,
  pr.name AS product_name,
  pr.sku AS product_sku,
  bh.version,
  bh.output_quantity,
  count(bl.id) FILTER (WHERE bl.is_deleted = false) AS component_count,
  sum(
    bl.quantity * COALESCE(comp.cost_price, comp.sell_price, 0::numeric)
  ) FILTER (WHERE bl.is_deleted = false) AS total_component_cost,
  CASE
    WHEN bh.output_quantity > 0 THEN
      sum(
        bl.quantity * COALESCE(comp.cost_price, comp.sell_price, 0::numeric)
      ) FILTER (WHERE bl.is_deleted = false) / bh.output_quantity
    ELSE NULL
  END AS cost_per_unit
FROM public.bom_headers bh
JOIN public.products pr ON pr.id = bh.product_id AND pr.is_deleted = false
LEFT JOIN public.bom_lines bl ON bl.bom_header_id = bh.id
LEFT JOIN public.products comp ON comp.id = bl.component_product_id AND comp.is_deleted = false
WHERE bh.is_deleted = false
GROUP BY bh.id, bh.product_id, pr.name, pr.sku, bh.version, bh.output_quantity;

-- =============================================================================
-- 13) RLS: Business Core tables (tenant via user_profiles)
-- =============================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'forecast_scenarios',
    'attribute_definitions',
    'bom_headers',
    'bom_lines',
    'demand_forecasts',
    'packing_configurations',
    'price_list_items',
    'price_lists',
    'product_activity_log',
    'product_barcodes',
    'product_categories',
    'product_cost_history',
    'product_metrics',
    'product_variants',
    'production_plans',
    'products',
    'retailer_weeks',
    'stock_levels',
    'stock_transactions',
    'unit_conversions',
    'units'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_delete', t);

    EXECUTE format(
      $pol$
      CREATE POLICY %I ON public.%I FOR SELECT
      USING (tenant_id IN (
        SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
      ))
      $pol$,
      'bc_' || t || '_select',
      t
    );

    EXECUTE format(
      $pol$
      CREATE POLICY %I ON public.%I FOR INSERT
      WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
      ))
      $pol$,
      'bc_' || t || '_insert',
      t
    );

    EXECUTE format(
      $pol$
      CREATE POLICY %I ON public.%I FOR UPDATE
      USING (tenant_id IN (
        SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
      ))
      WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
      ))
      $pol$,
      'bc_' || t || '_update',
      t
    );

    EXECUTE format(
      $pol$
      CREATE POLICY %I ON public.%I FOR DELETE
      USING (tenant_id IN (
        SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
      ))
      $pol$,
      'bc_' || t || '_delete',
      t
    );
  END LOOP;
END $$;
