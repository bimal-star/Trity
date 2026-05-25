-- Cost Card and Logistics Rate Card schema.
-- Tables: exchange_rates, logistics_rate_cards/lines, cost_card_scenarios/versions/
--   product_entries, cost_lines.
-- RLS via app_effective_tenant_id() (tenant impersonation aware).
-- Depends on: tenants, products, customers, suppliers, auth.users.

-- ---------------------------------------------------------------------------
-- 1) exchange_rates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_currency char(3) NOT NULL,
  to_currency char(3) NOT NULL,
  rate numeric(12, 6) NOT NULL,
  effective_date date NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_exchange_rates_tenant_currencies_date
    UNIQUE (tenant_id, from_currency, to_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_tenant_id
  ON public.exchange_rates (tenant_id);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_tenant_effective
  ON public.exchange_rates (tenant_id, effective_date DESC);

COMMENT ON TABLE public.exchange_rates IS
  'Tenant-scoped currency exchange rates by effective date.';

-- ---------------------------------------------------------------------------
-- 2) logistics_rate_cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label text NOT NULL,
  provider text,
  direction text NOT NULL,
  effective_date_from date NOT NULL,
  effective_date_to date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_logistics_rate_cards_direction
    CHECK (direction IN ('inbound', 'outbound', 'both')),
  CONSTRAINT chk_logistics_rate_cards_status
    CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_logistics_rate_cards_tenant_id
  ON public.logistics_rate_cards (tenant_id);

CREATE INDEX IF NOT EXISTS idx_logistics_rate_cards_tenant_status
  ON public.logistics_rate_cards (tenant_id, status);

COMMENT ON TABLE public.logistics_rate_cards IS
  'Tenant logistics rate card headers (inbound/outbound freight and distribution).';

-- ---------------------------------------------------------------------------
-- 3) logistics_rate_lines
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_rate_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id uuid NOT NULL REFERENCES public.logistics_rate_cards(id) ON DELETE CASCADE,
  lane text,
  charge_type text NOT NULL,
  rate numeric(12, 4) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'GBP',
  min_charge numeric(12, 4),
  fuel_surcharge_pct numeric(5, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_logistics_rate_lines_charge_type
    CHECK (charge_type IN ('per_unit', 'per_kg', 'per_pallet', 'per_delivery'))
);

CREATE INDEX IF NOT EXISTS idx_logistics_rate_lines_rate_card_id
  ON public.logistics_rate_lines (rate_card_id);

COMMENT ON TABLE public.logistics_rate_lines IS
  'Line items for a logistics rate card (lane, charge type, rate).';

-- ---------------------------------------------------------------------------
-- 4) cost_card_scenarios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cost_card_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scenario_type text NOT NULL,
  label text NOT NULL,
  effective_date_from date NOT NULL,
  effective_date_to date,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cost_card_scenarios_scenario_type
    CHECK (scenario_type IN ('live', 'annual_budget', 'half_year', 'quarterly', 'monthly', 'custom')),
  CONSTRAINT chk_cost_card_scenarios_status
    CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_cost_card_scenarios_tenant_id
  ON public.cost_card_scenarios (tenant_id);

CREATE INDEX IF NOT EXISTS idx_cost_card_scenarios_tenant_type
  ON public.cost_card_scenarios (tenant_id, scenario_type);

COMMENT ON TABLE public.cost_card_scenarios IS
  'Cost card planning scenarios (live, budget, quarterly, etc.).';

