-- Fix RLS policy if 20260525200000 failed on is_platform_super_admin().
-- Requires public.is_tenants_platform_super_admin() from 20260412100000_tenants_super_admin_rls.sql.

DROP POLICY IF EXISTS bc_tenant_document_code_formats_select_platform_super_admin
  ON public.tenant_document_code_formats;

CREATE POLICY bc_tenant_document_code_formats_select_platform_super_admin
  ON public.tenant_document_code_formats
  FOR SELECT
  USING (public.is_tenants_platform_super_admin());
