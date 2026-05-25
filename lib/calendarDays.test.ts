import { describe, expect, it } from 'vitest';
import {
  buildCalendarDayRow,
  buildCalendarYearRows,
  calendarRowsMissingForYear,
  isoWeekUTC,
  normalizeCalendarDate,
} from './calendarDays';

describe('calendarDays', () => {
  it('normalizeCalendarDate keeps YYYY-MM-DD prefix', () => {
    expect(normalizeCalendarDate('2026-05-01T00:00:00.000Z')).toBe('2026-05-01');
    expect(normalizeCalendarDate('2026-05-01')).toBe('2026-05-01');
    expect(normalizeCalendarDate('')).toBeNull();
  });

  it('buildCalendarYearRows returns 365 or 366 days', () => {
    expect(buildCalendarYearRows(2026, 'tenant-id').length).toBe(365);
    expect(buildCalendarYearRows(2024, 'tenant-id').length).toBe(366);
  });

  it('buildCalendarDayRow fills required metadata fields', () => {
    const row = buildCalendarDayRow(2026, 1, 1, 'tenant-id');
    expect(row.date).toBe('2026-01-01');
    expect(row.month_name).toBe('January');
    expect(row.day_name).toBe('Thursday');
    expect(row.julian_day).toBe(1);
    expect(row.week_iso).toBe(isoWeekUTC(2026, 1, 1));
  });

  it('calendarRowsMissingForYear skips existing dates', () => {
    const missing = calendarRowsMissingForYear(2026, 'tenant-id', ['2026-01-01', '2026-01-02']);
    expect(missing).toHaveLength(363);
    expect(missing.some((row) => row.date === '2026-01-01')).toBe(false);
  });
});
