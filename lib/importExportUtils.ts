import { supabase } from '@/lib/supabaseClient';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';
import * as XLSX from 'xlsx';

export interface TableMetadata {
  name: string;
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
  originalData: Record<string, any>;
  classification: 'NEW' | 'UPDATE' | 'DELETE' | 'INVALID';
  reason?: string;
  pkValue?: any;
}

/**
 * Fetch all accessible tables from current schema
 */
export async function getTables(tenantId: string): Promise<TableMetadata[]> {
  try {
    // Fallback: return hardcoded common tables for tenant-accessible schemas
    // Excludes: users, user_profiles, and tenants (system tables)
    return [
      { name: 'customers', columns: [], primaryKey: 'id', softDeleteField: 'deleted_at' },
      { name: 'products', columns: [], primaryKey: 'id', softDeleteField: 'deleted_at' },
      { name: 'calendar', columns: [], primaryKey: 'id', softDeleteField: undefined },
    ];
  } catch (err) {
    console.error('Error fetching tables:', err);
    return [];
  }
}

/**
 * Fetch column metadata for a specific table
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

/**
 * Export data from table to CSV/XLSX
 */
export async function exportTable(tableName: string, tenantId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
  try {
    const { data, error } = await (supabase as any).from(tableName).select('*').eq('tenant_id', tenantId);

    if (error) throw error;

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data || []);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tableName);
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } else {
      const csv = Papa.unparse(data || []);
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    }
  } catch (err) {
    console.error('Export error:', err);
    throw err;
  }
}

/**
 * Parse uploaded file (CSV/XLSX)
 */
export async function parseImportFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, any>>) => resolve(results.data as Record<string, any>[]),
        error: reject,
      });
    } else if (file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(jsonData as Record<string, any>[]);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Unsupported file format'));
    }
  });
}

/**
 * Validate imported rows against schema and existing data
 */
export async function validateAndClassifyRows(
  tableName: string,
  tenantId: string,
  importedRows: Record<string, any>[]
): Promise<ImportRow[]> {
  const metadata = await inferTableMetadata(tableName);

  // Fetch existing PKs
  const { data: existing, error: existErr } = await (supabase as any).from(tableName).select('id').eq('tenant_id', tenantId);

  if (existErr) throw existErr;
  const existingIds = new Set((existing || []).map((row: any) => row.id));

  // Classify each row
  return importedRows.map((row) => {
    const classification: ImportRow = {
      originalData: row,
      pkValue: row.id,
      classification: 'NEW',
      reason: undefined,
    };

    // Validate required fields
    for (const col of metadata.columns) {
      if (col.isRequired && !row[col.name]) {
        classification.classification = 'INVALID';
        classification.reason = `Missing required field: ${col.name}`;
        return classification;
      }
    }

    // Determine if NEW or UPDATE
    if (row.id && existingIds.has(row.id)) {
      classification.classification = 'UPDATE';
    } else if (!row.id) {
      classification.classification = 'NEW';
    }

    return classification;
  });
}

/**
 * Apply import changes to database
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

    // Insert new rows
    if (newRows.length > 0) {
      const insertData = newRows.map((r) => ({
        ...r.originalData,
        tenant_id: tenantId,
        created_by: userId,
        updated_by: userId,
      }));

      const { error } = await (supabase as any).from(tableName).insert(insertData);
      if (error) throw error;
      inserts = newRows.length;
    }

    // Update existing rows
    if (updateRows.length > 0) {
      for (const row of updateRows) {
        const { error } = await (supabase as any)
          .from(tableName)
          .update({
            ...row.originalData,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.pkValue)
          .eq('tenant_id', tenantId);
        if (error) throw error;
      }
      updates = updateRows.length;
    }

    // Soft delete rows
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
          .in('id', deleteRows.map((r) => r.pkValue))
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
