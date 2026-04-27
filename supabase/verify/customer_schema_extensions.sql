-- Verify customers columns and satellite RLS alignment (run after migrations).
-- Expect: metadata, version, logo_url on public.customers; policies on customer_* tables.

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
  AND column_name IN ('metadata', 'version', 'logo_url', 'address_line1')
ORDER BY column_name;

SELECT schemaname, tablename, policyname, cmd, qual::text AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'customer_addresses',
    'customer_contacts',
    'customer_notes',
    'customer_attachments'
  )
ORDER BY tablename, policyname;
