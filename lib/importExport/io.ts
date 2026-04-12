import { supabase } from '@/lib/supabaseClient';
import { buildExportRows } from '@/lib/importExport/core';

/**
 * Import/export I/O — loaded via dynamic import() from UI so papaparse stays out of the main chunk.
 * CSV only (no spreadsheet binary formats).
 */
export async function exportTable(tableName: string, tenantId: string): Promise<Blob> {
  try {
    // Dynamic table name is not in generated schema keys.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime-selected import/export table
    const { data, error } = await (supabase as any)
      .from(tableName)
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const exportRows = buildExportRows(tableName, (data || []) as Record<string, unknown>[]);
    const Papa = (await import('papaparse')).default;
    const csv = Papa.unparse(exportRows);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  } catch (err) {
    console.error('Export error:', err);
    throw err;
  }
}

export async function parseImportFile(file: File): Promise<Record<string, unknown>[]> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Only CSV files are supported');
  }
  const Papa = (await import('papaparse')).default;
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve((results.data ?? []) as Record<string, unknown>[]),
      error: (err: Error) => reject(err),
    });
  });
}
