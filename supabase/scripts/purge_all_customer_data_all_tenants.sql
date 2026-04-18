-- =============================================================================
-- DANGER: DESTRUCTIVE — NOT A MIGRATION
-- =============================================================================
-- Deletes all customer-related rows in public for every tenant: satellite tables
-- then customers. (FKs from satellites use ON DELETE CASCADE from customers;
-- explicit deletes keep order obvious and match other purge scripts.)
--
-- Does NOT delete: tenants, products, suppliers, categories, warehouses, price_lists.
--
-- Run as postgres in Supabase SQL Editor (or any role with BYPASSRLS).
-- =============================================================================

BEGIN;

SELECT set_config('row_security', 'off', true);

DELETE FROM public.customer_addresses;
DELETE FROM public.customer_attachments;
DELETE FROM public.customer_contacts;
DELETE FROM public.customer_notes;

DELETE FROM public.customers;

COMMIT;

-- Verification:
-- SELECT COUNT(*) AS customer_addresses FROM public.customer_addresses;
-- SELECT COUNT(*) AS customer_contacts FROM public.customer_contacts;
-- SELECT COUNT(*) AS customers FROM public.customers;
