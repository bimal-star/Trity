-- Supplier × product catalog pricing (list price + MOQ) for PO line defaults.
-- RLS matches public.suppliers / purchase_orders (tenant via user_profiles).

CREATE TABLE IF NOT EXISTS public.supplier_product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  unit_price numeric NOT NULL DEFAULT 0,
  min_order_qty numeric NOT NULL DEFAULT 1,
  currency text,
  supplier_sku text,
  uom text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_supplier_product_prices_price CHECK (unit_price >= 0),
  CONSTRAINT chk_supplier_product_prices_moq CHECK (min_order_qty > 0),
  CONSTRAINT uq_supplier_product_prices_tenant_supplier_product UNIQUE (tenant_id, supplier_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_product_prices_tenant_supplier
  ON public.supplier_product_prices (tenant_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_product_prices_tenant_product
  ON public.supplier_product_prices (tenant_id, product_id);

CREATE OR REPLACE FUNCTION public.supplier_product_prices_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_product_prices_before_update_trigger ON public.supplier_product_prices;
CREATE TRIGGER supplier_product_prices_before_update_trigger
  BEFORE UPDATE ON public.supplier_product_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.supplier_product_prices_before_update();

ALTER TABLE public.supplier_product_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplier_product_prices_select ON public.supplier_product_prices;
DROP POLICY IF EXISTS supplier_product_prices_insert ON public.supplier_product_prices;
DROP POLICY IF EXISTS supplier_product_prices_update ON public.supplier_product_prices;
DROP POLICY IF EXISTS supplier_product_prices_delete ON public.supplier_product_prices;

CREATE POLICY supplier_product_prices_select ON public.supplier_product_prices
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_product_prices_insert ON public.supplier_product_prices
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_product_prices_update ON public.supplier_product_prices
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_product_prices_delete ON public.supplier_product_prices
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

COMMENT ON TABLE public.supplier_product_prices IS
  'Negotiated/list unit price and MOQ per supplier and product; used to default PO lines.';
