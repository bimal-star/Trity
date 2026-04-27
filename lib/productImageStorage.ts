import { supabase } from '@/lib/supabaseClient';
import type { Product } from '@/types/product';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

function extensionForFile(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf('.');
  if (dot >= 0) {
    const ext = name.slice(dot).toLowerCase();
    if (/^\.(jpe?g|png|webp|gif)$/.test(ext)) return ext;
  }
  const t = file.type;
  if (t === 'image/jpeg' || t === 'image/jpg') return '.jpg';
  if (t === 'image/png') return '.png';
  if (t === 'image/webp') return '.webp';
  if (t === 'image/gif') return '.gif';
  return '';
}

/**
 * Upload a product image to Supabase Storage under `{tenantId}/{uuid}{ext}`.
 * Requires the `product-images` bucket and matching RLS (see migrations).
 */
export async function uploadProductImage(tenantId: string, file: File): Promise<string> {
  const ext = extensionForFile(file);
  const path = `${tenantId}/${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Cover image: `image_url`, else first entry in `images` jsonb. */
export function getProductPrimaryImageUrl(product: Product): string | null {
  const direct = product.image_url?.trim();
  if (direct) return direct;
  const imgs = product.images;
  if (!Array.isArray(imgs) || imgs.length === 0) return null;
  const first = imgs[0];
  if (typeof first === 'string' && first.trim()) return first.trim();
  if (first && typeof first === 'object' && 'url' in first) {
    const u = (first as { url?: unknown }).url;
    if (typeof u === 'string' && u.trim()) return u.trim();
  }
  return null;
}
