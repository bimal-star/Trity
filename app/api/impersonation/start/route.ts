import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin, impersonationDefaultReadOnly } from '@/lib/server/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { data: profile, error: profErr } = await admin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profErr || !profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as { tenantId?: string; readOnly?: boolean };
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    if (
      !tenantId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)
    ) {
      return NextResponse.json({ error: 'Invalid tenantId' }, { status: 400 });
    }

    const { data: tenant, error: tErr } = await admin
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .maybeSingle();
    if (tErr || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const readOnly =
      typeof body.readOnly === 'boolean' ? body.readOnly : impersonationDefaultReadOnly();

    const app = { ...(user.app_metadata as Record<string, unknown>) };
    app.impersonate_tenant_id = tenantId;
    app.impersonate_read_only = readOnly ? 'true' : 'false';

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: app,
    });
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    await admin.from('tenant_impersonation_audit').insert({
      actor_user_id: user.id,
      target_tenant_id: tenantId,
      action: 'start',
      read_only: readOnly,
    });

    return NextResponse.json({ ok: true, readOnly });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    if (message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'Server misconfigured: service role key missing' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
