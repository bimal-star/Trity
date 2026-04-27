import type { NavigationItem } from '@/types/navigation';

/**
 * Default navigation structure for Trity
 * Updated: January 31, 2026
 *
 * Organized by five pillars (product narrative order: Business Core, Execution, Analytics, then Admin/Account).
 * Position prefixes today: 1 = Analytics, 2 = Business Core, 3 = Execution — reorder in DB/Navigation Manager when migrating.
 * - Business Core (Green) - Core business entities and data management
 * - Execution (Orange) - Planning and execution
 * - Analytics (Blue) - Reporting and insights
 * - Administration (Gray) - System configuration and management
 * - Account (Gray) - User and system settings
 *
 * Position format: dot-notation strings ("1", "1.1", "1.1.1") for unlimited hierarchy depth
 */
export const defaultNavigationItems: NavigationItem[] = [
  // === ANALYTICS PILLAR (Blue) ===
  {
    id: 'nav-analytics-root',
    label: 'Analytics',
    position: '1',
    is_enabled: true,
    path: null,
    children: [],
  },
  {
    id: 'nav-forecast',
    label: 'Forecast',
    position: '1.1',
    is_enabled: true,
    path: '/analytics/forecast',
  },
  {
    id: 'nav-cost-file',
    label: 'Cost File',
    position: '1.2',
    is_enabled: true,
    path: '/analytics/cost-file',
  },
  {
    id: 'nav-inventory',
    label: 'Inventory',
    position: '1.3',
    is_enabled: true,
    path: '/analytics/inventory',
  },

  // === BUSINESS CORE PILLAR (Green) ===
  {
    id: 'nav-businesscore-root',
    label: 'Business Core',
    position: '2',
    is_enabled: true,
    path: null,
    children: [],
  },
  {
    id: 'nav-products',
    label: 'Products',
    position: '2.1',
    is_enabled: true,
    path: '/products',
  },
  {
    id: 'nav-products-new',
    label: 'New product',
    position: '2.1.1',
    is_enabled: true,
    path: '/products/new',
  },
  {
    id: 'nav-products-price-lists',
    label: 'Customer pricing',
    position: '2.1.2',
    is_enabled: true,
    path: '/products/price-lists',
  },
  {
    id: 'nav-customers',
    label: 'Customers',
    position: '2.2',
    is_enabled: true,
    path: '/customers',
  },
  {
    id: 'nav-customers-new',
    label: 'New customer',
    position: '2.2.1',
    is_enabled: true,
    path: '/customers/new',
  },
  {
    id: 'nav-suppliers',
    label: 'Supplier',
    position: '2.3',
    is_enabled: true,
    path: '/suppliers',
  },
  {
    id: 'nav-suppliers-new',
    label: 'New supplier',
    position: '2.3.1',
    is_enabled: true,
    path: '/suppliers/new',
  },
  {
    id: 'nav-suppliers-pricing',
    label: 'Supplier pricing',
    position: '2.3.2',
    is_enabled: true,
    path: '/suppliers/pricing',
  },
  {
    id: 'nav-warehouse',
    label: 'Warehouse',
    position: '2.4',
    is_enabled: true,
    path: '/warehouse',
  },
  {
    id: 'nav-warehouse-new',
    label: 'New warehouse',
    position: '2.4.1',
    is_enabled: true,
    path: '/warehouse/new',
  },
  {
    id: 'nav-stock-management',
    label: 'Stock Adjustments',
    position: '2.5',
    is_enabled: true,
    path: '/stock-adjustments',
  },
  {
    id: 'nav-purchase-mgmt',
    label: 'Purchase Management',
    position: '2.6',
    is_enabled: true,
    path: null,
    children: [],
  },
  {
    id: 'nav-purchase-orders',
    label: 'Purchase Orders',
    position: '2.6.1',
    is_enabled: true,
    path: '/purchase-orders',
  },
  {
    id: 'nav-goods-receipt',
    label: 'Goods Receipt',
    position: '2.6.2',
    is_enabled: true,
    path: '/goods-receipt',
  },
  {
    id: 'nav-purchase-invoices',
    label: 'Purchase Invoices',
    position: '2.6.3',
    is_enabled: true,
    path: '/purchase-invoices',
  },
  {
    id: 'nav-purchase-reports',
    label: 'Purchase reports',
    position: '2.6.4',
    is_enabled: true,
    path: '/purchase-reports',
  },
  {
    id: 'nav-purchase-returns',
    label: 'Purchase Returns',
    position: '2.6.5',
    is_enabled: true,
    path: '/purchase-returns',
  },
  {
    id: 'nav-order-mgmt',
    label: 'Order Management',
    position: '2.7',
    is_enabled: true,
    path: null,
    children: [],
  },
  {
    id: 'nav-sales-orders',
    label: 'Sales Orders',
    position: '2.7.1',
    is_enabled: true,
    path: '/sales-orders',
  },
  {
    id: 'nav-order-fulfillment',
    label: 'Order Fulfillment',
    position: '2.7.2',
    is_enabled: true,
    path: '/order-fulfillment',
  },

  // === EXECUTION PILLAR (Orange) ===
  {
    id: 'nav-execution-root',
    label: 'Execution',
    position: '3',
    is_enabled: true,
    path: null,
    children: [],
  },
  {
    id: 'nav-calendar',
    label: 'Calendar',
    position: '3.1',
    is_enabled: true,
    path: '/calendar',
  },
  {
    id: 'nav-okrs',
    label: 'OKRs',
    position: '3.2',
    is_enabled: true,
    path: '/okrs',
  },
  {
    id: 'nav-scheduler',
    label: 'Scheduler',
    position: '3.4',
    is_enabled: true,
    path: '/scheduler',
  },

  // === ACCOUNT & ADMINISTRATION (Gray) ===
  {
    id: 'nav-admin-root',
    label: 'Administration',
    position: '4',
    is_enabled: true,
    path: null,
    children: [],
  },
  {
    id: 'nav-users',
    label: 'Users',
    position: '4.1',
    is_enabled: true,
    path: '/users',
  },
  {
    id: 'nav-tenant-settings',
    label: 'Tenant Settings',
    position: '4.3',
    is_enabled: true,
    path: '/tenant-settings',
  },
  {
    id: 'nav-tenants',
    label: 'Tenants Hub',
    position: '4.4',
    is_enabled: true,
    path: '/admin/tenants',
  },
  {
    id: 'nav-subscription-packages',
    label: 'Subscription packages',
    position: '4.45',
    is_enabled: true,
    path: '/admin/subscription-packages',
  },
  {
    id: 'nav-navigation-manager',
    label: 'Navigation Manager',
    position: '4.5',
    is_enabled: true,
    path: '/navigation-manager',
  },
  {
    id: 'nav-import-export',
    label: 'Import/Export',
    position: '4.6',
    is_enabled: true,
    path: '/import-export',
  },
  {
    id: 'nav-user-access',
    label: 'Access Levels',
    position: '4.7',
    is_enabled: true,
    path: '/users/access',
  },

  // === ACCOUNT ===
  {
    id: 'nav-account-root',
    label: 'Account',
    position: '5',
    is_enabled: true,
    path: null,
    children: [],
  },
  {
    id: 'nav-profile',
    label: 'Profile',
    position: '5.1',
    is_enabled: true,
    path: '/profile',
  },
  {
    id: 'nav-founder',
    label: 'Founder',
    position: '5.2',
    is_enabled: true,
    path: '/about/founder',
  },
];
