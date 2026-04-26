import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/server/supabaseAdmin';

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

    const app = { ...(user.app_metadata as Record<string, unknown>) };
    const prevTenant = app.impersonate_tenant_id;
    delete app.impersonate_tenant_id;
    delete app.impersonate_read_only;

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: app,
    });
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (typeof prevTenant === 'string') {
      await admin.from('tenant_impersonation_audit').insert({
        actor_user_id: user.id,
        target_tenant_id: prevTenant,
        action: 'end',
        read_only: false,
      });
    }

    return NextResponse.json({ ok: true });
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
