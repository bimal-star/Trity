/** Display helper for customer_code (read-only preview before save uses placeholder). */
export function formatCustomerCode(code: string | null | undefined): string {
  if (!code) return 'Will be generated on save';
  if (code.startsWith('CUS-')) return code;
  const year = new Date().getFullYear().toString();
  const numStr = code.replace(/\D/g, '');
  const sequence = numStr.padStart(6, '0');
  return `CUS-${year}-${sequence}`;
}
