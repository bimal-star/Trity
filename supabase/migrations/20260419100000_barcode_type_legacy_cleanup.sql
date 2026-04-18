-- Normalize legacy barcode_type labels if any rows were stored with old UI values
-- (defensive; enum columns normally cannot hold invalid labels).

UPDATE public.product_barcodes pb
SET barcode_type = v.mapped::public.barcode_type
FROM (
  VALUES
    ('upc_a', 'upc'),
    ('upc_e', 'upc'),
    ('code39', 'code128'),
    ('other', 'internal')
) AS v(old, mapped)
WHERE pb.barcode_type::text = v.old;
