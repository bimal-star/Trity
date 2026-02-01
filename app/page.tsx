'use client';

import { useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/lib/supabaseClient';
import { comparePositions, getDescendants } from '@/lib/navigation-hierarchy';
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart2,
  BarChart3,
  BookOpen,
  Boxes,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Circle,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  PieChart,
  Plug,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, tenant_id, isLoading: tenantLoading } = useTenant();
  const { products, isLoading: productsLoading } = useProducts(undefined, 'created_at', 'desc');
  const [stats, setStats] = useState({
    totalProducts: 0,
  });
  const [navigationItems, setNavigationItems] = useState<{
    id: string;
    label: string;
    position: string;
    is_enabled: boolean;
    is_deleted?: boolean | null;
  }[]>([]);
  const [navigationLoading, setNavigationLoading] = useState(false);

  // Calculate stats when data loads
  useEffect(() => {
    if (!productsLoading) {
      setStats({
        totalProducts: products.length,
      });
    }
  }, [products, productsLoading]);

  useEffect(() => {
    let isMounted = true;
    const fetchNavigation = async () => {
      if (!tenant_id) {
        if (isMounted) {
          setNavigationItems([]);
          setNavigationLoading(false);
        }
        return;
      }

      setNavigationLoading(true);
      const { data, error } = await supabase
        .from('navigation')
        .select('id,label,position,is_enabled,is_deleted')
        .eq('tenant_id', tenant_id)
        .order('position', { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error('Navigation fetch error:', error.message);
        setNavigationItems([]);
        setNavigationLoading(false);
        return;
      }

      const normalized = (data || []).map(item => ({
        ...item,
        position: String(item.position || '1'),
      }));

      setNavigationItems(normalized);
      setNavigationLoading(false);
    };

    fetchNavigation();
    return () => {
      isMounted = false;
    };
  }, [tenant_id]);

  const labelIconMap = useMemo(() => ({
    // Pillar roots
    Analytics: BarChart3,
    Integration: Plug,
    Execution: Zap,
    // Integration
    Calendar,
    Product: Package,
    Products: Package,
    'Bills of Materials': Layers,
    Supplier: Truck,
    Warehouse,
    'Stock Adjustments': ClipboardList,
    'Stock Count': ClipboardCheck,
    'Stock Transfer': ArrowLeftRight,
    'Purchase Management': ShoppingCart,
    'Purchase Orders': FileSpreadsheet,
    'Goods Receipt': PackageCheck,
    'Purchase Invoices': FileText,
    'Goods Return': PackageX,
    'Purchase Returns': PackageX,
    Customer: Users,
    Customers: Users,
    'Delivery Locations': MapPin,
    'Order Management': PackagePlus,
    'Sales Orders': FileSpreadsheet,
    'Order Fulfillment': PackageCheck,
    'Sales Invoice': FileText,
    'Sales Invoices': FileText,
    'Sales Returns': RotateCcw,
    'Customer Weeks': Calendar,
    // Analytics
    Forecast: TrendingUp,
    'Forecast Model': BarChart2,
    'Customer Forecast': TrendingUp,
    'Cost File': FileText,
    'Cost of Goods': FileBarChart,
    'Logistics Costs': Truck,
    Inventory: Boxes,
    'Material Variance': BarChart2,
    'Working Capital': PieChart,
    'P&L': FileBarChart,
    Reports: BookOpen,
    // Execution
    'Planning Board': GitBranch,
    Scheduler: Calendar,
    'Material Requirement Plan (MRP)': Layers,
    MRP: Layers,
    'Product Movement': Zap,
  }), []);

  const getPillarItems = (pillarLabel: string) => {
    const root = navigationItems.find(item => item.label === pillarLabel);
    if (!root) return [];
    const descendants = getDescendants(root.position, navigationItems)
      .filter(item => item.is_enabled && !item.is_deleted)
      .sort((a, b) => comparePositions(a.position, b.position));
    return descendants;
  };

  const integrationItems = getPillarItems('Business Core');
  const analyticsItems = getPillarItems('Analytics');
  const executionItems = getPillarItems('Execution');

  const renderInlineItems = (
    items: typeof integrationItems,
    textClassName: string,
    loadingClassName: string
  ) => {
    if (navigationLoading) {
      return <p className={loadingClassName}>Loading navigation…</p>;
    }

    if (items.length === 0) {
      return <p className={loadingClassName}>No items configured.</p>;
    }

    return (
      <p className={`text-sm ${textClassName} flex flex-wrap items-center justify-center gap-y-0 text-center leading-tight`}>
        {items.map((item, index) => {
          const level = String(item.position).split('.').length - 1;
          const isTopLevel = level === 1;
          return (
            <span
              key={item.id}
              className={`inline-flex items-center ${isTopLevel ? 'font-semibold text-base' : 'font-normal text-sm'}`}
            >
              {item.label}
              {index < items.length - 1 && <span className="mx-2">ǀ</span>}
            </span>
          );
        })}
      </p>
    );
  };

  // Note: Authentication and redirect logic is handled by ProtectedRoute component
  // No need for redundant redirect logic here

  return (
    <ProtectedRoute>
      <PageContainer module="analytics">
        {/* Two-Tier Header */}
        <div className="mb-6 -mt-1">
          {/* Primary Row - Title with Icon */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              Dashboard
            </h1>
          </div>
          {/* Secondary Row - Supporting Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Here's an overview of your workspace
          </p>
        </div>

        {/* Subtle Divider */}
        <div className="h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent mb-4" />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <Link
            href="/products"
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                  Total Products
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {productsLoading ? '...' : stats.totalProducts}
                </p>
              </div>
              <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
                <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-green-600 dark:text-green-400">
              <span>View all products</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            href="/calendar"
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                  Calendar
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  2026
                </p>
              </div>
              <div className="p-2 bg-purple-200 dark:bg-purple-800/50 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-purple-600 dark:text-purple-400">
              <span>View operations calendar</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
            Quick Actions
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Link
              href="/products"
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/10 rounded-lg">
                  <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                    Products
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Manage your product catalog
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/calendar"
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                    Calendar
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    View operations calendar
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Core Modules Info - Three Pillars */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              System Overview
            </h2>
            <Link
              href="/navigation-manager"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage navigation
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            
            {/* Business Core Pillar */}
            <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 shadow-sm min-h-[320px]">
              <div className="flex flex-col items-center justify-center gap-2 mb-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-green-600/20 rounded-lg">
                  <Plug className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">
                  Business Core
                </h3>
              </div>
              <p className="text-xs text-green-800 dark:text-green-300 mb-6 text-center -mt-2">
                Core business entities and data management
              </p>
              {renderInlineItems(
                integrationItems,
                'text-green-700 dark:text-green-300',
                'text-xs text-green-700 dark:text-green-300'
              )}
            </div>

            {/* Analytics Pillar */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm min-h-[320px]">
              <div className="flex flex-col items-center justify-center gap-2 mb-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  Analytics
                </h3>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-300 mb-6 text-center -mt-2">
                Reporting and insights
              </p>
              {renderInlineItems(
                analyticsItems,
                'text-blue-700 dark:text-blue-300',
                'text-xs text-blue-700 dark:text-blue-300'
              )}
            </div>

            {/* Execution Pillar */}
            <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm min-h-[320px]">
              <div className="flex flex-col items-center justify-center gap-2 mb-4 text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-orange-600/20 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-200">
                  Execution
                </h3>
              </div>
              <p className="text-xs text-orange-800 dark:text-orange-300 mb-6 text-center -mt-2">
                Planning and execution
              </p>
              {renderInlineItems(
                executionItems,
                'text-orange-700 dark:text-orange-300',
                'text-xs text-orange-700 dark:text-orange-300'
              )}
            </div>
          </div>
        </div>

        {/* Account Info */}
        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              Account Information
            </h2>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="text-gray-900 dark:text-white font-medium">{user.email}</span>
              </div>
              {tenant_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Tenant ID:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{tenant_id}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
