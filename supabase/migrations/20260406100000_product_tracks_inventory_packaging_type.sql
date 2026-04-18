-- Stock policy: explicit column separate from product_type (service vs stocked FG, etc.).
-- Packaging: new product_type enum value for filters and reporting.

ALTER TYPE public.product_type ADD VALUE IF NOT EXISTS 'packaging';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tracks_inventory boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.products.tracks_inventory IS
  'When false, the item is not maintained as a stock item (services, drop-ship SKUs, fees, etc.). App should skip stock_levels / MRP for these.';

-- Existing services: align with typical non-stocked behavior (idempotent).
UPDATE public.products
SET tracks_inventory = false
WHERE product_type = 'service'::public.product_type
  AND tracks_inventory IS TRUE;
