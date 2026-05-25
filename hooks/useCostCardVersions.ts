'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTenant } from '@/contexts/TenantContext';

import { tenantedSupabase } from '@/lib/supabaseSchemaClient';

import type { CostCardVersion, CostCardVersionFormData } from '@/types/costCard';

interface UseCostCardVersionsReturn {
  versions: CostCardVersion[];

  isLoading: boolean;

  error: string | null;

  createVersion: (
    costSetId: string,

    data: CostCardVersionFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;

  updateVersion: (
    versionId: string,

    data: CostCardVersionFormData
  ) => Promise<{ success: boolean; error?: string }>;

  activateVersion: (
    costSetId: string,

    versionId: string
  ) => Promise<{ success: boolean; error?: string }>;

  lockVersion: (versionId: string) => Promise<{ success: boolean; error?: string }>;

  cloneVersion: (
    sourceVersionId: string,

    newLabel: string,

    newEffectiveDate: string
  ) => Promise<{ success: boolean; id?: string; error?: string }>;

  refreshVersions: () => Promise<void>;
}

export function useCostCardVersions(costSetId: string | null): UseCostCardVersionsReturn {
  const { effectiveTenantId: tenant_id, user } = useTenant();

  const [versions, setVersions] = useState<CostCardVersion[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!tenant_id || !costSetId) {
      setVersions([]);

      setIsLoading(false);

      return;
    }

    try {
      setIsLoading(true);

      setError(null);

      const { data, error: err } = await tenantedSupabase

        .from('cost_card_versions')

        .select('*')

        .eq('cost_set_id', costSetId)

        .order('version_number', { ascending: false });

      if (err) throw err;

      setVersions((data ?? []) as unknown as CostCardVersion[]);
    } catch (err: unknown) {
      console.error('Error fetching cost card versions:', err);

      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [tenant_id, costSetId]);

  useEffect(() => {
    void fetchVersions();
  }, [fetchVersions]);

  const createVersion = async (
    sid: string,

    data: CostCardVersionFormData
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { data: maxRow } = await tenantedSupabase

        .from('cost_card_versions')

        .select('version_number')

        .eq('cost_set_id', sid)

        .order('version_number', { ascending: false })

        .limit(1)

        .maybeSingle();

      const nextNumber = ((maxRow as { version_number?: number } | null)?.version_number ?? 0) + 1;

      const { data: created, error: err } = await tenantedSupabase

        .from('cost_card_versions')

        .insert([
          {
            cost_set_id: sid,

            tenant_id,

            version_number: nextNumber,

            label: data.label.trim() || null,

            status: 'draft',

            effective_date: data.effective_date,

            notes: data.notes.trim() || null,

            locked: false,

            created_by: user?.id ?? null,
          },
        ])

        .select('id')

        .single();

      if (err) return { success: false, error: err.message };

      await fetchVersions();

      const row = created as { id?: string } | null;

      return { success: true, id: row?.id };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create version',
      };
    }
  };

  const updateVersion = async (
    versionId: string,
    data: CostCardVersionFormData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase
        .from('cost_card_versions')
        .update({
          label: data.label.trim() || null,
          effective_date: data.effective_date,
          notes: data.notes.trim() || null,
        })
        .eq('id', versionId);

      if (err) return { success: false, error: err.message };
      await fetchVersions();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update version',
      };
    }
  };

  const activateVersion = async (
    sid: string,

    versionId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: archiveErr } = await tenantedSupabase

        .from('cost_card_versions')

        .update({ status: 'archived' })

        .eq('cost_set_id', sid)

        .eq('status', 'active');

      if (archiveErr) return { success: false, error: archiveErr.message };

      const { error: activateErr } = await tenantedSupabase

        .from('cost_card_versions')

        .update({ status: 'active' })

        .eq('id', versionId);

      if (activateErr) return { success: false, error: activateErr.message };

      await fetchVersions();

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to activate version',
      };
    }
  };

  const lockVersion = async (versionId: string): Promise<{ success: boolean; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { error: err } = await tenantedSupabase

        .from('cost_card_versions')

        .update({ locked: true })

        .eq('id', versionId);

      if (err) return { success: false, error: err.message };

      await fetchVersions();

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to lock version',
      };
    }
  };

  const cloneVersion = async (
    sourceVersionId: string,

    newLabel: string,

    newEffectiveDate: string
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!tenant_id) return { success: false, error: 'No tenant' };

    try {
      const { data, error: err } = await tenantedSupabase.rpc('clone_cost_card_version', {
        source_version_id: sourceVersionId,

        new_label: newLabel.trim(),

        new_effective_date: newEffectiveDate,
      });

      if (err) return { success: false, error: err.message };

      await fetchVersions();

      return { success: true, id: typeof data === 'string' ? data : undefined };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to clone version',
      };
    }
  };

  return {
    versions,

    isLoading,

    error,

    createVersion,

    updateVersion,

    activateVersion,

    lockVersion,

    cloneVersion,

    refreshVersions: fetchVersions,
  };
}
