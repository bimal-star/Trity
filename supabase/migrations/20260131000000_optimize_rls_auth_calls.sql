-- Optimize RLS policies: Wrap auth.uid() calls to prevent re-evaluation per row
-- This addresses Supabase Linter WARN: auth_rls_initplan
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- user_profiles table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own profile by user_id" ON public.user_profiles;
CREATE POLICY "Users can read own profile by user_id" ON public.user_profiles
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- tenants table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;
CREATE POLICY "Users can read own tenant" ON public.tenants
  FOR SELECT
  USING (id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Admins can update own tenant" ON public.tenants;
CREATE POLICY "Admins can update own tenant" ON public.tenants
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
-- navigation table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read tenant navigation" ON public.navigation;
CREATE POLICY "Users can read tenant navigation" ON public.navigation
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Admins can manage tenant navigation" ON public.navigation;
CREATE POLICY "Admins can manage tenant navigation" ON public.navigation
  FOR INSERT, UPDATE, DELETE
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
-- calendar table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read tenant calendar" ON public.calendar;
CREATE POLICY "Users can read tenant calendar" ON public.calendar
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can manage tenant calendar" ON public.calendar;
CREATE POLICY "Users can manage tenant calendar" ON public.calendar
  FOR INSERT, UPDATE, DELETE
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
-- customers table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert customers in their tenant" ON public.customers;
CREATE POLICY "Users can insert customers in their tenant" ON public.customers
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view customers in their tenant" ON public.customers;
CREATE POLICY "Users can view customers in their tenant" ON public.customers
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update customers in their tenant" ON public.customers;
CREATE POLICY "Users can update customers in their tenant" ON public.customers
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

DROP POLICY IF EXISTS "Users can delete customers in their tenant" ON public.customers;
CREATE POLICY "Users can delete customers in their tenant" ON public.customers
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can view own customers" ON public.customers;
CREATE POLICY "Tenants can view own customers" ON public.customers
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can insert own customers" ON public.customers;
CREATE POLICY "Tenants can insert own customers" ON public.customers
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can update own customers" ON public.customers;
CREATE POLICY "Tenants can update own customers" ON public.customers
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
-- customer_addresses table policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view own customer addresses" ON public.customer_addresses;
CREATE POLICY "Tenants can view own customer addresses" ON public.customer_addresses
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can insert own customer addresses" ON public.customer_addresses;
CREATE POLICY "Tenants can insert own customer addresses" ON public.customer_addresses
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can update own customer addresses" ON public.customer_addresses;
CREATE POLICY "Tenants can update own customer addresses" ON public.customer_addresses
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
-- customer_contacts table policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view own customer contacts" ON public.customer_contacts;
CREATE POLICY "Tenants can view own customer contacts" ON public.customer_contacts
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can insert own customer contacts" ON public.customer_contacts;
CREATE POLICY "Tenants can insert own customer contacts" ON public.customer_contacts
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can update own customer contacts" ON public.customer_contacts;
CREATE POLICY "Tenants can update own customer contacts" ON public.customer_contacts
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
-- customer_notes table policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view own customer notes" ON public.customer_notes;
CREATE POLICY "Tenants can view own customer notes" ON public.customer_notes
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can insert own customer notes" ON public.customer_notes;
CREATE POLICY "Tenants can insert own customer notes" ON public.customer_notes
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can update own customer notes" ON public.customer_notes;
CREATE POLICY "Tenants can update own customer notes" ON public.customer_notes
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
-- customer_attachments table policies
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view own customer attachments" ON public.customer_attachments;
CREATE POLICY "Tenants can view own customer attachments" ON public.customer_attachments
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can insert own customer attachments" ON public.customer_attachments;
CREATE POLICY "Tenants can insert own customer attachments" ON public.customer_attachments
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Tenants can update own customer attachments" ON public.customer_attachments;
CREATE POLICY "Tenants can update own customer attachments" ON public.customer_attachments
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
-- audit_logs table policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated users to insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view tenant audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view tenant audit logs" ON public.audit_logs
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role = 'super_admin'
  ));
