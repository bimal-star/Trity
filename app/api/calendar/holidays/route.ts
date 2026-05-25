import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBearerToken } from '@/lib/api/requireBearer';
import { fetchNagerPublicHolidays, parseHolidayImportParams } from '@/lib/nagerHolidays';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';
import type { Database } from '@/types/database';

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  try {
    const auth = parseBearerToken(request);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const parsed = parseHolidayImportParams(
      url.searchParams.get('year'),
      url.searchParams.get('country')
    );
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabaseEnv = getSupabaseUrlAndAnonKey();
    if (!supabaseEnv) {
      return NextResponse.json(
        { error: 'Server is missing Supabase configuration' },
        { status: 503 }
      );
    }

    const supabase = createClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const holidays = await fetchNagerPublicHolidays(parsed.year, parsed.country);
    return NextResponse.json({ holidays });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch holidays';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
