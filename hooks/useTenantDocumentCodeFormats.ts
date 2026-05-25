'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/lib/supabaseClient';
import {
  DOCUMENT_CODE_TYPES,
  type DocumentCodeType,
  type TenantDocumentCodeFormat,
  type TenantDocumentCodeFormatUpdate,
  defaultDocumentCodeFormat,
} from '@/lib/documentCodeFormats';

export interface UseTenantDocumentCodeFormatsReturn {
  formats: TenantDocumentCodeFormat[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateFormat: (
    documentType: DocumentCodeType,
    patch: TenantDocumentCodeFormatUpdate
  ) => Promise<{ success: boolean; error?: string }>;
  ensureDefaults: () => Promise<void>;
}

function sortFormats(rows: TenantDocumentCodeFormat[]): TenantDocumentCodeFormat[] {
  const order = new Map(DOCUMENT_CODE_TYPES.map((t, i) => [t, i]));
  return [...rows].sort(
    (a, b) => (order.get(a.document_type) ?? 99) - (order.get(b.document_type) ?? 99)
  );
}

export function useTenantDocumentCodeFormats(): UseTenantDocumentCodeFormatsReturn {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [formats, setFormats] = useState<TenantDocumentCodeFormat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureDefaults = useCallback(async () => {
    if (!tenant_id) return;
    // Regenerate types/database.ts after applying migration 20260525200000
    const { error: rpcErr } = await (
      supabase as unknown as {
        rpc: (
          fn: string,
          args: { p_tenant_id: string }
        ) => Promise<{ error: { message: string } | null }>;
      }
    ).rpc('ensure_tenant_document_code_formats', { p_tenant_id: tenant_id });
    if (rpcErr) {
      console.warn('ensure_tenant_document_code_formats:', rpcErr.message);
    }
  }, [tenant_id]);

  const refresh = useCallback(async () => {
    if (!tenant_id) {
      setFormats([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await ensureDefaults();
      const { data, error: fetchErr } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (
                col: string,
                val: string
              ) => Promise<{
                data: TenantDocumentCodeFormat[] | null;
                error: { message: string } | null;
              }>;
            };
          };
        }
      )
        .from('tenant_document_code_formats')
        .select('*')
        .eq('tenant_id', tenant_id);

      if (fetchErr) throw fetchErr;

      const rows = (data ?? []) as TenantDocumentCodeFormat[];
      const byType = new Map(rows.map((r) => [r.document_type, r]));
      const merged = DOCUMENT_CODE_TYPES.map((documentType) => {
        const existing = byType.get(documentType);
        if (existing) return existing;
        const d = defaultDocumentCodeFormat(documentType);
        return {
          tenant_id,
          ...d,
        } as TenantDocumentCodeFormat;
      });
      setFormats(sortFormats(merged));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load code formats');
      setFormats([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, ensureDefaults]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateFormat = useCallback(
    async (
      documentType: DocumentCodeType,
      patch: TenantDocumentCodeFormatUpdate
    ): Promise<{ success: boolean; error?: string }> => {
      if (!tenant_id) return { success: false, error: 'No tenant' };
      try {
        const { error: upsertErr } = await (
          supabase as unknown as {
            from: (t: string) => {
              upsert: (
                row: Record<string, unknown>,
                opts: { onConflict: string }
              ) => Promise<{ error: { message: string } | null }>;
            };
          }
        )
          .from('tenant_document_code_formats')
          .upsert(
            {
              tenant_id,
              document_type: documentType,
              ...patch,
            },
            { onConflict: 'tenant_id,document_type' }
          );
        if (upsertErr) return { success: false, error: upsertErr.message };
        await refresh();
        return { success: true };
      } catch (e: unknown) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Failed to save format',
        };
      }
    },
    [tenant_id, refresh]
  );

  return {
    formats,
    isLoading,
    error,
    refresh,
    updateFormat,
    ensureDefaults,
  };
}
