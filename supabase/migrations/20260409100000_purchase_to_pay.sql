-- Purchase-to-Pay (option A): PO → goods receipt (qty only) → supplier invoice + 3-way match.
-- Requires: public.tenants, suppliers, warehouses, products, user_profiles.
-- Stock: optional app-side inserts into stock_transactions; no enum dependency here.

-- ---------------------------------------------------------------------------
-- PO number generator
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_purchase_order_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count integer;
  v_num text;
  v_attempt integer := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    SELECT COUNT(*) INTO v_count
    FROM public.purchase_orders
    WHERE tenant_id = p_tenant_id
      AND po_number LIKE 'PO-%';

    v_num := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((v_count + 1)::text, 5, '0');

    IF NOT EXISTS (
      SELECT 1 FROM public.purchase_orders
      WHERE tenant_id = p_tenant_id AND po_number = v_num
    ) THEN
      RETURN v_num;
    END IF;

    EXIT WHEN v_attempt >= 100;
  END LOOP;

  RETURN 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_goods_receipt_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_count integer;
  v_num text;
  v_attempt integer := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    SELECT COUNT(*) INTO v_count
    FROM public.goods_receipts
    WHERE tenant_id = p_tenant_id
      AND gr_number LIKE 'GR-%';

    v_num := 'GR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((v_count + 1)::text, 5, '0');

    IF NOT EXISTS (
      SELECT 1 FROM public.goods_receipts
      WHERE tenant_id = p_tenant_id AND gr_number = v_num
    ) THEN
      RETURN v_num;
    END IF;

    EXIT WHEN v_attempt >= 100;
  END LOOP;

  RETURN 'GR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
END;
$$;

