'use client';

import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import type { PremiumModule } from '@/lib/premiumUi';
import { pillarAccent, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';

export interface PremiumStickyHeaderProps {
  module?: PremiumModule | null;
  backHref?: string;
  backLabel?: string;
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  /** Override default muted subtitle color (e.g. pillar-tinted tagline on list pages). */
  subtitleClassName?: string;
  /** When set, replaces the default icon + title + subtitle block (back link and `right` unchanged). */
  titleSlot?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  /** When false, header scrolls with the page (avoids overlap on long forms). Default true. */
  sticky?: boolean;
}

export default function PremiumStickyHeader({
  module = null,
  backHref,
  backLabel,
  icon: Icon,
  title,
  subtitle,
  subtitleClassName,
  titleSlot,
  right,
  className = '',
  sticky = true,
}: PremiumStickyHeaderProps) {
  const a = pillarAccent(module);
  const shell = sticky ? premiumSurfaces.stickyHeaderShell : premiumSurfaces.staticHeaderShell;

  const mainBlock =
    titleSlot != null ? (
      <div className="min-w-0 flex-1">{titleSlot}</div>
    ) : Icon && title != null ? (
      <div className="flex min-w-0 items-center gap-3">
        <div className={a.iconTile}>
          <Icon className={`h-5 w-5 ${a.iconColor}`} aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className={`truncate ${premiumTypography.pageTitle} ${a.titleText}`}>{title}</h1>
          {subtitle ? (
            <p className={`mt-0.5 ${subtitleClassName ?? premiumTypography.pageSubtitle}`}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <div className={`${shell} ${className}`.trim()}>
      <div className="flex min-w-0 w-full flex-nowrap items-center justify-between gap-3 overflow-x-auto">
        <div className="min-w-0 flex-1">
          {backHref && backLabel && (
            <Link
              href={backHref}
              className={`mb-2 inline-flex items-center gap-1 ${premiumTypography.backLink}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {backLabel}
            </Link>
          )}
          {mainBlock}
        </div>
        {right ? (
          <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto">
            {right}
          </div>
        ) : null}
      </div>
    </div>
  );
}
