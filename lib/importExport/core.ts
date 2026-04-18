import { supabase } from '@/lib/supabaseClient';
import { sanitizeText } from '@/lib/sanitization';

/**
 * Import uses allowlists aligned with export columns, tenant-scoped id/natural-key resolution,
 * and sanitized payloads (no tenant_id / audit fields from the file).
 */
export interface TableMetadata {
  name: string;
  /** UI label for dropdowns; defaults to name when omitted */
  label?: string;
  columns: ColumnInfo[];
  primaryKey: string;
  softDeleteField?: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isRequired: boolean;
  defaultValue?: any;
  enumValues?: string[];
  isForeignKey: boolean;
  referencedTable?: string;
}

export interface ImportRow {
  /** Allowlisted, coerced fields only (safe for insert/update). */
  originalData: Record<string, any>;
  classification: 'NEW' | 'UPDATE' | 'DELETE' | 'INVALID';
  reason?: string;
  pkValue?: any;
  /** 1-based row index in the parsed file. */
  sourceRowNumber?: number;
}

/**
 * Fetch all accessible tables from current schema
 */
export async function getTables(tenantId: string): Promise<TableMetadata[]> {
  try {
    // Fallback: return hardcoded common tables for tenant-accessible schemas
    // Excludes: users, user_profiles, and tenants (system tables)
    return [
      { name: 'customers', label: 'Customers', columns: [], primaryKey: 'id', softDeleteField: 'deleted_at' },
      {
        name: 'products',
        label: 'Products',
        columns: [],
        primaryKey: 'id',
        softDeleteField: 'is_deleted',
      },
      { name: 'calendar', label: 'Calendar', columns: [], primaryKey: 'id', softDeleteField: 'is_deleted' },
      { name: 'suppliers', label: 'Suppliers', columns: [], primaryKey: 'id', softDeleteField: 'deleted_at' },
      { name: 'warehouses', label: 'Warehouses', columns: [], primaryKey: 'id', softDeleteField: 'deleted_at' },
    ];
  } catch (err) {
    console.error('Error fetching tables:', err);
    return [];
  }
}

/**
 * Fetch column metadata for a specific table.
 * See module comment: PostgREST usually cannot read information_schema this way; replace with RPC or allowlists.
 */
export async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('information_schema.columns' as any)
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName)
      .eq('table_schema', 'public');

    if (error) throw error;

    return ((data as any[]) || []).map((col: any) => ({
      name: col.column_name,
      dataType: col.data_type,
      isNullable: col.is_nullable === 'YES',
      isRequired:
        col.is_nullable === 'NO' &&
        !['created_at', 'updated_at', 'id', 'tenant_id', 'created_by', 'updated_by', 'deleted_at', 'deleted_by', 'version'].includes(
          col.column_name
        ),
      isForeignKey: false,
    }));
  } catch (err) {
    console.error('Error fetching columns:', err);
    return [];
  }
}

/**
 * Infer table metadata from actual data
 */
export async function inferTableMetadata(tableName: string): Promise<TableMetadata> {
  const columns = await getTableColumns(tableName);

  return {
    name: tableName,
    columns,
    primaryKey: 'id',
    softDeleteField: ['deleted_at', 'is_deleted'].find((f) => columns.some((c) => c.name === f)),
  };
}

/** Keys to strip from every user-facing export (system / audit / integration sync). */
const EXPORT_OMIT_KEYS = new Set([
  'id',
  'tenant_id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'deleted_at',
  'deleted_by',
  'version',
  'user_id',
  'external_system',
  'external_id',
  'integration_metadata',
  'last_synced_at',
]);

/** Per-table keys that are redundant or maintained outside normal user editing. */
const EXPORT_EXTRA_OMIT_BY_TABLE: Record<string, string[]> = {
  calendar: ['year', 'month', 'day', 'day_of_week', 'week_iso'],
};

function exportOmitKeySet(tableName: string): Set<string> {
  const extra = EXPORT_EXTRA_OMIT_BY_TABLE[tableName] ?? [];
  return new Set([...EXPORT_OMIT_KEYS, ...extra]);
}

/**
 * Preferred column order per table (remaining keys after omit are appended alphabetically).
 * Aligns with master-detail / form section ordering in the app where practical.
 */
const EXPORT_COLUMN_ORDER_BY_TABLE: Record<string, string[]> = {
  customers: [
    'customer_code',
    'customer_type',
    'status',
    'legal_name',
    'trading_name',
    'email',
    'phone',
    'logo_url',
    'address_line1',
    'address_line2',
    'city',
    'state',
    'postcode',
    'country',
    'registration_number',
    'vat_number',
    'tax_scheme',
    'credit_rating',
    'risk_category',
    'payment_terms',
    'credit_limit',
    'credit_hold',
    'currency',
    'price_list_id',
    'discount_rate',
    'tax_inclusive',
    'default_warehouse_id',
    'delivery_instructions',
    'preferred_carrier',
    'shipping_account_number',
    'incoterms',
    'sales_rep_id',
    'channel',
    'region',
    'forecast_group',
    'demand_profile',
    'metadata',
  ],
  products: [
    'sku',
    'name',
    'description',
    'short_description',
    'product_type',
    'industry_type',
    'category_id',
    'base_unit_id',
    'status',
    'is_active',
    'is_deleted',
    'tracks_inventory',
    'cost_price',
    'sell_price',
    'currency',
    'weight',
    'weight_unit_id',
    'length',
    'width',
    'height',
    'dimension_unit_id',
    'volume',
    'volume_unit_id',
    'min_stock_level',
    'max_stock_level',
    'reorder_point',
    'reorder_quantity',
    'lead_time_days',
    'shelf_life_days',
    'storage_conditions',
    'allergens',
    'certifications',
    'safety_rating',
    'default_supplier_id',
    'manufacturer_part_number',
    'batch_tracked',
    'serial_tracked',
    'lot_controlled',
    'image_url',
    'images',
    'documents',
    'specifications_url',
    'attributes',
    'metadata',
    'tags',
    'categories',
  ],
  calendar: [
    'date',
    'bank_holiday',
    'events',
    'notes',
  ],
  suppliers: [
    'supplier_code',
    'supplier_type',
    'logo_url',
    'legal_name',
    'trading_name',
    'status',
    'email',
    'phone',
    'address_line1',
    'address_line2',
    'city',
    'state',
    'postcode',
    'country',
    'payment_terms',
    'currency',
    'tax_id',
    'notes',
    'metadata',
  ],
  warehouses: [
    'warehouse_code',
    'name',
    'logo_url',
    'warehouse_type',
    'status',
    'is_default',
    'address_line1',
    'address_line2',
    'city',
    'state',
    'postcode',
    'country',
    'contact_name',
    'contact_email',
    'contact_phone',
    'notes',
    'metadata',
  ],
};

// --- Import: allowlist, sanitization, natural keys ---

const JSONB_IMPORT_FIELDS = new Set([
  'metadata',
  'attributes',
  'images',
  'documents',
  'tags',
  'categories',
  'allergens',
  'certifications',
]);

const BOOLEAN_IMPORT_FIELDS = new Set([
  'credit_hold',
  'tax_inclusive',
  'is_active',
  'is_deleted',
  'tracks_inventory',
  'batch_tracked',
  'serial_tracked',
  'lot_controlled',
  'is_default',
]);

const NUMERIC_IMPORT_FIELDS = new Set([
  'credit_limit',
  'discount_rate',
  'cost_price',
  'sell_price',
  'weight',
  'length',
  'width',
  'height',
  'volume',
  'min_stock_level',
  'max_stock_level',
  'reorder_point',
  'reorder_quantity',
  'lead_time_days',
  'shelf_life_days',
]);

const IMPORT_REQUIRED_BY_TABLE: Record<string, string[]> = {
  customers: ['email', 'legal_name'],
  products: ['sku', 'name'],
  suppliers: ['legal_name'],
  warehouses: ['name'],
  calendar: ['date'],
};

const TABLES_WITH_USER_AUDIT = new Set(['customers', 'products', 'suppliers', 'warehouses']);

function importAllowlist(tableName: string): Set<string> {
  return new Set(EXPORT_COLUMN_ORDER_BY_TABLE[tableName] ?? []);
}

function normalizeImportKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim();
    if (key) out[key] = v;
  }
  return out;
}

function isEmptyCell(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

function excelSerialToISODate(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(serial * 86400000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function coerceCalendarDateRaw(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === 'number') {
    if (raw > 20000 && raw < 120000) return excelSerialToISODate(raw);
    if (raw > 1e12) return new Date(raw).toISOString().slice(0, 10);
    if (raw > 1e9) return new Date(raw * 1000).toISOString().slice(0, 10);
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(t);
    if (m) return m[1];
  }
  return null;
}

function parseBooleanCell(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v !== 'string') return undefined;
  const s = v.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return undefined;
}

function parseNumberCell(v: unknown): number | null | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return undefined;
}

function tryParseJsonField(
  field: string,
  raw: unknown
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (raw === null || raw === undefined || raw === '') return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: true, value: raw };
  const s = raw.trim();
  if (s === '') return { ok: true, value: null };
  if (!(s.startsWith('{') || s.startsWith('['))) return { ok: true, value: raw };
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false, error: `Invalid JSON in ${field}` };
  }
}

