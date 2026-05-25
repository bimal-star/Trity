/**
 * Tenant document code format settings (mirrors public.tenant_document_code_formats).
 */

export const DOCUMENT_CODE_TYPES = [
  'product',
  'customer',
  'supplier',
  'warehouse',
  'bom',
  'purchase_order',
  'goods_receipt',
  'category',
] as const;

export type DocumentCodeType = (typeof DOCUMENT_CODE_TYPES)[number];

export type DocumentCodeDatePart = 'none' | 'year' | 'ymd';

export interface TenantDocumentCodeFormat {
  tenant_id: string;
  document_type: DocumentCodeType;
  prefix: string;
  date_part: DocumentCodeDatePart;
  sequence_pad: number;
  separator: string;
  auto_generate: boolean;
  label: string | null;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TenantDocumentCodeFormatUpdate {
  prefix?: string;
  date_part?: DocumentCodeDatePart;
  sequence_pad?: number;
  separator?: string;
  auto_generate?: boolean;
}

export const DOCUMENT_CODE_TYPE_LABELS: Record<DocumentCodeType, string> = {
  product: 'Product code (SKU)',
  customer: 'Customer code',
  supplier: 'Supplier code',
  warehouse: 'Warehouse code',
  bom: 'BOM code',
  purchase_order: 'Purchase order number',
  goods_receipt: 'Goods receipt number',
  category: 'Category code',
};

export const DATE_PART_OPTIONS: { value: DocumentCodeDatePart; label: string }[] = [
  { value: 'none', label: 'No date' },
  { value: 'year', label: 'Year (YYYY)' },
  { value: 'ymd', label: 'Full date (YYYYMMDD)' },
];

/** Defaults aligned with SQL tenant_document_code_format_default(). */
export function defaultDocumentCodeFormat(
  documentType: DocumentCodeType
): Omit<TenantDocumentCodeFormat, 'tenant_id' | 'created_at' | 'updated_at'> {
  switch (documentType) {
    case 'product':
      return {
        document_type: 'product',
        prefix: 'PRD',
        date_part: 'ymd',
        sequence_pad: 5,
        separator: '-',
        auto_generate: false,
        label: DOCUMENT_CODE_TYPE_LABELS.product,
        description: 'Auto-fill SKU on new products when enabled.',
      };
    case 'customer':
      return {
        document_type: 'customer',
        prefix: 'CUS',
        date_part: 'year',
        sequence_pad: 6,
        separator: '-',
        auto_generate: true,
        label: DOCUMENT_CODE_TYPE_LABELS.customer,
        description: 'Assigned when customer code is left blank on create.',
      };
    case 'supplier':
      return {
        document_type: 'supplier',
        prefix: 'SUP',
        date_part: 'year',
        sequence_pad: 5,
        separator: '-',
        auto_generate: true,
        label: DOCUMENT_CODE_TYPE_LABELS.supplier,
        description: 'Assigned when supplier code is left blank on create.',
      };
    case 'warehouse':
      return {
        document_type: 'warehouse',
        prefix: 'WH',
        date_part: 'ymd',
        sequence_pad: 5,
        separator: '-',
        auto_generate: true,
        label: DOCUMENT_CODE_TYPE_LABELS.warehouse,
        description: 'Assigned when warehouse code is left blank on create.',
      };
    case 'bom':
      return {
        document_type: 'bom',
        prefix: 'BOM',
        date_part: 'year',
        sequence_pad: 5,
        separator: '-',
        auto_generate: true,
        label: DOCUMENT_CODE_TYPE_LABELS.bom,
        description: 'Unique BOM identifier when left blank on create.',
      };
    case 'purchase_order':
      return {
        document_type: 'purchase_order',
        prefix: 'PO',
        date_part: 'ymd',
        sequence_pad: 5,
        separator: '-',
        auto_generate: true,
        label: DOCUMENT_CODE_TYPE_LABELS.purchase_order,
        description: 'PO number when left blank on create.',
      };
    case 'goods_receipt':
      return {
        document_type: 'goods_receipt',
        prefix: 'GR',
        date_part: 'ymd',
        sequence_pad: 5,
        separator: '-',
        auto_generate: true,
        label: DOCUMENT_CODE_TYPE_LABELS.goods_receipt,
        description: 'GR number when left blank on create.',
      };
    case 'category':
      return {
        document_type: 'category',
        prefix: 'CAT',
        date_part: 'none',
        sequence_pad: 4,
        separator: '-',
        auto_generate: false,
        label: DOCUMENT_CODE_TYPE_LABELS.category,
        description: 'Optional auto code for new categories when enabled.',
      };
    default: {
      const _exhaustive: never = documentType;
      return _exhaustive;
    }
  }
}

function formatDatePart(datePart: DocumentCodeDatePart, now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  if (datePart === 'year') return String(y);
  if (datePart === 'ymd') return `${y}${m}${d}`;
  return '';
}

/**
 * Human-readable pattern for the settings UI (matches DB render rules).
 * Example: CUS-{YYYY}-{SEQ:6} or PRD-{YYYYMMDD}-{SEQ:5}
 */
export function describeDocumentCodePattern(
  format: Pick<TenantDocumentCodeFormat, 'prefix' | 'date_part' | 'sequence_pad' | 'separator'>
): string {
  const prefix = (format.prefix.trim().toUpperCase() || 'CODE').replace(/[{}]/g, '');
  const sep = format.separator ?? '';
  const seqToken = `{SEQ:${format.sequence_pad}}`;

  if (format.date_part === 'year') {
    return `${prefix}${sep}{YYYY}${sep}${seqToken}`;
  }
  if (format.date_part === 'ymd') {
    return `${prefix}${sep}{YYYYMMDD}${sep}${seqToken}`;
  }
  return `${prefix}${sep}${seqToken}`;
}

export type ParsedDocumentCodeParts = Pick<
  TenantDocumentCodeFormat,
  'prefix' | 'date_part' | 'sequence_pad' | 'separator'
>;

export type ParseDocumentCodePatternResult =
  | { ok: true; value: ParsedDocumentCodeParts }
  | { ok: false; error: string };

const MARK_DATE = '\u0001DATE\u0001';
const MARK_SEQ = '\u0001SEQ\u0001';

/**
 * Parse an editable pattern string into DB fields.
 * Required token: {SEQ:n}. Optional: {YYYY} or {YYYYMMDD}.
 */
export function parseDocumentCodePattern(template: string): ParseDocumentCodePatternResult {
  const raw = template.trim();
  if (!raw) {
    return { ok: false, error: 'Enter a format pattern.' };
  }

  const normalized = raw.toUpperCase();
  const seqMatch = normalized.match(/\{SEQ:(\d+)\}/);
  if (!seqMatch) {
    return {
      ok: false,
      error: 'Add a sequence token like {SEQ:6} for the running number.',
    };
  }

  const sequence_pad = parseInt(seqMatch[1], 10);
  if (Number.isNaN(sequence_pad) || sequence_pad < 1 || sequence_pad > 12) {
    return { ok: false, error: 'Sequence must be {SEQ:1} through {SEQ:12}.' };
  }

  let date_part: DocumentCodeDatePart = 'none';
  let working = normalized;
  if (working.includes('{YYYYMMDD}')) {
    if (working.includes('{YYYY}')) {
      return { ok: false, error: 'Use either {YYYY} or {YYYYMMDD}, not both.' };
    }
    date_part = 'ymd';
    working = working.replace('{YYYYMMDD}', MARK_DATE);
  } else if (working.includes('{YYYY}')) {
    date_part = 'year';
    working = working.replace('{YYYY}', MARK_DATE);
  }

  working = working.replace(/\{SEQ:\d+\}/, MARK_SEQ);

  const prefixMatch = working.match(/^([A-Z0-9]+)/);
  if (!prefixMatch) {
    return { ok: false, error: 'Start with a letter/number prefix (e.g. CUS or PO).' };
  }

  const prefix = prefixMatch[1];
  const tail = working.slice(prefix.length);
  const sepSource = tail.replaceAll(MARK_DATE, '|').replaceAll(MARK_SEQ, '|').replace(/\|+/g, '|');
  const sepMatch = sepSource.match(/^([^A-Z0-9|{}]+)/);
  const separator = sepMatch ? sepMatch[1].slice(0, 3) : '';

  return {
    ok: true,
    value: { prefix, date_part, sequence_pad, separator },
  };
}

/** Tokens users can insert into the pattern field. */
export const DOCUMENT_CODE_FORMAT_TOKENS = [
  { token: '{YYYY}', label: 'Year' },
  { token: '{YYYYMMDD}', label: 'Full date' },
  { token: '{SEQ:6}', label: '6-digit #' },
  { token: '{SEQ:5}', label: '5-digit #' },
] as const;

/**
 * Preview the next code (client-side; DB uses same rules on insert).
 */
export function previewDocumentCode(
  format: Pick<TenantDocumentCodeFormat, 'prefix' | 'date_part' | 'sequence_pad' | 'separator'>,
  sequence = 1,
  now = new Date()
): string {
  const prefix = format.prefix.trim().toUpperCase() || 'CODE';
  const sep = format.separator ?? '';
  const seq = String(sequence).padStart(Math.min(12, Math.max(1, format.sequence_pad)), '0');
  const dateStr = formatDatePart(format.date_part, now);

  if (format.date_part === 'none') {
    return `${prefix}${sep}${seq}`;
  }
  return `${prefix}${sep}${dateStr}${sep}${seq}`;
}

export function normalizePrefix(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

export function validateDocumentCodeFormat(
  patch: TenantDocumentCodeFormatUpdate & { prefix: string; sequence_pad: number }
): string | null {
  if (!patch.prefix.trim()) return 'Prefix is required.';
  if (patch.sequence_pad < 1 || patch.sequence_pad > 12) return 'Sequence length must be 1–12.';
  if (patch.separator.length > 3) return 'Separator is too long.';
  return null;
}
