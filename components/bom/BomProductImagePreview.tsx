'use client';

import { Package2 } from 'lucide-react';
import { clampImageIndex, resolveGalleryPreviewUrl } from '@/lib/productImages';
import type { ProductImageEntry } from '@/types/product';

const MAIN_SIZE_CLASS = 'size-[252px]';

interface BomProductImagePreviewProps {
  entries: ProductImageEntry[];
  defaultUrl: string | null;
  selectedIndex?: number;
  alt?: string;
}

/** Read-only product image tile (matches ProductImageGallery dimensions). */
export default function BomProductImagePreview({
  entries,
  defaultUrl,
  selectedIndex = 0,
  alt = 'Product',
}: BomProductImagePreviewProps) {
  const url = resolveGalleryPreviewUrl(
    entries,
    clampImageIndex(selectedIndex, entries.length),
    defaultUrl
  );

  return (
    <div
      className={`relative ${MAIN_SIZE_CLASS} shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-950`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className="block h-full w-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Package2 className="h-12 w-12 text-gray-400" aria-hidden />
        </div>
      )}
      {entries.length > 1 ? (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {clampImageIndex(selectedIndex, entries.length) + 1}/{entries.length}
        </span>
      ) : null}
    </div>
  );
}