function sanitizeImportRow(
  tableName: string,
  rawNorm: Record<string, any>
): { data: Record<string, any>; error?: string } {
  const allow = importAllowlist(tableName);
  if (allow.size === 0) {
    return { data: {}, error: `Unsupported table for import: ${tableName}` };
  }

  const data: Record<string, any> = {};

  for (const key of allow) {
    if (!(key in rawNorm)) continue;
    let val = rawNorm[key];

    if (tableName === 'calendar' && key === 'date') {
      const d = coerceCalendarDateRaw(val);
      if (!isEmptyCell(val) && d === null) {
        return { data: {}, error: 'Invalid calendar date' };
      }
      if (d) val = d;
    }

    if (BOOLEAN_IMPORT_FIELDS.has(key)) {
      const b = parseBooleanCell(val);
      if (b !== undefined) val = b;
    }

    if (NUMERIC_IMPORT_FIELDS.has(key)) {
      const n = parseNumberCell(val);
      if (n === null) return { data: {}, error: `Invalid number for ${key}` };
      if (n !== undefined) val = n;
    }

    if (JSONB_IMPORT_FIELDS.has(key)) {
      const parsed = tryParseJsonField(key, val);
      if (!parsed.ok) return { data: {}, error: parsed.error };
      val = parsed.value;
    }

    if (!isEmptyCell(val)) {
      // Sanitize string fields to prevent stored XSS from malicious CSV content.
      data[key] = typeof val === 'string' ? sanitizeText(val.trim()) : val;
    }
  }

  return { data };
}

function rowNaturalKey(tableName: string, data: Record<string, any>): string | null {
  switch (tableName) {
    case 'products': {
      const sku = String(data.sku ?? '').trim();
      return sku ? `sku:${sku.toLowerCase()}` : null;
    }
    case 'customers': {
      const code = String(data.customer_code ?? '').trim();
      if (code) return `code:${code.toLowerCase()}`;
      const email = String(data.email ?? '').trim().toLowerCase();
      return email ? `email:${email}` : null;
    }
    case 'suppliers': {
      const code = String(data.supplier_code ?? '').trim();
      if (code) return `code:${code.toLowerCase()}`;
      const email = String(data.email ?? '').trim().toLowerCase();
      return email ? `email:${email}` : null;
    }
    case 'warehouses': {
      const code = String(data.warehouse_code ?? '').trim();
      return code ? `code:${code.toLowerCase()}` : null;
    }
    case 'calendar': {
      const d = String(data.date ?? '').trim().slice(0, 10);
      return d ? `date:${d}` : null;
    }
    default:
      return null;
  }
}

interface ImportLookups {
  existingUuids: Set<string>;
  byNatural: Map<string, string>;
  calendarByDate: Map<string, number>;
  calendarIds: Set<number>;
}

async function fetchImportLookups(tableName: string, tenantId: string): Promise<ImportLookups> {
  const empty: ImportLookups = {
    existingUuids: new Set(),
    byNatural: new Map(),
    calendarByDate: new Map(),
    calendarIds: new Set(),
  };

  if (tableName === 'calendar') {
    const { data, error } = await (supabase as any).from('calendar').select('id, date').eq('tenant_id', tenantId);
    if (error) throw error;
    for (const r of data || []) {
      const id = r.id as number;
      const dateStr = String(r.date).slice(0, 10);
      empty.calendarIds.add(id);
      empty.calendarByDate.set(dateStr, id);
    }
    return empty;
  }

  let select = 'id';
  if (tableName === 'products') select = 'id, sku';
  else if (tableName === 'customers') select = 'id, customer_code, email';
  else if (tableName === 'suppliers') select = 'id, supplier_code, email';
  else if (tableName === 'warehouses') select = 'id, warehouse_code';

  const { data, error } = await (supabase as any).from(tableName).select(select).eq('tenant_id', tenantId);
  if (error) throw error;

  for (const r of data || []) {
    const id = String(r.id);
    empty.existingUuids.add(id);

    if (tableName === 'products' && r.sku != null && String(r.sku).trim() !== '') {
      empty.byNatural.set(`sku:${String(r.sku).trim().toLowerCase()}`, id);
    }
    if (tableName === 'customers') {
      if (r.customer_code != null && String(r.customer_code).trim() !== '') {
        empty.byNatural.set(`code:${String(r.customer_code).trim().toLowerCase()}`, id);
      }
      if (r.email != null && String(r.email).trim() !== '') {
        empty.byNatural.set(`email:${String(r.email).trim().toLowerCase()}`, id);
      }
    }
    if (tableName === 'suppliers') {
      if (r.supplier_code != null && String(r.supplier_code).trim() !== '') {
        empty.byNatural.set(`code:${String(r.supplier_code).trim().toLowerCase()}`, id);
      }
      if (r.email != null && String(r.email).trim() !== '') {
        empty.byNatural.set(`email:${String(r.email).trim().toLowerCase()}`, id);
      }
    }
    if (tableName === 'warehouses' && r.warehouse_code != null && String(r.warehouse_code).trim() !== '') {
      empty.byNatural.set(`code:${String(r.warehouse_code).trim().toLowerCase()}`, id);
    }
  }

  return empty;
}

