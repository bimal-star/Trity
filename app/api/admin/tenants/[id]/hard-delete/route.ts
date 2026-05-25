import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { createSupabaseBearerClient } from '@/lib/server/supabaseBearerClient';
import { verifyPlatformSuperAdmin } from '@/lib/server/verifyPlatformSuperAdmin';
import { getResolvedTemplateTenantId, isValidUuid } from '@/lib/templateTenant';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const { id: tenantId } = await context.params;
    if (!tenantId || !UUID_RE.test(tenantId)) {
      return NextResponse.json({ error: 'Invalid tenant id' }, { status: 400 });
    }

    const gate = await verifyPlatformSuperAdmin(token);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = (await req.json().catch(() => ({}))) as { confirmName?: string };
    const confirmName = typeof body.confirmName === 'string' ? body.confirmName.trim() : '';

    // Load tenant with the caller JWT (same DB + RLS as Admin → Tenants list).
    const bearer = createSupabaseBearerClient(token);
    const { data: tenant, error: tErr } = await bearer
      .from('tenants')
      .select('id, name, company_name, slug')
      .eq('id', tenantId)
      .maybeSingle();

    if (tErr || !tenant) {
      const detail = tErr?.message?.trim();
      return NextResponse.json(
        {
          error: 'Tenant not found',
          ...(detail ? { detail } : {}),
        },
        { status: 404 }
      );
    }

    const admin = createSupabaseAdmin();

    const envTemplateId = process.env.NEXT_PUBLIC_TEMPLATE_TENANT_ID?.trim();
    if (envTemplateId && isValidUuid(envTemplateId) && envTemplateId === tenantId) {
      return NextResponse.json(
        { error: 'Cannot delete the configured template tenant' },
        { status: 409 }
      );
    }

    const { templateId } = await getResolvedTemplateTenantId(admin);
    if (templateId === tenantId) {
      return NextResponse.json({ error: 'Cannot delete the template tenant' }, { status: 409 });
    }

    const { data: templateRow } = await admin
      .from('tenants')
      .select('is_template')
      .eq('id', tenantId)
      .maybeSingle();
    if (templateRow?.is_template === true) {
      return NextResponse.json({ error: 'Cannot delete the template tenant' }, { status: 409 });
    }

    const expectedConfirm = (tenant.name || tenant.company_name || tenant.slug || '').trim();
    if (!expectedConfirm || confirmName !== expectedConfirm) {
      return NextResponse.json(
        { error: 'Confirmation name does not match tenant' },
        { status: 400 }
      );
    }

    // Regenerate types after applying 20260524160000_hard_delete_tenant.sql
    const { data: rpcData, error: rpcErr } = await (
      admin as unknown as {
        rpc: (
          fn: 'hard_delete_tenant',
          args: { p_tenant_id: string }
        ) => ReturnType<typeof admin.rpc>;
      }
    ).rpc('hard_delete_tenant', { p_tenant_id: tenantId });

    if (rpcErr) {
      const msg = rpcErr.message || 'Hard delete failed';
      if (msg.includes('hard_delete_tenant') && msg.includes('does not exist')) {
        return NextResponse.json(
          {
            error:
              'hard_delete_tenant is not installed. Apply migration 20260524160000_hard_delete_tenant.sql in Supabase.',
          },
          { status: 503 }
        );
      }
      const status = msg.includes('template') ? 409 : msg.includes('not found') ? 404 : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    const auditTenantId = gate.profileTenantId ?? tenantId;
    await admin.from('audit_logs').insert({
      tenant_id: auditTenantId,
      user_id: gate.user.id,
      action: 'tenant_hard_deleted',
      resource_type: 'tenant',
      resource_id: tenantId,
      changes: {
        deleted_tenant_name: tenant.name,
        rpc_result: rpcData,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted_tenant_id: tenantId,
      result: rpcData,
    });
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
