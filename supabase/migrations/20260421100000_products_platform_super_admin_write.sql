-- Allow platform super-admins to insert/update/delete products and product_categories for any
-- tenant while using workspace impersonation. Standard policies only allow rows where tenant_id
-- is in the actor's user_profiles; impersonation sets the app tenant to another workspace without
-- a matching profile row, which blocked creates. SELECT is already covered by
-- bc_products_select_platform_super_admin / bc_product_categories_select_platform_super_admin
-- (20260415120000_platform_super_admin_workspace_select.sql).

DROP POLICY IF EXISTS bc_products_insert_platform_super_admin ON public.products;
CREATE POLICY bc_products_insert_platform_super_admin ON public.products
  FOR INSERT
  WITH CHECK (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS bc_products_update_platform_super_admin ON public.products;
CREATE POLICY bc_products_update_platform_super_admin ON public.products
  FOR UPDATE
  USING (public.is_tenants_platform_super_admin())
  WITH CHECK (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS bc_products_delete_platform_super_admin ON public.products;
CREATE POLICY bc_products_delete_platform_super_admin ON public.products
  FOR DELETE
  USING (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS bc_product_categories_insert_platform_super_admin ON public.product_categories;
CREATE POLICY bc_product_categories_insert_platform_super_admin ON public.product_categories
  FOR INSERT
  WITH CHECK (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS bc_product_categories_update_platform_super_admin ON public.product_categories;
CREATE POLICY bc_product_categories_update_platform_super_admin ON public.product_categories
  FOR UPDATE
  USING (public.is_tenants_platform_super_admin())
  WITH CHECK (public.is_tenants_platform_super_admin());

DROP POLICY IF EXISTS bc_product_categories_delete_platform_super_admin ON public.product_categories;
CREATE POLICY bc_product_categories_delete_platform_super_admin ON public.product_categories
  FOR DELETE
  USING (public.is_tenants_platform_super_admin());
