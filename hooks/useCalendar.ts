'use client';

import { useState, useEffect, useRef } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import { CalendarEntry } from '@/types/calendar';
import type { Database } from '@/types/database';
import { calendarRowsMissingForYear, normalizeCalendarDate } from '@/lib/calendarDays';

type CalendarRowUpdate = Database['public']['Tables']['calendar']['Update'];

function toQueryError(err: unknown, fallback: string): Error {
  if (err instanceof Error && err.message.trim()) return err;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return new Error(message);
  }
  return new Error(fallback);
}

async function seedCalendarYearViaApi(tenantId: string, year: number): Promise<number> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Session expired. Please sign in again.');
  }

  const response = await fetch('/api/calendar/ensure-year', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({ year, tenant_id: tenantId }),
  });

  const payload = (await response.json()) as { inserted?: number; error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to generate calendar days for this year');
  }

  return payload.inserted ?? 0;
}

/**
 * Custom hook to fetch and manage calendar data
 * @param year - The year to fetch data for
 * @param month - The month to fetch data for (1-12), or undefined to fetch all months
 */
export function useCalendar(year: number, month?: number) {
  const { effectiveTenantId: tenant_id, ready, workspaceHydrated } = useTenant();
  const [data, setData] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    if (!ready || !workspaceHydrated) {
      return;
    }

    if (!tenant_id) {
      setData([]);
      setError(new Error('Your account is not associated with a tenant.'));
      setIsLoading(false);
      return;
    }

    const generation = ++fetchGenerationRef.current;

    async function fetchCalendarRows(tenantId: string): Promise<CalendarEntry[]> {
      let query = tenantedSupabase
        .from('calendar')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('year', year);

      if (month !== undefined) {
        query = query.eq('month', month);
      }

      const { data: calendarData, error: fetchError } = await query.order('date', {
        ascending: true,
      });

      if (fetchError) throw fetchError;
      return (calendarData || []) as unknown as CalendarEntry[];
    }

    async function ensureYearPopulated(
      tenantId: string,
      existingRows: CalendarEntry[]
    ): Promise<CalendarEntry[]> {
      const missingCount = calendarRowsMissingForYear(
        year,
        tenantId,
        existingRows.map((row) => row.date)
      ).length;

      if (missingCount === 0) {
        return existingRows;
      }

      await seedCalendarYearViaApi(tenantId, year);
      return fetchCalendarRows(tenantId);
    }

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const rows = await fetchCalendarRows(tenant_id);
        const populatedRows = await ensureYearPopulated(tenant_id, rows);
        if (generation !== fetchGenerationRef.current) return;
        setData(populatedRows);
      } catch (err) {
        if (generation !== fetchGenerationRef.current) return;
        console.error('Calendar fetch failed:', err);
        setError(toQueryError(err, 'Failed to fetch calendar'));
      } finally {
        if (generation === fetchGenerationRef.current) {
          setIsLoading(false);
        }
      }
    })();
  }, [year, month, tenant_id, ready, workspaceHydrated]);

  async function fetchCalendarRowsForTenant(tenantId: string): Promise<CalendarEntry[]> {
    let query = tenantedSupabase
      .from('calendar')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('year', year);

    if (month !== undefined) {
      query = query.eq('month', month);
    }

    const { data: calendarData, error: fetchError } = await query.order('date', {
      ascending: true,
    });

    if (fetchError) throw fetchError;
    return (calendarData || []) as unknown as CalendarEntry[];
  }

  async function ensureYearPopulatedForTenant(
    tenantId: string,
    existingRows: CalendarEntry[]
  ): Promise<CalendarEntry[]> {
    const missingCount = calendarRowsMissingForYear(
      year,
      tenantId,
      existingRows.map((row) => row.date)
    ).length;

    if (missingCount === 0) {
      return existingRows;
    }

    await seedCalendarYearViaApi(tenantId, year);
    return fetchCalendarRowsForTenant(tenantId);
  }

  async function refetchCalendarData() {
    if (!tenant_id) return;
    const generation = ++fetchGenerationRef.current;
    try {
      setIsLoading(true);
      setError(null);
      const rows = await fetchCalendarRowsForTenant(tenant_id);
      const populatedRows = await ensureYearPopulatedForTenant(tenant_id, rows);
      if (generation !== fetchGenerationRef.current) return;
      setData(populatedRows);
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return;
      console.error('Calendar fetch failed:', err);
      setError(toQueryError(err, 'Failed to fetch calendar'));
    } finally {
      if (generation === fetchGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function updateCalendarEntry(
    id: number,
    updates: Partial<Pick<CalendarEntry, 'events' | 'notes' | 'bank_holiday'>>
  ) {
    if (!tenant_id) {
      return { success: false, error: new Error('No tenant context') };
    }

    try {
      const { data: updatedRows, error: updateError } = await tenantedSupabase
        .from('calendar')
        .update(updates as CalendarRowUpdate)
        .eq('id', id)
        .eq('tenant_id', tenant_id)
        .select('id');

      if (updateError) throw updateError;
      if (!updatedRows?.length) {
        throw new Error('Calendar update did not apply. Check workspace permissions.');
      }

      setData((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)));

      return { success: true };
    } catch (err) {
      console.error('Error updating calendar entry:', err);
      return { success: false, error: err };
    }
  }

  async function ensureYearReady(): Promise<CalendarEntry[]> {
    if (!tenant_id) {
      throw new Error('Your account is not associated with a tenant.');
    }

    const rows = await fetchCalendarRowsForTenant(tenant_id);
    const populatedRows = await ensureYearPopulatedForTenant(tenant_id, rows);
    setData(populatedRows);
    return populatedRows;
  }

  return {
    data,
    isLoading,
    error,
    updateCalendarEntry,
    refetch: refetchCalendarData,
    ensureYearReady,
  };
}

export interface WeekCommencing {
  date: string;
  year: number;
  week_iso: number;
  label: string;
}

/**
 * Fetch week-commencing (Monday) dates from calendar schema for a date range.
 * Used for Gantt weekly timeline.
 */
export function useCalendarWeeksForRange(startDate: string | null, endDate: string | null) {
  const [weeks, setWeeks] = useState<WeekCommencing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      setWeeks([]);
      return;
    }
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data, error: fetchError } = await tenantedSupabase
          .from('calendar')
          .select('date, year, week_iso, day_of_week')
          .gte('date', startDate)
          .lte('date', endDate)
          .eq('day_of_week', 1)
          .order('date', { ascending: true });

        if (fetchError) throw fetchError;
        const rows = (data || []) as unknown as { date: string; year: number; week_iso: number }[];
        const list: WeekCommencing[] = rows.map((r) => ({
          date: r.date,
          year: r.year,
          week_iso: r.week_iso,
          label: `WC ${new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        }));
        setWeeks(list);
      } catch (err) {
        setError(toQueryError(err, 'Failed to fetch calendar weeks'));
        setWeeks([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [startDate, endDate]);

  return { weeks, isLoading, error };
}

export { normalizeCalendarDate };
