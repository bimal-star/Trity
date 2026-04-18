'use client';

import { useEffect, useMemo, useState } from 'react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/lib/supabaseClient';
import { getFlatDefaultNavigationForDashboard } from '@/lib/navigationSeed';
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
  UserCircle2,
  Zap,
} from 'lucide-react';
import { pillarAccent, premiumSurfaces, premiumTypography } from '@/lib/premiumUi';
import Link from 'next/link';

const analyticsAccent = pillarAccent('analytics');
const bc = pillarAccent('businessCore');
const ex = pillarAccent('execution');

export default function HomePage() {
  const { user, effectiveTenantId: tenant_id, isLoading: _tenantLoading } = useTenant();
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

      const normalized = (data || []).map((item) => ({
        id: item.id,
        label: item.label ?? '',
        position: String(item.position ?? '1'),
        is_enabled: Boolean(item.is_enabled),
        is_deleted: item.is_deleted ?? null,
      }));

      setNavigationItems(
        normalized.length > 0 ? normalized : getFlatDefaultNavigationForDashboard()
      );
      setNavigationLoading(false);
    };

    fetchNavigation();
    return () => {
      isMounted = false;
    };
  }, [tenant_id]);

  const labelIconMap = useMemo(() => ({
    Analytics: BarChart3,
    Integration: Plug,
    Execution: Zap,
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
    'Planning Board': GitBranch,
    Scheduler: Calendar,
    'Material Requirement Plan (MRP)': Layers,
    MRP: Layers,
    'Product Movement': Zap,
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
    Founder: UserCircle2,
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
  const executionItems = getPillarItems('Execution');
  const analyticsItems = getPillarItems('Analytics');

  const renderPillarItems = (
    items: typeof integrationItems,
    titleColor: string,
    iconColor: string
  ) => {
    if (navigationLoading) {
      return <p className={premiumTypography.helper}>Loading navigation…</p>;
    }
    if (items.length === 0) {
      return <p className={premiumTypography.helper}>No items configured.</p>;
    }
    return (
      <ul className="mt-1 space-y-1.5">
        {items.map((item) => {
          const level = String(item.position).split('.').length - 1;
          const isTopLevel = level === 1;
          const IconComp = (labelIconMap as Record<string, React.ElementType>)[item.label] ?? Circle;
          return (
            <li key={item.id} className={`flex items-center gap-2 ${isTopLevel ? '' : 'pl-5'}`}>
              <IconComp
                className={`w-3.5 h-3.5 shrink-0 ${isTopLevel ? iconColor : 'text-gray-400 dark:text-gray-500'}`}
              />
              <span
                className={`text-xs leading-tight ${
                  isTopLevel
                    ? `${titleColor} font-semibold`
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <ProtectedRoute>
      <PageContainer module="analytics">
        <PremiumStickyHeader
          module="analytics"
          icon={BarChart3}
          title="Dashboard"
          subtitle={`Welcome back${user?.email ? `, ${user.email.split('@')[0]}` : ''}! Here's an overview of your workspace`}
          subtitleClassName={`${premiumTypography.pageSubtitle} ${analyticsAccent.subtitleTint}`}
        />

        <div className={`mb-4 ${premiumSurfaces.divider}`} />

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link
            href="/products"
            className={`${premiumSurfaces.card} block cursor-pointer hover:shadow-md transition-all`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${premiumTypography.helper} mb-1`}>Total Products</p>
                <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  {productsLoading ? '…' : stats.totalProducts}
                </p>
              </div>
              <div className={bc.iconTile}>
                <Package className={`h-5 w-5 ${bc.iconColor}`} />
              </div>
            </div>
            <div className={`mt-3 flex items-center gap-1 text-xs ${bc.titleText}`}>
              <span>View all products</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/calendar"
            className={`${premiumSurfaces.card} block cursor-pointer hover:shadow-md transition-all`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`${premiumTypography.helper} mb-1`}>Calendar</p>
                <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  2026
                </p>
              </div>
              <div className={bc.iconTile}>
                <Calendar className={`h-5 w-5 ${bc.iconColor}`} />
              </div>
            </div>
            <div className={`mt-3 flex items-center gap-1 text-xs ${bc.titleText}`}>
              <span>View operations calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>

        {/* System Overview — Three Pillars */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className={premiumTypography.sectionTitle}>System Overview</h2>
            <Link
              href="/navigation-manager"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage navigation
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">

            {/* Business Core */}
            <div className={premiumSurfaces.card}>
              <div className="mb-3 flex items-center gap-3">
                <div className={bc.iconTile}>
                  <Plug className={`h-5 w-5 ${bc.iconColor}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${bc.titleText}`}>Business Core</h3>
                  <p className={premiumTypography.helper}>Core entities and data</p>
                </div>
              </div>
              {renderPillarItems(integrationItems, bc.titleText, bc.iconColor)}
            </div>

            {/* Execution */}
            <div className={premiumSurfaces.card}>
              <div className="mb-3 flex items-center gap-3">
                <div className={ex.iconTile}>
                  <Zap className={`h-5 w-5 ${ex.iconColor}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${ex.titleText}`}>Execution</h3>
                  <p className={premiumTypography.helper}>Planning and operations</p>
                </div>
              </div>
              {renderPillarItems(executionItems, ex.titleText, ex.iconColor)}
            </div>

            {/* Analytics */}
            <div className={premiumSurfaces.card}>
              <div className="mb-3 flex items-center gap-3">
                <div className={analyticsAccent.iconTile}>
                  <BarChart3 className={`h-5 w-5 ${analyticsAccent.iconColor}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${analyticsAccent.titleText}`}>Analytics</h3>
                  <p className={premiumTypography.helper}>Reporting and insights</p>
                </div>
              </div>
              {renderPillarItems(analyticsItems, analyticsAccent.titleText, analyticsAccent.iconColor)}
            </div>
          </div>
        </div>

        {/* Account info — compact inset */}
        {user && (
          <div className={premiumSurfaces.insetInfo}>
            <div className="flex items-center justify-between">
              <span className={premiumTypography.helper}>Signed in as</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{user.email}</span>
            </div>
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
