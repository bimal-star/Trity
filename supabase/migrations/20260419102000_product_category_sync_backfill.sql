-- Align products.category_id with product_categories junction (see app comments:
-- junction = canonical memberships; products.category_id = primary for reporting).

INSERT INTO public.product_categories (
  product_id,
  category_id,
  tenant_id,
  is_deleted,
  metadata,
  updated_at
)
SELECT p.id, p.category_id, p.tenant_id, false, '{}'::jsonb, now()
FROM public.products p
WHERE p.category_id IS NOT NULL
  AND p.is_deleted = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_categories pc
    WHERE pc.product_id = p.id
      AND pc.category_id = p.category_id
      AND pc.tenant_id = p.tenant_id
      AND pc.is_deleted = false
  );

-- Only fill primary category when missing (do not override existing picks).
UPDATE public.products p
SET category_id = sub.primary_category_id
FROM (
  SELECT DISTINCT ON (pc.product_id, pc.tenant_id)
    pc.product_id,
    pc.tenant_id,
    pc.category_id AS primary_category_id
  FROM public.product_categories pc
  WHERE pc.is_deleted = false
  ORDER BY pc.product_id, pc.tenant_id, pc.created_at NULLS LAST, pc.category_id
) sub
WHERE p.id = sub.product_id
  AND p.tenant_id = sub.tenant_id
  AND p.category_id IS NULL;
