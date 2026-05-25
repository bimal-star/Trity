'use client';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { NavigationItem } from '@/types/navigation';
import type { PremiumModule } from '@/lib/premiumUi';

type MenuTreeComponent = React.ComponentType<{
  items: NavigationItem[];
  depth?: number;
  onClose: () => void;
  accentModule: PremiumModule | null;
  variant?: 'darkPanel' | 'lightFlyout';
}>;

export interface Row2SectionFlyoutProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  sectionLabel: string;
  sectionPath: string | null;
  sectionPathOk: boolean;
  items: NavigationItem[];
  onClose: () => void;
  accentModule: PremiumModule;
  MenuTree: MenuTreeComponent;
}

export function Row2SectionFlyout({
  open,
  anchorEl,
  sectionLabel,
  sectionPath,
  sectionPathOk,
  items,
  onClose,
  accentModule,
  MenuTree,
}: Row2SectionFlyoutProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorEl) {
      setCoords(null);
      return;
    }
    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: rect.left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorEl]);

  if (!open || !coords || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-row2-section-flyout
      role="menu"
      className="fixed z-[80] max-h-[min(70vh,420px)] min-w-[220px] max-w-[min(92vw,320px)] overflow-y-auto rounded-b-lg rounded-tr-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      style={{ top: coords.top, left: coords.left }}
    >
      {sectionPathOk && sectionPath ? (
        <Link
          href={sectionPath}
          role="menuitem"
          onClick={onClose}
          className="block border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-800"
        >
          {sectionLabel}
        </Link>
      ) : null}
      <MenuTree items={items} onClose={onClose} accentModule={accentModule} variant="lightFlyout" />
    </div>,
    document.body
  );
}
