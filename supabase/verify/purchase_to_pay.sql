-- Verify P2P objects exist (run against project after migration 20260409100000_purchase_to_pay).

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'purchase_orders'
) AS has_purchase_orders;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'purchase_order_lines'
) AS has_purchase_order_lines;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'goods_receipts'
) AS has_goods_receipts;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'goods_receipt_lines'
) AS has_goods_receipt_lines;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'supplier_invoices'
) AS has_supplier_invoices;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'supplier_invoice_lines'
) AS has_supplier_invoice_lines;
