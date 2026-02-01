/**
 * Calendar entry interface matching the Supabase calendar table schema
 */
export interface CalendarEntry {
  id: number;
  date: string;
  year: number;
  month: number;
  month_name: string;
  day: number;
  day_of_week: number;
  day_name: string;
  week_iso: number;
  week_monday: number;
  week_sunday: number;
  julian_day: number;
  bank_holiday: string | null;
  events: string | null;
  notes: string | null;
}
