-- supabase/migrations/20260201000000_schema_isolation_infrastructure.sql
--
-- Purpose: Create infrastructure for multi-tenant schema isolation
-- Date: February 1, 2026
-- 
-- This migration sets up:
-- 1. Tenant schema tracking table
-- 2. Feature provisioning log
-- 3. Function to create tenant schemas
--
-- After this migration runs, you need to manually:
-- - Create schemas for existing tenants using create_tenant_schema()
-- - Copy tables from public schema to tenant schemas

-- ============================================================================
-- 1. TABLE: tenant_schemas
-- Track which tenants have schemas and their status
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  schema_name text NOT NULL UNIQUE,
  provisioned_at timestamp DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

COMMENT ON TABLE public.tenant_schemas IS 'Tracks tenant schemas for multi-tenant data isolation';
COMMENT ON COLUMN public.tenant_schemas.schema_name IS 'Format: tenant_UUID with dashes replaced by underscores';
COMMENT ON COLUMN public.tenant_schemas.status IS 'active: ready for use, inactive: disabled, pending: being created';

-- RLS: Users can view their own tenant schema info
ALTER TABLE public.tenant_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant schema"
ON public.tenant_schemas
FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- 2. TABLE: feature_provisioning_log
-- Log all feature provisioning events for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_provisioning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  schema_name text NOT NULL,
  provisioned_by uuid REFERENCES auth.users(id),
  provisioned_at timestamp DEFAULT now(),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  notes text,
  created_at timestamp DEFAULT now()
);

COMMENT ON TABLE public.feature_provisioning_log IS 'Audit trail of feature provisioning for each tenant';
COMMENT ON COLUMN public.feature_provisioning_log.feature_name IS 'Name of feature provisioned (e.g., base, forecast_model, inventory)';

-- RLS: Users can view provisioning logs for their tenant
ALTER TABLE public.feature_provisioning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant provisioning logs"
ON public.feature_provisioning_log
FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Super admins can view all provisioning logs
CREATE POLICY "Super admins can view all provisioning logs"
ON public.feature_provisioning_log
FOR SELECT
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'super_admin'
);

-- ============================================================================
-- 3. FUNCTION: create_tenant_schema
-- Automatically creates schema for a tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_tenant_schema(
  p_tenant_id uuid,
  p_tenant_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_schema_name text;
  v_tenant_name text;
BEGIN
  -- Format schema name: tenant_abc-123-def → tenant_abc_123_def
  v_schema_name := 'tenant_' || REPLACE(CAST(p_tenant_id AS text), '-', '_');
  
  -- Get tenant name if not provided
  IF p_tenant_name IS NULL THEN
    SELECT name INTO v_tenant_name FROM public.tenants WHERE id = p_tenant_id;
  ELSE
    v_tenant_name := p_tenant_name;
  END IF;
  
  -- Create schema if it doesn't exist
  EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quote_ident(v_schema_name);
  
  -- Record in tracking table
  INSERT INTO public.tenant_schemas (tenant_id, schema_name, status)
  VALUES (p_tenant_id, v_schema_name, 'active')
  ON CONFLICT (tenant_id) DO UPDATE
  SET status = 'active', updated_at = now();
  
  -- Log the creation
  INSERT INTO public.feature_provisioning_log (
    tenant_id,
    feature_name,
    schema_name,
    status,
    notes
  ) VALUES (
    p_tenant_id,
    'schema_creation',
    v_schema_name,
    'completed',
    'Schema created for tenant: ' || COALESCE(v_tenant_name, 'Unknown')
  );
  
  RETURN v_schema_name;
END;
$$;

COMMENT ON FUNCTION public.create_tenant_schema(uuid, text) IS 'Creates a new tenant schema and logs the action';

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX idx_tenant_schemas_status ON public.tenant_schemas(status);
CREATE INDEX idx_feature_provisioning_tenant ON public.feature_provisioning_log(tenant_id);
CREATE INDEX idx_feature_provisioning_feature ON public.feature_provisioning_log(feature_name);
CREATE INDEX idx_feature_provisioning_date ON public.feature_provisioning_log(provisioned_at);
