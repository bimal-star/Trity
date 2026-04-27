-- logo_url on suppliers and warehouses; public storage buckets (tenant-scoped paths).

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.suppliers ADD COLUMN logo_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.warehouses ADD COLUMN logo_url TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.suppliers.logo_url IS 'Public URL for supplier logo (e.g. supplier-logos bucket).';
COMMENT ON COLUMN public.warehouses.logo_url IS 'Public URL for warehouse logo (e.g. warehouse-logos bucket).';

-- ---------------------------------------------------------------------------
-- Storage: supplier-logos
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-logos',
  'supplier-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- No SELECT policy: public bucket allows GET by URL without one.
-- A broad SELECT policy also enables directory listing by anon (avoided).

DROP POLICY IF EXISTS "supplier_logos_insert_tenant" ON storage.objects;
CREATE POLICY "supplier_logos_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "supplier_logos_update_tenant" ON storage.objects;
CREATE POLICY "supplier_logos_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'supplier-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    bucket_id = 'supplier-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "supplier_logos_delete_tenant" ON storage.objects;
CREATE POLICY "supplier_logos_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'supplier-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: warehouse-logos
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'warehouse-logos',
  'warehouse-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- No SELECT policy: public bucket allows GET by URL without one.
-- A broad SELECT policy also enables directory listing by anon (avoided).

DROP POLICY IF EXISTS "warehouse_logos_insert_tenant" ON storage.objects;
CREATE POLICY "warehouse_logos_insert_tenant"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'warehouse-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "warehouse_logos_update_tenant" ON storage.objects;
CREATE POLICY "warehouse_logos_update_tenant"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'warehouse-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    bucket_id = 'warehouse-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "warehouse_logos_delete_tenant" ON storage.objects;
CREATE POLICY "warehouse_logos_delete_tenant"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'warehouse-logos'
    AND (storage.foldername(name))[1] = (
      SELECT up.tenant_id::text
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      LIMIT 1
    )
  );
