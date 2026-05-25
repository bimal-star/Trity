'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const TAG_CLASS =
  'inline-flex max-w-[5.5rem] shrink-0 items-center truncate rounded-full border border-gray-200 bg-gray-50 px-1.5 py-px text-[10px] font-medium leading-none text-gray-700 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-300';

const SURPLUS_CLASS =
  'inline-flex shrink-0 cursor-default items-center rounded-full border border-gray-200/80 bg-gray-100/80 px-1.5 py-px text-[10px] font-medium leading-none text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400';

const POPOVER_TAG_CLASS =
  'inline-flex max-w-full items-center truncate rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-300';

const HOVER_DELAY_MS = 200;

function CategoryTag({ label }: { label: string }) {
  return (
    <span className={TAG_CLASS} title={label}>
      {label}
    </span>
  );
}

function stopRowActivation(e: React.MouseEvent) {
  e.stopPropagation();
}

export default function ProductListCategoriesCell({
  categories,
}: {
  categories: string[] | null | undefined;
}) {
  const items = (categories ?? []).map((c) => c.trim()).filter(Boolean);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const closePopover = useCallback(() => {
    clearHoverTimer();
    setPopoverOpen(false);
  }, [clearHoverTimer]);

  const scheduleOpen = useCallback(() => {
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => setPopoverOpen(true), HOVER_DELAY_MS);
  }, [clearHoverTimer]);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  if (items.length === 0) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }

  const visibleCount = items.length > 2 ? 2 : items.length;
  const visible = items.slice(0, visibleCount);
  const remaining = items.slice(visibleCount);
  const surplus = remaining.length;

  return (
    <div
      className="flex h-5 max-h-5 min-w-0 items-center gap-0.5 overflow-hidden"
      onClick={stopRowActivation}
      onMouseDown={stopRowActivation}
    >
      {visible.map((label, i) => (
        <CategoryTag key={`${label}-${i}`} label={label} />
      ))}
      {surplus > 0 ? (
        <div className="relative shrink-0" onMouseEnter={scheduleOpen} onMouseLeave={closePopover}>
          <span className={SURPLUS_CLASS} aria-label={`${surplus} more categories`}>
            +{surplus}
          </span>
          {popoverOpen ? (
            <div
              role="tooltip"
              className="absolute left-0 top-[calc(100%-2px)] z-30 min-w-[8rem] max-w-[14rem] pt-0.5"
            >
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {remaining.map((label, i) => (
                  <li key={`${label}-${i}`}>
                    <span className={POPOVER_TAG_CLASS} title={label}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
