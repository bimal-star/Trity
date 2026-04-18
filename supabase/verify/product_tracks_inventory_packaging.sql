-- Read-only checks after migration 20260406100000_product_tracks_inventory_packaging_type.sql

-- Column exists
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name = 'tracks_inventory';

-- Enum includes packaging
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname = 'product_type'
ORDER BY e.enumsortorder;
