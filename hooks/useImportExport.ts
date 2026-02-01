'use client';

import { useState } from 'react';
import {
  getTables,
  exportTable,
  parseImportFile,
  validateAndClassifyRows,
  applyImportChanges,
  TableMetadata,
  ImportRow,
} from '@/lib/importExportUtils';

interface UseImportExportReturn {
  tables: TableMetadata[];
  loadTables: (tenantId: string) => Promise<void>;
  exportData: (tableName: string, tenantId: string, format: 'csv' | 'xlsx') => Promise<Blob>;
  parseFile: (file: File) => Promise<Record<string, any>[]>;
  classifyRows: (tableName: string, tenantId: string, rows: Record<string, any>[]) => Promise<ImportRow[]>;
  applyChanges: (tableName: string, tenantId: string, rows: ImportRow[], userId: string) => Promise<any>;
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (tableName: string, tenantId: string, format: 'csv' | 'xlsx') => {
    try {
      setError(null);
      return await exportTable(tableName, tenantId, format);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const parseFile = async (file: File) => {
    try {
      setError(null);
      return await parseImportFile(file);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const classifyRows = async (tableName: string, tenantId: string, rows: Record<string, any>[]) => {
    try {
      setError(null);
      return await validateAndClassifyRows(tableName, tenantId, rows);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const applyChanges = async (tableName: string, tenantId: string, rows: ImportRow[], userId: string) => {
    try {
      setError(null);
      return await applyImportChanges(tableName, tenantId, rows, userId);
    } catch (err: any) {
      setError(err.message);
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
