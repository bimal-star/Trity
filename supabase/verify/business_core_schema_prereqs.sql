-- Business Core schema — live database verification (read-only)
-- Run against target Supabase/Postgres before or after applying business_core_schema_consolidation migration.
-- Compares expected Business Core entities from types/Supabase Snippet Public Schema Column Catalog.csv

-- 1) Expected base tables (excluding views)
WITH expected(name) AS (
  VALUES
    ('attribute_definitions'),
    ('bom_headers'),
    ('bom_lines'),
    ('calendar'),
    ('categories'),
    ('demand_forecasts'),
    ('navigation'),
    ('packing_configurations'),
    ('price_list_items'),
    ('price_lists'),
    ('product_activity_log'),
    ('product_barcodes'),
    ('product_categories'),
    ('product_cost_history'),
    ('product_metrics'),
    ('product_groups'),
    ('production_plans'),
    ('products'),
    ('retailer_weeks'),
    ('stock_levels'),
    ('stock_transactions'),
    ('unit_conversions'),
    ('units')
)
SELECT e.name AS expected_table,
       CASE WHEN c.relname IS NOT NULL THEN 'present' ELSE 'MISSING' END AS status
FROM expected e
LEFT JOIN pg_class c ON c.relname = e.name
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND c.relkind = 'r'
ORDER BY e.name;

-- 2) Optional FK targets referenced by app/docs but not in CSV export
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('suppliers', 'warehouses', 'warehouse_locations', 'customers', 'sales_order_lines')
ORDER BY table_name;

-- 3) Duplicate foreign keys on same column (same referenced table/column)
SELECT conrelid::regclass AS table_name,
       a.attname AS column_name,
       confrelid::regclass AS ref_table,
       af.attname AS ref_column,
       array_agg(con.conname ORDER BY con.conname) AS constraint_names,
       COUNT(*) AS cnt
FROM pg_constraint con
JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey) AND NOT a.attisdropped
JOIN pg_attribute af ON af.attrelid = con.confrelid AND af.attnum = ANY (con.confkey) AND NOT af.attisdropped
WHERE con.contype = 'f'
  AND con.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY conrelid, a.attname, confrelid, af.attname
HAVING COUNT(*) > 1
ORDER BY table_name, column_name;

-- 4) tenant_id columns without FK to public.tenants (before migration)
SELECT c.table_name, c.column_name
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND c.column_name = 'tenant_id'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = c.table_name
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'tenant_id'
      AND ccu.table_name = 'tenants'
      AND ccu.column_name = 'id'
  )
ORDER BY c.table_name;
