'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type {
  SubscriptionPackageInsert,
  SubscriptionPackageRow,
  SubscriptionPackageUpdate,
} from '@/types/subscriptionPackage';

export function useSubscriptionPackages() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listAll = useCallback(async (): Promise<SubscriptionPackageRow[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('subscription_packages')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (err) throw err;
      return (data ?? []) as SubscriptionPackageRow[];
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to load packages');
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listActive = useCallback(async (): Promise<SubscriptionPackageRow[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('subscription_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (err) throw err;
      return (data ?? []) as SubscriptionPackageRow[];
    } catch (e) {
      const msg = getErrorMessage(e, 'Failed to load packages');
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getById = useCallback(async (id: string): Promise<SubscriptionPackageRow | null> => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('subscription_packages')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (err) throw err;
      return (data as SubscriptionPackageRow) ?? null;
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load package'));
      return null;
    }
  }, []);

  const createPackage = useCallback(
    async (
      row: SubscriptionPackageInsert
    ): Promise<{ data: SubscriptionPackageRow | null; error: string | null }> => {
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('subscription_packages')
          .insert([
            {
              name: row.name.trim(),
              description: row.description?.trim() || null,
              mapped_tier: row.mapped_tier,
              is_active: row.is_active ?? true,
              sort_order: row.sort_order ?? 0,
            },
          ])
          .select()
          .single();
        if (err) throw err;
        return { data: data as SubscriptionPackageRow, error: null };
      } catch (e) {
        const msg = getErrorMessage(e, 'Failed to create package');
        setError(msg);
        return { data: null, error: msg };
      }
    },
    []
  );

  const updatePackage = useCallback(
    async (
      id: string,
      patch: SubscriptionPackageUpdate
    ): Promise<{ success: boolean; error: string | null }> => {
      setError(null);
      try {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.name !== undefined) payload.name = String(patch.name).trim();
        if (patch.description !== undefined) {
          payload.description =
            typeof patch.description === 'string'
              ? patch.description.trim() || null
              : patch.description;
        }
        if (patch.mapped_tier !== undefined) payload.mapped_tier = patch.mapped_tier;
        if (patch.is_active !== undefined) payload.is_active = patch.is_active;
        if (patch.sort_order !== undefined) payload.sort_order = patch.sort_order;
        const { error: err } = await supabase
          .from('subscription_packages')
          .update(payload)
          .eq('id', id);
        if (err) throw err;
        return { success: true, error: null };
      } catch (e) {
        const msg = getErrorMessage(e, 'Failed to update package');
        setError(msg);
        return { success: false, error: msg };
      }
    },
    []
  );

  const removePackage = useCallback(
    async (id: string): Promise<{ success: boolean; error: string | null }> => {
      setError(null);
      try {
        const { error: err } = await supabase.from('subscription_packages').delete().eq('id', id);
        if (err) throw err;
        return { success: true, error: null };
      } catch (e) {
        const msg = getErrorMessage(e, 'Failed to delete package');
        setError(msg);
        return { success: false, error: msg };
      }
    },
    []
  );

  return {
    isLoading,
    error,
    listAll,
    listActive,
    getById,
    createPackage,
    updatePackage,
    removePackage,
  };
}
