-- Helper for tenant lifecycle (deactivate / reactivate). App enforces is_active; this supports SQL/RLS extensions.

CREATE OR REPLACE FUNCTION public.tenant_is_active(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT t.is_active FROM public.tenants t WHERE t.id = p_tenant_id),
    false
  );
$$;

COMMENT ON FUNCTION public.tenant_is_active(uuid) IS
  'Returns public.tenants.is_active for the given id; false when the row is missing.';

GRANT EXECUTE ON FUNCTION public.tenant_is_active(uuid) TO authenticated;
