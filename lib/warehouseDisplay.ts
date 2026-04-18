/** Read-only preview for warehouse_code before save. */
export function formatWarehouseCode(code: string | null | undefined): string {
  if (!code) return 'Will be generated on save';
  return code;
}
