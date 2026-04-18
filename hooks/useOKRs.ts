/**
 * useOKRs Hook
 * 
 * Custom React hook for managing OKRs data from Supabase
 * Provides CRUD operations and progress calculation
 */

import { useState, useEffect } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { OKR, KeyResult, OKRFormData, KeyResultFormData, OKRFilters } from '@/types/okr';
import { useTenant } from '@/contexts/TenantContext';

interface UseOKRsReturn {
  okrs: OKR[];
  isLoading: boolean;
  error: string | null;
  createOKR: (data: OKRFormData) => Promise<{ success: boolean; error?: string; data?: OKR }>;
  updateOKR: (id: string, data: Partial<OKRFormData>) => Promise<{ success: boolean; error?: string }>;
  deleteOKR: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshOKRs: () => Promise<void>;
}

export function useOKRs(filters?: OKRFilters): UseOKRsReturn {
  const { user, effectiveTenantId: tenant_id } = useTenant();
  const [okrs, setOKRs] = useState<OKR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate OKR progress from key results
  const calculateOKRProgress = (keyResults: KeyResult[]): number => {
    if (!keyResults || keyResults.length === 0) return 0;

    let totalWeight = 0;
    let weightedProgress = 0;

    keyResults.forEach(kr => {
      const weight = kr.weight || 1.0;
      totalWeight += weight;

      let progress = 0;
      if (kr.target_value && kr.target_value > 0) {
        progress = Math.min((kr.current_value / kr.target_value) * 100, 100);
      } else if (kr.status === 'achieved') {
        progress = 100;
      }

      weightedProgress += progress * weight;
    });

    return totalWeight > 0 ? weightedProgress / totalWeight : 0;
  };

  // Fetch OKRs from Supabase with filters
  const fetchOKRs = async () => {
    if (!tenant_id) {
      setOKRs([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = tenantedSupabase
        .from('okrs')
        .select(`
          *,
          key_results (*)
        `)
        .eq('tenant_id', tenant_id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.project_id !== undefined) {
          if (filters.project_id === null) {
            query = query.is('project_id', null);
          } else {
            query = query.eq('project_id', filters.project_id);
          }
        }

        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        if (filters.quarter) {
          query = query.eq('quarter', filters.quarter);
        }

        if (filters.year) {
          query = query.eq('year', filters.year);
        }

        if (filters.searchQuery) {
          const search = filters.searchQuery.toLowerCase();
          query = query.ilike('objective', `%${search}%`);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Calculate progress for each OKR
      const okrsWithProgress = (data || []).map((okr: any) => {
        const keyResults = (okr.key_results || []) as KeyResult[];
        const progress = calculateOKRProgress(keyResults);
        return {
          ...okr,
          key_results: keyResults,
          progress_percentage: Math.round(progress),
        } as OKR;
      });

      setOKRs(okrsWithProgress);
    } catch (err: any) {
      console.error('Error fetching OKRs:', err);
      setError(err.message || 'Failed to fetch OKRs');
      setOKRs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new OKR with key results
  const createOKR = async (data: OKRFormData): Promise<{ success: boolean; error?: string; data?: OKR }> => {
    try {
      setError(null);

      const currentUserId = user?.id || null;

      // Create OKR
      const { data: newOKR, error: okrError } = await tenantedSupabase
        .from('okrs')
        .insert([{
          project_id: data.project_id || null,
          objective: data.objective,
          quarter: data.quarter || null,
          year: data.year || null,
          status: data.status || 'draft',
          target_date: data.target_date || null,
          created_by: currentUserId,
          updated_by: currentUserId,
        }] as any)
        .select()
        .single();

      if (okrError) throw okrError;

      const createdOkr = newOKR as { id: string };

      // Create key results if provided
      if (data.key_results && data.key_results.length > 0) {
        const keyResultsData = data.key_results.map(kr => ({
          okr_id: createdOkr.id,
          description: kr.description,
          target_value: kr.target_value || null,
          current_value: kr.current_value || 0,
          unit: kr.unit || null,
          status: kr.status || 'not_started',
          weight: kr.weight || 1.0,
        }));

        const { error: krError } = await tenantedSupabase
          .from('key_results')
          .insert(keyResultsData as any);

        if (krError) throw krError;
      }

      await fetchOKRs();
      return { success: true, data: newOKR as unknown as OKR };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create OKR';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update an existing OKR
  const updateOKR = async (id: string, data: Partial<OKRFormData>): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const currentUserId = user?.id || null;

      const updateData: any = {
        updated_by: currentUserId,
        updated_at: new Date().toISOString(),
      };

      if (data.objective !== undefined) updateData.objective = data.objective;
      if (data.project_id !== undefined) updateData.project_id = data.project_id;
      if (data.quarter !== undefined) updateData.quarter = data.quarter;
      if (data.year !== undefined) updateData.year = data.year;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.target_date !== undefined) updateData.target_date = data.target_date;

      const { error: updateError } = await tenantedSupabase
        .from('okrs')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update key results if provided
      if (data.key_results) {
        // Delete existing key results
        await tenantedSupabase
          .from('key_results')
          .delete()
          .eq('okr_id', id);

        // Insert updated key results
        if (data.key_results.length > 0) {
          const keyResultsData = data.key_results.map(kr => ({
            okr_id: id,
            description: kr.description,
            target_value: kr.target_value || null,
            current_value: kr.current_value || 0,
            unit: kr.unit || null,
            status: kr.status || 'not_started',
            weight: kr.weight || 1.0,
          }));

          const { error: krError } = await tenantedSupabase
            .from('key_results')
            .insert(keyResultsData as any);

          if (krError) throw krError;
        }
      }

      await fetchOKRs();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update OKR';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete an OKR (soft delete)
  const deleteOKR = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const currentUserId = user?.id || null;

      const { error: deleteError } = await tenantedSupabase
        .from('okrs')
        .update({
          is_deleted: true,
          updated_by: currentUserId,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchOKRs();
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete OKR';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchOKRs();
  }, [filters]);

  return {
    okrs,
    isLoading,
    error,
    createOKR,
    updateOKR,
    deleteOKR,
    refreshOKRs: fetchOKRs,
  };
}
