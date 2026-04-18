'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface IndustryRow {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface UseIndustriesReturn {
  industries: IndustryRow[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Fetches the master list of industries from `public.industries`.
 *
 * The table is readable by any authenticated user; inserts/updates are
 * gated to super-admins by RLS (see migration
 * `20260425100000_industries_master.sql`).
 */
export function useIndustries(): UseIndustriesReturn {
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('industries')
      .select('id, slug, label, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });
    if (err) {
      setError(err.message);
      setIndustries([]);
    } else {
      setIndustries((data ?? []) as IndustryRow[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { industries, isLoading, error, reload };
}
