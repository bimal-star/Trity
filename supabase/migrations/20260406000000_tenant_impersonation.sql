-- Tenant impersonation for super_admin: JWT app_metadata drives effective tenant for RLS.
-- Optional read-only mode blocks mutations while impersonating (default strict when flag absent).

-- ============================================================================
-- 1. Audit table (server-side inserts only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_impersonation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('start', 'end', 'refresh')),
  read_only boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_impersonation_audit_actor
  ON public.tenant_impersonation_audit (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_impersonation_audit_tenant
  ON public.tenant_impersonation_audit (target_tenant_id, created_at DESC);

ALTER TABLE public.tenant_impersonation_audit ENABLE ROW LEVEL SECURITY;

-- Super admins can read audit rows (aligns with audit_logs pattern)
DROP POLICY IF EXISTS "tenant_impersonation_audit_select" ON public.tenant_impersonation_audit;
CREATE POLICY "tenant_impersonation_audit_select" ON public.tenant_impersonation_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );

COMMENT ON TABLE public.tenant_impersonation_audit IS
  'Super-admin tenant impersonation lifecycle; rows inserted via service role from API.';

-- ============================================================================
-- 2. JWT helpers (impersonation only applies when profile role is super_admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.app_impersonate_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  v := auth.jwt() -> 'app_metadata' ->> 'impersonate_tenant_id';
  IF v IS NULL OR btrim(v) = '' THEN
    RETURN NULL;
  END IF;
  IF v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN v::uuid;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_effective_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
  home uuid;
  imp uuid;
BEGIN
  SELECT up.role, up.tenant_id
  INTO r, home
  FROM public.user_profiles up
  WHERE up.user_id = (SELECT auth.uid())
  LIMIT 1;

  IF r = 'super_admin' THEN
    imp := public.app_impersonate_tenant_id();
    IF imp IS NOT NULL THEN
      RETURN imp;
    END IF;
  END IF;

  RETURN home;
END;
$$;

-- True when super_admin is impersonating (JWT tenant set)
CREATE OR REPLACE FUNCTION public.app_impersonation_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = (SELECT auth.uid())
      AND up.role = 'super_admin'
  )
  AND public.app_impersonate_tenant_id() IS NOT NULL;
$$;

-- Block INSERT/UPDATE/DELETE when impersonating unless read_only is explicitly false in JWT
CREATE OR REPLACE FUNCTION public.app_impersonation_write_blocked()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.app_impersonation_is_active()
    AND COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'impersonate_read_only') IS DISTINCT FROM 'false',
      true
    );
$$;

-- ============================================================================
-- 3. Replace tenant-scoped policies to use app_effective_tenant_id()
-- ============================================================================

DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_super_admin_select_all" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT
  USING (
    id = (SELECT public.app_effective_tenant_id())
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
CREATE POLICY "tenants_insert" ON public.tenants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants
  FOR UPDATE
  USING (
    id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "navigation_select" ON public.navigation;
CREATE POLICY "navigation_select" ON public.navigation
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS "navigation_insert" ON public.navigation;
CREATE POLICY "navigation_insert" ON public.navigation
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "navigation_update" ON public.navigation;
CREATE POLICY "navigation_update" ON public.navigation
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "navigation_delete" ON public.navigation;
CREATE POLICY "navigation_delete" ON public.navigation
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "calendar_select" ON public.calendar;
CREATE POLICY "calendar_select" ON public.calendar
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS "calendar_insert" ON public.calendar;
CREATE POLICY "calendar_insert" ON public.calendar
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "calendar_update" ON public.calendar;
CREATE POLICY "calendar_update" ON public.calendar
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "calendar_delete" ON public.calendar;
CREATE POLICY "calendar_delete" ON public.calendar
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customers_delete" ON public.customers;
CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customer_addresses_select" ON public.customer_addresses;
CREATE POLICY "customer_addresses_select" ON public.customer_addresses
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS "customer_addresses_insert" ON public.customer_addresses;
CREATE POLICY "customer_addresses_insert" ON public.customer_addresses
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customer_addresses_update" ON public.customer_addresses;
CREATE POLICY "customer_addresses_update" ON public.customer_addresses
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customer_contacts_select" ON public.customer_contacts;
CREATE POLICY "customer_contacts_select" ON public.customer_contacts
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS "customer_contacts_insert" ON public.customer_contacts;
CREATE POLICY "customer_contacts_insert" ON public.customer_contacts
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customer_contacts_update" ON public.customer_contacts;
CREATE POLICY "customer_contacts_update" ON public.customer_contacts
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customer_notes_select" ON public.customer_notes;
CREATE POLICY "customer_notes_select" ON public.customer_notes
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS "customer_notes_insert" ON public.customer_notes;
CREATE POLICY "customer_notes_insert" ON public.customer_notes
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customer_notes_update" ON public.customer_notes;
CREATE POLICY "customer_notes_update" ON public.customer_notes
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customer_attachments_select" ON public.customer_attachments;
CREATE POLICY "customer_attachments_select" ON public.customer_attachments
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS "customer_attachments_insert" ON public.customer_attachments;
CREATE POLICY "customer_attachments_insert" ON public.customer_attachments
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "customer_attachments_update" ON public.customer_attachments;
CREATE POLICY "customer_attachments_update" ON public.customer_attachments
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated users to insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

-- ============================================================================
-- 4. user_groups / group_members / module access — effective tenant
-- ============================================================================

DROP POLICY IF EXISTS user_groups_select ON public.user_groups;
CREATE POLICY user_groups_select ON public.user_groups
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS user_groups_insert ON public.user_groups;
CREATE POLICY user_groups_insert ON public.user_groups
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS user_groups_update ON public.user_groups;
CREATE POLICY user_groups_update ON public.user_groups
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS user_groups_delete ON public.user_groups;
CREATE POLICY user_groups_delete ON public.user_groups
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) = 'super_admin'
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS group_members_select ON public.group_members;
CREATE POLICY group_members_select ON public.group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_members.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
    )
  );

DROP POLICY IF EXISTS group_members_insert ON public.group_members;
CREATE POLICY group_members_insert ON public.group_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_members.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
        AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS group_members_update ON public.group_members;
CREATE POLICY group_members_update ON public.group_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_members.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
        AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_members.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
        AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS group_members_delete ON public.group_members;
CREATE POLICY group_members_delete ON public.group_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_members.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
        AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) = 'super_admin'
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS user_module_access_select ON public.user_module_access;
CREATE POLICY user_module_access_select ON public.user_module_access
  FOR SELECT
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (
      user_id = (SELECT auth.uid())
      OR (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS user_module_access_insert ON public.user_module_access;
CREATE POLICY user_module_access_insert ON public.user_module_access
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS user_module_access_update ON public.user_module_access;
CREATE POLICY user_module_access_update ON public.user_module_access
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS user_module_access_delete ON public.user_module_access;
CREATE POLICY user_module_access_delete ON public.user_module_access
  FOR DELETE
  USING (
    tenant_id = (SELECT public.app_effective_tenant_id())
    AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS group_module_access_select ON public.group_module_access;
CREATE POLICY group_module_access_select ON public.group_module_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_module_access.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
    )
  );

DROP POLICY IF EXISTS group_module_access_insert ON public.group_module_access;
CREATE POLICY group_module_access_insert ON public.group_module_access
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_module_access.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
        AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS group_module_access_update ON public.group_module_access;
CREATE POLICY group_module_access_update ON public.group_module_access
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_module_access.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
        AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_module_access.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
        AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) IN ('admin', 'super_admin')
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS group_module_access_delete ON public.group_module_access;
CREATE POLICY group_module_access_delete ON public.group_module_access
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_groups ug
      WHERE ug.id = group_module_access.group_id
        AND ug.tenant_id = (SELECT public.app_effective_tenant_id())
        AND (SELECT role FROM public.user_profiles WHERE user_id = (SELECT auth.uid())) = 'super_admin'
    )
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

-- ============================================================================
-- 5. tenant_schemas & feature_provisioning_log
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their tenant schema" ON public.tenant_schemas;
CREATE POLICY "Users can view their tenant schema" ON public.tenant_schemas
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));

DROP POLICY IF EXISTS "Users can view their tenant provisioning logs" ON public.feature_provisioning_log;
CREATE POLICY "Users can view their tenant provisioning logs" ON public.feature_provisioning_log
  FOR SELECT
  USING (tenant_id = (SELECT public.app_effective_tenant_id()));
