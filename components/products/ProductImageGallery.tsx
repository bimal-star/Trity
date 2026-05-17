'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Package2, Pencil, Star, Upload, X } from 'lucide-react';
import { clampImageIndex, resolveGalleryPreviewUrl } from '@/lib/productImages';
import type { ProductImageEntry } from '@/types/product';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAIN_SIZE_CLASS = 'size-[252px]';

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

  const busy = uploading || settingDefault || removing;
  const controlsDisabled = disabled || busy;

  const safeIndex = clampImageIndex(selectedIndex, entries.length);
  const selectedUrl = resolveGalleryPreviewUrl(entries, safeIndex, defaultUrl);
  const isDefault = Boolean(selectedUrl && defaultUrl && selectedUrl === defaultUrl.trim());
  const canSetDefault = Boolean(selectedUrl && !isDefault && entries.length > 0);

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

  const toggleManage = useCallback(() => {
    if (controlsDisabled) return;
    setManageOpen((open) => !open);
  }, [controlsDisabled]);

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

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div
        className={`group relative ${MAIN_SIZE_CLASS} shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-950`}
      >
        {selectedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedUrl}
            alt=""
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
            {safeIndex + 1}/{entries.length}
          </span>
        ) : null}

        {!controlsDisabled ? (
          <button
            type="button"
            onClick={toggleManage}
            aria-expanded={manageOpen}
            aria-haspopup="dialog"
            aria-label="Manage product images"
            className={`absolute inset-0 z-10 flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 ${
              manageOpen
                ? 'bg-black/45'
                : 'bg-black/0 group-hover:bg-black/40 group-focus-within:bg-black/40'
            }`}
          >
            <span
              className={`rounded-full bg-white/95 p-2.5 text-gray-800 shadow-md transition-opacity dark:bg-gray-900/95 dark:text-gray-100 ${
                manageOpen
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
              }`}
            >
              {entries.length > 0 ? (
                <Pencil className="h-5 w-5" aria-hidden />
              ) : (
                <Camera className="h-5 w-5" aria-hidden />
              )}
            </span>
          </button>
        ) : null}
      </div>

      {manageOpen && !controlsDisabled ? (
        <div
          role="dialog"
          aria-label="Product image management"
          className="absolute left-0 top-full z-50 mt-1.5 w-[min(17.5rem,90vw)] rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-900"
        >
          {entries.length > 0 ? (
            <div
              className="mb-2 flex gap-1 overflow-x-auto pb-0.5"
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

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={handlePick}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-600/40 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70"
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