-- ---------------------------------------------------------------------------
-- purchase_orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  po_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'GBP',
  order_date date NOT NULL DEFAULT (CURRENT_DATE),
  expected_date date,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_purchase_orders_status CHECK (
    status IN ('draft', 'sent', 'partially_received', 'received', 'closed', 'cancelled')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_tenant_po_number
  ON public.purchase_orders (tenant_id, po_number);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_supplier
  ON public.purchase_orders (tenant_id, supplier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_status
  ON public.purchase_orders (tenant_id, status, order_date DESC);

CREATE OR REPLACE FUNCTION public.purchase_orders_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.po_number IS NULL OR btrim(NEW.po_number) = '' THEN
    NEW.po_number := public.generate_purchase_order_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_orders_before_update()
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

DROP TRIGGER IF EXISTS purchase_orders_before_insert_trigger ON public.purchase_orders;
CREATE TRIGGER purchase_orders_before_insert_trigger
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.purchase_orders_before_insert();

DROP TRIGGER IF EXISTS purchase_orders_before_update_trigger ON public.purchase_orders;
CREATE TRIGGER purchase_orders_before_update_trigger
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.purchase_orders_before_update();

-- ---------------------------------------------------------------------------
-- purchase_order_lines
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  description text,
  uom text,
  quantity_ordered numeric NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_purchase_order_lines_qty CHECK (quantity_ordered > 0),
  CONSTRAINT chk_purchase_order_lines_line_no CHECK (line_no > 0),
  CONSTRAINT chk_purchase_order_lines_price CHECK (unit_price >= 0),
  CONSTRAINT uq_purchase_order_lines_po_line UNIQUE (purchase_order_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po
  ON public.purchase_order_lines (purchase_order_id, line_no);

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_product
  ON public.purchase_order_lines (tenant_id, product_id);

CREATE OR REPLACE FUNCTION public.purchase_order_lines_sync_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT po.tenant_id INTO v_tenant
  FROM public.purchase_orders po
  WHERE po.id = NEW.purchase_order_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'purchase_order not found';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM v_tenant THEN
    NEW.tenant_id := v_tenant;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchase_order_lines_sync_tenant_trigger ON public.purchase_order_lines;
CREATE TRIGGER purchase_order_lines_sync_tenant_trigger
  BEFORE INSERT OR UPDATE OF purchase_order_id ON public.purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.purchase_order_lines_sync_tenant();

CREATE OR REPLACE FUNCTION public.purchase_order_lines_touch_po()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.purchase_orders
  SET updated_at = now()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS purchase_order_lines_touch_po_trigger ON public.purchase_order_lines;
CREATE TRIGGER purchase_order_lines_touch_po_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.purchase_order_lines_touch_po();

-- ---------------------------------------------------------------------------
-- goods_receipts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  gr_number text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_goods_receipts_status CHECK (status IN ('draft', 'posted')),
  CONSTRAINT chk_goods_receipts_warehouse_matches_po CHECK (true)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_goods_receipts_tenant_gr_number
  ON public.goods_receipts (tenant_id, gr_number);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_po
  ON public.goods_receipts (tenant_id, purchase_order_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.goods_receipts_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_wh uuid;
BEGIN
  IF NEW.gr_number IS NULL OR btrim(NEW.gr_number) = '' THEN
    NEW.gr_number := public.generate_goods_receipt_number(NEW.tenant_id);
  END IF;

  SELECT warehouse_id INTO v_wh
  FROM public.purchase_orders
  WHERE id = NEW.purchase_order_id AND tenant_id = NEW.tenant_id;

  IF v_wh IS NULL THEN
    RAISE EXCEPTION 'purchase order not found or tenant mismatch';
  END IF;

  IF NEW.warehouse_id IS DISTINCT FROM v_wh THEN
    RAISE EXCEPTION 'goods receipt warehouse_id must match purchase order warehouse_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.goods_receipts_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_wh uuid;
BEGIN
  IF NEW.status = 'posted' AND OLD.status = 'posted' THEN
    IF NEW.purchase_order_id IS DISTINCT FROM OLD.purchase_order_id
       OR NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id
       OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'cannot change key fields on posted goods receipt';
    END IF;
  END IF;

  SELECT warehouse_id INTO v_wh
  FROM public.purchase_orders
  WHERE id = NEW.purchase_order_id AND tenant_id = NEW.tenant_id;

  IF v_wh IS NULL THEN
    RAISE EXCEPTION 'purchase order not found or tenant mismatch';
  END IF;

  IF NEW.warehouse_id IS DISTINCT FROM v_wh THEN
    RAISE EXCEPTION 'goods receipt warehouse_id must match purchase order warehouse_id';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS goods_receipts_before_insert_trigger ON public.goods_receipts;
CREATE TRIGGER goods_receipts_before_insert_trigger
  BEFORE INSERT ON public.goods_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.goods_receipts_before_insert();

DROP TRIGGER IF EXISTS goods_receipts_before_update_trigger ON public.goods_receipts;
CREATE TRIGGER goods_receipts_before_update_trigger
  BEFORE UPDATE ON public.goods_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.goods_receipts_before_update();

-- Drop bogus check and enforce warehouse via triggers only
ALTER TABLE public.goods_receipts DROP CONSTRAINT IF EXISTS chk_goods_receipts_warehouse_matches_po;

-- ---------------------------------------------------------------------------
-- goods_receipt_lines (quantity only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goods_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  goods_receipt_id uuid NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id uuid NOT NULL REFERENCES public.purchase_order_lines(id) ON DELETE RESTRICT,
  quantity_received numeric NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_goods_receipt_lines_qty CHECK (quantity_received > 0)
);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_gr
  ON public.goods_receipt_lines (goods_receipt_id);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_pol
  ON public.goods_receipt_lines (purchase_order_line_id);

CREATE OR REPLACE FUNCTION public.goods_receipt_lines_sync_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT gr.tenant_id INTO v_tenant
  FROM public.goods_receipts gr
  WHERE gr.id = NEW.goods_receipt_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'goods_receipt not found';
  END IF;

  NEW.tenant_id := v_tenant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS goods_receipt_lines_sync_tenant_trigger ON public.goods_receipt_lines;
CREATE TRIGGER goods_receipt_lines_sync_tenant_trigger
  BEFORE INSERT OR UPDATE OF goods_receipt_id ON public.goods_receipt_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.goods_receipt_lines_sync_tenant();

-- Validate PO line belongs to same PO as receipt header; qty caps when posting
CREATE OR REPLACE FUNCTION public.validate_goods_receipt_line_pol()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_gr_po uuid;
  v_pol_po uuid;
BEGIN
  SELECT purchase_order_id INTO v_gr_po
  FROM public.goods_receipts WHERE id = NEW.goods_receipt_id;

  SELECT purchase_order_id INTO v_pol_po
  FROM public.purchase_order_lines WHERE id = NEW.purchase_order_line_id;

  IF v_gr_po IS DISTINCT FROM v_pol_po THEN
    RAISE EXCEPTION 'purchase order line does not belong to this goods receipt purchase order';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS goods_receipt_lines_validate_pol_trigger ON public.goods_receipt_lines;
CREATE TRIGGER goods_receipt_lines_validate_pol_trigger
  BEFORE INSERT OR UPDATE OF purchase_order_line_id, goods_receipt_id ON public.goods_receipt_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_goods_receipt_line_pol();

CREATE OR REPLACE FUNCTION public.goods_receipt_lines_block_if_posted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.goods_receipts WHERE id = COALESCE(NEW.goods_receipt_id, OLD.goods_receipt_id);
  IF v_status = 'posted' THEN
    RAISE EXCEPTION 'cannot modify goods receipt lines on a posted receipt';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS goods_receipt_lines_block_posted_trigger ON public.goods_receipt_lines;
CREATE TRIGGER goods_receipt_lines_block_posted_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.goods_receipt_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.goods_receipt_lines_block_if_posted();

CREATE OR REPLACE FUNCTION public.validate_goods_receipt_post_qty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  r record;
  v_ordered numeric;
  v_received_other numeric;
  v_this_line numeric;
BEGIN
  IF NOT (NEW.status = 'posted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'posted')) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.goods_receipt_lines WHERE goods_receipt_id = NEW.id) THEN
    RAISE EXCEPTION 'cannot post goods receipt without at least one line';
  END IF;

  FOR r IN
    SELECT purchase_order_line_id, SUM(quantity_received) AS qty
    FROM public.goods_receipt_lines
    WHERE goods_receipt_id = NEW.id
    GROUP BY purchase_order_line_id
  LOOP
    SELECT quantity_ordered INTO v_ordered
    FROM public.purchase_order_lines WHERE id = r.purchase_order_line_id;

    SELECT COALESCE(SUM(grl.quantity_received), 0) INTO v_received_other
    FROM public.goods_receipt_lines grl
    JOIN public.goods_receipts gr ON gr.id = grl.goods_receipt_id
    WHERE grl.purchase_order_line_id = r.purchase_order_line_id
      AND gr.status = 'posted'
      AND gr.id IS DISTINCT FROM NEW.id;

    v_this_line := r.qty;

    IF v_received_other + v_this_line > v_ordered + 0.0000001 THEN
      RAISE EXCEPTION 'received quantity exceeds ordered for line %', r.purchase_order_line_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS goods_receipts_validate_post_qty_trigger ON public.goods_receipts;
CREATE TRIGGER goods_receipts_validate_post_qty_trigger
  BEFORE INSERT OR UPDATE OF status ON public.goods_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_goods_receipt_post_qty();

CREATE OR REPLACE FUNCTION public.purchase_orders_refresh_receipt_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_po_id uuid;
  v_all_received boolean;
  v_any_received boolean;
  v_line_count integer;
BEGIN
  v_po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

  SELECT COUNT(*) INTO v_line_count
  FROM public.purchase_order_lines WHERE purchase_order_id = v_po_id;

  IF v_line_count = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COALESCE(BOOL_AND(pol_recv.recv >= pol.quantity_ordered - 0.0000001), false),
    COALESCE(BOOL_OR(pol_recv.recv > 0), false)
  INTO v_all_received, v_any_received
  FROM public.purchase_order_lines pol
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(grl.quantity_received), 0) AS recv
    FROM public.goods_receipt_lines grl
    JOIN public.goods_receipts gr ON gr.id = grl.goods_receipt_id
    WHERE grl.purchase_order_line_id = pol.id AND gr.status = 'posted'
  ) pol_recv ON true
  WHERE pol.purchase_order_id = v_po_id;

  UPDATE public.purchase_orders
  SET
    status = CASE
      WHEN status IN ('draft', 'cancelled', 'closed') THEN status
      WHEN v_all_received THEN 'received'
      WHEN v_any_received THEN 'partially_received'
      WHEN status IN ('received', 'partially_received') THEN 'sent'
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_po_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS goods_receipts_refresh_po_status_trigger ON public.goods_receipts;
CREATE TRIGGER goods_receipts_refresh_po_status_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.goods_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.purchase_orders_refresh_receipt_status();

-- ---------------------------------------------------------------------------
-- supplier_invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT (CURRENT_DATE),
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'draft',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_supplier_invoices_status CHECK (
    status IN ('draft', 'matched', 'exception', 'closed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_invoices_tenant_supplier_number
  ON public.supplier_invoices (tenant_id, supplier_id, invoice_number);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_tenant_date
  ON public.supplier_invoices (tenant_id, invoice_date DESC);

CREATE OR REPLACE FUNCTION public.supplier_invoices_before_update()
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

DROP TRIGGER IF EXISTS supplier_invoices_before_update_trigger ON public.supplier_invoices;
CREATE TRIGGER supplier_invoices_before_update_trigger
  BEFORE UPDATE ON public.supplier_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.supplier_invoices_before_update();

-- ---------------------------------------------------------------------------
-- supplier_invoice_lines (pricing + match snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_invoice_id uuid NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  purchase_order_line_id uuid REFERENCES public.purchase_order_lines(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  description text,
  quantity_invoiced numeric NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  line_total numeric,
  match_status text NOT NULL DEFAULT 'pending',
  match_computed_at timestamptz,
  qty_ordered_snapshot numeric,
  qty_received_snapshot numeric,
  po_unit_price_snapshot numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_supplier_invoice_lines_qty CHECK (quantity_invoiced > 0),
  CONSTRAINT chk_supplier_invoice_lines_price CHECK (unit_price >= 0),
  CONSTRAINT chk_supplier_invoice_lines_line_no CHECK (line_no > 0),
  CONSTRAINT chk_supplier_invoice_lines_match_status CHECK (
    match_status IN ('pending', 'ok', 'price_variance', 'qty_variance', 'unlinked')
  ),
  CONSTRAINT uq_supplier_invoice_lines_invoice_line UNIQUE (supplier_invoice_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_lines_inv
  ON public.supplier_invoice_lines (supplier_invoice_id, line_no);

CREATE OR REPLACE FUNCTION public.supplier_invoice_lines_sync_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant
  FROM public.supplier_invoices
  WHERE id = NEW.supplier_invoice_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'supplier_invoice not found';
  END IF;

  NEW.tenant_id := v_tenant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_invoice_lines_sync_tenant_trigger ON public.supplier_invoice_lines;
CREATE TRIGGER supplier_invoice_lines_sync_tenant_trigger
  BEFORE INSERT OR UPDATE OF supplier_invoice_id ON public.supplier_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.supplier_invoice_lines_sync_tenant();

CREATE OR REPLACE FUNCTION public.supplier_invoice_lines_touch_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.supplier_invoices
  SET updated_at = now()
  WHERE id = COALESCE(NEW.supplier_invoice_id, OLD.supplier_invoice_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS supplier_invoice_lines_touch_invoice_trigger ON public.supplier_invoice_lines;
CREATE TRIGGER supplier_invoice_lines_touch_invoice_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.supplier_invoice_lines_touch_invoice();

-- ---------------------------------------------------------------------------
-- RLS (match suppliers pattern)
-- ---------------------------------------------------------------------------
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_orders_select ON public.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_insert ON public.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_update ON public.purchase_orders;
DROP POLICY IF EXISTS purchase_orders_delete ON public.purchase_orders;

CREATE POLICY purchase_orders_select ON public.purchase_orders
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY purchase_orders_insert ON public.purchase_orders
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY purchase_orders_update ON public.purchase_orders
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY purchase_orders_delete ON public.purchase_orders
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS purchase_order_lines_select ON public.purchase_order_lines;
DROP POLICY IF EXISTS purchase_order_lines_insert ON public.purchase_order_lines;
DROP POLICY IF EXISTS purchase_order_lines_update ON public.purchase_order_lines;
DROP POLICY IF EXISTS purchase_order_lines_delete ON public.purchase_order_lines;

CREATE POLICY purchase_order_lines_select ON public.purchase_order_lines
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY purchase_order_lines_insert ON public.purchase_order_lines
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY purchase_order_lines_update ON public.purchase_order_lines
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY purchase_order_lines_delete ON public.purchase_order_lines
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS goods_receipts_select ON public.goods_receipts;
DROP POLICY IF EXISTS goods_receipts_insert ON public.goods_receipts;
DROP POLICY IF EXISTS goods_receipts_update ON public.goods_receipts;
DROP POLICY IF EXISTS goods_receipts_delete ON public.goods_receipts;

CREATE POLICY goods_receipts_select ON public.goods_receipts
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY goods_receipts_insert ON public.goods_receipts
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY goods_receipts_update ON public.goods_receipts
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY goods_receipts_delete ON public.goods_receipts
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ) AND status = 'draft');

DROP POLICY IF EXISTS goods_receipt_lines_select ON public.goods_receipt_lines;
DROP POLICY IF EXISTS goods_receipt_lines_insert ON public.goods_receipt_lines;
DROP POLICY IF EXISTS goods_receipt_lines_update ON public.goods_receipt_lines;
DROP POLICY IF EXISTS goods_receipt_lines_delete ON public.goods_receipt_lines;

CREATE POLICY goods_receipt_lines_select ON public.goods_receipt_lines
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY goods_receipt_lines_insert ON public.goods_receipt_lines
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY goods_receipt_lines_update ON public.goods_receipt_lines
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY goods_receipt_lines_delete ON public.goods_receipt_lines
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS supplier_invoices_select ON public.supplier_invoices;
DROP POLICY IF EXISTS supplier_invoices_insert ON public.supplier_invoices;
DROP POLICY IF EXISTS supplier_invoices_update ON public.supplier_invoices;
DROP POLICY IF EXISTS supplier_invoices_delete ON public.supplier_invoices;

CREATE POLICY supplier_invoices_select ON public.supplier_invoices
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_invoices_insert ON public.supplier_invoices
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_invoices_update ON public.supplier_invoices
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_invoices_delete ON public.supplier_invoices
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS supplier_invoice_lines_select ON public.supplier_invoice_lines;
DROP POLICY IF EXISTS supplier_invoice_lines_insert ON public.supplier_invoice_lines;
DROP POLICY IF EXISTS supplier_invoice_lines_update ON public.supplier_invoice_lines;
DROP POLICY IF EXISTS supplier_invoice_lines_delete ON public.supplier_invoice_lines;

CREATE POLICY supplier_invoice_lines_select ON public.supplier_invoice_lines
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_invoice_lines_insert ON public.supplier_invoice_lines
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_invoice_lines_update ON public.supplier_invoice_lines
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY supplier_invoice_lines_delete ON public.supplier_invoice_lines
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
  ));

COMMENT ON TABLE public.purchase_orders IS 'Purchase order header; requires supplier + warehouse.';
COMMENT ON TABLE public.purchase_order_lines IS 'PO lines; expected unit_price used for invoice matching.';
COMMENT ON TABLE public.goods_receipts IS 'Receipt against a PO; warehouse must match PO.';
COMMENT ON TABLE public.goods_receipt_lines IS 'Received quantities only (no unit price).';
COMMENT ON TABLE public.supplier_invoices IS 'Supplier AP invoice; v1 match-only (no payments).';
COMMENT ON TABLE public.supplier_invoice_lines IS 'Invoice lines with optional PO line link and match snapshots.';
