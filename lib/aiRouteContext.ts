import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export async function fetchTenantIdForAiUser(
  supabase: SupabaseClient<Database>,
  authUserId: string
): Promise<{ tenantId: string } | { error: string; status: number }> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', authUserId)
    .single();

  if (error || !profile?.tenant_id) {
    return { error: 'User profile not found', status: 404 };
  }

  const tenantId = profile.tenant_id;

  // Gate on the ai_lab feature flag. Default is enabled; admins can disable per-tenant via settings.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings =
    tenant?.settings && typeof tenant.settings === 'object'
      ? (tenant.settings as Record<string, unknown>)
      : null;
  // Explicitly false means disabled; absent or true means enabled (default on).
  if (settings?.['ai_lab'] === false) {
    return { error: 'AI features are not enabled for this workspace.', status: 403 };
  }

  return { tenantId };
}

export async function insertAiUsageLog(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    tenantId: string;
    route: 'chat' | 'assistant';
    model: string;
    messageCount: number;
  }
): Promise<void> {
  const { error } = await supabase.from('ai_usage_logs').insert({
    user_id: params.userId,
    tenant_id: params.tenantId,
    route: params.route,
    model: params.model,
    message_count: params.messageCount,
  });
  if (error) {
    console.error('[ai usage log]', error.message);
  }
}
