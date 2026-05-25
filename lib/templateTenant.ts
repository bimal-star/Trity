import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export type TemplateTenantLookup = {
  templateId: string | null;
  /** Set when the `tenants` query fails (e.g. missing `is_template` column before migration). */
  lookupError: string | null;
};

/**
 * Prefer `NEXT_PUBLIC_TEMPLATE_TENANT_ID`, else first tenant with `is_template = true`.
 */
export async function getResolvedTemplateTenantId(
  supabase: SupabaseClient
): Promise<TemplateTenantLookup> {
  const envId =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TEMPLATE_TENANT_ID?.trim() : '';
  if (envId && isValidUuid(envId)) {
    return { templateId: envId, lookupError: null };
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('is_template', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '[templateTenant] Failed to resolve template tenant (is_template query):',
      error.message
    );
    return { templateId: null, lookupError: error.message };
  }

  if (!data?.id) {
    return { templateId: null, lookupError: null };
  }

  return { templateId: data.id, lookupError: null };
}

export async function provisionTenantFromTemplate(
  supabase: SupabaseClient,
  newTenantId: string,
  templateTenantId: string
): Promise<{ data: unknown; error: string | null }> {
  const { data, error } = await supabase.rpc('provision_tenant_from_template', {
    p_new_tenant: newTenantId,
    p_template_tenant: templateTenantId,
  });
  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function syncTenantNavigationFromTemplate(
  supabase: SupabaseClient,
  targetTenantId: string,
  templateTenantId: string
): Promise<{ data: unknown; error: string | null }> {
  const { data, error } = await supabase.rpc('sync_tenant_navigation_from_template', {
    p_target_tenant: targetTenantId,
    p_template_tenant: templateTenantId,
  });
  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/**
 * Full provision for empty tenants; merge missing navigation when the target already has rows.
 */
export async function provisionOrSyncTenantFromTemplate(
  supabase: SupabaseClient,
  targetTenantId: string,
  templateTenantId: string
): Promise<{ data: unknown; error: string | null; mode: 'provision' | 'sync' }> {
  const { data: provData, error: provErr } = await provisionTenantFromTemplate(
    supabase,
    targetTenantId,
    templateTenantId
  );
  if (provErr) {
    return { data: null, error: provErr, mode: 'provision' };
  }

  const prov = provData as Record<string, unknown> | null;
  if (prov?.skipped === true && prov?.reason === 'target_tenant_already_has_navigation') {
    const { data: syncData, error: syncErr } = await syncTenantNavigationFromTemplate(
      supabase,
      targetTenantId,
      templateTenantId
    );
    if (syncErr) {
      return { data: null, error: syncErr, mode: 'sync' };
    }
    return { data: syncData, error: null, mode: 'sync' };
  }

  return { data: provData, error: null, mode: 'provision' };
}

/** Human-readable summary of `provision_tenant_from_template` JSON result. */
export function formatProvisionResultMessage(payload: unknown): {
  variant: 'success' | 'warning';
  message: string;
} {
  const p = payload as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') {
    return {
      variant: 'warning',
      message: 'Provisioning finished with no result details from the server.',
    };
  }

  if (p.skipped === true) {
    const reason = typeof p.reason === 'string' ? p.reason : 'unknown';
    if (reason === 'target_tenant_already_has_navigation') {
      return {
        variant: 'warning',
        message:
          'Provisioning was skipped: this tenant already has navigation rows. Remove them (e.g. in Supabase) if you want to clone from the template again, or ask for a replace-from-template feature.',
      };
    }
    return { variant: 'warning', message: `Provisioning was skipped: ${reason}.` };
  }

  const nav = Number(p.navigation_rows ?? 0);
  const pr = Number(p.permission_resources_rows ?? 0);
  const rrg = Number(p.role_resource_grants_rows ?? 0);
  const pa = Number(p.permission_actions_rows ?? 0);
  const sup = Number(p.catalog_supplemented_nav_rows ?? 0);
  const note = typeof p.note === 'string' ? p.note : '';

  if (nav === 0) {
    return {
      variant: 'warning',
      message:
        'Provisioning ran but copied 0 navigation rows. Your template tenant may have no navigation — open it in workspace, seed navigation, then try again.',
    };
  }

  let message = `Copied ${nav} navigation row(s), ${pr} permission resource(s), ${rrg} role grant row(s), ${pa} permission action row(s).`;
  if (sup > 0) {
    message += ` Supplemented catalog for ${sup} nav item(s) missing in the template.`;
  }
  if (note) {
    message += ` Note: ${note}`;
  }
  return { variant: 'success', message };
}

/** Human-readable summary of `sync_tenant_navigation_from_template` JSON result. */
export function formatSyncResultMessage(payload: unknown): {
  variant: 'success' | 'warning';
  message: string;
} {
  const p = payload as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') {
    return {
      variant: 'warning',
      message: 'Sync finished with no result details from the server.',
    };
  }

  const inserted = Number(p.navigation_rows_inserted ?? 0);
  const updated = Number(p.navigation_rows_updated ?? 0);
  const pr = Number(p.permission_resources_rows ?? 0);
  const prDisplay = Number(p.permission_display_names_updated ?? 0);
  const rrg = Number(p.role_resource_grants_rows ?? 0);
  const pa = Number(p.permission_actions_rows ?? 0);
  const sup = Number(p.catalog_supplemented_nav_rows ?? 0);
  const note = typeof p.note === 'string' ? p.note : '';

  if (inserted === 0 && updated === 0) {
    return {
      variant: 'warning',
      message: note || 'Navigation is already in sync with the template; nothing to add or update.',
    };
  }

  const parts: string[] = [];
  if (inserted > 0) {
    parts.push(`added ${inserted} item(s)`);
  }
  if (updated > 0) {
    parts.push(`updated ${updated} item(s)`);
  }
  let message = `Synced navigation from template (${parts.join(', ')}).`;
  if (pr > 0 || rrg > 0 || pa > 0) {
    message += ` Permission catalog: ${pr} resource(s), ${rrg} grant(s), ${pa} action(s).`;
  }
  if (prDisplay > 0) {
    message += ` Updated ${prDisplay} permission display name(s).`;
  }
  if (sup > 0) {
    message += ` Supplemented catalog for ${sup} nav item(s) missing in the template.`;
  }
  if (note) {
    message += ` Note: ${note}`;
  }
  return { variant: 'success', message };
}

export function formatTemplateOperationMessage(
  payload: unknown,
  mode: 'provision' | 'sync'
): { variant: 'success' | 'warning'; message: string } {
  return mode === 'sync' ? formatSyncResultMessage(payload) : formatProvisionResultMessage(payload);
}
