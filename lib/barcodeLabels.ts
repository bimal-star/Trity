import type { Database } from '@/types/database';

export type BarcodeType = Database['public']['Enums']['barcode_type'];

export const BARCODE_TYPE_OPTIONS: { value: BarcodeType; label: string }[] = [
  { value: 'ean13', label: 'EAN-13' },
  { value: 'ean8', label: 'EAN-8' },
  { value: 'upc', label: 'UPC' },
  { value: 'code128', label: 'Code 128' },
  { value: 'qr', label: 'QR Code' },
  { value: 'datamatrix', label: 'Data Matrix' },
  { value: 'internal', label: 'Internal' },
];

const LABEL_BY_VALUE = Object.fromEntries(
  BARCODE_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<BarcodeType, string>;

/** Human-readable label for a stored `barcode_type` enum value. */
export function formatBarcodeTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  if (value in LABEL_BY_VALUE) return LABEL_BY_VALUE[value as BarcodeType];
  return value;
}
