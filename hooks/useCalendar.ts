'use client';

import { useState, useEffect } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { useTenant } from '@/contexts/TenantContext';
import { CalendarEntry } from '@/types/calendar';
import type { Database } from '@/types/database';

type CalendarRowUpdate = Database['public']['Tables']['calendar']['Update'];

/**
 * Custom hook to fetch and manage calendar data
 * @param year - The year to fetch data for
 * @param month - The month to fetch data for (1-12), or undefined to fetch all months
 */
export function useCalendar(year: number, month?: number) {
  const { effectiveTenantId: tenant_id } = useTenant();
  const [data, setData] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCalendarData();
  }, [year, month, tenant_id]);

  async function fetchCalendarData() {
    try {
      setIsLoading(true);
      setError(null);

      if (!tenant_id) {
        setData([]);
        setError(new Error('Your account is not associated with a tenant.'));
        return;
      }

      let query = tenantedSupabase
        .from('calendar')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('year', year);

      if (month !== undefined) {
        query = query.eq('month', month);
      }

      const { data: calendarData, error: fetchError } = await query
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;
      
      setData((calendarData || []) as unknown as CalendarEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch calendar'));
    } finally {
      setIsLoading(false);
    }
  }

  async function updateCalendarEntry(
    id: number,
    updates: Partial<Pick<CalendarEntry, 'events' | 'notes' | 'bank_holiday'>>
  ) {
    try {
      const { error: updateError } = await tenantedSupabase
        .from('calendar')
        .update(updates as CalendarRowUpdate)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setData(prev =>
        prev.map(entry => (entry.id === id ? { ...entry, ...updates } : entry))
      );

      return { success: true };
    } catch (err) {
      console.error('Error updating calendar entry:', err);
      return { success: false, error: err };
    }
  }

  return { data, isLoading, error, updateCalendarEntry, refetch: fetchCalendarData };
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
        setError(err instanceof Error ? err : new Error('Failed to fetch calendar weeks'));
        setWeeks([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [startDate, endDate]);

  return { weeks, isLoading, error };
}
