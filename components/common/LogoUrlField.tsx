'use client';

import { useRef, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { ImagePlus, Loader2, X } from 'lucide-react';

export interface LogoUrlFieldProps {
  logoUrl: string | null | undefined;
  onLogoUrlChange: (url: string | null) => void;
  uploadFile: (tenantId: string, file: File) => Promise<string>;
  label?: string;
  disabled?: boolean;
  /**
   * Which tenant id to use as the storage path prefix.
   * - `undefined`: use `effectiveTenantId` from TenantContext (default).
   * - `null`: uploads disabled (show hint only).
   * - string: use that id (e.g. super-admin editing another workspace).
   */
  storageTenantId?: string | null;
  labelClassName?: string;
  /** Shown under the field when uploads are disabled (`storageTenantId === null`). */
  uploadDisabledHint?: string;
  /** Shown when upload is available (default: customer-style tenant folder copy). */
  uploadReadyHint?: string;
}

export default function LogoUrlField({
  logoUrl,
  onLogoUrlChange,
  uploadFile,
  label = 'Logo',
  disabled,
  storageTenantId: storageTenantIdProp,
  labelClassName,
  uploadDisabledHint,
  uploadReadyHint,
}: LogoUrlFieldProps) {
  const { effectiveTenantId } = useTenant();
  const resolvedUploadTenantId =
    storageTenantIdProp === undefined ? effectiveTenantId : storageTenantIdProp;
  const uploadBlocked = resolvedUploadTenantId === null || resolvedUploadTenantId === '';

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = Boolean(disabled || uploading);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (uploadBlocked) {
      return;
    }
    if (!resolvedUploadTenantId) {
      setLocalError('Tenant not ready. Try again in a moment.');
      return;
    }
    setLocalError(null);
    setUploading(true);
    try {
      const url = await uploadFile(resolvedUploadTenantId, file);
      onLogoUrlChange(url);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const defaultLabelClass = 'mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="space-y-2">
      <label className={labelClassName ?? defaultLabelClass}>{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
          {logoUrl?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl.trim()}
              alt={`Current ${label.toLowerCase()}`}
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <ImagePlus className="h-7 w-7 text-gray-400 dark:text-gray-500" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Upload logo image"
            className="sr-only"
            onChange={onPickFile}
            disabled={busy || uploadBlocked}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || uploadBlocked}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            )}
            {uploading ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
          </button>
          {logoUrl?.trim() ? (
            <button
              type="button"
              onClick={() => onLogoUrlChange(null)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {localError ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {localError}
        </p>
      ) : uploadBlocked ? (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {storageTenantIdProp === null
            ? (uploadDisabledHint ?? 'Save the tenant first, then open Edit to upload a logo.')
            : 'Workspace not ready. Try again in a moment.'}
        </p>
      ) : (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {uploadReadyHint ??
            'JPEG, PNG, WebP, or GIF. Stored in your tenant folder in Supabase Storage.'}
        </p>
      )}
    </div>
  );
}
