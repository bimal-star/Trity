-- SMB-friendly label for price tiers page (path unchanged).

UPDATE public.navigation
SET label = 'Customer pricing', updated_at = now()
WHERE path = '/products/price-lists'
  AND is_deleted = false
  AND coalesce(label, '') IN ('Price lists', 'Price Lists', 'price lists');
