  -- Platform super-admin write policies for product satellite tables.
  -- SELECT is already covered by the consolidated bc_*_select policies
  -- (20260423100000_fix_performance_lint.sql). This migration adds the
  -- missing INSERT / UPDATE / DELETE policies so that platform super-admins
  -- can write to all product-related tables when impersonating a workspace.
  -- Mirrors the pattern established in 3B / 3C of 20260423100000.
  -- Each section guards against the table not existing to keep migration idempotent.

  DO $$
  DECLARE
    t    TEXT;
    tbls TEXT[] := ARRAY[
      'product_barcodes',
      'product_variants',
      'product_cost_history',
      'product_metrics',
      'product_activity_log',
      'packing_configurations',
      'price_lists',
      'price_list_items'
    ];
  BEGIN
    FOREACH t IN ARRAY tbls LOOP
      IF to_regclass('public.' || t) IS NULL THEN
        CONTINUE;
      END IF;

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_insert', t);
      EXECUTE format($pol$
        CREATE POLICY %I ON public.%I FOR INSERT
          WITH CHECK (
            tenant_id IN (
              SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
            )
            OR public.is_tenants_platform_super_admin()
          )
      $pol$, 'bc_' || t || '_insert', t);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_update', t);
      EXECUTE format($pol$
        CREATE POLICY %I ON public.%I FOR UPDATE
          USING (
            tenant_id IN (
              SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
            )
            OR public.is_tenants_platform_super_admin()
          )
          WITH CHECK (
            tenant_id IN (
              SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
            )
            OR public.is_tenants_platform_super_admin()
          )
      $pol$, 'bc_' || t || '_update', t);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'bc_' || t || '_delete', t);
      EXECUTE format($pol$
        CREATE POLICY %I ON public.%I FOR DELETE
          USING (
            tenant_id IN (
              SELECT tenant_id FROM public.user_profiles WHERE user_id = (SELECT auth.uid())
            )
            OR public.is_tenants_platform_super_admin()
          )
      $pol$, 'bc_' || t || '_delete', t);

    END LOOP;
  END $$;
