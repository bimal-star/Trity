-- Public bucket for product hero/gallery files; paths are tenant-scoped (first folder = tenant_id).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- No SELECT policy: public bucket allows GET by URL without one.
-- A broad SELECT policy also enables directory listing by anon (avoided).

-- Authenticated users may only write under their profile tenant folder
DROP POLICY IF EXISTS "product_images_insert_tenant" ON storage.objects;
CREATE POLICY "product_images_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "product_images_update_tenant" ON storage.objects;
CREATE POLICY "product_images_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "product_images_delete_tenant" ON storage.objects;
CREATE POLICY "product_images_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );
