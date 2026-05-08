'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';
import type { TableColumnDefinition } from '@/types/tableView';

type SavedViewDbRow = Database['public']['Tables']['product_list_saved_views']['Row'];
type SavedViewInsert = Database['public']['Tables']['product_list_saved_views']['Insert'];
type SavedViewUpdate = Database['public']['Tables']['product_list_saved_views']['Update'];
type TenantListSettingsInsert =
  Database['public']['Tables']['tenant_products_list_settings']['Insert'];

export type TableViewDefinitionBase = {
  v: number;
  columns: { order: string[]; hidden: string[] };
};

type WorkspaceSettingsRow<TDef> = {
  tenant_id: string;
  workspace_default_definition: TDef | null;
  updated_at: string;
  updated_by: string | null;
};

export type TableSavedViewRow<TDefinition> = {
  id: string;
  tenant_id: string;
  owner_user_id: string;
  name: string;
  definition: TDefinition;
  is_personal_default: boolean;
  created_at: string;
  updated_at: string;
};

export function useTableView<TDefinition extends TableViewDefinitionBase>(options: {
  pageKey: string;
  tenantId: string | null;
  userId: string | null;
  columnDefinitions: TableColumnDefinition[];
  coerceDefinition: (raw: unknown) => TDefinition;
  buildSystemDefinition: () => TDefinition;
}) {
  const { pageKey, tenantId, userId, columnDefinitions, coerceDefinition, buildSystemDefinition } =
    options;
  const [views, setViews] = useState<TableSavedViewRow<TDefinition>[]>([]);
  const [workspaceRow, setWorkspaceRow] = useState<WorkspaceSettingsRow<TDefinition> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const mapSavedViewRow = useCallback(
    (row: SavedViewDbRow): TableSavedViewRow<TDefinition> => ({
      id: row.id,
      tenant_id: row.tenant_id,
      owner_user_id: row.owner_user_id,
      name: row.name,
      definition: coerceDefinition(row.definition),
      is_personal_default: row.is_personal_default,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }),
    [coerceDefinition]
  );

  const refresh = useCallback(async () => {
    if (!tenantId || !userId) {
      setViews([]);
      setWorkspaceRow(null);
      setReady(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [savedRes, wsRes] = await Promise.all([
        supabase
          .from('product_list_saved_views')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('owner_user_id', userId)
          .eq('page_key', pageKey)
          .order('name', { ascending: true }),
        supabase
          .from('tenant_products_list_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
      ]);

      if (savedRes.error) throw savedRes.error;
      if (wsRes.error) throw wsRes.error;

      setViews((savedRes.data ?? []).map((row) => mapSavedViewRow(row)));
      if (wsRes.data) {
        const ws = wsRes.data;
        setWorkspaceRow({
          tenant_id: ws.tenant_id,
          workspace_default_definition: ws.workspace_default_definition
            ? coerceDefinition(ws.workspace_default_definition)
            : null,
          updated_at: ws.updated_at,
          updated_by: ws.updated_by,
        });
      } else {
        setWorkspaceRow(null);
      }
      setReady(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load saved views';
      setError(msg);
      setViews([]);
      setWorkspaceRow(null);
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, pageKey, mapSavedViewRow, coerceDefinition]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const workspaceDefinition = workspaceRow?.workspace_default_definition ?? null;

  const pickInitialDefinition = useCallback((): TDefinition => {
    const personalDefault = views.find((v) => v.is_personal_default);
    if (personalDefault) return coerceDefinition(personalDefault.definition);
    if (workspaceDefinition) return coerceDefinition(workspaceDefinition);
    return buildSystemDefinition();
  }, [views, workspaceDefinition, coerceDefinition, buildSystemDefinition]);

  const saveNewView = useCallback(
    async (name: string, definition: TDefinition) => {
      if (!tenantId || !userId) return { success: false as const, error: 'Not signed in' };
      const trimmed = name.trim();
      if (!trimmed) return { success: false as const, error: 'Name required' };
      const payload: SavedViewInsert = {
        tenant_id: tenantId,
        owner_user_id: userId,
        page_key: pageKey,
        name: trimmed,
        definition,
        is_personal_default: false,
      };
      const { data, error: insErr } = await supabase
        .from('product_list_saved_views')
        .insert(payload)
        .select('*')
        .single();
      if (insErr) return { success: false as const, error: insErr.message };
      await refresh();
      return { success: true as const, id: data.id };
    },
    [tenantId, userId, pageKey, refresh]
  );

  const deleteView = useCallback(
    async (id: string) => {
      if (!tenantId || !userId) return { success: false as const, error: 'Not signed in' };
      const { error: delErr } = await supabase
        .from('product_list_saved_views')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('owner_user_id', userId)
        .eq('page_key', pageKey);
      if (delErr) return { success: false as const, error: delErr.message };
      await refresh();
      return { success: true as const };
    },
    [tenantId, userId, pageKey, refresh]
  );

  const setPersonalDefault = useCallback(
    async (viewId: string) => {
      if (!tenantId || !userId) return { success: false as const, error: 'Not signed in' };
      const clearAll: SavedViewUpdate = { is_personal_default: false };
      await supabase
        .from('product_list_saved_views')
        .update(clearAll)
        .eq('tenant_id', tenantId)
        .eq('owner_user_id', userId)
        .eq('page_key', pageKey);
      const setOne: SavedViewUpdate = { is_personal_default: true };
      const { error: upErr } = await supabase
        .from('product_list_saved_views')
        .update(setOne)
        .eq('id', viewId)
        .eq('tenant_id', tenantId)
        .eq('owner_user_id', userId)
        .eq('page_key', pageKey);
      if (upErr) return { success: false as const, error: upErr.message };
      await refresh();
      return { success: true as const };
    },
    [tenantId, userId, pageKey, refresh]
  );

  const saveWorkspaceDefault = useCallback(
    async (definition: TDefinition) => {
      if (!tenantId || !userId) return { success: false as const, error: 'No tenant' };
      const row: TenantListSettingsInsert = {
        tenant_id: tenantId,
        workspace_default_definition: definition,
        updated_by: userId,
      };
      const { error: upErr } = await supabase
        .from('tenant_products_list_settings')
        .upsert(row, { onConflict: 'tenant_id' });
      if (upErr) return { success: false as const, error: upErr.message };
      await refresh();
      return { success: true as const };
    },
    [tenantId, userId, refresh]
  );

  const clearPersonalDefault = useCallback(async () => {
    if (!tenantId || !userId) return { success: false as const, error: 'Not signed in' };
    const clearAll: SavedViewUpdate = { is_personal_default: false };
    const { error: upErr } = await supabase
      .from('product_list_saved_views')
      .update(clearAll)
      .eq('tenant_id', tenantId)
      .eq('owner_user_id', userId)
      .eq('page_key', pageKey);
    if (upErr) return { success: false as const, error: upErr.message };
    await refresh();
    return { success: true as const };
  }, [tenantId, userId, pageKey, refresh]);

  return useMemo(
    () => ({
      views,
      workspaceDefinition,
      loading,
      error,
      ready,
      refresh,
      pickInitialDefinition,
      saveNewView,
      deleteView,
      setPersonalDefault,
      saveWorkspaceDefault,
      clearPersonalDefault,
      columnDefinitions,
    }),
    [
      views,
      workspaceDefinition,
      loading,
      error,
      ready,
      refresh,
      pickInitialDefinition,
      saveNewView,
      deleteView,
      setPersonalDefault,
      saveWorkspaceDefault,
      clearPersonalDefault,
      columnDefinitions,
    ]
  );
}
