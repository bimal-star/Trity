-- Public bucket for customer logos; paths are tenant-scoped (first folder = tenant_id).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-logos',
  'customer-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- No SELECT policy: public bucket allows GET by URL without one.
-- A broad SELECT policy also enables directory listing by anon (avoided).

DROP POLICY IF EXISTS "customer_logos_insert_tenant" ON storage.objects;
CREATE POLICY "customer_logos_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'customer-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "customer_logos_update_tenant" ON storage.objects;
CREATE POLICY "customer_logos_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'customer-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    bucket_id = 'customer-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "customer_logos_delete_tenant" ON storage.objects;
CREATE POLICY "customer_logos_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );
