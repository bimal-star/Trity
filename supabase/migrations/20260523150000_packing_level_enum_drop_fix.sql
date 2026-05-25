-- Repair: drop packing_level enum after enum→text conversion.
-- product_barcodes.packing_level default ('unit'::packing_level) keeps a dependency
-- on the enum even when the column is already text, blocking DROP TYPE.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'packing_level'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'packing_configurations'
      AND column_name = 'level'
      AND udt_name = 'packing_level'
  ) THEN
    ALTER TABLE public.packing_configurations
      ALTER COLUMN level TYPE text USING level::text,
      ALTER COLUMN previous_level TYPE text USING previous_level::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_barcodes'
      AND column_name = 'packing_level'
      AND udt_name = 'packing_level'
  ) THEN
    ALTER TABLE public.product_barcodes
      ALTER COLUMN packing_level DROP DEFAULT;
    ALTER TABLE public.product_barcodes
      ALTER COLUMN packing_level TYPE text USING packing_level::text;
    ALTER TABLE public.product_barcodes
      ALTER COLUMN packing_level SET DEFAULT 'unit';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_barcodes'
      AND column_name = 'packing_level'
  ) THEN
    ALTER TABLE public.product_barcodes
      ALTER COLUMN packing_level DROP DEFAULT;
    ALTER TABLE public.product_barcodes
      ALTER COLUMN packing_level SET DEFAULT 'unit';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND udt_name = 'packing_level'
  ) THEN
    DROP TYPE public.packing_level;
  END IF;
END $$;
