-- Sanity checks for BOM costing migration (run after 20260525120000_bom_costing_views_and_product_waste.sql).

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name = 'waste_percentage';

SELECT to_regclass('public.vw_product_last_purchase_price') AS vw_product_last_purchase_price;
SELECT to_regclass('public.vw_bom_line_costing') AS vw_bom_line_costing;
SELECT to_regclass('public.vw_bom_costing') AS vw_bom_costing;

SELECT
  c.relname AS view_name,
  (SELECT option_value
   FROM pg_options_to_table(c.reloptions)
   WHERE option_name = 'security_invoker') AS security_invoker
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname IN (
    'vw_product_last_purchase_price',
    'vw_bom_line_costing',
    'vw_bom_costing',
    'vw_products_full'
  )
ORDER BY c.relname;

SELECT pol.polname, pol.polcmd, c.relname
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
WHERE c.relname IN ('bom_headers', 'bom_lines')
ORDER BY c.relname, pol.polname;

SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'po_line_net_unit_price',
    'bom_effective_quantity',
    'bom_lines_default_waste_from_product'
  )
ORDER BY proname;

SELECT COUNT(*) AS nav_boms_rows
FROM public.navigation
WHERE path = '/boms'
  AND is_deleted = false;
