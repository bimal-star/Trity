/**
 * PageContainer Component
 * 
 * Standard page wrapper for all pages in the application.
 * Provides consistent layout, spacing, and styling across the app.
 * Supports module-based color theming for Business Core, Analytics, and Execution.
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

type ModuleType = 'businessCore' | 'analytics' | 'execution' | null;

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  headerContent?: React.ReactNode;
  module?: ModuleType;
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

export default function PageContainer({ children, title, headerContent, module = null }: PageContainerProps) {
  const theme = module ? moduleThemes[module] : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-4 pb-2 px-6">
      <div className="w-full max-w-[1600px] mx-auto">
        {(title || headerContent) && (
          <div
            className={`sticky top-0 z-50 mb-6 flex items-center justify-between bg-gray-50 dark:bg-gray-900 py-2 -mx-1 px-1 ${
              theme ? `p-4 mt-2 rounded-lg bg-gradient-to-r ${theme.gradient} border-l-4 ${theme.border}` : ''
            }`}
          >
            {title && (
              <div className="flex items-center gap-3">
                {theme && (
                  <div className={`w-1 h-8 rounded-full ${theme.accent}`} />
                )}
                <h1 className={`text-2xl font-bold ${
                  theme 
                    ? `bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {title}
                </h1>
              </div>
            )}
            {headerContent}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
