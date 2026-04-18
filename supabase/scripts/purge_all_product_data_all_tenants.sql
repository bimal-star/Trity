-- =============================================================================
-- DANGER: DESTRUCTIVE — NOT A MIGRATION
-- =============================================================================
-- Deletes every row in public tables that hang off the product catalogue:
-- purchase lines that reference products, stock, BOM, price list items, barcodes,
-- product_groups, and finally products. Runs for ALL tenants (no tenant filter).
--
-- Does NOT delete: public.tenants, public.categories, public.customers,
-- public.suppliers, public.price_lists (headers), public.warehouses.
--
-- Run as postgres in Supabase SQL Editor (or any role with BYPASSRLS).
-- =============================================================================

BEGIN;

SELECT set_config('row_security', 'off', true);

-- Purchase-to-pay (product_id / PO chain RESTRICT)
DELETE FROM public.goods_receipt_lines;
DELETE FROM public.goods_receipts;
DELETE FROM public.supplier_invoice_lines;
DELETE FROM public.supplier_invoices;
DELETE FROM public.purchase_order_lines;
DELETE FROM public.purchase_orders;

DELETE FROM public.supplier_product_prices;

-- BOM & planning (production_plans references bom_headers — plans before headers)
DELETE FROM public.bom_lines;
DELETE FROM public.production_plans;
DELETE FROM public.bom_headers;
DELETE FROM public.demand_forecasts;

DELETE FROM public.product_activity_log;
DELETE FROM public.product_metrics;
DELETE FROM public.product_cost_history;
DELETE FROM public.packing_configurations;

DELETE FROM public.stock_transactions;
DELETE FROM public.stock_levels;
DELETE FROM public.product_barcodes;
DELETE FROM public.product_categories;

DELETE FROM public.price_list_items;

-- Catalogue
DELETE FROM public.products;
DELETE FROM public.product_groups;

COMMIT;

-- Verification:
-- SELECT COUNT(*) AS products FROM public.products;
-- SELECT COUNT(*) AS product_groups FROM public.product_groups;
-- SELECT COUNT(*) AS price_list_items FROM public.price_list_items;
