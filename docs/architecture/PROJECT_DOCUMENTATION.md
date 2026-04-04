# Trity - Complete Project Documentation

**Version:** 1.1  
**Last Updated:** January 31, 2026  
**Project Type:** Enterprise SaaS Platform with RBAC  
**Technology Stack:** Next.js 14, TypeScript, Supabase, Tailwind CSS

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Core Features & Modules](#core-features--modules)
4. [Database Schema](#database-schema)
5. [Technical Requirements](#technical-requirements)
6. [Security Implementation](#security-implementation)
7. [API Documentation](#api-documentation)
8. [Development Guidelines](#development-guidelines)
9. [Deployment & Operations](#deployment--operations)
10. [Testing Strategy](#testing-strategy)

---

## Project Overview

### Mission Statement
Trity is a modern enterprise SaaS platform designed to provide comprehensive product management, analytics, calendar operations, and dynamic navigation capabilities through a unified, enterprise-grade interface.

### Key Differentiators
- **Dynamic Navigation System**: Database-driven navigation with real-time updates
- **Hierarchical Organization**: Unlimited depth navigation with visual tree structure
- **Enterprise-Grade UI**: Professional, minimalist design with full dark mode
- **Type-Safe Development**: Complete TypeScript coverage with auto-generated database types
- **Real-Time Synchronization**: Instant updates across all connected clients

### Target Users
- Enterprise teams managing complex product catalogs
- Operations teams requiring calendar-based planning
- Analytics-driven organizations
- Teams requiring flexible, customizable navigation structures

---

## System Architecture

### Technology Stack

#### Frontend
```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript 5.3+",
  "ui_library": "React 18.2",
  "styling": "Tailwind CSS 3.4",
  "icons": "Lucide React 0.303",
  "state_management": "React Hooks (useState, useEffect)",
  "routing": "Next.js App Router"
}
```

#### Backend & Database
```json
{
  "database": "Supabase (PostgreSQL)",
  "orm": "@supabase/supabase-js 2.39",
  "authentication": "Supabase Auth (ready for implementation)",
  "real_time": "Supabase Realtime + Browser Events",
  "storage": "Supabase Storage (available)",
  "edge_functions": "Supabase Edge Functions (available)"
}
```

#### Development Tools
```json
{
  "package_manager": "npm",
  "linting": "ESLint 8.56",
  "type_generation": "Custom scripts (generate-types.js)",
  "schema_documentation": "Custom scripts (document-schema.js)",
  "dev_server": "Next.js Dev Server",
  "build_tool": "Next.js Build"
}
```

### Application Structure

```
trity/
├── app/                          # Next.js 14 App Router pages
│   ├── layout.tsx               # Root layout with sidebar & providers
│   ├── page.tsx                 # Dashboard/home page
│   │
│   ├── analytics/               # 📊 Analytics Pillar (Blue)
│   │   └── page.tsx             # Analytics dashboard
│   │
│   ├── products/                # 📦 Business Core Pillar (Green)
│   ├── customers/               # 👥 Customer management
│   ├── suppliers/               # 🚚 Supplier management  
│   ├── warehouse/               # 📦 Warehouse operations
│   ├── stock-adjustments/       # 📊 Stock management
│   ├── purchase-orders/         # 💳 Purchase management
│   ├── sales-orders/            # 📋 Sales operations
│   ├── order-fulfillment/       # ✓ Order fulfillment
│   │   └── page.tsx
│   │
│   ├── calendar/                # 📅 Execution Pillar (Orange)
│   │   └── page.tsx             # Calendar operations
│   ├── workstreams/             # ⚡ Workstream management
│   │   └── page.tsx
│   ├── okrs/                    # 🎯 OKR tracking
│   │   └── page.tsx
│   ├── scheduler/               # ⏰ Scheduling
│   │   └── page.tsx
│   │
│   ├── admin/                   # ⚙️ Administration (Gray)
│   │   └── tenants/             # Multi-tenant management
│   ├── users/                   # 👤 User management
│   │   └── page.tsx
│   ├── groups/                  # 👥 User groups
│   │   └── page.tsx
│   ├── tenant-settings/         # ⚙️ Tenant configuration
│   │   └── page.tsx
│   ├── navigation-manager/      # 🗂️ Navigation structure
│   │   └── page.tsx
│   ├── import-export/           # 📤 Data import/export
│   │   └── page.tsx
│   │
│   ├── profile/                 # 👤 Account
│   │   └── page.tsx             # User profile
│   ├── login/                   # 🔐 Login page
│   │   └── page.tsx
│   ├── reset-password/          # 🔓 Password reset
│   │   └── page.tsx
│   │
│   ├── diagnostics/             # 🔧 Developer tools
│   │   └── page.tsx             # System diagnostics
│   └── test-supabase/           # 🧪 Supabase connection test
│       └── page.tsx
│
├── components/                   # Reusable React components
│   ├── PageContainer.tsx        # 📍 Standard page wrapper with module colors
│   ├── LayoutSkeleton.tsx       # Loading skeleton
│   ├── LayoutWrapper.tsx        # Auth wrapper & layout gate
│   ├── ProtectedRoute.tsx       # Route protection component
│   ├── ProtectedAction.tsx      # Permission-aware action component
│   ├── navigation/
│   │   └── Sidebar.tsx          # 📍 Dynamic sidebar (3-pillar system)
│   ├── products/                # Product-specific components
│   │   ├── ProductCreateModal.tsx
│   │   ├── ProductDetailsTabs.tsx
│   │   ├── PackingConfigurationsEditor.tsx
│   │   └── ... (other product components)
│   └── ... (other component groups)
│
├── hooks/                        # Custom React hooks
│   ├── usePermissions.ts        # RBAC permission checking
│   ├── useFeatureFlags.ts       # Feature flag management
│   ├── useTenantDetails.ts      # Tenant information
│   ├── useTenantUsers.ts        # Tenant user management
│   ├── useTenantInvites.ts      # User invitations
│   ├── useUserGroups.ts         # User group operations
│   ├── useUsers.ts              # User management
│   ├── useProducts.ts           # Product CRUD operations
│   ├── useCalendar.ts           # Calendar data management
│   ├── useWorkstreams.ts        # Workstream operations
│   ├── useOKRs.ts               # OKR tracking
│   ├── useCustomers.ts          # Customer operations
│   ├── useProfile.ts            # User profile management
│   └── useImportExport.ts       # Import/export operations
│
├── contexts/                     # React context providers
│   └── TenantContext.tsx        # 📍 Multi-tenant context
│
├── lib/                          # Shared utilities & services
│   ├── supabaseClient.ts        # 📍 Typed Supabase client singleton
│   ├── permissions.ts           # RBAC utilities & checks
│   ├── auditLog.ts              # Audit logging system
│   ├── featureFlags.ts          # Feature flag management
│   ├── navigation-hierarchy.ts  # Position-based hierarchy algorithm
│   ├── navigation-default.ts    # Default navigation structure
│   ├── ownerUtils.ts            # Owner assignment utilities
│   ├── gantt-utils.ts           # Gantt chart utilities
│   ├── importExportUtils.ts     # Import/export helpers
│   ├── validation.ts            # Data validation utilities
│   ├── sanitization.ts          # Input sanitization
│   ├── security.ts              # Security utilities (CSRF, etc.)
│   ├── statusConfig.ts          # Status configuration objects
│   ├── debugLog.ts              # Debug logging utilities
│   └── ... (other utilities)
│
├── providers/                    # Context providers
│   └── AppProviders.tsx         # Application-level providers
│
├── types/                        # TypeScript type definitions
│   ├── database.ts              # 📍 Auto-generated from Supabase
│   ├── navigation.ts            # Navigation interfaces
│   ├── access.ts                # RBAC type definitions
│   ├── product.ts               # Product interfaces
│   ├── calendar.ts              # Calendar interfaces
│   ├── customer.ts              # Customer interfaces
│   ├── workstream.ts            # Workstream interfaces
│   ├── okr.ts                   # OKR interfaces
│   ├── profile.ts               # User profile interfaces
│   └── Supabase Snippet Public Schema Column Catalog.csv  # 📍 SCHEMA SOURCE OF TRUTH
│
├── sql/                          # SQL migrations
│   └── ... (migration files)
│
├── scripts/                      # Build & utility scripts
│   ├── generate-types.js        # 📍 DB type generation
│   ├── document-schema.js       # Schema documentation
│   └── discover-tables.js       # Table discovery utility
│
├── docs/                         # Project documentation
│   ├── AI_PROMPT.md             # AI assistant guidelines
│   ├── SUPABASE_OPTIMIZATION_SUMMARY.md
│   ├── TYPE_GENERATION.md       # Type generation guide
│   └── adr/                     # Architecture decision records
│
└── Configuration Files
    ├── .env.credentials         # Environment variables
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── next.config.js
    ├── postcss.config.js
    └── ... (other configs)
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  (Next.js Pages + React Components + Tailwind CSS)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Custom React Hooks                        │
│  (useNavigation, useProducts, useCalendar)                  │
│  - State Management                                          │
│  - Data Fetching                                             │
│  - CRUD Operations                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               Supabase Client (Typed)                        │
│  (@supabase/supabase-js)                                    │
│  - Query Builder                                             │
│  - Real-time Subscriptions                                  │
│  - Type Safety                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL                         │
│  - Tables (navigation, products, price_lists, etc.)         │
│  - Row Level Security (RLS)                                  │
│  - Triggers & Functions                                      │
│  - Real-time Change Notifications                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Features & Modules

### 1. Navigation Management System 🗂️

**Route:** `/navigation-manager`  
**Module Type:** Business Core  
**Status:** ✅ Production Ready

#### Features
- **Hierarchical Navigation Structure**
  - Unlimited depth nesting (position-based: "1", "1.1", "1.1.1")
  - Visual tree representation with L-shaped connectors
  - Level indicators (L0, L1, L2+) with color coding
  - Parent-child relationship tracking

- **Drag-and-Drop Interface**
  - Visual drop zones (Before, Child, After)
  - Real-time position recalculation
  - Automatic descendant updates
  - Hover-based drag handles

- **CRUD Operations**
  - Create new navigation labels with route paths
  - Inline editing (label name + path only)
  - Soft delete (recoverable)
  - Permanent delete (with confirmation)

- **User Experience**
  - Tree view with compact layout
  - Hover-only controls (clean interface)
  - Character counters (Label: 100, Path: 200)
  - Toast notifications (success/error)
  - Real-time sidebar synchronization

#### Technical Implementation
```typescript
// Position-based hierarchy
interface NavigationLabel {
  id: string;
  label: string;
  position: string;        // "1.2.3" format
  is_enabled: boolean;
  path: string | null;
  is_deleted: boolean;
  // Virtual fields
  parent_id: string | null;  // Calculated from position
  level: number;             // Calculated from position
  order: number;             // Calculated from position
}
```

#### Database Table
```sql
navigation:
- id: uuid (PK)
- label: string
- position: string (indexed)
- is_enabled: boolean
- path: string (nullable)
- is_deleted: boolean
- created_at: timestamp
- updated_at: timestamp
```

---

### 2. Product Management System 📦

**Route:** `/products`  
**Module Type:** Business Core  
**Status:** ✅ Production Ready

#### Features
- **Product Catalog**
  - Master product list with search
  - Product master card view
  - Detailed product tabs
  - Category management

- **Product CRUD**
  - Create new products
  - Edit product details
  - Update pricing information
  - Manage product categories

- **Search & Filter**
  - Real-time search
  - Category filtering
  - Status filtering
  - Sorting options

#### Technical Implementation
```typescript
interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  name: string;
  description?: string;
  sku?: string;
  category_id?: string;
}
```

#### Database Tables
```sql
products:
- id: uuid (PK)
- name: string
- description: text
- sku: string (unique)
- category_id: uuid (FK → categories)
- is_active: boolean
- created_at: timestamp
- updated_at: timestamp

categories:
- id: uuid (PK)
- name: string
- description: text
- parent_id: uuid (FK → categories)
- is_active: boolean

price_lists:
- id: uuid (PK)
- name: string
- description: text
- is_active: boolean
- valid_from: timestamp
- valid_to: timestamp

price_list_items:
- id: uuid (PK)
- price_list_id: uuid (FK → price_lists)
- product_id: uuid (FK → products)
- unit_price: numeric
- min_quantity: numeric
- max_quantity: numeric
```

---

### 3. Calendar/Operations Module 📅

**Route:** `/calendar`  
**Module Type:** Execution  
**Status:** ✅ Production Ready

#### Features
- **Year-Based Calendar View**
  - Full year calendar display
  - Day-by-day entry rows
  - Today highlighting
  - Auto-scroll to current date

- **Entry Management**
  - Inline editing of calendar entries
  - Quick update functionality
  - Bulk operations support
  - Search and filter capabilities

- **View Options**
  - Density controls (Compact/Comfortable/Spacious)
  - Column visibility toggles
  - Export functionality
  - Print-friendly layout

- **Advanced Features**
  - Jump to date navigation
  - Chat assistant integration
  - Holiday import from external sources
  - Analytics view

#### Technical Implementation
```typescript
interface CalendarEntry {
  id: number;
  date: string;           // YYYY-MM-DD format
  day_of_week: string;
  week_number: number;
  is_weekend: boolean;
  is_holiday: boolean;
  holiday_name?: string;
  notes?: string;
  status?: string;
  year: number;
  month: number;
  day: number;
}
```

#### User Interactions
- Inline cell editing with save/cancel
- Quick update modal for batch edits
- Keyboard navigation support
- Responsive table with horizontal scroll
- Sticky header and column

---

### 4. Analytics Dashboard 📊

**Route:** `/analytics`  
**Module Type:** Analytics  
**Status:** 🚧 Placeholder (Ready for Implementation)

#### Planned Features
- **Dashboard Overview**
  - Key performance indicators (KPIs)
  - Real-time metrics
  - Trend visualizations
  - Customizable widgets

- **Product Analytics**
  - Sales performance
  - Inventory levels
  - Category analysis
  - SKU performance

- **Calendar Analytics**
  - Operations metrics
  - Holiday impact analysis
  - Productivity trends
  - Resource utilization

- **Navigation Analytics**
  - Usage patterns
  - Popular routes
  - User journey tracking
  - Access frequency

#### Recommended Implementation
```typescript
interface AnalyticsDashboard {
  kpis: KeyPerformanceIndicator[];
  charts: ChartConfiguration[];
  dateRange: DateRange;
  filters: AnalyticsFilter[];
}

interface KeyPerformanceIndicator {
  id: string;
  label: string;
  value: number;
  change: number;        // % change
  trend: 'up' | 'down' | 'stable';
  period: string;
}
```

---

### 5. System Diagnostics 🔧

**Route:** `/diagnostics`  
**Module Type:** System  
**Status:** ✅ Development Tool

#### Features
- **Connection Testing**
  - Supabase connectivity check
  - Database query validation
  - Error diagnosis
  - RLS policy verification

- **Debug Information**
  - Response status codes
  - Error messages with hints
  - SQL fix suggestions
  - JSON response inspection

#### Use Cases
- Troubleshooting database connection issues
- Verifying RLS configuration
- Testing new table access
- Development debugging

---

### 6. Supabase Test Page 🧪

**Route:** `/test-supabase`  
**Module Type:** System  
**Status:** ✅ Development Tool

#### Features
- Comprehensive connection testing
- Detailed error reporting
- Common solution suggestions
- Environment variable verification

---

## Development Guide & Design System

### Overview

This section provides comprehensive guidelines for developing new features and maintaining consistency across the Trity application. All developers should follow these patterns when creating new pages, components, or modifying existing functionality.

---

### 🎨 Trity Color Theme & Navigation System

The application uses a **three-pillar navigation system** with color-coded sidebar sections providing visual organization and brand consistency:

#### Sidebar Navigation Structure (3 Pillars + Admin)

```
Analytics Pillar (Blue #2563eb)
├── Forecast
├── Cost File
└── Inventory

Business Core Pillar (Green #16a34a)
├── Products
├── Customers
├── Suppliers
├── Warehouse
├── Stock Adjustments
├── Purchase Management
└── Order Management

Execution Pillar (Orange/Amber #b45309)
├── Calendar
├── Workstreams
├── OKRs
└── Scheduler

Administration (Gray #6b7280)
├── Users
├── User Groups
├── Tenant Settings
├── Tenants Hub
├── Navigation Manager
└── Import/Export

Account (Gray #6b7280)
└── Profile
```

#### Sidebar Styling & Icons

**Dynamic Icon Mapping**: Each navigation item displays a context-specific icon based on its label:
- **Analytics items**: Blue icons (TrendingUp, BarChart, Boxes, etc.)
- **Integration items**: Green icons (Package, Users, Truck, Warehouse, etc.)
- **Execution items**: Orange icons (Calendar, GitBranch, Zap, etc.)
- **Admin items**: Gray icons (Users, Settings, Building, Navigation, etc.)

**Active State Styling**:
- Left accent border (4px) in pillar color
- Highlighted text in white
- Icon color matches pillar color

**Responsive Behavior**:
- Collapsed sidebar: 70px width (icons only)
- Expanded sidebar: 246px width (full labels)
- Toggle button in header
- Smooth transition animations

#### Module Colors for Pages

The application uses a three-module color system for page content styling:

```typescript
Integration: Green (#16a34a / green-600)   // Products, Customers, Suppliers, etc.
Analytics:   Blue (#2563eb / blue-600)     // Analytics, Reports, Dashboards
Execution:   Purple (#9333ea / purple-600) // Calendar, Workstreams, OKRs
```

#### Color Application Guidelines

**Page Headers**: Use gradient backgrounds with module color
- Integration: `bg-gradient-to-r from-green-600/15 to-green-700/10`
- Analytics: `bg-gradient-to-r from-blue-600/15 to-blue-700/10`
- Execution: `bg-gradient-to-r from-purple-600/15 to-purple-700/10`

**Border Accents**: Left border with module color
- Integration: `border-l-4 border-green-600`
- Analytics: `border-l-4 border-blue-600`
- Execution: `border-l-4 border-purple-600`

**Statistics Cards**: White cards with colored left borders
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-green-500">
  {/* Card content */}
</div>
```

**Modal Headers**: Full gradient backgrounds
```tsx
<div className="bg-gradient-to-r from-green-600 to-green-700">
  {/* Header content */}
</div>
```

---

### 📝 Typography Standards

**Font Family**: Inter (via `next/font/google`), applied globally in [app/layout.tsx](app/layout.tsx) using `inter.className`.

**Text Sizing**:
- **Base text**: `text-sm` for most body copy, inputs, and table cells
- **Micro text**: `text-xs` for helper text, captions, badges, and uppercase labels (e.g., statistics labels, form hints)
- **Page titles**: `text-3xl font-bold` for primary page headings in [components/PageContainer.tsx](components/PageContainer.tsx)
- **Section titles / modal titles**: `text-lg`–`text-xl font-bold` for card and modal headers
- **Numeric highlights**: `text-3xl font-bold` for key stat values in dashboard-style cards

**Best Practices**:
- Prefer `text-sm` for readable body text
- Reserve `text-xs` for supporting metadata
- Use `text-2xl`/`text-3xl` only for primary headings or key metrics

---

### 🔘 Button Styling Standards

The app uses a small/medium button scale with module-colored primaries and neutral secondary buttons.

#### Primary Buttons (Module-Colored, Small)
**Usage**: Toolbars, compact actions (e.g., calendar toolbar buttons)
```tsx
<button className="px-3 py-1.5 text-xs font-medium rounded-lg shadow-sm bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2">
  Action
</button>
```

#### Primary Buttons (Module-Colored, Medium)
**Usage**: Modal primary actions and key CTAs
```tsx
<button className="px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm bg-green-600 hover:bg-green-700 active:bg-green-800 text-white transition-colors flex items-center justify-center gap-2">
  Submit
</button>
```

#### Secondary Buttons (Neutral)
**Usage**: Cancel / non-destructive actions next to primaries
```tsx
<button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm">
  Cancel
</button>
```

#### Secondary Buttons (Neutral, Medium)
**Usage**: Modal cancel/close buttons
```tsx
<button className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-650 transition-colors flex items-center justify-center gap-2">
  Cancel
</button>
```

#### Icon Buttons (Small)
**Usage**: Compact icon-only controls inside tables and toolbars

**Neutral icon**:
```tsx
<button className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
  <Icon size={18} />
</button>
```

**Module-colored icon**:
```tsx
<button className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors">
  <Icon size={18} />
</button>
```

#### Button with Icon
```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium shadow-sm">
  <Plus size={14} />
  Add Item
</button>
```

---

### 📄 Page Structure Pattern

All pages should follow this standardized layout structure:

```tsx
<PageContainer 
  title="Page Title"
  module="businessCore" // or "analytics" or "execution"
  headerContent={<CustomHeaderContent />} // optional
>
  {/* Statistics Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {/* Stat cards with border-l-4 */}
  </div>

  {/* Toolbar */}
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 shadow-sm">
    {/* Search, filters, actions */}
  </div>

  {/* Main Content */}
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
    {/* Table or content */}
  </div>
</PageContainer>
```

#### Statistics Cards Pattern
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 border-green-500">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        Label
      </p>
      <p className="text-3xl font-bold text-green-600">{value}</p>
    </div>
    <div className="p-3 bg-green-500 rounded-lg">
      <Icon className="text-white" size={24} />
    </div>
  </div>
</div>
```

---

### 🎯 Form Input Patterns

#### Text Input
```tsx
<input
  type="text"
  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
  placeholder="Enter value"
/>
```

#### Select Dropdown
```tsx
<select
  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
>
  <option value="value">Label</option>
</select>
```

#### Textarea
```tsx
<textarea
  rows={4}
  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
  placeholder="Enter description"
/>
```

#### Checkbox Group (Horizontal)
```tsx
<div className="flex flex-wrap gap-x-4 gap-y-1">
  {items.map(item => (
    <label key={item.id} className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-0.5 rounded">
      <input
        type="checkbox"
        className="rounded text-green-600 focus:ring-green-500"
      />
      <span className="text-xs text-gray-700 dark:text-gray-300">{item.name}</span>
    </label>
  ))}
</div>
```

---

### 🎭 Modal Patterns

#### Full Modal Structure
```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 pl-20 animate-in fade-in duration-200">
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700">
    
    {/* Header */}
    <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 border-b border-green-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Modal Title</h2>
            <p className="text-xs text-green-100 mt-0.5">Subtitle</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="overflow-y-auto max-h-[calc(95vh-180px)]">
      <div className="p-6 space-y-5 bg-gray-50 dark:bg-gray-900/50">
        {/* Sections */}
      </div>
    </div>

    {/* Footer */}
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <span className="text-red-500">*</span> Required fields
      </p>
      <div className="flex gap-2">
        <button className="px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600 font-medium">
          Cancel
        </button>
        <button className="px-5 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-sm flex items-center gap-2">
          <Icon size={16} />
          Submit
        </button>
      </div>
    </div>
  </div>
</div>
```

#### Section Pattern in Modals
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
    <div className="w-1 h-4 bg-green-600 rounded-full"></div>
    Section Title
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {/* Form fields */}
  </div>
</div>
```

---

### 📋 Table Patterns

#### Table Header
```tsx
<thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
  <tr>
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
      Column Name
    </th>
  </tr>
</thead>
```

#### Table Body with Hover
```tsx
<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
  {items.map(item => (
    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
        {item.value}
      </td>
    </tr>
  ))}
</tbody>
```

---

### 🔧 Custom Hooks Pattern

#### Standard Hook Structure
All custom hooks should follow this pattern for consistency:

```typescript
export function useResourceName(filters?: Filters): UseResourceReturn {
  const [data, setData] = useState<Type[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let query = supabase.from('table').select('*');
      
      // Apply filters
      if (filters) {
        // ... filter logic
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      setData(data || []);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    // CRUD operations
  };
}
```

---

### 🎨 Component Naming & Organization

#### File Structure
```
app/
  [page-name]/
    page.tsx          # Main page component
components/
  [ComponentName].tsx # Reusable components
  navigation/
    Sidebar.tsx
hooks/
  use[ResourceName].ts # Data hooks
types/
  [resource].ts      # TypeScript interfaces
lib/
  supabaseClient.ts  # Shared utilities
```

#### Naming Conventions
- **Pages**: `[Name]Page` (default export)
- **Components**: `[Name]Component` (named export)
- **Hooks**: `use[Name]` (named export)
- **Types**: `[Name]Type` or `[Name]Interface`

---

### 🌗 Dark Mode Support

All components **must** support dark mode using Tailwind's `dark:` variant:

```tsx
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
```

#### Common Dark Mode Colors
- **Background**: `dark:bg-gray-900` (page), `dark:bg-gray-800` (cards)
- **Text**: `dark:text-white` (primary), `dark:text-gray-400` (secondary)
- **Borders**: `dark:border-gray-700`, `dark:border-gray-600`
- **Hover**: `dark:hover:bg-gray-700`

---

### ✅ Development Best Practices

1. **Always use module colors** - Reference the Trity theme for all colored elements
2. **Consistent spacing** - Use Tailwind spacing scale (px-3, py-2, gap-4, etc.)
3. **Responsive design** - Use `md:` and `lg:` breakpoints for layouts
4. **Accessibility** - Include hover states, focus rings, and semantic HTML
5. **Error handling** - Always handle Supabase errors gracefully
6. **TypeScript** - Use proper types for all Supabase queries and responses
7. **Loading states** - Show loading indicators during async operations
8. **Form validation** - Validate required fields before submission
9. **Confirmation dialogs** - Use confirm() for destructive actions
10. **Refresh data** - Call refresh functions after mutations

---

### 🚀 Quick Implementation Guide

#### Create New Resource Page
1. Add route in `app/[resource]/page.tsx`
2. Create hook in `hooks/use[Resource].ts`
3. Define types in `types/[resource].ts`
4. Use `PageContainer` with appropriate module color
5. Follow statistics cards → toolbar → content pattern

#### Add New Supabase Table
1. Define schema in Supabase dashboard or SQL editor
2. Run migration if needed
3. Create TypeScript interface in `types/`
4. Run `npm run generate:types` to update database types
5. Create custom hook for CRUD operations
6. Implement UI following patterns above

---

**Implementation Reference**: When in doubt, reference the Calendar, Products, or Navigation Manager pages for implementation examples. These pages demonstrate all patterns documented above.

---

## Database Schema

### Schema Documentation Source
**Authoritative Source:** `types/Supabase Snippet Public Schema Column Catalog.csv`

This CSV file contains the complete, authoritative schema definition exported directly from Supabase. It includes:
- Table names
- Column names and types
- Nullable constraints
- Default values
- Foreign key relationships
- Constraint definitions

### Key Database Tables

#### 1. Navigation System
```sql
navigation (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  label varchar NOT NULL,
  position varchar NOT NULL,
  is_enabled boolean DEFAULT true,
  path varchar NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX idx_navigation_position ON navigation(position);
CREATE INDEX idx_navigation_is_deleted ON navigation(is_deleted);
```

#### 2. Product System
```sql
products (
  id uuid PRIMARY KEY,
  name varchar NOT NULL,
  description text,
  sku varchar UNIQUE,
  category_id uuid REFERENCES categories(id),
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

categories (
  id uuid PRIMARY KEY,
  name varchar NOT NULL,
  description text,
  parent_id uuid REFERENCES categories(id),
  is_active boolean DEFAULT true
);

price_lists (
  id uuid PRIMARY KEY,
  name varchar NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  valid_from timestamp,
  valid_to timestamp
);

price_list_items (
  id uuid PRIMARY KEY,
  price_list_id uuid REFERENCES price_lists(id),
  product_id uuid REFERENCES products(id),
  unit_price numeric NOT NULL,
  min_quantity numeric DEFAULT 1,
  max_quantity numeric
);
```

#### 3. Calendar System
```sql
calendar_entries (
  id serial PRIMARY KEY,
  date date NOT NULL UNIQUE,
  day_of_week varchar,
  week_number integer,
  is_weekend boolean DEFAULT false,
  is_holiday boolean DEFAULT false,
  holiday_name varchar,
  notes text,
  status varchar,
  year integer,
  month integer,
  day integer
);

CREATE INDEX idx_calendar_date ON calendar_entries(date);
CREATE INDEX idx_calendar_year ON calendar_entries(year);
```

#### 4. Packing Configurations
```sql
packing_configurations (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES products(id),
  name varchar NOT NULL,
  description text,
  configuration jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  updated_by uuid,
  is_deleted boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  version integer DEFAULT 1,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### Database Relationships

```
categories
    ↓ (1:many)
products
    ↓ (1:many)
price_list_items
    ↑ (many:1)
price_lists

products
    ↓ (1:many)
packing_configurations

navigation (self-referential via position string)
```

---

## Technical Requirements

### Minimum System Requirements

#### Development Environment
- **Node.js:** 18.0.0 or higher
- **npm:** 8.0.0 or higher
- **Operating System:** Windows 10+, macOS 11+, Linux (Ubuntu 20.04+)
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 500MB for project dependencies

#### Production Environment
- **Node.js Runtime:** 18.x LTS or 20.x LTS
- **Memory:** 512MB minimum, 2GB recommended
- **CPU:** 1 vCPU minimum, 2+ recommended
- **Network:** HTTPS with valid SSL certificate
- **Database:** Supabase (managed PostgreSQL)

### Browser Compatibility

#### Supported Browsers
- **Chrome:** 90+ (Primary development target)
- **Firefox:** 88+
- **Safari:** 14+
- **Edge:** 90+

#### Required Browser Features
- ES6+ JavaScript support
- Drag and Drop API
- Fetch API
- LocalStorage
- CSS Grid & Flexbox
- WebSocket (for Supabase Realtime)

### Dependencies

#### Core Dependencies
```json
{
  "@supabase/supabase-js": "^2.39.1",
  "next": "14.0.4",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "lucide-react": "^0.303.0"
}
```

#### Development Dependencies
```json
{
  "typescript": "^5.3.3",
  "tailwindcss": "^3.4.0",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32",
  "eslint": "^8.56.0",
  "eslint-config-next": "14.0.4"
}
```

### Environment Variables

#### Required Configuration
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Development
NODE_ENV=development

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id

# Optional: Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REALTIME=true
```

---

## Security Implementation

### Security Level: **Enterprise-Grade** (Level 3/5)

### Current Security Posture

#### ✅ Implemented Security Measures

**1. Input Validation (Client-Side)**
```typescript
// Character limits enforced
- Navigation labels: 100 characters max
- Route paths: 200 characters max
- Product names: 255 characters max
- Descriptions: 5000 characters max

// Required field validation
- Navigation label name (required)
- Product name (required)
- Empty string prevention with .trim()

// Input sanitization
- Whitespace trimming on all text inputs
- Type enforcement via TypeScript
```

**2. XSS Prevention**
- React's built-in JSX escaping (automatic)
- No use of `dangerouslySetInnerHTML`
- All user input rendered through React components
- URL encoding for path parameters

**3. Error Handling**
```typescript
// Standardized error handling pattern
try {
  // Database operation
} catch (err) {
  console.error('Internal error:', err);
  setError('User-friendly message only');
  // No stack traces exposed to users
}
```

**4. UI/UX Security Features**
- Confirmation dialogs for destructive actions
- Soft delete (is_deleted flag) for recoverability
- Success/error toast notifications
- Loading states prevent double-submission

**5. Type Safety**
- Complete TypeScript coverage
- Auto-generated database types
- Compile-time type checking
- Interface validation

#### 🟡 Partially Implemented

**1. Authentication & Authorization**
- **Status:** Infrastructure ready, not implemented
- **Supabase Auth:** Available but not configured
- **Current State:** No user login/authentication
- **Access Control:** No role-based permissions

**2. Row Level Security (RLS)**
- **Status:** Disabled in development
- **Configuration:** Must be enabled per table
- **Policies:** Need to be defined for production
- **Current Impact:** All data accessible without restrictions

#### ❌ Not Implemented (High Priority)

**1. Server-Side Validation**
```typescript
// Recommended: Supabase Database Functions
CREATE OR REPLACE FUNCTION validate_navigation_label(label_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF LENGTH(label_text) = 0 OR LENGTH(label_text) > 100 THEN
    RAISE EXCEPTION 'Invalid label length';
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**2. Rate Limiting**
- No request throttling
- No abuse prevention
- No DDoS protection
- Recommendation: Implement via Supabase Edge Functions or API Gateway

**3. Audit Logging**
- No comprehensive audit trail
- No user action tracking
- No compliance logging
- Recommendation: Implement audit table with triggers

**4. Data Encryption**
- Database at rest: ✅ Supabase default encryption
- Data in transit: ✅ HTTPS/TLS
- Sensitive fields: ❌ No field-level encryption
- Recommendation: Encrypt PII if stored

**5. CSRF Protection**
- No CSRF tokens
- No same-site cookie policies
- Recommendation: Implement for forms with mutations

### Security Recommendations by Priority

#### Critical (Implement Immediately)

1. **Enable Row Level Security (RLS)**
```sql
-- Enable RLS on all tables
ALTER TABLE navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_entries ENABLE ROW LEVEL SECURITY;

-- Create policies (example)
CREATE POLICY "Users can view active navigation"
  ON navigation FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Authenticated users can manage navigation"
  ON navigation FOR ALL
  USING (auth.role() = 'authenticated');
```

2. **Implement Authentication**
```typescript
// Add Supabase Auth
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// Protected route wrapper
export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}
```

3. **Add Server-Side Validation**
- Database triggers for critical fields
- Supabase Edge Functions for complex validation
- Schema constraints (NOT NULL, CHECK, UNIQUE)

#### High Priority

4. **Implement Audit Logging**
```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  table_name varchar NOT NULL,
  record_id uuid NOT NULL,
  action varchar NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values jsonb,
  new_values jsonb,
  created_at timestamp DEFAULT now()
);

-- Trigger example
CREATE OR REPLACE FUNCTION audit_navigation_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, table_name, record_id, action, old_values, new_values)
  VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

5. **Add Rate Limiting**
```typescript
// Using Supabase Edge Function
import { serve } from 'https://deno.land/std/http/server.ts';
import { rateLimit } from './rate-limiter.ts';

serve(async (req) => {
  const ip = req.headers.get('x-forwarded-for');
  
  if (!await rateLimit(ip, 100, 60000)) { // 100 requests per minute
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  // Process request
});
```

6. **Implement CSRF Protection**
```typescript
// Add CSRF token to forms
import { generateCSRFToken, validateCSRFToken } from '@/lib/security';

export function SecureForm({ onSubmit }) {
  const csrfToken = generateCSRFToken();
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (validateCSRFToken(csrfToken)) {
        onSubmit();
      }
    }}>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      {/* Form fields */}
    </form>
  );
}
```

#### Medium Priority

7. **Content Security Policy (CSP)**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co"
            ].join('; ')
          }
        ]
      }
    ];
  }
};
```

8. **Implement Data Sanitization Library**
```bash
npm install dompurify isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}
```

### Security Compliance Checklist

#### OWASP Top 10 Coverage

| Threat | Status | Mitigation |
|--------|--------|------------|
| A01: Broken Access Control | 🟡 Partial | RLS ready, not enabled |
| A02: Cryptographic Failures | ✅ Good | HTTPS + DB encryption |
| A03: Injection | ✅ Good | Parameterized queries |
| A04: Insecure Design | ✅ Good | Secure patterns used |
| A05: Security Misconfiguration | 🟡 Partial | RLS needs configuration |
| A06: Vulnerable Components | ✅ Good | Dependencies up-to-date |
| A07: Authentication Failures | ❌ Critical | No auth implemented |
| A08: Software/Data Integrity | ✅ Good | Audit logging planned |
| A09: Logging/Monitoring | 🟡 Partial | Basic error logging |
| A10: SSRF | ✅ Good | No external requests |

#### GDPR Compliance Requirements

**For Production Deployment:**
1. ✅ User consent management
2. ❌ Right to erasure (delete user data)
3. ❌ Data portability (export user data)
4. ✅ Data encryption in transit and at rest
5. ❌ Data processing agreements
6. ❌ Privacy policy and terms of service
7. ❌ Data retention policies
8. ❌ Breach notification procedures

---

## API Documentation

### Supabase Client API

#### Navigation Operations

```typescript
// Fetch all navigation items
const { data, error } = await supabase
  .from('navigation')
  .select('*')
  .eq('is_deleted', false)
  .order('position', { ascending: true });

// Create navigation item
const { data, error } = await supabase
  .from('navigation')
  .insert([{
    label: 'Products',
    position: '1',
    path: '/products',
    is_enabled: true,
    is_deleted: false
  }]);

// Update navigation item
const { data, error } = await supabase
  .from('navigation')
  .update({
    label: 'Updated Label',
    path: '/new-path'
  })
  .eq('id', itemId);

// Soft delete
const { data, error } = await supabase
  .from('navigation')
  .update({ is_deleted: true })
  .eq('id', itemId);

// Permanent delete
const { data, error } = await supabase
  .from('navigation')
  .delete()
  .eq('id', itemId);
```

#### Product Operations

```typescript
// Fetch products with filters
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    category:categories(id, name)
  `)
  .eq('is_active', true)
  .ilike('name', `%${searchQuery}%`)
  .order('created_at', { ascending: false });

// Create product
const { data, error } = await supabase
  .from('products')
  .insert([{
    name: 'Product Name',
    description: 'Description',
    sku: 'SKU-001',
    category_id: categoryId,
    is_active: true
  }]);

// Update product
const { data, error } = await supabase
  .from('products')
  .update(productData)
  .eq('id', productId);

// Delete product
const { data, error } = await supabase
  .from('products')
  .delete()
  .eq('id', productId);
```

#### Calendar Operations

```typescript
// Fetch calendar entries for year
const { data, error } = await supabase
  .from('calendar_entries')
  .select('*')
  .eq('year', year)
  .order('date', { ascending: true });

// Update calendar entry
const { data, error } = await supabase
  .from('calendar_entries')
  .update({
    is_holiday: true,
    holiday_name: 'Holiday Name',
    notes: 'Additional notes'
  })
  .eq('id', entryId);
```

### Custom Hook APIs

#### useNavigation Hook

```typescript
interface NavigationItem {
  id: string;
  label: string;
  position: string;
  path: string | null;
  level: number;
  parent_id: string | null;
  children?: NavigationItem[];
  is_enabled: boolean;
  is_deleted: boolean;
}

const {
  data,              // NavigationItem[]
  isLoading,         // boolean
  error,             // string | null
  refetch            // () => Promise<void>
} = useNavigation();
```

#### useProducts Hook

```typescript
interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  availableCategories: Category[];
  createProduct: (data: ProductFormData) => Promise<void>;
  updateProduct: (id: string, data: ProductFormData) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const result = useProducts(
  filters?: ProductFilters,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
);
```

#### useCalendar Hook

```typescript
interface UseCalendarReturn {
  data: CalendarEntry[];
  isLoading: boolean;
  error: string | null;
  updateCalendarEntry: (id: number, data: Partial<CalendarEntry>) => Promise<void>;
}

const result = useCalendar(year: number);
```

---

## Development Guidelines

### Code Style & Standards

#### TypeScript Conventions

```typescript
// Use interfaces for objects
interface User {
  id: string;
  name: string;
  email: string;
}

// Use types for unions and primitives
type Status = 'active' | 'inactive' | 'pending';
type Callback = (data: any) => void;

// Naming conventions
interface UserProfile {}      // PascalCase for interfaces
type UserRole = ...;         // PascalCase for types
const MAX_ITEMS = 100;       // UPPER_SNAKE_CASE for constants
let currentUser: User;       // camelCase for variables
function getUserData() {}    // camelCase for functions
```

#### Component Structure

```typescript
// Component template
'use client'; // Only if client-side interactivity needed

import { useState, useEffect } from 'react';
import { ComponentProps } from '@/types';
import { useCustomHook } from '@/hooks/useCustomHook';

interface Props {
  title: string;
  onAction?: () => void;
}

export default function ComponentName({ title, onAction }: Props) {
  // 1. Hooks
  const [state, setState] = useState(initial);
  const { data, isLoading } = useCustomHook();
  
  // 2. Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // 3. Handlers
  const handleClick = () => {
    // Event handler logic
  };
  
  // 4. Derived state
  const derivedValue = useMemo(() => {
    return computeValue(data);
  }, [data]);
  
  // 5. Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
}
```

#### File Naming Conventions

```
components/
  ComponentName.tsx        # PascalCase for components
  
hooks/
  useHookName.ts          # camelCase with 'use' prefix

types/
  typeName.ts             # camelCase for files
  
lib/
  utilityName.ts          # camelCase for utilities

app/
  page-name/              # kebab-case for routes
    page.tsx
```

### Dark Mode Implementation

**All components MUST support dark mode:**

```typescript
// Background colors
bg-white dark:bg-gray-900          // Page background
bg-gray-50 dark:bg-gray-800         // Card background
bg-gray-100 dark:bg-gray-700        // Hover states

// Text colors
text-gray-900 dark:text-white       // Primary text
text-gray-700 dark:text-gray-300    // Secondary text
text-gray-500 dark:text-gray-400    // Tertiary text

// Border colors
border-gray-200 dark:border-gray-700  // Standard borders
border-gray-300 dark:border-gray-600  // Input borders

// Interactive elements
hover:bg-gray-100 dark:hover:bg-gray-700
focus:ring-green-500 dark:focus:ring-green-400
```

### Module Color System

```typescript
// PageContainer module theming
const moduleThemes = {
  integration: {
    gradient: 'from-green-500/10 to-emerald-500/10 dark:from-green-600/20 dark:to-emerald-600/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400'
  },
  analytics: {
    gradient: 'from-blue-500/10 to-cyan-500/10 dark:from-blue-600/20 dark:to-cyan-600/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400'
  },
  execution: {
    gradient: 'from-purple-500/10 to-pink-500/10 dark:from-purple-600/20 dark:to-pink-600/20',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400'
  }
};
```

### Best Practices

#### Error Handling
```typescript
// ✅ Good
try {
  const result = await apiCall();
  setData(result);
} catch (err) {
  console.error('Error details:', err);
  setError('User-friendly message');
  // Optional: Log to error tracking service
}

// ❌ Bad
const result = await apiCall(); // No error handling
```

#### State Management
```typescript
// ✅ Good - Single source of truth
const [formData, setFormData] = useState({
  name: '',
  email: ''
});

// ❌ Bad - Multiple states
const [name, setName] = useState('');
const [email, setEmail] = useState('');
```

#### Performance Optimization
```typescript
// ✅ Good - Memoization
const expensiveValue = useMemo(() => 
  computeExpensive(data),
  [data]
);

// ✅ Good - Callback memoization
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// ❌ Bad - Inline functions in renders
<button onClick={() => handleClick(id)}>Click</button>
```

#### Accessibility
```typescript
// ✅ Good
<button
  aria-label="Delete item"
  title="Delete permanently"
  onClick={handleDelete}
>
  <Trash2 className="w-4 h-4" />
</button>

// ❌ Bad
<div onClick={handleDelete}>
  <Trash2 />
</div>
```

---

## Deployment & Operations

### Build Process

```bash
# Install dependencies
npm install

# Generate database types
npm run generate:types

# Build for production
npm run build

# Start production server
npm run start
```

### Environment Setup

#### Development
```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
```

#### Production
```bash
# Environment variables (via hosting platform)
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
```

### Deployment Platforms

#### Recommended: Vercel (Official Next.js Platform)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Configuration:**
- Automatic builds on git push
- Zero-configuration deployment
- Edge network distribution
- Automatic HTTPS
- Environment variable management

#### Alternative: Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### Alternative: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Database Migrations

```bash
# Using Supabase CLI
supabase migration new create_new_table
supabase db push

# Or via SQL Editor in Supabase Dashboard
# Execute migration scripts manually
```

### Monitoring & Logging

#### Recommended Tools
- **Vercel Analytics**: Built-in performance monitoring
- **Sentry**: Error tracking and reporting
- **LogRocket**: Session replay and debugging
- **Supabase Dashboard**: Database metrics and logs

#### Basic Logging Setup
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
    // Send to logging service
  },
  error: (message: string, error: any) => {
    console.error(`[ERROR] ${message}`, error);
    // Send to error tracking
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  }
};
```

### Backup Strategy

#### Database Backups
```sql
-- Supabase provides automatic backups
-- Manual backup via SQL:
pg_dump -h db.your-project.supabase.co \
        -U postgres \
        -d postgres \
        > backup-$(date +%Y%m%d).sql
```

#### Application Backups
- Git repository as source control
- Tag releases for rollback capability
- Store environment variables securely (1Password, Vault)

---

## Testing Strategy

### Testing Pyramid

```
         /\
        /UI\
       /----\
      /Integr\
     /--------\
    /   Unit   \
   /------------\
```

### Unit Testing (Recommended)

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

```typescript
// __tests__/hooks/useNavigation.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useNavigation } from '@/hooks/useNavigation';

describe('useNavigation', () => {
  it('should fetch navigation items', async () => {
    const { result } = renderHook(() => useNavigation());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeInstanceOf(Array);
  });
});
```

### Integration Testing

```typescript
// __tests__/pages/products.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ProductsPage from '@/app/products/page';

describe('Products Page', () => {
  it('should display product list', async () => {
    render(<ProductsPage />);
    
    expect(screen.getByText('Products')).toBeInTheDocument();
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });
  
  it('should open create modal', () => {
    render(<ProductsPage />);
    
    const createButton = screen.getByText('Add');
    fireEvent.click(createButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

### E2E Testing (Recommended: Playwright)

```typescript
// e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test('should manage navigation items', async ({ page }) => {
  await page.goto('/navigation-manager');
  
  // Add new label
  await page.fill('[name="label"]', 'Test Label');
  await page.fill('[name="path"]', '/test');
  await page.click('button:has-text("Add")');
  
  // Verify label appears
  await expect(page.locator('text=Test Label')).toBeVisible();
  
  // Edit label
  await page.hover('text=Test Label');
  await page.click('[title="Edit label"]');
  await page.fill('input[value="Test Label"]', 'Updated Label');
  await page.click('[title="Save changes"]');
  
  // Verify update
  await expect(page.locator('text=Updated Label')).toBeVisible();
});
```

### Manual Testing Checklist

#### Navigation Manager
- [ ] Create new label
- [ ] Edit label (name and path)
- [ ] Drag-and-drop reordering
- [ ] Nest labels (create child)
- [ ] Soft delete and restore
- [ ] Permanent delete
- [ ] Search/filter functionality
- [ ] Sidebar updates in real-time

#### Products Module
- [ ] View product list
- [ ] Search products
- [ ] Filter by category
- [ ] Create new product
- [ ] Edit product details
- [ ] Delete product
- [ ] View product details

#### Calendar Module
- [ ] Navigate between years
- [ ] Edit calendar entries
- [ ] Quick update modal
- [ ] Export calendar data
- [ ] Toggle column visibility
- [ ] Jump to specific date
- [ ] Scroll to today

#### Dark Mode
- [ ] Toggle dark mode
- [ ] All pages render correctly
- [ ] No contrast issues
- [ ] Icons visible in both modes

---

## Appendices

### A. Troubleshooting Guide

#### Common Issues

**Issue: "Row Level Security" Error**
```sql
-- Solution: Disable RLS for development
ALTER TABLE navigation DISABLE ROW LEVEL SECURITY;
```

**Issue: Type Generation Fails**
```bash
# Check Supabase connection
npm run generate:types

# If still failing, update @supabase/supabase-js
npm update @supabase/supabase-js
```

**Issue: Drag-and-Drop Not Working**
- Check browser compatibility (Chrome 90+)
- Verify draggable attribute is set
- Check console for JavaScript errors

### B. Performance Optimization Tips

1. **Code Splitting**
```typescript
// Use dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />
});
```

2. **Image Optimization**
```typescript
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={500}
  height={300}
  alt="Description"
  priority // For above-the-fold images
/>
```

3. **Database Query Optimization**
```typescript
// Use select to limit fields
.select('id, name, category_id')

// Use indexes for frequently queried columns
CREATE INDEX idx_products_category ON products(category_id);

// Paginate large result sets
.range(0, 49) // First 50 items
```

### C. Migration Guide (Future Versions)

**From 1.0 to 2.0:**
1. Backup database
2. Run migration scripts
3. Update environment variables
4. Regenerate types: `npm run generate:types`
5. Test critical paths
6. Deploy

### D. API Rate Limits

**Supabase Free Tier:**
- 500 MB database space
- 2 GB bandwidth/month
- 50 MB file storage
- 60 requests/minute

**Recommended Upgrades:**
- Pro: $25/month (8GB DB, 50GB bandwidth, 100GB storage)
- Team: $599/month (unlimited everything)

### E. Support & Resources

**Documentation:**
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

**Community:**
- GitHub Issues: Create issues for bugs
- Discord: Join Supabase Discord for support
- Stack Overflow: Tag questions with `next.js`, `supabase`

---

## Version History

### v1.0 (Current - January 1, 2026)

#### Core Features
- ✅ Navigation Manager with drag-and-drop
- ✅ Product Management System
- ✅ Calendar/Operations Module
- ✅ Dynamic Sidebar Navigation
- ✅ Dark Mode Support
- ✅ TypeScript Type Safety
- ✅ Supabase Integration

#### Known Issues
- Authentication not implemented
- RLS disabled in development
- No audit logging
- Analytics dashboard placeholder only

#### Planned for v1.1
- [ ] User authentication
- [ ] Role-based access control
- [ ] Comprehensive audit logging
- [ ] Rate limiting
- [ ] Enhanced error handling
- [ ] Performance optimizations

---

## Glossary

**App Router:** Next.js 14+ routing system using the `app/` directory  
**Dark Mode:** UI theme with dark background colors  
**Drag-and-Drop:** User interaction for reordering items  
**Edge Functions:** Serverless functions running on edge network  
**Hierarchical:** Tree-like structure with parent-child relationships  
**Middleware:** Code that runs before request completion  
**Module Theming:** Color-coding system for different app sections  
**Position String:** Dot-notation for hierarchy (e.g., "1.2.3")  
**Real-time:** Instant updates without page refresh  
**RLS:** Row Level Security (Supabase/PostgreSQL feature)  
**Server Components:** React components rendered on server  
**Soft Delete:** Marking record as deleted without removing from DB  
**Supabase:** Open-source Firebase alternative  
**Toast Notification:** Temporary popup message  
**Type Safety:** Compile-time checking of data types  

---

**Document Status:** ✅ Complete  
**Next Review:** June 1, 2026  
**Maintainers:** Development Team  
**Classification:** Internal Use

---

*End of Documentation*
