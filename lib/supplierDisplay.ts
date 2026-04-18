/** Read-only preview for supplier_code before save (matches customer_code UX). */
export function formatSupplierCode(code: string | null | undefined): string {
  if (!code) return 'Will be generated on save';
  return code;
}
