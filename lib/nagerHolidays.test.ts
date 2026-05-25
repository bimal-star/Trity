import { describe, expect, it } from 'vitest';
import { parseHolidayImportParams } from './nagerHolidays';

describe('parseHolidayImportParams', () => {
  it('accepts valid year and supported country', () => {
    expect(parseHolidayImportParams('2026', 'gb')).toEqual({
      ok: true,
      year: 2026,
      country: 'GB',
    });
  });

  it('rejects invalid year', () => {
    expect(parseHolidayImportParams('abc', 'GB')).toEqual({
      ok: false,
      error: 'Year must be an integer between 2000 and 2100',
    });
    expect(parseHolidayImportParams('1999', 'GB').ok).toBe(false);
  });

  it('rejects unsupported country', () => {
    expect(parseHolidayImportParams('2026', 'XX')).toEqual({
      ok: false,
      error: 'Unsupported or invalid country code',
    });
  });
});
