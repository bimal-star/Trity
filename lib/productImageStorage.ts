import { supabase } from '@/lib/supabaseClient';
import {
  getProductPrimaryImageUrlFromNormalized,
  normalizeProductImages,
} from '@/lib/productImages';
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

/** Storage object path from a public `product-images` URL, if applicable. */
export function storagePathFromProductImageUrl(publicUrl: string): string | null {
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = publicUrl.slice(idx + marker.length).split('?')[0];
  return path.trim() || null;
}

/** Delete a file from `product-images` when the URL points at our bucket (no-op for external URLs). */
export async function deleteProductImageByUrl(url: string): Promise<void> {
  const path = storagePathFromProductImageUrl(url);
  if (!path) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  if (error) throw error;
}

/** Cover image: `image_url`, else first entry in normalized `images` gallery. */
export function getProductPrimaryImageUrl(product: Product): string | null {
  const entries = normalizeProductImages(product);
  return getProductPrimaryImageUrlFromNormalized(entries, product.image_url);
}
