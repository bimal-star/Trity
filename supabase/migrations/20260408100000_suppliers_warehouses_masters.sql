-- Supplier & warehouse master tables aligned with customers/products patterns:
-- tenant_id isolation, soft delete (deleted_at), metadata + version, audit columns,
-- integration fields (external_system / external_id), RLS matching public.customers.
--
-- Schema improvements vs ad-hoc masters:
-- 1) Document codes: tenant-scoped SUP-* / WH-* via triggers (same idea as customer_code).
-- 2) Partial unique indexes so codes are unique among active (non-deleted) rows only.
-- 3) At most one default warehouse per tenant (partial unique on is_default).
-- 4) Optional FK from customers.default_warehouse_id → warehouses(id) when safe.
-- 5) Future: warehouse_locations (already a prereq in verify) can hang off warehouses.id.

-- ---------------------------------------------------------------------------
-- Code generators (separate from customers; same algorithm style)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_supplier_code(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_code TEXT;
  v_max_attempts INTEGER := 100;
  v_attempt INTEGER := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    SELECT COUNT(*) INTO v_count
    FROM public.suppliers
    WHERE tenant_id = p_tenant_id
      AND supplier_code IS NOT NULL
      AND supplier_code LIKE 'SUP-%';

    v_code := 'SUP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((v_count + 1)::text, 5, '0');

    IF NOT EXISTS (
      SELECT 1 FROM public.suppliers
      WHERE tenant_id = p_tenant_id AND supplier_code = v_code
    ) THEN
      RETURN v_code;
    END IF;

    EXIT WHEN v_attempt >= v_max_attempts;
  END LOOP;

  RETURN 'SUP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_warehouse_code(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_code TEXT;
  v_max_attempts INTEGER := 100;
  v_attempt INTEGER := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    SELECT COUNT(*) INTO v_count
    FROM public.warehouses
    WHERE tenant_id = p_tenant_id
      AND warehouse_code IS NOT NULL
      AND warehouse_code LIKE 'WH-%';

    v_code := 'WH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((v_count + 1)::text, 5, '0');

    IF NOT EXISTS (
      SELECT 1 FROM public.warehouses
      WHERE tenant_id = p_tenant_id AND warehouse_code = v_code
    ) THEN
      RETURN v_code;
    END IF;

    EXIT WHEN v_attempt >= v_max_attempts;
  END LOOP;

  RETURN 'WH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
END;
$$;

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_code text,
  supplier_type text NOT NULL DEFAULT 'distributor',
  legal_name text NOT NULL,
  trading_name text,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'active',
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postcode text,
  country text,
  payment_terms text,
  currency text,
  tax_id text,
  notes text,
  external_system text,
  external_id text,
  integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT chk_suppliers_status CHECK (status IN ('active', 'inactive', 'on_hold')),
  CONSTRAINT chk_suppliers_type CHECK (
    supplier_type IN ('manufacturer', 'distributor', 'service', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_active
  ON public.suppliers (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_tenant_code_active
  ON public.suppliers (tenant_id, supplier_code)
  WHERE deleted_at IS NULL AND supplier_code IS NOT NULL AND btrim(supplier_code) <> '';

CREATE OR REPLACE FUNCTION public.suppliers_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.supplier_code IS NULL OR btrim(NEW.supplier_code) = '' THEN
    NEW.supplier_code := generate_supplier_code(NEW.tenant_id);
  END IF;
  IF NEW.status IS NULL THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.suppliers_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.supplier_code IS NULL OR btrim(NEW.supplier_code) = '' THEN
    IF OLD.supplier_code IS NOT NULL AND btrim(OLD.supplier_code) <> '' THEN
      NEW.supplier_code := OLD.supplier_code;
    ELSE
      NEW.supplier_code := generate_supplier_code(NEW.tenant_id);
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS suppliers_before_insert_trigger ON public.suppliers;
CREATE TRIGGER suppliers_before_insert_trigger
  BEFORE INSERT ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.suppliers_before_insert();

DROP TRIGGER IF EXISTS suppliers_before_update_trigger ON public.suppliers;
CREATE TRIGGER suppliers_before_update_trigger
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.suppliers_before_update();

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
DROP POLICY IF EXISTS suppliers_insert ON public.suppliers;
DROP POLICY IF EXISTS suppliers_update ON public.suppliers;
DROP POLICY IF EXISTS suppliers_delete ON public.suppliers;

CREATE POLICY suppliers_select ON public.suppliers
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY suppliers_insert ON public.suppliers
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY suppliers_update ON public.suppliers
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY suppliers_delete ON public.suppliers
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- warehouses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  warehouse_code text,
  name text NOT NULL,
  warehouse_type text NOT NULL DEFAULT 'distribution',
  status text NOT NULL DEFAULT 'active',
  is_default boolean NOT NULL DEFAULT false,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postcode text,
  country text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  external_system text,
  external_id text,
  integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT chk_warehouses_status CHECK (status IN ('active', 'inactive', 'closed')),
  CONSTRAINT chk_warehouses_type CHECK (
    warehouse_type IN ('distribution', 'manufacturing', 'retail', '3pl', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_active
  ON public.warehouses (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_tenant_code_active
  ON public.warehouses (tenant_id, warehouse_code)
  WHERE deleted_at IS NULL AND warehouse_code IS NOT NULL AND btrim(warehouse_code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_one_default_per_tenant
  ON public.warehouses (tenant_id)
  WHERE is_default = true AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.warehouses_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.warehouse_code IS NULL OR btrim(NEW.warehouse_code) = '' THEN
    NEW.warehouse_code := generate_warehouse_code(NEW.tenant_id);
  END IF;
  IF NEW.status IS NULL THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.warehouses_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.warehouse_code IS NULL OR btrim(NEW.warehouse_code) = '' THEN
    IF OLD.warehouse_code IS NOT NULL AND btrim(OLD.warehouse_code) <> '' THEN
      NEW.warehouse_code := OLD.warehouse_code;
    ELSE
      NEW.warehouse_code := generate_warehouse_code(NEW.tenant_id);
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS warehouses_before_insert_trigger ON public.warehouses;
CREATE TRIGGER warehouses_before_insert_trigger
  BEFORE INSERT ON public.warehouses
  FOR EACH ROW
  EXECUTE FUNCTION public.warehouses_before_insert();

DROP TRIGGER IF EXISTS warehouses_before_update_trigger ON public.warehouses;
CREATE TRIGGER warehouses_before_update_trigger
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW
  EXECUTE FUNCTION public.warehouses_before_update();

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouses_select ON public.warehouses;
DROP POLICY IF EXISTS warehouses_insert ON public.warehouses;
DROP POLICY IF EXISTS warehouses_update ON public.warehouses;
DROP POLICY IF EXISTS warehouses_delete ON public.warehouses;

CREATE POLICY warehouses_select ON public.warehouses
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY warehouses_insert ON public.warehouses
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY warehouses_update ON public.warehouses
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY warehouses_delete ON public.warehouses
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Optional: tie customers.default_warehouse_id to warehouses
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.customers') IS NULL OR to_regclass('public.warehouses') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_customers_default_warehouse_id'
  ) THEN
    RETURN;
  END IF;
  ALTER TABLE public.customers
    ADD CONSTRAINT fk_customers_default_warehouse_id
    FOREIGN KEY (default_warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN invalid_foreign_key THEN NULL;
END $$;

COMMENT ON TABLE public.suppliers IS 'Tenant-scoped supplier master; codes auto-generated when blank.';
COMMENT ON TABLE public.warehouses IS 'Tenant-scoped warehouse master; optional single default per tenant.';
