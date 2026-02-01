-- Consolidate multiple permissive policies to improve performance
-- Supabase Linter WARN: multiple_permissive_policies
-- Multiple policies on same table/role/action are suboptimal for performance

-- ============================================================================
-- First, drop all policies created in the first optimization migration
-- ============================================================================

-- From 20260131000000_optimize_rls_auth_calls.sql
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete" ON public.tenants;
DROP POLICY IF EXISTS "navigation_select" ON public.navigation;
DROP POLICY IF EXISTS "navigation_insert" ON public.navigation;
DROP POLICY IF EXISTS "navigation_update" ON public.navigation;
DROP POLICY IF EXISTS "navigation_delete" ON public.navigation;
DROP POLICY IF EXISTS "calendar_select" ON public.calendar;
DROP POLICY IF EXISTS "calendar_insert" ON public.calendar;
DROP POLICY IF EXISTS "calendar_update" ON public.calendar;
DROP POLICY IF EXISTS "calendar_delete" ON public.calendar;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;
DROP POLICY IF EXISTS "customer_addresses_select" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_insert" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_addresses_update" ON public.customer_addresses;
DROP POLICY IF EXISTS "customer_contacts_select" ON public.customer_contacts;
DROP POLICY IF EXISTS "customer_contacts_insert" ON public.customer_contacts;
DROP POLICY IF EXISTS "customer_contacts_update" ON public.customer_contacts;
DROP POLICY IF EXISTS "customer_notes_select" ON public.customer_notes;
DROP POLICY IF EXISTS "customer_notes_insert" ON public.customer_notes;
DROP POLICY IF EXISTS "customer_notes_update" ON public.customer_notes;
DROP POLICY IF EXISTS "customer_attachments_select" ON public.customer_attachments;
DROP POLICY IF EXISTS "customer_attachments_insert" ON public.customer_attachments;
DROP POLICY IF EXISTS "customer_attachments_update" ON public.customer_attachments;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

-- ============================================================================
-- calendar table: Consolidate multiple policies into single policies per action
-- ============================================================================

-- Consolidate SELECT policies: "Users can read tenant calendar" + "Users can manage tenant calendar"
DROP POLICY IF EXISTS "Users can read tenant calendar" ON public.calendar;
DROP POLICY IF EXISTS "Users can manage tenant calendar" ON public.calendar;
DROP POLICY IF EXISTS "calendar_select" ON public.calendar;

CREATE POLICY "calendar_select" ON public.calendar
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate INSERT policies
DROP POLICY IF EXISTS "calendar_insert" ON public.calendar;

CREATE POLICY "calendar_insert" ON public.calendar
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate UPDATE policies
DROP POLICY IF EXISTS "calendar_update" ON public.calendar;

CREATE POLICY "calendar_update" ON public.calendar
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate DELETE policies
DROP POLICY IF EXISTS "calendar_delete" ON public.calendar;

CREATE POLICY "calendar_delete" ON public.calendar
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- customers table: Consolidate overlapping INSERT policies
-- ============================================================================

-- Consolidate both INSERT policies (Users + Tenants)
DROP POLICY IF EXISTS "Users can insert customers in their tenant" ON public.customers;
DROP POLICY IF EXISTS "Tenants can insert own customers" ON public.customers;

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate both SELECT policies (Users + Tenants)
DROP POLICY IF EXISTS "Users can view customers in their tenant" ON public.customers;
DROP POLICY IF EXISTS "Tenants can view own customers" ON public.customers;

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate both UPDATE policies (Users + Tenants)
DROP POLICY IF EXISTS "Users can update customers in their tenant" ON public.customers;
DROP POLICY IF EXISTS "Tenants can update own customers" ON public.customers;

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate DELETE policy (keep existing or create if missing)
DROP POLICY IF EXISTS "Users can delete customers in their tenant" ON public.customers;

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- navigation table: Consolidate overlapping policies
-- ============================================================================

-- Consolidate SELECT policies
DROP POLICY IF EXISTS "Users can read tenant navigation" ON public.navigation;
DROP POLICY IF EXISTS "Admins can manage tenant navigation" ON public.navigation;
DROP POLICY IF EXISTS "navigation_select" ON public.navigation;

CREATE POLICY "navigation_select" ON public.navigation
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate INSERT policies
DROP POLICY IF EXISTS "navigation_insert" ON public.navigation;

CREATE POLICY "navigation_insert" ON public.navigation
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate UPDATE policies
DROP POLICY IF EXISTS "navigation_update" ON public.navigation;

CREATE POLICY "navigation_update" ON public.navigation
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Consolidate DELETE policies
DROP POLICY IF EXISTS "navigation_delete" ON public.navigation;

CREATE POLICY "navigation_delete" ON public.navigation
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- tenants table: Consolidate overlapping UPDATE policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update own tenant" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update" ON public.tenants;

CREATE POLICY "tenants_update" ON public.tenants
  FOR UPDATE
  USING (id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- audit_logs table: Consolidate overlapping SELECT policies
-- ============================================================================

-- Consolidate "Admins can view tenant audit logs" + "Super admins can view all audit logs"
DROP POLICY IF EXISTS "Admins can view tenant audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT
  USING (
    -- Admins can view their tenant's audit logs
    (tenant_id IN (
      SELECT tenant_id 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid())
    ))
    OR
    -- Super admins can view all audit logs
    (EXISTS (
      SELECT 1 
      FROM public.user_profiles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'super_admin'
    ))
  );

-- ============================================================================
-- customer_addresses table: Consolidate policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view own customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Tenants can insert own customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Tenants can update own customer addresses" ON public.customer_addresses;

CREATE POLICY "customer_addresses_select" ON public.customer_addresses
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "customer_addresses_insert" ON public.customer_addresses
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "customer_addresses_update" ON public.customer_addresses
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- customer_contacts table: Consolidate policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view own customer contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Tenants can insert own customer contacts" ON public.customer_contacts;
DROP POLICY IF EXISTS "Tenants can update own customer contacts" ON public.customer_contacts;

CREATE POLICY "customer_contacts_select" ON public.customer_contacts
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "customer_contacts_insert" ON public.customer_contacts
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "customer_contacts_update" ON public.customer_contacts
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- customer_notes table: Consolidate policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view own customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Tenants can insert own customer notes" ON public.customer_notes;
DROP POLICY IF EXISTS "Tenants can update own customer notes" ON public.customer_notes;

CREATE POLICY "customer_notes_select" ON public.customer_notes
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "customer_notes_insert" ON public.customer_notes
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "customer_notes_update" ON public.customer_notes
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- customer_attachments table: Consolidate policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view own customer attachments" ON public.customer_attachments;
DROP POLICY IF EXISTS "Tenants can insert own customer attachments" ON public.customer_attachments;
DROP POLICY IF EXISTS "Tenants can update own customer attachments" ON public.customer_attachments;

CREATE POLICY "customer_attachments_select" ON public.customer_attachments
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "customer_attachments_insert" ON public.customer_attachments
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "customer_attachments_update" ON public.customer_attachments
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- Keep user_profiles and navigation simplified (already optimized)
-- ============================================================================

-- Ensure user_profiles has clean policies
DROP POLICY IF EXISTS "Users can read own profile by user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;

CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Ensure tenants has clean policies
DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;

CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT
  USING (id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));