-- ---------------------------------------------------------------------------
-- 5) cost_card_versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cost_card_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.cost_card_scenarios(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'draft',
  effective_date date NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  cloned_from_version_id uuid REFERENCES public.cost_card_versions(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cost_card_versions_scenario_version
    UNIQUE (scenario_id, version_number),
  CONSTRAINT chk_cost_card_versions_status
    CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_cost_card_versions_scenario_id
  ON public.cost_card_versions (scenario_id);

CREATE INDEX IF NOT EXISTS idx_cost_card_versions_tenant_id
  ON public.cost_card_versions (tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_card_versions_one_active_per_scenario
  ON public.cost_card_versions (scenario_id)
  WHERE status = 'active';

COMMENT ON TABLE public.cost_card_versions IS
  'Versioned cost card snapshots within a scenario; one active version per scenario.';

-- ---------------------------------------------------------------------------
-- 6) cost_card_product_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cost_card_product_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.cost_card_versions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  base_currency char(3) NOT NULL DEFAULT 'GBP',
  selling_price_resolved numeric(12, 4),
  target_margin_pct numeric(5, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cost_card_product_entries_version_id
  ON public.cost_card_product_entries (version_id);

CREATE INDEX IF NOT EXISTS idx_cost_card_product_entries_tenant_id
  ON public.cost_card_product_entries (tenant_id);

CREATE INDEX IF NOT EXISTS idx_cost_card_product_entries_product_id
  ON public.cost_card_product_entries (product_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_card_product_entries_version_product_no_customer
  ON public.cost_card_product_entries (version_id, product_id)
  WHERE customer_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_card_product_entries_version_product_customer
  ON public.cost_card_product_entries (version_id, product_id, customer_id)
  WHERE customer_id IS NOT NULL;

COMMENT ON TABLE public.cost_card_product_entries IS
  'Product (and optional customer) rows on a cost card version.';

-- ---------------------------------------------------------------------------
-- 7) cost_lines
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cost_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.cost_card_product_entries(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  component_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  logistics_rate_card_id uuid REFERENCES public.logistics_rate_cards(id) ON DELETE SET NULL,
  logistics_rate_line_id uuid REFERENCES public.logistics_rate_lines(id) ON DELETE SET NULL,
  description text,
  quantity numeric(12, 4),
  uom text,
  resolved_unit_cost numeric(12, 4),
  source_currency char(3) NOT NULL DEFAULT 'GBP',
  exchange_rate numeric(12, 6) NOT NULL DEFAULT 1,
  exchange_rate_date date,
  converted_cost numeric(12, 4),
  is_manual_override boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cost_lines_block_type
    CHECK (block_type IN (
      'materials',
      'packaging',
      'labour',
      'overhead',
      'inbound_freight',
      'outbound_distribution',
      'duties_tariffs',
      'regulatory',
      'royalties',
      'contingency'
    ))
);

CREATE INDEX IF NOT EXISTS idx_cost_lines_entry_id
  ON public.cost_lines (entry_id);

CREATE INDEX IF NOT EXISTS idx_cost_lines_tenant_id
  ON public.cost_lines (tenant_id);

COMMENT ON TABLE public.cost_lines IS
  'Cost breakdown lines for a cost card product entry (materials, freight, labour, etc.).';

-- ---------------------------------------------------------------------------
-- 8) updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.logistics_rate_cards_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS logistics_rate_cards_before_update ON public.logistics_rate_cards;
CREATE TRIGGER logistics_rate_cards_before_update
  BEFORE UPDATE ON public.logistics_rate_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.logistics_rate_cards_set_updated_at();

CREATE OR REPLACE FUNCTION public.cost_card_scenarios_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cost_card_scenarios_before_update ON public.cost_card_scenarios;
CREATE TRIGGER cost_card_scenarios_before_update
  BEFORE UPDATE ON public.cost_card_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.cost_card_scenarios_set_updated_at();

CREATE OR REPLACE FUNCTION public.cost_card_versions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cost_card_versions_before_update ON public.cost_card_versions;
CREATE TRIGGER cost_card_versions_before_update
  BEFORE UPDATE ON public.cost_card_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.cost_card_versions_set_updated_at();

CREATE OR REPLACE FUNCTION public.cost_card_product_entries_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cost_card_product_entries_before_update ON public.cost_card_product_entries;
CREATE TRIGGER cost_card_product_entries_before_update
  BEFORE UPDATE ON public.cost_card_product_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.cost_card_product_entries_set_updated_at();

CREATE OR REPLACE FUNCTION public.cost_lines_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cost_lines_before_update ON public.cost_lines;
CREATE TRIGGER cost_lines_before_update
  BEFORE UPDATE ON public.cost_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.cost_lines_set_updated_at();

-- ---------------------------------------------------------------------------
-- 9) RLS — tenant-scoped tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exchange_rates_select ON public.exchange_rates;
DROP POLICY IF EXISTS exchange_rates_insert ON public.exchange_rates;
DROP POLICY IF EXISTS exchange_rates_update ON public.exchange_rates;
DROP POLICY IF EXISTS exchange_rates_delete ON public.exchange_rates;

CREATE POLICY exchange_rates_select ON public.exchange_rates
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

CREATE POLICY exchange_rates_insert ON public.exchange_rates
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY exchange_rates_update ON public.exchange_rates
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY exchange_rates_delete ON public.exchange_rates
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

ALTER TABLE public.logistics_rate_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logistics_rate_cards_select ON public.logistics_rate_cards;
DROP POLICY IF EXISTS logistics_rate_cards_insert ON public.logistics_rate_cards;
DROP POLICY IF EXISTS logistics_rate_cards_update ON public.logistics_rate_cards;
DROP POLICY IF EXISTS logistics_rate_cards_delete ON public.logistics_rate_cards;

CREATE POLICY logistics_rate_cards_select ON public.logistics_rate_cards
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

CREATE POLICY logistics_rate_cards_insert ON public.logistics_rate_cards
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY logistics_rate_cards_update ON public.logistics_rate_cards
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY logistics_rate_cards_delete ON public.logistics_rate_cards
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

ALTER TABLE public.cost_card_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_card_scenarios_select ON public.cost_card_scenarios;
DROP POLICY IF EXISTS cost_card_scenarios_insert ON public.cost_card_scenarios;
DROP POLICY IF EXISTS cost_card_scenarios_update ON public.cost_card_scenarios;
DROP POLICY IF EXISTS cost_card_scenarios_delete ON public.cost_card_scenarios;

CREATE POLICY cost_card_scenarios_select ON public.cost_card_scenarios
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

CREATE POLICY cost_card_scenarios_insert ON public.cost_card_scenarios
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_card_scenarios_update ON public.cost_card_scenarios
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_card_scenarios_delete ON public.cost_card_scenarios
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

ALTER TABLE public.cost_card_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_card_versions_select ON public.cost_card_versions;
DROP POLICY IF EXISTS cost_card_versions_insert ON public.cost_card_versions;
DROP POLICY IF EXISTS cost_card_versions_update ON public.cost_card_versions;
DROP POLICY IF EXISTS cost_card_versions_delete ON public.cost_card_versions;

CREATE POLICY cost_card_versions_select ON public.cost_card_versions
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

CREATE POLICY cost_card_versions_insert ON public.cost_card_versions
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_card_versions_update ON public.cost_card_versions
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_card_versions_delete ON public.cost_card_versions
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

ALTER TABLE public.cost_card_product_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_card_product_entries_select ON public.cost_card_product_entries;
DROP POLICY IF EXISTS cost_card_product_entries_insert ON public.cost_card_product_entries;
DROP POLICY IF EXISTS cost_card_product_entries_update ON public.cost_card_product_entries;
DROP POLICY IF EXISTS cost_card_product_entries_delete ON public.cost_card_product_entries;

CREATE POLICY cost_card_product_entries_select ON public.cost_card_product_entries
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

CREATE POLICY cost_card_product_entries_insert ON public.cost_card_product_entries
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_card_product_entries_update ON public.cost_card_product_entries
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_card_product_entries_delete ON public.cost_card_product_entries
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

ALTER TABLE public.cost_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_lines_select ON public.cost_lines;
DROP POLICY IF EXISTS cost_lines_insert ON public.cost_lines;
DROP POLICY IF EXISTS cost_lines_update ON public.cost_lines;
DROP POLICY IF EXISTS cost_lines_delete ON public.cost_lines;

CREATE POLICY cost_lines_select ON public.cost_lines
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

CREATE POLICY cost_lines_insert ON public.cost_lines
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_lines_update ON public.cost_lines
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY cost_lines_delete ON public.cost_lines
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

-- ---------------------------------------------------------------------------
-- 10) RLS — logistics_rate_lines (via parent rate card)
-- ---------------------------------------------------------------------------
ALTER TABLE public.logistics_rate_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logistics_rate_lines_select ON public.logistics_rate_lines;
DROP POLICY IF EXISTS logistics_rate_lines_insert ON public.logistics_rate_lines;
DROP POLICY IF EXISTS logistics_rate_lines_update ON public.logistics_rate_lines;
DROP POLICY IF EXISTS logistics_rate_lines_delete ON public.logistics_rate_lines;

