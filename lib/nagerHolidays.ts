export const SUPPORTED_HOLIDAY_COUNTRY_CODES = [
  'GB',
  'US',
  'DE',
  'FR',
  'ES',
  'IT',
  'NL',
  'BE',
  'CH',
  'AT',
  'IE',
  'SE',
  'NO',
  'DK',
  'FI',
  'PL',
  'CA',
  'AU',
  'NZ',
  'IN',
  'JP',
  'CN',
  'SG',
  'BR',
  'MX',
  'ZA',
] as const;

export type SupportedHolidayCountryCode = (typeof SUPPORTED_HOLIDAY_COUNTRY_CODES)[number];

export interface NagerPublicHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

const MIN_HOLIDAY_YEAR = 2000;
const MAX_HOLIDAY_YEAR = 2100;
const SUPPORTED_COUNTRY_SET = new Set<string>(SUPPORTED_HOLIDAY_COUNTRY_CODES);

export function parseHolidayImportParams(
  yearParam: string | null,
  countryParam: string | null
): { ok: true; year: number; country: SupportedHolidayCountryCode } | { ok: false; error: string } {
  if (!yearParam?.trim()) {
    return { ok: false, error: 'Year is required' };
  }

  const year = Number.parseInt(yearParam, 10);
  if (!Number.isInteger(year) || year < MIN_HOLIDAY_YEAR || year > MAX_HOLIDAY_YEAR) {
    return {
      ok: false,
      error: `Year must be an integer between ${MIN_HOLIDAY_YEAR} and ${MAX_HOLIDAY_YEAR}`,
    };
  }

  const country = countryParam?.trim().toUpperCase() ?? '';
  if (!/^[A-Z]{2}$/.test(country) || !SUPPORTED_COUNTRY_SET.has(country)) {
    return { ok: false, error: 'Unsupported or invalid country code' };
  }

  return { ok: true, year, country: country as SupportedHolidayCountryCode };
}

export async function fetchNagerPublicHolidays(
  year: number,
  country: SupportedHolidayCountryCode
): Promise<NagerPublicHoliday[]> {
  const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`Holiday provider returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Holiday provider returned an unexpected response');
  }

  return payload as NagerPublicHoliday[];
}
