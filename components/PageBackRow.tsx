import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export interface PageBackRowProps {
  href?: string;
  label?: string;
}

/**
 * Optional row above the title/hero. Renders nothing when href/label are missing.
 * Subtle text link only — no border or heavy button styling.
 */
export default function PageBackRow({ href, label }: PageBackRowProps) {
  if (!href || !label) {
    return null;
  }

  return (
    <div className="mb-2 flex h-7 items-center">
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ChevronLeft className="h-3 w-3 shrink-0" aria-hidden />
        {label}
      </Link>
    </div>
  );
}
