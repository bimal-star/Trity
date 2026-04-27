-- Quick checks after 20260408100000_suppliers_warehouses_masters.sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'suppliers'
) AS suppliers_table_exists;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'warehouses'
) AS warehouses_table_exists;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'suppliers'
  AND column_name IN (
    'tenant_id', 'supplier_code', 'legal_name', 'status', 'metadata', 'deleted_at',
    'external_system', 'external_id', 'integration_metadata'
  )
ORDER BY column_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'warehouses'
  AND column_name IN (
    'tenant_id', 'warehouse_code', 'name', 'is_default', 'status', 'metadata', 'deleted_at',
    'external_system', 'external_id', 'integration_metadata'
  )
ORDER BY column_name;
