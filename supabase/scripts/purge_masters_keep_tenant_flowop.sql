-- =============================================================================
-- DANGER: DESTRUCTIVE DATA SCRIPT — NOT A MIGRATION
-- =============================================================================
-- Removes products, categories, customers, suppliers (and dependent rows) for
-- every tenant EXCEPT the one with slug 'flowop' (case-insensitive, trimmed).
--
-- IMPORTANT: Rows in public.tenants are NOT deleted. You will still see every
-- tenant in the tenants table; only their products/categories/customers/suppliers
-- (and related rows) for non-keeper tenants are removed.
--
-- If you have only ONE tenant and it is the keeper, or all products use that
-- tenant_id, DELETE ... WHERE tenant_id <> v_keep removes zero product rows —
-- that is expected.
--
-- Run in Supabase SQL Editor as the postgres role (Database → Roles). If you use
-- a role that is subject to RLS, deletes can affect 0 rows; this script turns
-- row_security OFF for the transaction when the session allows it.
--
-- Before running (pick one):
--   SELECT id, slug, name FROM public.tenants ORDER BY slug;
-- The script keeps the tenant where lower(btrim(slug)) = 'flowop', or if none,
-- lower(btrim(name)) = 'flowop'. If still no match, set v_keep_override below.
--
-- After running, use the verification queries at the bottom of this file.
-- =============================================================================

DO $$
DECLARE
  -- If lookup by slug/name fails, set this to the tenant UUID to keep and re-run:
  v_keep_override uuid := NULL;

  v_keep uuid;
  v_cnt  int;
  v_n    bigint;
