-- After 20260411103000_supplier_warehouse_logo_url.sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('suppliers', 'warehouses')
  AND column_name = 'logo_url';

SELECT id, public FROM storage.buckets WHERE id IN ('supplier-logos', 'warehouse-logos');

SELECT pol.polname
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
  AND c.relname = 'objects'
  AND pol.polname LIKE '%supplier_logos%'
ORDER BY pol.polname;

SELECT pol.polname
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
  AND c.relname = 'objects'
  AND pol.polname LIKE '%warehouse_logos%'
ORDER BY pol.polname;
