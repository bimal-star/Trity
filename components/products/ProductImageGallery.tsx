'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Package2, Pencil, Star, Upload, X } from 'lucide-react';
import { clampImageIndex, resolveGalleryPreviewUrl } from '@/lib/productImages';
import type { ProductImageEntry } from '@/types/product';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAIN_SIZE_CLASS = 'size-[252px]';
const MAIN_WIDTH_CLASS = 'w-[252px]';

export interface ProductImageGalleryProps {
  entries: ProductImageEntry[];
  defaultUrl: string | null;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onUpload: (files: File[]) => void | Promise<void>;
  onSetDefault: () => void | Promise<void>;
  onRemove?: (url: string) => void | Promise<void>;
  uploading?: boolean;
  settingDefault?: boolean;
  removing?: boolean;
  disabled?: boolean;
}

export default function ProductImageGallery({
  entries,
  defaultUrl,
  selectedIndex,
  onSelectIndex,
  onUpload,
  onSetDefault,
  onRemove,
  uploading = false,
  settingDefault = false,
  removing = false,
  disabled = false,
}: ProductImageGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const busy = uploading || settingDefault || removing;
  const controlsDisabled = disabled || busy;

  const safeIndex = clampImageIndex(selectedIndex, entries.length);
  const selectedUrl = resolveGalleryPreviewUrl(entries, safeIndex, defaultUrl);
  const isDefault = Boolean(selectedUrl && defaultUrl && selectedUrl === defaultUrl.trim());
  const canSetDefault = Boolean(selectedUrl && !isDefault && entries.length > 0);
  const hasImage = Boolean(selectedUrl);

  const openManage = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (controlsDisabled) return;
      setManageOpen(true);
    },
    [controlsDisabled]
  );

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const handlePick = useCallback(() => {
    if (controlsDisabled) return;
    fileInputRef.current?.click();
  }, [controlsDisabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length) {
        e.target.value = '';
        return;
      }
      const files = Array.from(list);
      e.target.value = '';
      void onUpload(files);
    },
    [onUpload]
  );

  const handleImageAreaClick = useCallback(() => {
    if (controlsDisabled) return;
    if (hasImage) {
      setLightboxOpen(true);
    } else {
      setManageOpen(true);
    }
  }, [controlsDisabled, hasImage]);

  useEffect(() => {
    if (!manageOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setManageOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setManageOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [manageOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div
        className={`group relative ${MAIN_SIZE_CLASS} shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-950 ${
          !controlsDisabled ? 'cursor-pointer' : ''
        }`}
        onClick={handleImageAreaClick}
        onKeyDown={(e) => {
          if (controlsDisabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleImageAreaClick();
          }
        }}
        role={!controlsDisabled ? 'button' : undefined}
        tabIndex={!controlsDisabled ? 0 : undefined}
        aria-label={
          hasImage
            ? 'View full size image'
            : controlsDisabled
              ? 'No product image'
              : 'Add product image'
        }
      >
        {selectedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedUrl}
            alt=""
            className="block h-full w-full object-cover object-center transition-[filter,box-shadow] duration-150 group-hover:brightness-[0.88] group-hover:ring-2 group-hover:ring-inset group-hover:ring-green-500/35"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center transition-[filter,box-shadow] duration-150 group-hover:brightness-[0.92] group-hover:ring-2 group-hover:ring-inset group-hover:ring-green-500/35">
            <Package2 className="h-12 w-12 text-gray-400" aria-hidden />
          </div>
        )}

        {entries.length > 1 ? (
          <span className="pointer-events-none absolute bottom-2 right-2 z-[1] rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white">
            {safeIndex + 1}/{entries.length}
          </span>
        ) : null}

        {!controlsDisabled ? (
          <button
            type="button"
            onClick={openManage}
            aria-expanded={manageOpen}
            aria-haspopup="dialog"
            aria-label="Manage product images"
            className="absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-md bg-black/55 p-1.5 text-white shadow-sm backdrop-blur-[2px] transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
          >
            {entries.length > 0 ? (
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Camera className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {lightboxOpen && selectedUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close image preview"
            className="absolute right-4 top-4 z-[101] inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedUrl}
            alt=""
            className="max-h-[min(90vh,900px)] max-w-[min(92vw,1200px)] object-contain shadow-2xl"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      {manageOpen && !controlsDisabled ? (
        <div
          role="dialog"
          aria-label="Product image management"
          className={`absolute left-0 top-full z-50 mt-1.5 ${MAIN_WIDTH_CLASS} overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-900`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {entries.length > 0 ? (
            <div
              className="flex gap-1 overflow-x-auto p-2 pb-0"
              role="listbox"
              aria-label="Product images"
            >
              {entries.map((entry, index) => {
                const isSelected = index === safeIndex;
                const isEntryDefault = Boolean(defaultUrl && entry.url === defaultUrl.trim());
                return (
                  <div
                    key={entry.url}
                    className={`relative size-12 shrink-0 overflow-hidden rounded-md bg-gray-50 dark:bg-gray-950 ${
                      isSelected
                        ? 'ring-2 ring-inset ring-emerald-600 dark:ring-emerald-500'
                        : 'border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-label={isEntryDefault ? 'Default image' : `Image ${index + 1}`}
                      disabled={busy}
                      onClick={() => onSelectIndex(index)}
                      className="relative block size-12 disabled:opacity-60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.url}
                        alt=""
                        className="block h-full w-full object-cover object-center"
                        referrerPolicy="no-referrer"
                      />
                      {isEntryDefault ? (
                        <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-emerald-600 p-0.5 text-white shadow-sm">
                          <Star className="h-2 w-2 fill-current" aria-hidden />
                        </span>
                      ) : null}
                    </button>
                    {onRemove && !busy ? (
                      <button
                        type="button"
                        title="Remove image"
                        aria-label={`Remove image ${index + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void onRemove(entry.url);
                        }}
                        className="absolute right-0 top-0 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-red-600 text-white shadow hover:bg-red-700 dark:border-gray-900"
                      >
                        <X className="h-2 w-2" strokeWidth={2.5} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            aria-hidden
            onChange={handleFileChange}
          />

          <div className="flex flex-col">
            <button
              type="button"
              disabled={busy}
              onClick={handlePick}
              className={`inline-flex ${MAIN_WIDTH_CLASS} items-center justify-center gap-1 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${
                entries.length > 0 ? 'border-t border-gray-200 dark:border-gray-600' : ''
              }`}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              {uploading ? 'Uploading…' : 'Add image'}
            </button>
            {canSetDefault ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSetDefault()}
                className={`inline-flex ${MAIN_WIDTH_CLASS} items-center justify-center gap-1 border-t border-emerald-600/40 bg-emerald-50 px-2 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70`}
              >
                {settingDefault ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Star className="h-3.5 w-3.5" aria-hidden />
                )}
                Set default
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
