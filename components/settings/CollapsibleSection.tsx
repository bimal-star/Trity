'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Shown on the right of the header when collapsed */
  summary?: string;
  className?: string;
  contentClassName?: string;
}

const headerButtonClass =
  'flex w-full items-center justify-between gap-2 rounded-md py-1.5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50';

const titleClass =
  'text-sm font-bold uppercase tracking-[0.1em] text-purple-900 dark:text-purple-100';

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  summary,
  className = '',
  contentClassName = '',
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`border-b border-gray-200/90 last:border-b-0 dark:border-gray-700/90 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={headerButtonClass}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-purple-700 transition-transform dark:text-purple-300 ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
          <span className={titleClass}>{title}</span>
        </span>
        {!open && summary ? (
          <span className="max-w-[45%] truncate font-mono text-xs font-medium text-gray-600 dark:text-gray-400">
            {summary}
          </span>
        ) : null}
      </button>
      {open ? <div className={`pb-3 pt-1 ${contentClassName}`.trim()}>{children}</div> : null}
    </div>
  );
}
