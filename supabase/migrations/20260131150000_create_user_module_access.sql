-- Create user_module_access table for granular module access control
CREATE TABLE IF NOT EXISTS public.user_module_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own access and admins can view all
CREATE POLICY user_module_access_select ON public.user_module_access
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    AND (
      user_id = auth.uid()
      OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
    )
  );

-- RLS Policy: Only admins can insert/update
CREATE POLICY user_module_access_write ON public.user_module_access
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY user_module_access_update ON public.user_module_access
  FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY user_module_access_delete ON public.user_module_access
  FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- Create index for performance
CREATE INDEX idx_user_module_access_tenant_user ON public.user_module_access(tenant_id, user_id);
CREATE INDEX idx_user_module_access_user_module ON public.user_module_access(user_id, module_id);
