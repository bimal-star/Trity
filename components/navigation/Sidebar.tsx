'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NavigationItem } from '@/types/navigation';
import { X, AlertCircle, ChevronDown, ChevronUp, BarChart3, Plug, Zap, LogOut, Users, Settings, List, HelpCircle, Building, Navigation, Calendar, Package, User, Truck, Warehouse, MapPin, TrendingUp, FileText, Boxes, PieChart, FileBarChart, BookOpen, BarChart2, GitBranch, Layers, ShoppingCart, PackageCheck, RotateCcw, ClipboardList, PackagePlus, FileSpreadsheet, ArrowLeftRight, ClipboardCheck, PackageX } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Sidebar navigation item component - extracted for cleaner JSX
 */
function NavItemContent({ 
  item, 
  isActive, 
  isCollapsed, 
  hasChildren, 
  isExpanded, 
  onToggleExpand 
}: { 
  item: NavigationItem; 
  isActive: boolean; 
  isCollapsed: boolean; 
  hasChildren: boolean; 
  isExpanded: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
}) {
  return (
    <>
      {/* Subtle left accent border - always visible when active */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

      {/* Icon - Fixed size and alignment */}
      <span className={`relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center transition-colors duration-200 ${isActive ? 'text-blue-400' : 'text-gray-500'}`}>
        {/* Icon will be rendered at size 16 by parent */}
      </span>

      {/* Label and chevron - only show when expanded */}
      {!isCollapsed && (
        <>
          <span className={`relative z-10 flex-1 truncate transition-all duration-200 ${isActive ? 'text-white font-medium' : 'font-normal text-gray-300'}`}>
            {item.label}
          </span>
          
          {/* Expand/collapse chevron for parents */}
          {hasChildren && (
            <span 
              className={`relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center transition-all duration-200 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-400'}`}
              onClick={onToggleExpand}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </>
      )}
    </>
  );
}

/**
 * Sidebar component that displays navigation items fetched from Supabase
 * Features:
 * - Responsive design with collapse/expand functionality
 * - Nested navigation support (decimal positions)
 * - Loading and error states
 * - Light and dark mode support
 * - Compact Three Pillar theme with proper icon alignment
 */
export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();
  const { user, navigationItems, navigationError, signOut } = useTenant();
  const error = navigationError;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await signOut();
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
      alert('Error signing out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Hide sidebar on login page
  if (pathname === '/login') {
    return null;
  }

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const width = isCollapsed ? '70px' : '246px';
    document.documentElement.style.setProperty('--sidebar-width', width);
    return () => {
      document.documentElement.style.removeProperty('--sidebar-width');
    };
  }, [isCollapsed]);

  // Toggle parent item expansion - only one parent and one sub-parent can be expanded at a time
  const toggleExpanded = (itemId: string, level: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(itemId)) {
        // Collapse the item
        newSet.delete(itemId);
      } else {
        // Accordion mode for top-level items (level 0)
        if (level === 0) {
          // Close all parents and their children
          const allItems = navigationItems || [];
          allItems.forEach(item => {
            newSet.delete(item.id);
            if (item.children) {
              item.children.forEach(child => newSet.delete(child.id));
            }
          });
        } 
        // Accordion mode for sub-parent items (level 1)
        else if (level === 1) {
          // Find the parent of this sub-parent
          const allItems = navigationItems || [];
          for (const parent of allItems) {
            if (parent.children) {
              const isChildOfThisParent = parent.children.some(child => child.id === itemId);
              if (isChildOfThisParent) {
                // Close all siblings (other children of the same parent)
                parent.children.forEach(sibling => {
                  if (sibling.id !== itemId) {
                    newSet.delete(sibling.id);
                    // Also close grandchildren if any
                    if (sibling.children) {
                      sibling.children.forEach(grandchild => newSet.delete(grandchild.id));
                    }
                  }
                });
                break;
              }
            }
          }
        }
        newSet.add(itemId);
      }
      
      return newSet;
    });
  };

  // Get icon and pillar for navigation item
  const getIconAndPillar = (label: string) => {
    const iconMap: { [key: string]: { icon: any; pillar: 'analytics' | 'businessCore' | 'execution' | 'other' } } = {
      // Three Pillar Categories
      'Analytics': { icon: BarChart3, pillar: 'analytics' },
      'Business Core': { icon: Plug, pillar: 'businessCore' },
      'Execution': { icon: Zap, pillar: 'execution' },
      
      // Business Core Pillar (Green)
      'Calendar': { icon: Calendar, pillar: 'businessCore' },
      'Product': { icon: Package, pillar: 'businessCore' },
      'Bills of Materials': { icon: Layers, pillar: 'businessCore' },
      'Supplier': { icon: Truck, pillar: 'businessCore' },
      'Warehouse': { icon: Warehouse, pillar: 'businessCore' },
      'Stock Adjustments': { icon: ClipboardList, pillar: 'businessCore' },
      'Stock Count': { icon: ClipboardCheck, pillar: 'businessCore' },
      'Stock Transfer': { icon: ArrowLeftRight, pillar: 'businessCore' },
      'Purchase Management': { icon: ShoppingCart, pillar: 'businessCore' },
      'Purchase Orders': { icon: FileSpreadsheet, pillar: 'businessCore' },
      'Goods Receipt': { icon: PackageCheck, pillar: 'businessCore' },
      'Purchase Invoices': { icon: FileText, pillar: 'businessCore' },
      'Goods Return': { icon: PackageX, pillar: 'businessCore' },
      'Purchase Returns': { icon: PackageX, pillar: 'businessCore' },
      'Customer': { icon: Users, pillar: 'businessCore' },
      'Customers': { icon: Users, pillar: 'businessCore' },
      'Products': { icon: Package, pillar: 'businessCore' },
      'Delivery Locations': { icon: MapPin, pillar: 'businessCore' },
      'Order Management': { icon: PackagePlus, pillar: 'businessCore' },
      'Sales Orders': { icon: FileSpreadsheet, pillar: 'businessCore' },
      'Order Fulfillment': { icon: PackageCheck, pillar: 'businessCore' },
      'Sales Invoice': { icon: FileText, pillar: 'businessCore' },
      'Sales Invoices': { icon: FileText, pillar: 'businessCore' },
      'Sales Returns': { icon: RotateCcw, pillar: 'businessCore' },
      'Customer Weeks': { icon: Calendar, pillar: 'businessCore' },
      
      // Analytics Pillar (Blue)
      'Forecast': { icon: TrendingUp, pillar: 'analytics' },
      'Forecast Model': { icon: BarChart2, pillar: 'analytics' },
      'Customer Forecast': { icon: TrendingUp, pillar: 'analytics' },
      'Cost File': { icon: FileText, pillar: 'analytics' },
      'Cost of Goods': { icon: FileBarChart, pillar: 'analytics' },
      'Logistics Costs': { icon: Truck, pillar: 'analytics' },
      'Inventory': { icon: Boxes, pillar: 'analytics' },
      'Material Variance': { icon: BarChart2, pillar: 'analytics' },
      'Working Capital': { icon: PieChart, pillar: 'analytics' },
      'P&L': { icon: FileBarChart, pillar: 'analytics' },
      'Reports': { icon: BookOpen, pillar: 'analytics' },
      
      // Execution Pillar (Orange)
      'Planning Board': { icon: GitBranch, pillar: 'execution' },
      'Scheduler': { icon: Calendar, pillar: 'execution' },
      'Material Requirement Plan (MRP)': { icon: Layers, pillar: 'execution' },
      'MRP': { icon: Layers, pillar: 'execution' },
      'Product Movement': { icon: Zap, pillar: 'execution' },
      
      // Non-Pillar (Other - Gray)
      'User Profile': { icon: User, pillar: 'other' },
      'Profile': { icon: User, pillar: 'other' },
      'Administration': { icon: Settings, pillar: 'other' },
      'Navigation Manager': { icon: Navigation, pillar: 'other' },
      'Users': { icon: Users, pillar: 'other' },
      'User Groups': { icon: Users, pillar: 'other' },
      'Tenants Hub': { icon: Building, pillar: 'other' },
      'Tenant Management': { icon: Settings, pillar: 'other' },
      'Tenants List': { icon: List, pillar: 'other' },
      'Account': { icon: Users, pillar: 'other' },
      'Help': { icon: HelpCircle, pillar: 'other' },
    };
    return iconMap[label] || { icon: BarChart3, pillar: 'other' };
  };

  // Render a single navigation item with reduced indentation
  const renderNavItem = (item: NavigationItem, level: number = 0, isPillarRoot: boolean = false, parentPillar?: string) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const hasPath = item.path && item.path.trim() !== '';
    const isActive = hasPath && pathname === item.path;
    const isClickable = hasPath;

    // Reduced indentation
    const indentClass = level === 0 ? 'pl-2' : level === 1 ? 'pl-4' : 'pl-6';
    
    // Get icon and pillar
    const { icon: IconComponent, pillar } = getIconAndPillar(item.label);
    const effectivePillar = parentPillar || pillar;
    
    // Color map based on pillar
    const colorMap = {
      'analytics': { icon: 'text-blue-400', accent: 'bg-blue-500', hover: 'hover:text-blue-300', bg: 'hover:bg-blue-200/95' },
      'businessCore': { icon: 'text-green-400', accent: 'bg-green-500', hover: 'hover:text-green-300', bg: 'hover:bg-green-200/95' },
      'execution': { icon: 'text-orange-400', accent: 'bg-orange-500', hover: 'hover:text-orange-300', bg: 'hover:bg-orange-200/95' },
      'other': { icon: 'text-gray-500', accent: 'bg-gray-500', hover: 'hover:text-gray-300', bg: 'bg-gray-800/50' },
    };
    
    const colors = colorMap[effectivePillar] || colorMap['other'];
    
    // Special styling for pillar roots
    const baseClasses = isPillarRoot ? `
      relative flex items-center gap-2 px-1.5 py-1.5 mx-1 mb-0 rounded-lg
      cursor-pointer transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-blue-500
      ${isCollapsed ? 'justify-center px-1.5' : ''}
    ` : `
      relative flex items-center gap-2 px-2 py-1 mx-1 rounded-lg
      transition-all duration-200 ease-out group
      overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500
      ${isActive ? 'bg-gray-800/50 text-white' : 'text-gray-400 hover:bg-gray-700/70 hover:text-white hover:shadow-lg'}
      ${isCollapsed ? 'justify-center px-1.5' : ''}
      ${indentClass}
    `;

    const itemContent = (
      <>
        {/* Left accent border - hidden for pillars */}
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${colors.accent} transition-all duration-200 ${isPillarRoot ? 'opacity-0' : isActive ? 'opacity-100' : 'opacity-0'}`} />

        {/* Icon with pillar color */}
        <span className={`relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center transition-colors duration-200 ${colors.icon}`}>
          <IconComponent size={isPillarRoot ? 18 : 16} />
        </span>

        {/* Label and chevron */}
        {!isCollapsed && (
          <>
            <span className={`relative z-10 flex-1 truncate transition-all duration-200 ${isPillarRoot ? 'text-sm font-normal ' + colors.icon : isActive ? 'text-xs font-medium text-gray-300' : 'text-xs font-normal text-gray-400'}`} title={item.label}>
              {item.label}
            </span>
            
            {hasChildren && !isPillarRoot && (
              <span 
                className={`relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center transition-all duration-200 ${isActive ? colors.icon : 'text-gray-500 group-hover:text-gray-400'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpanded(item.id, level);
                }}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            )}
          </>
        )}
      </>
    );

    return (
      <li key={item.id}>
        {isClickable ? (
          <Link
            href={item.path!}
            className={baseClasses}
            title={item.label}
            onClick={() => {
              if (hasChildren) {
                const newSet = new Set(expandedItems);
                newSet.add(item.id);
                if (level === 0) {
                  const allItems = navigationItems || [];
                  allItems.forEach(i => {
                    if (i.id !== item.id) newSet.delete(i.id);
                  });
                }
                setExpandedItems(newSet);
              } else if (level === 0) {
                setExpandedItems(new Set());
              }
            }}
          >
            {itemContent}
          </Link>
        ) : (
          <div
            className={`${baseClasses} ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
            title={item.label}
            onClick={() => hasChildren && !isCollapsed && toggleExpanded(item.id, level)}
          >
            {itemContent}
          </div>
        )}

        {/* Render children - always show for pillar roots, otherwise only when expanded */}
        {hasChildren && (isPillarRoot || isExpanded) && !isCollapsed && (
          <ul className="mt-0 space-y-0.5">
            {item.children!.map(child => renderNavItem(child, level + 1, false, isPillarRoot ? pillar : parentPillar))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-gray-900
        border-r border-gray-800
        shadow-2xl
        transition-all duration-500 ease-out z-40
        select-none pointer-events-auto
        flex flex-col
        ${isCollapsed ? 'w-[70px]' : 'w-[246px]'}
      `}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Header with toggle button */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-gray-800">
        {!isCollapsed ? (
          <Link 
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            onClick={() => setExpandedItems(new Set())}
          >
            {/* Trity Logo */}
            <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0 pt-1">
              <style jsx>{`
                @keyframes shine {
                  0%, 100% { opacity: 0.6; filter: brightness(1); }
                  50% { opacity: 1; filter: brightness(1.5) drop-shadow(0 0 4px currentColor); }
                }
                .dot-1 { animation: shine 3s ease-in-out infinite; animation-delay: 0s; }
                .dot-2 { animation: shine 3s ease-in-out infinite; animation-delay: 1s; }
                .dot-3 { animation: shine 3s ease-in-out infinite; animation-delay: 2s; }
              `}</style>
              <svg viewBox="0 0 24 24" className="w-8 h-8">
                <circle cx="12" cy="6" r="2.5" className="fill-blue-400 dot-1" />
                <circle cx="7" cy="16" r="2.5" className="fill-green-400 dot-2" />
                <circle cx="17" cy="16" r="2.5" className="fill-orange-400 dot-3" />
                <line x1="12" y1="6" x2="7" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
                <line x1="12" y1="6" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
                <line x1="7" y1="16" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-white truncate leading-none flex items-center">
              Trity
            </h1>
          </Link>
        ) : (
          <Link 
            href="/"
            className="w-10 h-10 flex items-center justify-center mx-auto hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
            title="Trity Home"
            onClick={() => setExpandedItems(new Set())}
          >
            <style jsx>{`
              @keyframes shine {
                0%, 100% { opacity: 0.6; filter: brightness(1); }
                50% { opacity: 1; filter: brightness(1.5) drop-shadow(0 0 4px currentColor); }
              }
              .dot-1 { animation: shine 3s ease-in-out infinite; animation-delay: 0s; }
              .dot-2 { animation: shine 3s ease-in-out infinite; animation-delay: 1s; }
              .dot-3 { animation: shine 3s ease-in-out infinite; animation-delay: 2s; }
            `}</style>
            <svg viewBox="0 0 24 24" className="w-8 h-8">
              <circle cx="12" cy="6" r="2.5" className="fill-blue-400 dot-1" />
              <circle cx="7" cy="16" r="2.5" className="fill-green-400 dot-2" />
              <circle cx="17" cy="16" r="2.5" className="fill-orange-400 dot-3" />
              <line x1="12" y1="6" x2="7" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
              <line x1="12" y1="6" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
              <line x1="7" y1="16" x2="17" y2="16" className="stroke-blue-400/60" strokeWidth="1.5" />
            </svg>
          </Link>
        )}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all duration-200 flex-shrink-0"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation content */}
      <nav className="flex-1 overflow-y-auto py-3">
        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            {!isCollapsed && (
              <p className="mt-2 text-xs text-red-400 text-center">
                {error.message}
              </p>
            )}
          </div>
        )}

        {/* Navigation items - separate pillars from other items */}
        {navigationItems && navigationItems.length > 0 && (
          <>
            {/* Three Pillars - Always visible with content */}
            <div className="space-y-0.5 mb-0.5">
              {navigationItems
                .filter(item => ['Analytics', 'Business Core', 'Execution'].includes(item.label))
                .map((item) => {
                  return (
                    <div key={item.id}>
                      {renderNavItem(item, 0, true)}
                    </div>
                  );
                })}
            </div>

            {/* Other navigation items */}
            {navigationItems.filter(item => !['Analytics', 'Business Core', 'Execution'].includes(item.label)).length > 0 && (
              <>
                <div className="border-t border-gray-800 my-0.5 mx-3" />
                <ul className="space-y-0.5">
                  {navigationItems
                    .filter(item => !['Analytics', 'Business Core', 'Execution'].includes(item.label))
                    .map((item) => renderNavItem(item))}
                </ul>
              </>
            )}
          </>
        )}

        {/* Empty state */}
        {navigationItems && navigationItems.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            {!isCollapsed && (
              <p className="text-xs text-gray-500 text-center">
                No navigation items found
              </p>
            )}
          </div>
        )}
      </nav>

      {/* Logout button */}
      {user && (
        <div className="border-t border-gray-800 p-3">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`
              w-full flex items-center gap-2 px-2 py-1 rounded-lg
              transition-all duration-200 ease-out
              text-gray-400 hover:bg-gray-700/70 hover:text-white hover:shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isCollapsed ? 'justify-center px-1.5' : ''}
            `}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-xs font-medium truncate">
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
