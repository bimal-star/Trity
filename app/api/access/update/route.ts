import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBearerToken } from '@/lib/api/requireBearer';
import { getRoleDefaultAccess, mapAccessToRecord } from '@/lib/accessControl';
import {
  accessLevelToActions,
  ensurePermissionResourceForModule,
  toNavResourceKey,
} from '@/lib/permissionResolver';
import type { AccessLevel } from '@/types/access';
import type { Database } from '@/types/database';
import { isSuperAdminRole, normalizeTenantRole, resolveProfileRole } from '@/lib/permissions';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';
import { isValidTenantId } from '@/lib/tenantCache';
import { logAuditAction } from '@/lib/auditLog';

interface UpdateAccessPayload {
  user_id: string;
  module_id: string;
  access: AccessLevel;
  /** Workspace / tenant being configured (required for platform super admin acting outside home tenant). */
  target_tenant_id?: string;
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
      console.error(
        '[access/update] Missing Supabase URL or anon key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY on the server).'
      );
      return NextResponse.json(
        {
          error:
            'Server is missing Supabase configuration. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the environment (or SUPABASE_URL and SUPABASE_ANON_KEY for API routes).',
        },
        { status: 503 }
      );
    }
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = supabaseEnv;

    const { token } = auth;

    const body = (await request.json()) as UpdateAccessPayload;
    if (!body?.user_id || !body?.module_id || !body?.access) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['allowed', 'readonly', 'blocked'].includes(body.access)) {
      return NextResponse.json({ error: 'Invalid access level' }, { status: 400 });
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('user_profiles')
      .select('user_id, tenant_id, role')
      .eq('user_id', authData.user.id)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const jwtRoleRaw =
      (typeof authData.user.app_metadata?.role === 'string'
        ? authData.user.app_metadata.role
        : null) ??
      (typeof authData.user.user_metadata?.role === 'string'
        ? authData.user.user_metadata.role
        : null);
    const currentResolvedRole = resolveProfileRole(currentProfile.role, jwtRoleRaw);
    const isAdmin = currentResolvedRole === 'admin' || currentResolvedRole === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isPlatformSuper = isSuperAdminRole(currentProfile.role) || isSuperAdminRole(jwtRoleRaw);

    const tenantScope =
      typeof body.target_tenant_id === 'string' && body.target_tenant_id.trim()
        ? body.target_tenant_id.trim()
        : currentProfile.tenant_id;

    if (!isValidTenantId(tenantScope)) {
      return NextResponse.json({ error: 'Invalid tenant scope' }, { status: 400 });
    }

    if (!isPlatformSuper && tenantScope !== currentProfile.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from('user_profiles')
      .select('user_id, tenant_id, role')
      .eq('user_id', body.user_id)
      .eq('tenant_id', tenantScope)
      .maybeSingle();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetTenantRole = normalizeTenantRole(targetProfile.role) ?? 'member';
    const roleDefault = getRoleDefaultAccess(targetTenantRole);
    const shouldDeleteOverride = body.access === roleDefault;
    const resourceKey = toNavResourceKey(body.module_id);

    if (shouldDeleteOverride) {
      const { data: pr } = await (supabase as any)
        .from('permission_resources')
        .select('id')
        .eq('tenant_id', targetProfile.tenant_id)
        .eq('resource_key', resourceKey)
        .maybeSingle();

      if (pr?.id) {
        const { error: delGrant } = await (supabase as any)
          .from('user_resource_grants')
          .delete()
          .eq('tenant_id', targetProfile.tenant_id)
          .eq('user_id', body.user_id)
          .eq('resource_id', pr.id);
        if (delGrant) {
          return NextResponse.json({ error: delGrant.message }, { status: 500 });
        }
      }

      const { error: deleteError } = await (supabase as any)
        .from('user_module_access')
        .delete()
        .eq('tenant_id', targetProfile.tenant_id)
        .eq('user_id', body.user_id)
        .eq('module_id', body.module_id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      void logAuditAction({
        tenant_id: targetProfile.tenant_id,
        user_id: authData.user.id,
        action: 'access.reset_to_default',
        resource_type: 'module_access',
        resource_id: body.module_id,
        changes: { user_id: body.user_id, access: 'reset_to_default' },
      });

      return NextResponse.json({ success: true, removed: true });
    }

    const ensured = await ensurePermissionResourceForModule(
      supabase,
      targetProfile.tenant_id,
      body.module_id,
      body.module_id
    );
    if ('error' in ensured) {
      return NextResponse.json({ error: ensured.error }, { status: 500 });
    }

    const allowedActions = accessLevelToActions(body.access);
    const { error: grantErr } = await (supabase as any).from('user_resource_grants').upsert(
      {
        tenant_id: targetProfile.tenant_id,
        user_id: body.user_id,
        resource_id: ensured.resourceId,
        allowed_actions: allowedActions,
        effect: 'allow',
      },
      { onConflict: 'tenant_id,user_id,resource_id' }
    );

    if (grantErr) {
      return NextResponse.json({ error: grantErr.message }, { status: 500 });
    }

    const record = mapAccessToRecord(body.access);
    const { error: legacyErr } = await (supabase as any).from('user_module_access').upsert(
      {
        tenant_id: targetProfile.tenant_id,
        user_id: body.user_id,
        module_id: body.module_id,
        has_access: record.has_access,
        is_readonly: record.is_readonly,
      },
      { onConflict: 'tenant_id,user_id,module_id' }
    );

    if (legacyErr) {
      return NextResponse.json({ error: legacyErr.message }, { status: 500 });
    }

    void logAuditAction({
      tenant_id: targetProfile.tenant_id,
      user_id: authData.user.id,
      action: 'access.update',
      resource_type: 'module_access',
      resource_id: body.module_id,
      changes: { user_id: body.user_id, access: body.access },
    });

    return NextResponse.json({ success: true, removed: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
