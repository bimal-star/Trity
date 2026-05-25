-- Per-product tier price validity (optional open-ended window).
ALTER TABLE public.price_list_items
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date;

DO $$
BEGIN
  IF to_regclass('public.price_list_items') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_price_list_items_effective'
  ) THEN
    ALTER TABLE public.price_list_items
      ADD CONSTRAINT chk_price_list_items_effective
      CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_price_list_items_product_dates
  ON public.price_list_items (product_id, effective_from, effective_to);
