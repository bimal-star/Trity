/**
 * PageContainer Component
 *
 * Standard page wrapper for all pages in the application.
 * Provides consistent layout, spacing, and styling across the app.
 * Supports module-based color theming for Business Core, Execution, and Analytics.
 *
 * @example
 * // Basic usage with title
 * <PageContainer title="My Page">
 *   <p>Page content goes here</p>
 * </PageContainer>
 *
 * @example
 * // With module theming
 * <PageContainer
 *   title="Dashboard"
 *   module="analytics"
 * >
 *   <p>Page content</p>
 * </PageContainer>
 *
 * @example
 * // With custom header content
 * <PageContainer
 *   title="Dashboard"
 *   headerContent={<button>Action</button>}
 *   module="businessCore"
 * >
 *   <p>Page content</p>
 * </PageContainer>
 */

import PageBackRow from '@/components/PageBackRow';
import { stickyBelowTopNavClass } from '@/lib/appChrome';

type ModuleType = 'businessCore' | 'analytics' | 'execution' | null;

export interface PageContainerBackLink {
  href: string;
  label: string;
}

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  headerContent?: React.ReactNode;
  module?: ModuleType;
  /** Optional subtle link above the title/hero; omitted when not set. */
  backLink?: PageContainerBackLink;
  /** When set, replaces the default outer wrapper classes (e.g. full-viewport flex layouts). */
  rootClassName?: string;
  /** When set, replaces the default inner max-width wrapper classes. */
  innerClassName?: string;
}

// Module color configuration
const moduleThemes = {
  businessCore: {
    gradient: 'from-green-600/15 to-green-700/10',
    border: 'border-green-600/30',
    titleGradient: 'from-green-700 to-green-600',
    accent: 'bg-green-600',
  },
  analytics: {
    gradient: 'from-blue-600/15 to-blue-700/10',
    border: 'border-blue-600/30',
    titleGradient: 'from-blue-700 to-blue-600',
    accent: 'bg-blue-600',
  },
  execution: {
    gradient: 'from-purple-600/15 to-purple-700/10',
    border: 'border-purple-600/30',
    titleGradient: 'from-purple-700 to-purple-600',
    accent: 'bg-purple-600',
  },
};

export default function PageContainer({
  children,
  title,
  headerContent,
  module = null,
  backLink,
  rootClassName,
  innerClassName,
}: PageContainerProps) {
  const theme = module ? moduleThemes[module] : null;

  const backRow = backLink ? <PageBackRow href={backLink.href} label={backLink.label} /> : null;

  const outerClass =
    rootClassName ??
    'flex min-h-0 flex-1 flex-col bg-gray-50 dark:bg-gray-900 pt-4 pb-2 px-3 sm:px-6';
  const innerClass = innerClassName ?? 'mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col';

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        {title || headerContent ? (
          <div
            className={`sticky shrink-0 ${stickyBelowTopNavClass} z-30 mb-6 flex flex-col bg-gray-50 dark:bg-gray-900 py-2 -mx-1 px-1 ${
              theme
                ? `mt-2 rounded-lg border-l-4 bg-gradient-to-r p-4 ${theme.gradient} ${theme.border}`
                : ''
            }`}
          >
            {backRow}
            <div className="flex items-center justify-between gap-3">
              {title && (
                <div className="flex items-center gap-3">
                  {theme && <div className={`h-8 w-1 rounded-full ${theme.accent}`} />}
                  <h1
                    className={`text-2xl font-bold ${
                      theme
                        ? `bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {title}
                  </h1>
                </div>
              )}
              {headerContent}
            </div>
          </div>
        ) : (
          backRow
        )}
        {children}
      </div>
    </div>
  );
}
