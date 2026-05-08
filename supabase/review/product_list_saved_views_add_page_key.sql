-- REVIEW ONLY — do not run via CI. Apply manually after verification.
-- Adds `page_key` so saved list views can be scoped per page (e.g. products, suppliers).
-- Existing rows default to `products`.

ALTER TABLE public.product_list_saved_views
  ADD COLUMN IF NOT EXISTS page_key text NOT NULL DEFAULT 'products';

COMMENT ON COLUMN public.product_list_saved_views.page_key IS
  'Logical list page (e.g. products, suppliers); part of uniqueness with name per owner.';

-- Replace name uniqueness to be per page.
DROP INDEX IF EXISTS public.product_list_saved_views_unique_name_per_owner;
CREATE UNIQUE INDEX IF NOT EXISTS product_list_saved_views_unique_name_per_owner
  ON public.product_list_saved_views (tenant_id, owner_user_id, page_key, lower(trim(name)));

-- At most one personal default per tenant + owner + page.
DROP INDEX IF EXISTS public.product_list_saved_views_one_personal_default;
CREATE UNIQUE INDEX IF NOT EXISTS product_list_saved_views_one_personal_default
  ON public.product_list_saved_views (tenant_id, owner_user_id, page_key)
  WHERE is_personal_default = true;

-- Optional: faster list by page (keep old index if other queries depend on it).
CREATE INDEX IF NOT EXISTS idx_product_list_saved_views_tenant_owner_page
  ON public.product_list_saved_views (tenant_id, owner_user_id, page_key);
