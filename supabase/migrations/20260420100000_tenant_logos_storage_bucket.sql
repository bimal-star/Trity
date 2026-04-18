-- Public bucket for workspace (public.tenants) logos. Paths: `{tenant_id}/{uuid}.{ext}`.
-- Platform super-admins may upload for any tenant (admin UI). Tenant admins may upload
-- only under their own tenant_id folder (e.g. tenant settings).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-logos',
  'tenant-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- No SELECT policy: public bucket allows GET by URL without one.
-- A broad SELECT policy also enables directory listing by anon (avoided).

DROP POLICY IF EXISTS "tenant_logos_insert_super_admin" ON storage.objects;
CREATE POLICY "tenant_logos_insert_super_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-logos'
    AND public.is_tenants_platform_super_admin()
  );

DROP POLICY IF EXISTS "tenant_logos_update_super_admin" ON storage.objects;
CREATE POLICY "tenant_logos_update_super_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-logos' AND public.is_tenants_platform_super_admin())
  WITH CHECK (bucket_id = 'tenant-logos' AND public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS "tenant_logos_delete_super_admin" ON storage.objects;
CREATE POLICY "tenant_logos_delete_super_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-logos' AND public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS "tenant_logos_insert_tenant" ON storage.objects;
CREATE POLICY "tenant_logos_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-logos'
    AND NOT public.is_tenants_platform_super_admin()
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "tenant_logos_update_tenant" ON storage.objects;
CREATE POLICY "tenant_logos_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-logos'
    AND NOT public.is_tenants_platform_super_admin()
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    bucket_id = 'tenant-logos'
    AND NOT public.is_tenants_platform_super_admin()
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "tenant_logos_delete_tenant" ON storage.objects;
CREATE POLICY "tenant_logos_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-logos'
    AND NOT public.is_tenants_platform_super_admin()
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );
