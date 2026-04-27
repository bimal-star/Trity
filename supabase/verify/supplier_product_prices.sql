-- Sanity checks for supplier_product_prices (run after migrations).
SELECT to_regclass('public.supplier_product_prices') AS supplier_product_prices_table;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'supplier_product_prices'
ORDER BY ordinal_position;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'supplier_product_prices';

SELECT pol.polname AS policy_name
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
WHERE c.relname = 'supplier_product_prices';
