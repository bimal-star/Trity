'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, Loader2, Pencil, Upload, UserCircle, X } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { uploadCustomerLogo } from '@/lib/customerLogoStorage';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAIN_SIZE_CLASS = 'size-[252px]';
const MAIN_WIDTH_CLASS = 'w-[252px]';

export interface CustomerLogoPanelProps {
  logoUrl: string | null;
  onLogoUrlChange: (url: string | null) => void | Promise<void>;
  uploading?: boolean;
  disabled?: boolean;
}

export default function CustomerLogoPanel({
  logoUrl,
  onLogoUrlChange,
  uploading: uploadingProp = false,
  disabled = false,
}: CustomerLogoPanelProps) {
  const { effectiveTenantId: tenant_id } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [uploadingLocal, setUploadingLocal] = useState(false);

  const uploading = uploadingProp || uploadingLocal;
  const controlsDisabled = disabled || uploading;
  const hasLogo = Boolean(logoUrl?.trim());
  const url = logoUrl?.trim() || null;

  const handlePick = useCallback(() => {
    if (controlsDisabled) return;
    fileInputRef.current?.click();
  }, [controlsDisabled]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !tenant_id) return;
      setUploadingLocal(true);
      try {
        const uploaded = await uploadCustomerLogo(tenant_id, file);
        await onLogoUrlChange(uploaded);
        setManageOpen(false);
      } finally {
        setUploadingLocal(false);
      }
    },
    [tenant_id, onLogoUrlChange]
  );

  const handleRemove = useCallback(async () => {
    if (controlsDisabled) return;
    await onLogoUrlChange(null);
    setManageOpen(false);
  }, [controlsDisabled, onLogoUrlChange]);

  const openManage = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (controlsDisabled) return;
      setManageOpen(true);
    },
    [controlsDisabled]
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div
        className={`group relative ${MAIN_SIZE_CLASS} shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-950 ${
          !controlsDisabled ? 'cursor-pointer' : ''
        }`}
        onClick={() => {
          if (controlsDisabled) return;
          if (hasLogo) setLightboxOpen(true);
          else setManageOpen(true);
        }}
        role={!controlsDisabled ? 'button' : undefined}
        tabIndex={!controlsDisabled ? 0 : undefined}
        aria-label={
          hasLogo
            ? 'View customer logo'
            : controlsDisabled
              ? 'No customer logo'
              : 'Add customer logo'
        }
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="block h-full w-full object-cover object-center transition-[filter,box-shadow] duration-150 group-hover:brightness-[0.88] group-hover:ring-2 group-hover:ring-inset group-hover:ring-green-500/35"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center transition-[filter,box-shadow] duration-150 group-hover:brightness-[0.92] group-hover:ring-2 group-hover:ring-inset group-hover:ring-green-500/35">
            <UserCircle className="h-12 w-12 text-gray-400" aria-hidden />
          </div>
        )}

        {!controlsDisabled ? (
          <button
            type="button"
            onClick={openManage}
            aria-expanded={manageOpen}
            aria-haspopup="dialog"
            aria-label="Manage customer logo"
            className="absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-md bg-black/55 p-1.5 text-white shadow-sm backdrop-blur-[2px] transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
          >
            {hasLogo ? (
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Camera className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {lightboxOpen && url ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer logo preview"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close logo preview"
            className="absolute right-4 top-4 z-[101] inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 text-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
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
          aria-label="Customer logo management"
          className={`absolute left-0 top-full z-50 mt-1.5 ${MAIN_WIDTH_CLASS} overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-900`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-hidden
            onChange={(e) => void handleFileChange(e)}
          />
          <div className="flex flex-col">
            <button
              type="button"
              disabled={uploading}
              onClick={handlePick}
              className={`inline-flex ${MAIN_WIDTH_CLASS} items-center justify-center gap-1 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              {uploading ? 'Uploading…' : hasLogo ? 'Replace logo' : 'Upload logo'}
            </button>
            {hasLogo ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleRemove()}
                className={`inline-flex ${MAIN_WIDTH_CLASS} items-center justify-center gap-1 border-t border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-red-950/30`}
              >
                Remove logo
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
