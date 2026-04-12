import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export async function fetchTenantIdForAiUser(
  supabase: SupabaseClient<Database>,
  authUserId: string
): Promise<{ tenantId: string } | { error: string; status: 404 }> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', authUserId)
    .single();

  if (error || !profile?.tenant_id) {
    return { error: 'User profile not found', status: 404 };
  }
  return { tenantId: profile.tenant_id };
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
