-- Product image storage: align RLS with workspace impersonation.
-- Upload paths use effectiveTenantId ({tenant_id}/{uuid}.ext); prior policies only
-- matched user_profiles.tenant_id (home tenant), blocking impersonated uploads.

-- Platform super-admins: any tenant folder under product-images
DROP POLICY IF EXISTS "product_images_insert_platform_super_admin" ON storage.objects;
CREATE POLICY "product_images_insert_platform_super_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_tenants_platform_super_admin()
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "product_images_update_platform_super_admin" ON storage.objects;
CREATE POLICY "product_images_update_platform_super_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_tenants_platform_super_admin()
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_tenants_platform_super_admin()
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "product_images_delete_platform_super_admin" ON storage.objects;
CREATE POLICY "product_images_delete_platform_super_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_tenants_platform_super_admin()
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

-- Tenant users: folder must match effective tenant (home or impersonated workspace)
DROP POLICY IF EXISTS "product_images_insert_tenant" ON storage.objects;
CREATE POLICY "product_images_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND NOT public.is_tenants_platform_super_admin()
    AND (storage.foldername(name))[1] = (SELECT public.app_effective_tenant_id()::text)
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "product_images_update_tenant" ON storage.objects;
CREATE POLICY "product_images_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND NOT public.is_tenants_platform_super_admin()
    AND (storage.foldername(name))[1] = (SELECT public.app_effective_tenant_id()::text)
    AND NOT (SELECT public.app_impersonation_write_blocked())
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND NOT public.is_tenants_platform_super_admin()
    AND (storage.foldername(name))[1] = (SELECT public.app_effective_tenant_id()::text)
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );

DROP POLICY IF EXISTS "product_images_delete_tenant" ON storage.objects;
CREATE POLICY "product_images_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND NOT public.is_tenants_platform_super_admin()
    AND (storage.foldername(name))[1] = (SELECT public.app_effective_tenant_id()::text)
    AND NOT (SELECT public.app_impersonation_write_blocked())
  );
