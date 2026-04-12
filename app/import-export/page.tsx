'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ExportFormatDropdown } from '@/components/common/ExportFormatDropdown';
import { useTenant } from '@/contexts/TenantContext';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getTables,
  validateAndClassifyRows,
  applyImportChanges,
  type TableMetadata,
  type ImportRow,
} from '@/lib/importExportUtils';
import { supabase } from '@/lib/supabaseClient';
import { premiumPrimaryButton, premiumTertiaryButton, premiumSurfaces } from '@/lib/premiumUi';
import {
  Loader2,
  AlertCircle,
  Upload,
  CheckCircle,
  AlertTriangle,
  Save,
  Database,
} from 'lucide-react';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function ImportExportPage() {
  const router = useRouter();
  const { user, effectiveTenantId: tenant_id } = useTenant();
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const { can } = usePermissions();

  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tableRowCount, setTableRowCount] = useState(0);

  const canManageData = can('manage_users');

  useEffect(() => {
    if (profileLoading || !user) return;
    if (profile && !canManageData) {
      router.replace('/');
    }
  }, [profileLoading, user, profile, canManageData, router]);

  // Load available tables
  useEffect(() => {
    if (!tenant_id) return;

    const loadTables = async () => {
      try {
        setIsLoading(true);
        const availableTables = await getTables(tenant_id);
        setTables(availableTables);
        if (availableTables.length > 0) {
          setSelectedTable(availableTables[0].name);
        }
      } catch (err: unknown) {
        setError(errorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadTables();
  }, [tenant_id]);

  // Load table row count when table changes
  useEffect(() => {
    if (!selectedTable || !tenant_id) return;

    const loadRowCount = async () => {
      try {
        // Dynamic table name is not in generated schema keys.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime-selected import/export table
        const { count, error: err } = await (supabase as any)
          .from(selectedTable)
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant_id);

        if (err) throw err;
        setTableRowCount(count ?? 0);
      } catch (err: unknown) {
        console.error('Error loading row count:', err);
        setTableRowCount(0);
      }
    };

    loadRowCount();
  }, [selectedTable, tenant_id]);

  // Handle export
  const handleExport = async () => {
    if (!selectedTable || !tenant_id) return;

    try {
      setExportLoading(true);
      setError(null);
      const { exportTable } = await import('@/lib/importExport/io');
      const blob = await exportTable(selectedTable, tenant_id);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedTable}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Exported ${selectedTable} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setExportLoading(false);
    }
  };

  // Handle import file selection
  const handleFileSelect = async (file: File) => {
    if (!selectedTable || !tenant_id) return;

    try {
      setError(null);
      setImportFile(file);

      const { parseImportFile } = await import('@/lib/importExport/io');
      const parsed = await parseImportFile(file);
      const classified = await validateAndClassifyRows(
        selectedTable,
        tenant_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- validateAndClassifyRows accepts parsed CSV rows
        parsed as Record<string, any>[]
      );
      setImportRows(classified);
      setPreviewOpen(true);
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  };

  // Apply import changes
  const handleApplyChanges = async () => {
    if (!selectedTable || !tenant_id || !user?.id) return;

    try {
      setApplyLoading(true);
      setError(null);
      const result = await applyImportChanges(selectedTable, tenant_id, importRows, user.id);

      if (result.success) {
        setSuccessMessage(
          `Import completed: ${result.summary.inserts} inserted, ${result.summary.updates} updated, ${result.summary.deletes} deleted`
        );
        setImportRows([]);
        setImportFile(null);
        setPreviewOpen(false);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setApplyLoading(false);
    }
  };

  const stats = {
    newRows: importRows.filter((r) => r.classification === 'NEW').length,
    updateRows: importRows.filter((r) => r.classification === 'UPDATE').length,
    deleteRows: importRows.filter((r) => r.classification === 'DELETE').length,
    invalidRows: importRows.filter((r) => r.classification === 'INVALID').length,
    totalRows: importRows.length,
  };

  const isReady = profile && canManageData;
  const isRedirecting = profile && !canManageData;

  if (!isReady) {
    return (
      <ProtectedRoute>
        <PageContainer module="businessCore">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRedirecting ? 'Redirecting…' : 'Loading…'}
            </p>
          </div>
        </PageContainer>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          icon={Database}
          title="Import/Export"
          subtitle="Manage data ingestion and export with validation and classification"
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        <div className="space-y-4">
          {/* Hero Matrix */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Table Rows
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tableRowCount}
                  </p>
                </div>
                <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                  <Database className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                    New Rows
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.newRows}
                  </p>
                </div>
                <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                    Updates
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.updateRows}
                  </p>
                </div>
                <div className="p-2 bg-blue-200 dark:bg-blue-800/50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg border border-red-200 dark:border-red-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Invalid</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.invalidRows}
                  </p>
                </div>
                <div className="p-2 bg-red-200 dark:bg-red-800/50 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 dark:text-green-300">{successMessage}</p>
            </div>
          )}

          {/* Export Controls */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Table:</label>
            <select
              value={selectedTable}
              disabled={isLoading}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setImportRows([]);
                setImportFile(null);
              }}
              className="min-w-[11rem] w-48 px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500 disabled:opacity-50"
            >
              {tables.map((table) => (
                <option key={table.name} value={table.name}>
                  {table.label ?? table.name}
                </option>
              ))}
            </select>

            <div className="ml-2">
              <ExportFormatDropdown
                title="Export selected table as CSV"
                disabled={!selectedTable || exportLoading}
                isLoading={exportLoading}
                onExport={handleExport}
                buttonClassName={premiumTertiaryButton('sm', 'standard')}
              />
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Import Data</h3>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded p-4 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="import-file"
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Click to select or drag a CSV file here
                </p>
                {importFile && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {importFile.name}
                  </p>
                )}
              </label>
            </div>
          </div>

          {/* Preview Section */}
          {previewOpen && importRows.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Import Preview
                </h3>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Hide
                </button>
              </div>

              {/* Classification Sections */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    New ({stats.newRows})
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Update ({stats.updateRows})
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                  <p className="font-medium text-red-900 dark:text-red-100">
                    Delete ({stats.deleteRows})
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-2">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Invalid ({stats.invalidRows})
                  </p>
                </div>
              </div>

              {/* Invalid rows detail */}
              {stats.invalidRows > 0 && (
                <div className="space-y-1 bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Issues Found:
                  </p>
                  {importRows
                    .filter((r) => r.classification === 'INVALID')
                    .slice(0, 5)
                    .map((row, idx) => (
                      <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                        Row {row.sourceRowNumber ?? idx + 1}: {row.reason}
                      </p>
                    ))}
                  {stats.invalidRows > 5 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      ... and {stats.invalidRows - 5} more issues
                    </p>
                  )}
                </div>
              )}

              {/* Apply button */}
              <button
                onClick={handleApplyChanges}
                disabled={applyLoading || stats.invalidRows > 0}
                className={`w-full ${premiumPrimaryButton('businessCore', 'md', 'wide')}`}
              >
                {applyLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {applyLoading ? 'Applying...' : 'Apply Changes'}
              </button>
            </div>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
