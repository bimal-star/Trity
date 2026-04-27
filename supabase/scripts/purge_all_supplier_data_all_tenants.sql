-- =============================================================================
-- DANGER: DESTRUCTIVE — NOT A MIGRATION
-- =============================================================================
-- Deletes all supplier master rows and everything that references suppliers in
-- public (all tenants). Because purchase_orders and supplier_invoices use
-- ON DELETE RESTRICT on supplier_id, this first removes the full purchase-to-pay
-- chain (same head as purge_all_product_data_all_tenants.sql), then negotiated
-- prices, then suppliers.
--
-- Side effect: all POs, goods receipts, and supplier invoices are removed for
-- every tenant — not only supplier directory rows.
--
-- Does NOT delete: products (products.default_supplier_id becomes NULL when a
-- supplier row is deleted), tenants, customers, categories, warehouses.
--
-- Run as postgres in Supabase SQL Editor (or any role with BYPASSRLS).
-- =============================================================================

BEGIN;

SELECT set_config('row_security', 'off', true);

-- Purchase-to-pay (supplier_id RESTRICT on PO + supplier_invoices)
DELETE FROM public.goods_receipt_lines;
DELETE FROM public.goods_receipts;
DELETE FROM public.supplier_invoice_lines;
DELETE FROM public.supplier_invoices;
DELETE FROM public.purchase_order_lines;
DELETE FROM public.purchase_orders;

DELETE FROM public.supplier_product_prices;

DELETE FROM public.suppliers;

COMMIT;

-- Verification:
-- SELECT COUNT(*) AS suppliers FROM public.suppliers;
-- SELECT COUNT(*) AS purchase_orders FROM public.purchase_orders;
-- SELECT COUNT(*) AS supplier_product_prices FROM public.supplier_product_prices;
