import type { Database } from '@/types/database';

export type CalendarInsertRow = Database['public']['Tables']['calendar']['Insert'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function normalizeCalendarDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match ? match[1] : null;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function julianDayNumber(year: number, month: number, day: number): number {
  const utc = Date.UTC(year, month - 1, day);
  const start = Date.UTC(year, 0, 1);
  return Math.floor((utc - start) / 86400000) + 1;
}

export function isoWeekUTC(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function weekNumberSundayStart(year: number, month: number, day: number): number {
  const dayOfYear = julianDayNumber(year, month, day);
  const jan1Dow = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  return Math.floor((dayOfYear - 1 + jan1Dow) / 7) + 1;
}

export function buildCalendarDayRow(
  year: number,
  month: number,
  day: number,
  tenantId: string
): CalendarInsertRow {
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const utc = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utc.getUTCDay();

  return {
    tenant_id: tenantId,
    date,
    year,
    month,
    month_name: MONTH_NAMES[month - 1],
    day,
    day_name: DAY_NAMES[dayOfWeek],
    day_of_week: dayOfWeek,
    week_iso: isoWeekUTC(year, month, day),
    week_monday: isoWeekUTC(year, month, day),
    week_sunday: weekNumberSundayStart(year, month, day),
    julian_day: julianDayNumber(year, month, day),
    bank_holiday: null,
    events: null,
    notes: null,
    is_deleted: false,
    metadata: {},
    version: 1,
  };
}

export function buildCalendarYearRows(year: number, tenantId: string): CalendarInsertRow[] {
  const rows: CalendarInsertRow[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const maxDay = daysInMonth(year, month);
    for (let day = 1; day <= maxDay; day += 1) {
      rows.push(buildCalendarDayRow(year, month, day, tenantId));
    }
  }
  return rows;
}

export function calendarRowsMissingForYear(
  year: number,
  tenantId: string,
  existingDates: Iterable<string>
): CalendarInsertRow[] {
  const existing = new Set<string>();
  for (const raw of existingDates) {
    const normalized = normalizeCalendarDate(raw);
    if (normalized) existing.add(normalized);
  }

  return buildCalendarYearRows(year, tenantId).filter((row) => !existing.has(row.date));
}

export const CALENDAR_INSERT_BATCH_SIZE = 100;
