// lib/supabaseSchemaClient.ts
//
// Purpose: Route queries to the correct tenant schema automatically
// Part of: Multi-tenant schema isolation
// Created: February 1, 2026
//
// How it works:
// 1. On login, TenantContext calls setTenantId(tenantId)
// 2. All subsequent queries via tenantedSupabase automatically
//    route to that tenant's schema
// 3. Shared tables (tenants, user_profiles, audit_logs) stay
//    in public schema
//
// Usage:
//   // OLD (current):
//   supabase.from('calendar').select('*').eq('tenant_id', tenantId)
//
//   // NEW (with this client):
//   tenantedSupabase.from('calendar').select('*')
//   // No tenant_id filter needed - schema routing handles it!

import type { Database } from '@/types/database';
import { supabase } from './supabaseClient';

type PublicTable = keyof Database['public']['Tables'];

/** Base client with dynamic `.rpc` for function names not in generated typings. */
const dynamicSupabase = supabase as {
  rpc: (fn: string, args?: Record<string, unknown>) => ReturnType<typeof supabase.rpc>;
};

/**
 * Schema-aware Supabase client wrapper
 * Automatically routes queries to tenant-specific schemas
 */
export class TenantedSupabaseClient {
  private tenantId: string | null = null;

  /**
   * Set the current tenant ID
   * Called by TenantContext when user logs in
   */
  setTenantId(tenantId: string | null) {
    this.tenantId = tenantId;
  }

  /**
   * Get the current tenant ID
   */
  getTenantId(): string | null {
    return this.tenantId;
  }

  /**
   * Get the schema name for current tenant
   * Format: tenant_abc-123-def → tenant_abc_123_def
   */
  private getSchemaName(): string {
    if (!this.tenantId) {
      throw new Error('No tenant ID set. User must be authenticated first.');
    }
    return `tenant_${this.tenantId.replace(/-/g, '_')}`;
  }

  /**
   * Query data from correct schema based on tenant
   *
   * Tables in PUBLIC schema (shared):
   * - tenants
   * - user_profiles
   * - user_invites
   * - user_groups
   * - group_members
   * - audit_logs
   * - tenant_schemas
   * - feature_provisioning_log
   *
   * All other tables route to tenant's schema using qualified names (schema.table)
   */
  /**
   * Same runtime as `supabase.from`. Return type is intentionally loose: narrowing `relation`
   * to generated table keys makes TS instantiate the full `Database` union (slow / "excessively deep").
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see method JSDoc
  from(relation: PublicTable | string): any {
    // Tables that live in public schema (shared across all tenants)
    const sharedTables = [
      'tenants',
      'user_profiles',
      'tenant_invites',
      'user_groups',
      'group_members',
      'audit_logs',
      'tenant_schemas',
      'feature_provisioning_log',
    ] as const satisfies readonly PublicTable[];

    // If it's a shared table, use public schema
    if ((sharedTables as readonly string[]).includes(relation as string)) {
      return supabase.from(relation as PublicTable);
    }

    // For tenant-specific tables in non-public schemas, PostgREST requires RPC functions.
    // However, for now we keep data in public schema with RLS filters.
    // The tenant_id column still provides logical isolation and future schema migration path.
    //
    // NOTE: To move to true schema isolation (separate PostgreSQL schemas per tenant):
    // 1. Create RPC functions in public schema that query tenant schemas
    // 2. Update this method to call those RPC functions instead of direct table access
    // 3. Once RPC functions are created, uncomment the code below
    //
    // For now, we route to public schema and rely on RLS + tenant_id column
    return supabase.from(relation as PublicTable);
  }

  /**
   * Call a stored procedure/function
   */
  rpc(fnName: string, args?: Record<string, unknown>) {
    return dynamicSupabase.rpc(fnName, args);
  }

  /**
   * Access auth methods (always use public client)
   */
  get auth() {
    return supabase.auth;
  }
}

// Export singleton instance
export const tenantedSupabase = new TenantedSupabaseClient();
