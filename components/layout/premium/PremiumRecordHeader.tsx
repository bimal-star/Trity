'use client';

import type { LucideIcon } from 'lucide-react';
import type { PremiumModule } from '@/lib/premiumUi';
import { pillarAccent, recordDetail } from '@/lib/premiumUi';

export interface PremiumRecordHeaderProps {
  module?: PremiumModule | null;
  title: string;
  subtitle?: React.ReactNode;
  /** Muted metadata row (stock, dates, counts). */
  meta?: React.ReactNode;
  imageUrl?: string | null;
  imageFallback?: LucideIcon;
  imageAlt?: string;
  /** e.g. stockRecordBorderClass(bucket) */
  accentClassName?: string;
  imageFooter?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function PremiumRecordHeader({
  module = 'businessCore',
  title,
  subtitle,
  meta,
  imageUrl,
  imageFallback: ImageFallback,
  imageAlt = '',
  accentClassName = '',
  imageFooter,
  actions,
  footer,
  className = '',
}: PremiumRecordHeaderProps) {
  const accent = pillarAccent(module);

  return (
    <div className={`${recordDetail.headerShell} ${accentClassName} ${className}`.trim()}>
      <div className="flex flex-wrap items-start gap-3">
        {(imageUrl != null || ImageFallback) && (
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="h-14 w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-950">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : ImageFallback ? (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageFallback className="h-7 w-7 text-gray-400" aria-hidden />
                </div>
              ) : null}
            </div>
            {imageFooter}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className={`truncate ${recordDetail.title}`}>{title}</h1>
              {subtitle != null && subtitle !== '' ? (
                <p className={`mt-0.5 ${recordDetail.meta} ${accent.subtitleTint}`}>{subtitle}</p>
              ) : null}
              {meta ? <div className={`mt-1 ${recordDetail.meta}`}>{meta}</div> : null}
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                {actions}
              </div>
            ) : null}
          </div>
          {footer}
        </div>
      </div>
    </div>
  );
}
