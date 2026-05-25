import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBearerToken } from '@/lib/api/requireBearer';
import { CALENDAR_INSERT_BATCH_SIZE, calendarRowsMissingForYear } from '@/lib/calendarDays';
import { isSuperAdminRole, resolveProfileRole } from '@/lib/permissions';
import { createSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';
import { isValidTenantId } from '@/lib/tenantCache';
import type { Database } from '@/types/database';

interface EnsureYearPayload {
  year?: number;
  tenant_id?: string;
}

function isMissingSeedRpc(message: string): boolean {
  return (
    /seed_tenant_calendar_year/i.test(message) &&
    /does not exist|could not find|schema cache|PGRST202/i.test(message)
  );
}

async function insertMissingRowsWithAdmin(tenantId: string, year: number): Promise<number> {
  const admin = createSupabaseAdmin();
  const { data: existingRows, error: existingError } = await admin
    .from('calendar')
    .select('date')
    .eq('tenant_id', tenantId)
    .eq('year', year);

  if (existingError) throw existingError;

  const missingRows = calendarRowsMissingForYear(
    year,
    tenantId,
    (existingRows || []).map((row) => row.date)
  );

  if (missingRows.length === 0) return 0;

  let inserted = 0;
  for (let i = 0; i < missingRows.length; i += CALENDAR_INSERT_BATCH_SIZE) {
    const batch = missingRows.slice(i, i + CALENDAR_INSERT_BATCH_SIZE);
    const { error } = await admin.from('calendar').insert(batch);
    if (error) throw error;
    inserted += batch.length;
  }

  return inserted;
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const auth = parseBearerToken(request);
    if (!auth.ok) return auth.response;

    const supabaseEnv = getSupabaseUrlAndAnonKey();
    if (!supabaseEnv) {
      return NextResponse.json(
        { error: 'Server is missing Supabase configuration' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as EnsureYearPayload;
    const year = Number(body?.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
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

    const jwtRoleRaw =
      (typeof authData.user.app_metadata?.role === 'string'
        ? authData.user.app_metadata.role
        : null) ??
      (typeof authData.user.user_metadata?.role === 'string'
        ? authData.user.user_metadata.role
        : null);

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('user_id', authData.user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const tenantScope =
      typeof body.tenant_id === 'string' && body.tenant_id.trim()
        ? body.tenant_id.trim()
        : profile?.tenant_id;

    if (!isValidTenantId(tenantScope)) {
      return NextResponse.json({ error: 'Invalid tenant scope' }, { status: 400 });
    }

    const resolvedRole = resolveProfileRole(profile?.role, jwtRoleRaw);
    const isPlatformSuper =
      isSuperAdminRole(profile?.role) ||
      isSuperAdminRole(jwtRoleRaw) ||
      resolvedRole === 'super_admin';

    if (tenantScope !== profile?.tenant_id && !isPlatformSuper) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: inserted, error: seedError } = await supabase.rpc('seed_tenant_calendar_year', {
      p_tenant_id: tenantScope,
      p_year: year,
    });

    if (!seedError) {
      return NextResponse.json({ inserted: inserted ?? 0 });
    }

    if (isMissingSeedRpc(seedError.message)) {
      try {
        const fallbackInserted = await insertMissingRowsWithAdmin(tenantScope, year);
        return NextResponse.json({ inserted: fallbackInserted });
      } catch (fallbackError) {
        const message =
          fallbackError instanceof Error
            ? fallbackError.message
            : 'Failed to seed calendar year (admin fallback)';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    const status = seedError.message.includes('forbidden')
      ? 403
      : seedError.message.includes('read-only')
        ? 403
        : 500;
    return NextResponse.json({ error: seedError.message }, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to seed calendar year';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