function coerceFilePk(tableName: string, raw: unknown): string | number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (tableName === 'calendar') {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const n = Number(raw.trim());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    if (isUuid(t)) return t;
  }
  return null;
}

function isoWeekUTC(y: number, m: number, d: number): number {
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function enrichCalendarRowForDb(row: Record<string, any>): Record<string, any> {
  const dateStr = typeof row.date === 'string' ? row.date.slice(0, 10) : '';
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return row;
  const ys = parseInt(dateStr.slice(0, 4), 10);
  const ms = parseInt(dateStr.slice(5, 7), 10);
  const ds = parseInt(dateStr.slice(8, 10), 10);
  const utc = new Date(Date.UTC(ys, ms - 1, ds));
  const dow = utc.getUTCDay();
  return {
    ...row,
    date: dateStr,
    year: ys,
    month: ms,
    day: ds,
    day_of_week: dow,
    week_iso: isoWeekUTC(ys, ms, ds),
  };
}

function rowIsEffectivelyEmpty(data: Record<string, any>): boolean {
  return Object.keys(data).length === 0;
}

function stripInternalExportFields(
  tableName: string,
  rows: Record<string, unknown>[] | null
): Record<string, unknown>[] {
  if (!rows?.length) return [];
  const omit = exportOmitKeySet(tableName);
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!omit.has(k)) out[k] = v;
    }
    return out;
  });
}

