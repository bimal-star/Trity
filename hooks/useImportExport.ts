'use client';

import { useState } from 'react';
import {
  getTables,
  validateAndClassifyRows,
  applyImportChanges,
  TableMetadata,
  ImportRow,
} from '@/lib/importExportUtils';

type ApplyImportResult = Awaited<ReturnType<typeof applyImportChanges>>;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface UseImportExportReturn {
  tables: TableMetadata[];
  loadTables: (tenantId: string) => Promise<void>;
  exportData: (tableName: string, tenantId: string) => Promise<Blob>;
  parseFile: (file: File) => Promise<Record<string, unknown>[]>;
  classifyRows: (
    tableName: string,
    tenantId: string,
    rows: Record<string, unknown>[]
  ) => Promise<ImportRow[]>;
  applyChanges: (
    tableName: string,
    tenantId: string,
    rows: ImportRow[],
    userId: string
  ) => Promise<ApplyImportResult>;
  isLoading: boolean;
  error: string | null;
}

export function useImportExport(): UseImportExportReturn {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTables = async (tenantId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getTables(tenantId);
      setTables(result);
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (tableName: string, tenantId: string) => {
    try {
      setError(null);
      const { exportTable } = await import('@/lib/importExport/io');
      return await exportTable(tableName, tenantId);
    } catch (err: unknown) {
      setError(errorMessage(err));
      throw err;
    }
  };

  const parseFile = async (file: File) => {
    try {
      setError(null);
      const { parseImportFile } = await import('@/lib/importExport/io');
      return await parseImportFile(file);
    } catch (err: unknown) {
      setError(errorMessage(err));
      throw err;
    }
  };

  const classifyRows = async (
    tableName: string,
    tenantId: string,
    rows: Record<string, unknown>[]
  ) => {
    try {
      setError(null);
      return await validateAndClassifyRows(
        tableName,
        tenantId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- validateAndClassifyRows expects parsed CSV shape
        rows as Record<string, any>[]
      );
    } catch (err: unknown) {
      setError(errorMessage(err));
      throw err;
    }
  };

  const applyChanges = async (
    tableName: string,
    tenantId: string,
    rows: ImportRow[],
    userId: string
  ) => {
    try {
      setError(null);
      return await applyImportChanges(tableName, tenantId, rows, userId);
    } catch (err: unknown) {
      setError(errorMessage(err));
      throw err;
    }
  };

  return {
    tables,
    loadTables,
    exportData,
    parseFile,
    classifyRows,
    applyChanges,
    isLoading,
    error,
  };
}
