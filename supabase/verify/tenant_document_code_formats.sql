-- Verify tenant document code format settings (run after 20260525200000).

SELECT 'tenant_document_code_formats' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_document_code_formats'
  ) AS ok;

SELECT 'bom_headers.bom_code' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bom_headers'
      AND column_name = 'bom_code'
  ) AS ok;

SELECT 'vw_bom_costing.bom_code' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vw_bom_costing'
      AND column_name = 'bom_code'
  ) AS ok;

SELECT document_type, count(*) AS tenant_rows
FROM public.tenant_document_code_formats
GROUP BY document_type
ORDER BY document_type;
