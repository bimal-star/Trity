-- Align live DB with app + types: scope saved list views per page (e.g. products).
-- Safe if column already exists (IF NOT EXISTS / IF NOT EXISTS index names).

ALTER TABLE public.product_list_saved_views
  ADD COLUMN IF NOT EXISTS page_key text NOT NULL DEFAULT 'products';

COMMENT ON COLUMN public.product_list_saved_views.page_key IS
  'Logical list page (e.g. products); part of uniqueness with name per owner.';

DROP INDEX IF EXISTS public.product_list_saved_views_unique_name_per_owner;
CREATE UNIQUE INDEX IF NOT EXISTS product_list_saved_views_unique_name_per_owner
  ON public.product_list_saved_views (tenant_id, owner_user_id, page_key, lower(trim(name)));

DROP INDEX IF EXISTS public.product_list_saved_views_one_personal_default;
CREATE UNIQUE INDEX IF NOT EXISTS product_list_saved_views_one_personal_default
  ON public.product_list_saved_views (tenant_id, owner_user_id, page_key)
  WHERE is_personal_default = true;

CREATE INDEX IF NOT EXISTS idx_product_list_saved_views_tenant_owner_page
  ON public.product_list_saved_views (tenant_id, owner_user_id, page_key);