CREATE POLICY logistics_rate_lines_select ON public.logistics_rate_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.logistics_rate_cards lrc
      WHERE lrc.id = logistics_rate_lines.rate_card_id
        AND lrc.tenant_id = (SELECT public.app_effective_tenant_id())
    )
  );

CREATE POLICY logistics_rate_lines_insert ON public.logistics_rate_lines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.logistics_rate_cards lrc
      WHERE lrc.id = logistics_rate_lines.rate_card_id
        AND lrc.tenant_id = (SELECT public.app_effective_tenant_id())
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY logistics_rate_lines_update ON public.logistics_rate_lines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.logistics_rate_cards lrc
      WHERE lrc.id = logistics_rate_lines.rate_card_id
        AND lrc.tenant_id = (SELECT public.app_effective_tenant_id())
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.logistics_rate_cards lrc
      WHERE lrc.id = logistics_rate_lines.rate_card_id
        AND lrc.tenant_id = (SELECT public.app_effective_tenant_id())
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

CREATE POLICY logistics_rate_lines_delete ON public.logistics_rate_lines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.logistics_rate_cards lrc
      WHERE lrc.id = logistics_rate_lines.rate_card_id
        AND lrc.tenant_id = (SELECT public.app_effective_tenant_id())
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

-- ---------------------------------------------------------------------------
-- 11) clone_cost_card_version
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
  WHERE scenario_id = v_source.scenario_id;

  INSERT INTO public.cost_card_versions (
    scenario_id,
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
    v_source.scenario_id,
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
