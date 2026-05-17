import type { Product, ProductImageEntry } from '@/types/product';

export type { ProductImageEntry };

type ProductImageSource = Pick<Product, 'image_url' | 'images'>;

function parseImageEntry(item: unknown, fallbackOrder: number): ProductImageEntry | null {
  if (typeof item === 'string' && item.trim()) {
    return { url: item.trim(), sort_order: fallbackOrder };
  }
  if (item && typeof item === 'object' && 'url' in item) {
    const u = (item as { url?: unknown }).url;
    if (typeof u === 'string' && u.trim()) {
      const sortOrder = (item as { sort_order?: unknown }).sort_order;
      return {
        url: u.trim(),
        sort_order:
          typeof sortOrder === 'number' && Number.isFinite(sortOrder) ? sortOrder : fallbackOrder,
      };
    }
  }
  return null;
}

/** Parse `images` jsonb, merge `image_url` if missing, dedupe by URL, sort by sort_order. */
export function normalizeProductImages(product: ProductImageSource): ProductImageEntry[] {
  const byUrl = new Map<string, ProductImageEntry>();
  let order = 0;

  let imgs: unknown = product.images;
  if (typeof imgs === 'string' && imgs.trim()) {
    try {
      imgs = JSON.parse(imgs) as unknown;
    } catch {
      imgs = null;
    }
  }
  if (imgs && typeof imgs === 'object' && !Array.isArray(imgs)) {
    imgs = Object.values(imgs as Record<string, unknown>);
  }
  if (Array.isArray(imgs)) {
    for (const item of imgs) {
      const entry = parseImageEntry(item, order++);
      if (entry && !byUrl.has(entry.url)) {
        byUrl.set(entry.url, entry);
      }
    }
  }

  const cover = product.image_url?.trim();
  if (cover && !byUrl.has(cover)) {
    byUrl.set(cover, { url: cover, sort_order: -1 });
  }

  return Array.from(byUrl.values()).sort((a, b) => a.sort_order - b.sort_order);
}

/** Keep selection in range when gallery length changes. */
export function clampImageIndex(index: number, entryCount: number): number {
  if (entryCount <= 0) return 0;
  return Math.min(Math.max(0, index), entryCount - 1);
}

/** Resolve preview URL for the main gallery frame. */
export function resolveGalleryPreviewUrl(
  entries: ProductImageEntry[],
  selectedIndex: number,
  defaultUrl: string | null | undefined
): string | null {
  if (entries.length > 0) {
    const safe = clampImageIndex(selectedIndex, entries.length);
    const fromEntry = entries[safe]?.url?.trim();
    if (fromEntry) return fromEntry;
  }
  const cover = defaultUrl?.trim();
  return cover || null;
}

/** Index to select on load: matches `image_url`, else first gallery item. */
export function getDefaultImageIndex(
  entries: ProductImageEntry[],
  imageUrl: string | null | undefined
): number {
  if (entries.length === 0) return 0;
  const cover = imageUrl?.trim();
  if (cover) {
    const idx = entries.findIndex((e) => e.url === cover);
    if (idx >= 0) return idx;
  }
  return 0;
}

/** Append new URLs with incrementing sort_order; skips duplicates. */
export function appendProductImages(
  current: ProductImageEntry[],
  newUrls: string[]
): ProductImageEntry[] {
  const byUrl = new Map(current.map((e) => [e.url, e]));
  let maxOrder = current.reduce((max, e) => Math.max(max, e.sort_order), -1);

  for (const raw of newUrls) {
    const url = raw.trim();
    if (!url || byUrl.has(url)) continue;
    maxOrder += 1;
    byUrl.set(url, { url, sort_order: maxOrder });
  }

  return Array.from(byUrl.values()).sort((a, b) => a.sort_order - b.sort_order);
}

/** Patch for persisting the catalog cover image. */
export function productImageDefaultPatch(url: string): { image_url: string } {
  return { image_url: url.trim() };
}

/** Remove one gallery URL and reconcile `image_url` (promote first remaining if default removed). */
export function buildProductImagesRemovePatch(
  product: ProductImageSource,
  urlToRemove: string
): { images: ProductImageEntry[] | null; image_url: string | null } {
  const url = urlToRemove.trim();
  const current = normalizeProductImages(product);
  const next = current.filter((e) => e.url !== url);

  if (next.length === 0) {
    return { images: null, image_url: null };
  }

  const cover = product.image_url?.trim();
  if (cover === url || !cover || !next.some((e) => e.url === cover)) {
    return { images: next, image_url: next[0]!.url };
  }

  return { images: next, image_url: cover };
}

/** Cover URL: `image_url` when set, else first normalized gallery entry. */
export function getProductPrimaryImageUrlFromNormalized(
  entries: ProductImageEntry[],
  imageUrl: string | null | undefined
): string | null {
  const cover = imageUrl?.trim();
  if (cover) return cover;
  return entries[0]?.url ?? null;
}