function resolveExportColumnOrder(tableName: string, keySet: Set<string>): string[] {
  const preferred = EXPORT_COLUMN_ORDER_BY_TABLE[tableName] ?? [];
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const k of preferred) {
    if (keySet.has(k) && !seen.has(k)) {
      ordered.push(k);
      seen.add(k);
    }
  }
  const rest = [...keySet].filter((k) => !seen.has(k)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

/** Strip internals, unify column order across all rows, fill missing cells for stable CSV headers. */
export function buildExportRows(tableName: string, rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const stripped = stripInternalExportFields(tableName, rows);
  if (stripped.length === 0) return [];

  const allKeys = new Set<string>();
  for (const r of stripped) {
    for (const k of Object.keys(r)) allKeys.add(k);
  }
  const columnOrder = resolveExportColumnOrder(tableName, allKeys);

  return stripped.map((r) => {
    const out: Record<string, unknown> = {};
    for (const k of columnOrder) {
      out[k] = k in r ? (r[k] ?? '') : '';
    }
    return out;
  });
}

/**
 * Validate imported rows: allowlist + required fields + tenant-scoped id or natural key → NEW/UPDATE.
 */
export async function validateAndClassifyRows(
  tableName: string,
  tenantId: string,
  importedRows: Record<string, any>[]
): Promise<ImportRow[]> {
  const lookups = await fetchImportLookups(tableName, tenantId);
  const seenNatural = new Set<string>();
  const results: ImportRow[] = [];

  importedRows.forEach((row, index) => {
    const sourceRowNumber = index + 1;
    const rawNorm = normalizeImportKeys(row);
    const filePk = coerceFilePk(tableName, rawNorm['id']);
    const { data: sanitized, error: sanitizeError } = sanitizeImportRow(tableName, rawNorm);

    if (sanitizeError) {
      results.push({
        originalData: {},
        classification: 'INVALID',
        reason: sanitizeError,
        sourceRowNumber,
      });
      return;
    }

    if (rowIsEffectivelyEmpty(sanitized)) {
      results.push({
        originalData: {},
        classification: 'INVALID',
        reason: 'Empty row',
        sourceRowNumber,
      });
      return;
    }

    const required = IMPORT_REQUIRED_BY_TABLE[tableName] ?? [];
    for (const field of required) {
      if (isEmptyCell(sanitized[field])) {
        results.push({
          originalData: sanitized,
          classification: 'INVALID',
          reason: `Missing required field: ${field}`,
          sourceRowNumber,
        });
        return;
      }
    }

    const nat = rowNaturalKey(tableName, sanitized);
    if (nat && seenNatural.has(nat)) {
      results.push({
        originalData: sanitized,
        classification: 'INVALID',
        reason: `Duplicate ${nat.split(':')[0]} in file`,
        sourceRowNumber,
      });
      return;
    }
    if (nat) seenNatural.add(nat);

    const base: ImportRow = {
      originalData: sanitized,
      classification: 'NEW',
      sourceRowNumber,
    };

    if (tableName === 'calendar') {
      if (filePk !== null && lookups.calendarIds.has(filePk as number)) {
        base.classification = 'UPDATE';
        base.pkValue = filePk;
        results.push(base);
        return;
      }
      const dateKey = sanitized.date ? String(sanitized.date).slice(0, 10) : '';
      const existingId = dateKey ? lookups.calendarByDate.get(dateKey) : undefined;
      if (existingId !== undefined) {
        base.classification = 'UPDATE';
        base.pkValue = existingId;
      }
      results.push(base);
      return;
    }

    if (filePk !== null && typeof filePk === 'string') {
      if (lookups.existingUuids.has(filePk)) {
        base.classification = 'UPDATE';
        base.pkValue = filePk;
        results.push(base);
        return;
      }
      results.push({
        originalData: sanitized,
        classification: 'INVALID',
        reason: 'Unknown id (not in this tenant)',
        sourceRowNumber,
      });
      return;
    }

    if (nat) {
      const id = lookups.byNatural.get(nat);
      if (id) {
        base.classification = 'UPDATE';
        base.pkValue = id;
      }
    }

    results.push(base);
  });

  return results;
}

function withInsertServerFields(tableName: string, row: Record<string, any>, tenantId: string, userId: string) {
  if (tableName === 'calendar') {
    return { ...enrichCalendarRowForDb({ ...row }), tenant_id: tenantId };
  }
  if (TABLES_WITH_USER_AUDIT.has(tableName)) {
    return { ...row, tenant_id: tenantId, created_by: userId, updated_by: userId };
  }
  return { ...row, tenant_id: tenantId };
}

function withUpdateServerFields(tableName: string, row: Record<string, any>, userId: string) {
  const ts = new Date().toISOString();
  if (tableName === 'calendar') {
    return { ...enrichCalendarRowForDb({ ...row }), updated_at: ts };
  }
  if (TABLES_WITH_USER_AUDIT.has(tableName)) {
    return { ...row, updated_by: userId, updated_at: ts };
  }
  return { ...row, updated_at: ts };
}

/**
 * Apply import changes to database (sanitized payloads + session tenant/user only).
 */
export async function applyImportChanges(
  tableName: string,
  tenantId: string,
  importRows: ImportRow[],
  userId: string
): Promise<{ success: boolean; error?: string; summary: any }> {
  try {
    const newRows = importRows.filter((r) => r.classification === 'NEW');
    const updateRows = importRows.filter((r) => r.classification === 'UPDATE');
    const deleteRows = importRows.filter((r) => r.classification === 'DELETE');

    let inserts = 0,
      updates = 0,
      deletes = 0;

    if (newRows.length > 0) {
      const insertData = newRows.map((r) => withInsertServerFields(tableName, r.originalData, tenantId, userId));
      const { error } = await (supabase as any).from(tableName).insert(insertData);
      if (error) throw error;
      inserts = newRows.length;
    }

    if (updateRows.length > 0) {
      for (const row of updateRows) {
        const { error } = await (supabase as any)
          .from(tableName)
          .update(withUpdateServerFields(tableName, row.originalData, userId))
          .eq('id', row.pkValue)
          .eq('tenant_id', tenantId);
        if (error) throw error;
      }
      updates = updateRows.length;
    }

    if (deleteRows.length > 0) {
      const metadata = await inferTableMetadata(tableName);
      if (metadata.softDeleteField) {
        const updateField =
          metadata.softDeleteField === 'deleted_at'
            ? { deleted_at: new Date().toISOString(), deleted_by: userId }
            : { is_deleted: true, updated_by: userId };

        const { error } = await (supabase as any)
          .from(tableName)
          .update(updateField)
          .in(
            'id',
            deleteRows.map((r) => r.pkValue)
          )
          .eq('tenant_id', tenantId);
        if (error) throw error;
        deletes = deleteRows.length;
      }
    }

    return {
      success: true,
      summary: { inserts, updates, deletes, invalids: 0 },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      summary: { inserts: 0, updates: 0, deletes: 0, invalids: 0 },
    };
  }
}