BEGIN
  -- Bypass RLS for this transaction if the session is allowed (postgres / BYPASSRLS).
  PERFORM set_config('row_security', 'off', true);

  IF v_keep_override IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = v_keep_override) THEN
      RAISE EXCEPTION
        'purge_masters_keep_tenant_flowop: v_keep_override % is not a row in public.tenants',
        v_keep_override;
    END IF;
    v_keep := v_keep_override;
    RAISE NOTICE 'Keeping tenant_id=% (manual v_keep_override); deleting master data for other tenants.', v_keep;
  ELSE
    SELECT COUNT(*)::int INTO v_cnt
    FROM public.tenants t
    WHERE lower(btrim(COALESCE(t.slug, ''))) = 'flowop'
       OR lower(btrim(COALESCE(t.name, ''))) = 'flowop';

    IF v_cnt = 0 THEN
      RAISE EXCEPTION
        'purge_masters_keep_tenant_flowop: no tenant matches slug or name ''flowop'' (after lower/trim). '
        'Run: SELECT id, slug, name FROM public.tenants ORDER BY slug; '
        'Then set v_keep_override in this script to that id and re-run.';
    END IF;

    IF v_cnt > 1 THEN
      RAISE EXCEPTION
        'purge_masters_keep_tenant_flowop: ambiguous: % tenants match slug or name flowop; set v_keep_override',
        v_cnt;
    END IF;

    SELECT t.id INTO v_keep
    FROM public.tenants t
    WHERE lower(btrim(COALESCE(t.slug, ''))) = 'flowop'
       OR lower(btrim(COALESCE(t.name, ''))) = 'flowop'
    LIMIT 1;

    RAISE NOTICE 'Keeping tenant_id=% (matched slug or name flowop); deleting master data for other tenants.', v_keep;
  END IF;

  SELECT COUNT(*) INTO v_n FROM public.tenants;
  RAISE NOTICE 'purge_masters_keep_tenant_flowop: total rows in public.tenants=% (unchanged by this script).', v_n;

  SELECT COUNT(*) INTO v_n FROM public.products p WHERE p.tenant_id <> v_keep;
  RAISE NOTICE 'purge_masters_keep_tenant_flowop: products to delete (tenant_id <> keeper)=%', v_n;

  -- ---------------------------------------------------------------------------
  -- Purchase-to-pay (ON DELETE RESTRICT on products / suppliers / PO chain)
  -- ---------------------------------------------------------------------------
  DELETE FROM public.goods_receipt_lines WHERE tenant_id <> v_keep;
  DELETE FROM public.goods_receipts WHERE tenant_id <> v_keep;
  DELETE FROM public.supplier_invoice_lines WHERE tenant_id <> v_keep;
  DELETE FROM public.supplier_invoices WHERE tenant_id <> v_keep;
  DELETE FROM public.purchase_order_lines WHERE tenant_id <> v_keep;
  DELETE FROM public.purchase_orders WHERE tenant_id <> v_keep;

  DELETE FROM public.supplier_product_prices WHERE tenant_id <> v_keep;

  -- ---------------------------------------------------------------------------
  -- BOM & operations (product FKs)
  -- ---------------------------------------------------------------------------
  DELETE FROM public.bom_lines WHERE tenant_id <> v_keep;
  DELETE FROM public.production_plans WHERE tenant_id <> v_keep;
  DELETE FROM public.bom_headers WHERE tenant_id <> v_keep;
  DELETE FROM public.demand_forecasts WHERE tenant_id <> v_keep;

  DELETE FROM public.product_activity_log WHERE tenant_id <> v_keep;
  DELETE FROM public.product_metrics WHERE tenant_id <> v_keep;
  DELETE FROM public.product_cost_history WHERE tenant_id <> v_keep;
  DELETE FROM public.packing_configurations WHERE tenant_id <> v_keep;

  DELETE FROM public.stock_transactions WHERE tenant_id <> v_keep;
  DELETE FROM public.stock_levels WHERE tenant_id <> v_keep;
  DELETE FROM public.product_barcodes WHERE tenant_id <> v_keep;
  DELETE FROM public.product_categories WHERE tenant_id <> v_keep;

  DELETE FROM public.price_list_items WHERE tenant_id <> v_keep;

  -- ---------------------------------------------------------------------------
  -- Product catalogue (variants are product rows; groups are tenant-scoped)
  -- ---------------------------------------------------------------------------
  DELETE FROM public.products WHERE tenant_id <> v_keep;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'purge_masters_keep_tenant_flowop: deleted % rows from public.products', v_n;

  DELETE FROM public.product_groups WHERE tenant_id <> v_keep;

  -- May reference categories; clear for non-flowop tenants before categories
  DELETE FROM public.attribute_definitions WHERE tenant_id <> v_keep;

  DELETE FROM public.categories WHERE tenant_id <> v_keep;

  -- Satellite tables CASCADE from customers in schema; single delete is enough
  DELETE FROM public.customers WHERE tenant_id <> v_keep;

  DELETE FROM public.suppliers WHERE tenant_id <> v_keep;

  RAISE NOTICE 'purge_masters_keep_tenant_flowop: finished. Re-run the verification queries at the bottom.';
END $$;

-- =============================================================================
-- Verification (run separately; replace :keep with flowop tenant id if needed)
-- =============================================================================
-- WITH keep AS (
--   SELECT id FROM public.tenants t
--   WHERE lower(btrim(COALESCE(t.slug, ''))) = 'flowop'
--      OR lower(btrim(COALESCE(t.name, ''))) = 'flowop'
--   LIMIT 1
-- )
-- Or: WITH keep AS (SELECT id::uuid AS id FROM (VALUES ('your-tenant-uuid-here')) v(id))
-- SELECT 'products' AS tbl, tenant_id, count(*) FROM public.products p, keep k
--   WHERE p.tenant_id <> k.id GROUP BY tenant_id
-- UNION ALL
-- SELECT 'categories', tenant_id, count(*) FROM public.categories c, keep k
--   WHERE c.tenant_id <> k.id GROUP BY tenant_id
-- UNION ALL
-- SELECT 'customers', tenant_id, count(*) FROM public.customers c, keep k
--   WHERE c.tenant_id <> k.id GROUP BY tenant_id
-- UNION ALL
-- SELECT 'suppliers', tenant_id, count(*) FROM public.suppliers s, keep k
--   WHERE s.tenant_id <> k.id GROUP BY tenant_id;
--
-- Expect no rows (zero non-flowop rows). Then confirm flowop still has data if desired:
-- SELECT tenant_id, count(*) FROM public.products GROUP BY tenant_id;
-- SELECT tenant_id, count(*) FROM public.customers GROUP BY tenant_id;
