# TRITY_CONTEXT.md

**Version:** 0.2.1  
**Last Updated:** April 12, 2026  
**Purpose:** Complete AI & developer context for the Trity project  
**Authoritative Source:** This file reflects ONLY what exists in the current codebase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Summary](#architecture-summary)
3. [Coding Conventions](#coding-conventions)
4. [Database Conventions](#database-conventions)
5. [Multi-Tenant Architecture](#multi-tenant-architecture)
6. [Module System & Theming](#module-system--theming)
7. [File Structure & Organization](#file-structure--organization)
8. [Development Workflow](#development-workflow)
9. [Do Not Touch Areas](#do-not-touch-areas)
10. [AI Usage Rules](#ai-usage-rules)
11. [Known Gaps & TODOs](#known-gaps--todos)
12. [Bundle Rules](#bundle-rules)

---

## Project Overview

### What Trity Is

**Trity** is a Next.js 14-based enterprise SaaS platform for product management, calendar operations, and analytics. It features:

- **Dynamic navigation** with position-based hierarchical structure
- **Product management** with categories, pricing, barcodes, variants, BOMs
- **Calendar operations** with year-based views and inline editing
- **Real-time data** via Supabase PostgreSQL
- **Type-safe development** with auto-generated database types
- **Enterprise-grade UI** with dark mode and responsive design

### Who is building Trity

- **Founder:** Bimal Patel (product background in planning, manufacturing, logistics, and supply chain).
- **In-app:** Founder bio and narrative live at route **`/about/founder`** (`app/about/founder/page.tsx`).

### Tech Stack (Current Reality)

**Frontend:**

- Next.js 14.0.4 (App Router)
- React 18.2
- TypeScript 5.3.3
- Tailwind CSS 3.4
- Lucide React 0.303 (icons)

**Backend & Database:**

- Supabase (PostgreSQL)
- @supabase/supabase-js 2.39.1
- **Authentication:** Supabase Auth with login, session, and `ProtectedRoute` for gated pages
- **RLS:** Enabled on tenant-scoped and security-sensitive tables via migrations under `supabase/migrations/` (policies use `auth.uid()` and `tenant_id`)

**Development Tools:**

- ESLint 8.56 with Prettier
- Husky + lint-staged for pre-commit hooks
- Custom type generation script (`scripts/generate-types.js`)
- Vitest for unit tests (`npm test`)

### Current Status

- ✅ **Production Ready:** Navigation Manager, Products, Calendar
- 🚧 **Placeholder:** Analytics dashboard
- ✅ **Implemented:** Authentication (Supabase), RLS on core tables, audit logging infrastructure, AI route rate limiting (Upstash; see `.env.example`)

---

## Architecture Summary

### Application Flow

```
User Browser
    ↓
Next.js Pages (app/*/page.tsx)
    ↓
Custom React Hooks (hooks/use*.ts)
    ↓
Supabase Client (lib/supabaseClient.ts)
    ↓
Supabase PostgreSQL (with types from types/database.ts)
```

### Key Architectural Decisions

1. **Position-Based Navigation:** Hierarchical navigation uses dot-notation strings ("1", "1.1", "1.1.1") instead of parent_id foreign keys
2. **Client-heavy UI:** Many pages use `'use client'`; some routes use server components where applicable
3. **Centralized Supabase Client:** Single typed client instance exported from `lib/supabaseClient.ts`
4. **Database types:** Prefer `npm run generate:types` when schema changes; `types/database.ts` may be patched manually until regeneration
5. **Event-Based Refresh:** Navigation updates trigger browser events (`navigation-updated`) for sidebar synchronization

---

## Coding Conventions

### File Naming

| Type       | Convention                  | Example                   |
| ---------- | --------------------------- | ------------------------- |
| Components | PascalCase                  | `PageContainer.tsx`       |
| Hooks      | camelCase with `use` prefix | `useNavigation.ts`        |
| Types      | camelCase                   | `navigation.ts`           |
| Utilities  | camelCase                   | `supabaseClient.ts`       |
| Pages      | `page.tsx` in folder        | `app/products/page.tsx`   |
| Routes     | kebab-case                  | `app/navigation-manager/` |

### TypeScript Patterns

```typescript
// ✅ CORRECT: Use interfaces for objects
interface User {
  id: string;
  name: string;
}

// ✅ CORRECT: Use types for unions/primitives
type Status = 'active' | 'inactive';
type Callback = (data: any) => void;

// ✅ CORRECT: Naming conventions
interface UserProfile {}        // PascalCase
type UserRole = ...;           // PascalCase
const MAX_ITEMS = 100;         // UPPER_SNAKE_CASE
let currentUser: User;         // camelCase
function getUserData() {}      // camelCase
```

### Component Structure

**Standard order:**

1. `'use client'` directive (if needed)
2. Imports
3. Interface/type definitions
4. Component function
   - Hooks (useState, useEffect, custom hooks)
   - Effects (useEffect)
   - Handlers (event handlers)
   - Derived state (useMemo, computed values)
   - Render JSX

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Props {
  title: string;
}

export default function Component({ title }: Props) {
  const [state, setState] = useState(initial);
  const { data } = useCustomHook();

  useEffect(() => {
    // Side effects
  }, []);

  const handleClick = () => {};

  return <div>{title}</div>;
}
```

### Import Path Convention

Uses `@/*` alias pointing to project root:

```typescript
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/types/product';
import { useProducts } from '@/hooks/useProducts';
```

### ESLint Configuration

Current rules (`.eslintrc.json`):

- `no-console`: OFF (console.log allowed)
- `no-unused-vars`: OFF
- `@typescript-eslint/no-unused-vars`: WARN (with `^_` ignore pattern)
- `@typescript-eslint/no-explicit-any`: WARN
- `react-hooks/exhaustive-deps`: WARN
- `react/no-unescaped-entities`: WARN
- **`no-restricted-imports` (bundle guardrails):** `xlsx` is forbidden everywhere. Static `papaparse` imports are forbidden outside `lib/csvDownload.ts` and `lib/importExport/io.ts` (see [Bundle Rules](#bundle-rules)).

---

## Bundle Rules

### Libraries that must stay lazy loaded

- **papaparse** — use **dynamic** `import('papaparse')` inside `lib/importExport/io.ts` for import/export CSV parsing. Do **not** add static `import … from 'papaparse'` in pages, hooks, or components (ESLint enforces this except for the two allowlisted files).
- **xlsx** — **REMOVED.** Do not re-add as a client-side dependency. If Excel export is needed in the future, implement it as a **server-only** API route (and keep binaries off the default client graph).

### Middleware rules

- **`middleware.ts`** must stay **minimal** (edge runtime). See the header comment in that file.
- **Target:** under **~50KB parsed** for the middleware / edge chunk when `matcher` includes real routes.
- **Do not import:** `openai`, `@opentelemetry`, `xlsx`, `papaparse`, heavy Supabase server clients, or Node-only modules.
- **Verify:** run `npm run analyze` (or PowerShell: `$env:ANALYZE="true"; npm run build`) and inspect **`.next/analyze/edge.html`**.

### How to run the bundle analyzer

- **Cross-platform:** `npm run analyze` (uses `cross-env`).
- **Windows PowerShell:** `$env:ANALYZE="true"; npm run build` or `npm run analyze:win`
- **Output:** `.next/analyze/client.html` (client), `.next/analyze/edge.html` (middleware / edge), `.next/analyze/nodejs.html` (server)

### When to run the analyzer

- Before every **version bump**
- After adding any **new npm dependency**
- After adding a **new page** or **heavy** component

### Red flags to watch for

- Any **single client chunk** over **~200KB parsed**
- **`xlsx`** (or other spreadsheet binaries) appearing in **client.html**
- **Middleware / edge** chunk over **~50KB parsed** when middleware is active on real routes
- A heavy library duplicated into **every page chunk** — prefer **dynamic `import()`** or server-only usage

---

## Database Conventions

### Authoritative Schema Source

**File:** `types/Supabase Snippet Public Schema Column Catalog.csv`

This CSV file is the **single source of truth** for the database schema. Always reference this file when:

- Generating SQL migrations
- Creating TypeScript type definitions
- Implementing data access layers
- Designing new features

### Current Core Tables (Confirmed Stable)

**Multi-Tenant & Authentication:**

- `tenants` - Organization/tenant records
- `user_profiles` - User accounts with roles (member | admin | super_admin)
- `user_invites` - Pending user invitations
- `user_groups` - Team groups for organizing users

**Navigation:**

- `navigation` - Position-based hierarchical navigation (dot-notation positions)

**Operations & Planning:**

- `calendar` - Calendar events and dates
- `workstreams` - Project workstreams with tracking
- `workstream_tasks` - Tasks within workstreams
- `okrs` - OKR tracking

**Audit & Logging:**

- `audit_logs` - Complete audit trail of all user actions
  - Tracks: action, resource_type, resource_id, changes
  - Includes: user_id, tenant_id, ip_address, user_agent, timestamp

**System:**

- `cached_timezones` - Materialized view for timezone data (read-only)

**Additional Tables (40+):**

- Product catalog (products, categories, product_categories, product_barcodes, **product_groups**, packing_configurations, bom_headers, bom_lines, etc.)

**Catalogue configuration (`tenants.catalogue_mode`, migration `20260419105000_tenant_catalogue_settings.sql`):**

- **`simple`** (default): flat product list; no groups column or variants tab in the products UI.
- **`grouped`**: optional `products.product_group_id`; variants are **separate product rows** in the same group; `products.variant_attributes` holds optional labels (e.g. size/colour).
- **`matrix`**: same as grouped plus attribute dimensions on `product_groups.attribute_dimensions` (JSON) and a basic matrix view / variant generator on the group detail page. Operational modules (orders, stock, purchasing) do **not** branch on catalogue mode—only catalogue/UI layers do.
- Inventory (stock_levels, stock_adjustments, stock_transfers, etc.)
- Sales & Orders (sales_orders, sales_invoices, delivery_locations, etc.)
- Purchasing (purchase_orders, purchase_invoices, goods_receipt, goods_return, etc.)
- Customers & Suppliers (customers, suppliers, customer_groups, etc.)
- Pricing & Finance (price_lists, price_list_items, cost_file, logistics_costs, etc.)
- And more for complete enterprise operations

### Standard Fields (Present in All Tables)

All tables follow this standard field pattern:

```typescript
tenant_id: uuid NOT NULL              // Multi-tenant isolation
created_by: uuid | null               // User who created record
updated_by: uuid | null               // User who last updated
created_at: timestamp DEFAULT now()   // Creation timestamp
updated_at: timestamp DEFAULT now()   // Last update timestamp
is_deleted: boolean DEFAULT false      // Soft delete flag
[other business fields...]
```

### Audit Logging System

**Location:** `lib/auditLog.ts`

**Function:** `logAuditAction()`

```typescript
// Track any user action for compliance and debugging
await logAuditAction({
  tenantId: string,
  userId: string,
  action: 'create' | 'update' | 'delete' | 'invite' | 'role_change' | etc.,
  resourceType: string,   // 'user', 'product', 'workstream', etc.
  resourceId: string,     // ID of affected resource
  changes?: Json,         // Before/after changes
});
```

### Permission System

**Location:** `lib/permissions.ts` & `types/access.ts`

**3-Tier Role Hierarchy:**

```typescript
type UserRole = 'member' | 'admin' | 'super_admin';

// Member (7 permissions) - View-only access
// Admin (14 permissions) - Can manage users, groups, settings
// Super Admin (15 permissions) - Full control including feature flags
```

**15 Granular Permissions:**

```typescript
// User Management
('view_users', 'invite_users', 'manage_users', 'change_user_roles', 'remove_users');

// Groups & Teams
('manage_groups');

// Tenant & Settings
('view_tenant_settings', 'edit_tenant_settings', 'manage_features', 'manage_invites');

// Features
('access_calendar', 'access_products', 'access_workstreams', 'access_okrs');

// Audit
('view_audit_logs');
```

### Position-Based Navigation Hierarchy

**Pattern:** Dot-notation strings for unlimited depth nesting

```typescript
'1'; // Level 0 - Root pillar (prefix 1=A, 2=BC, 3=E; product order BC → Execution → Analytics; plus Admin, Account)
'1.1'; // Level 1 - Child of pillar 1
'1.1.1'; // Level 2 - Grandchild
'2.3.4.5'; // Unlimited depth supported
```

**Implementation Files:**

- `lib/navigation-hierarchy.ts` - Position comparison, parsing, hierarchy algorithms
- `lib/navigation-default.ts` - Default navigation structure
- `types/navigation.ts` - Navigation interfaces

### Multi-Tenant Architecture

**Current Implementation Status:**

- ✅ Tenant isolation at database level (every table has `tenant_id`)
- ✅ Row Level Security (RLS) policies in place
- ✅ Audit logging with tenant context
- ✅ User roles per tenant (member, admin, super_admin)
- ✅ TenantContext provides current tenant_id

**Convention:**

- All data operations include `tenant_id` context from `TenantContext` (use `effectiveTenantId` when the user may be acting in another workspace)
- RLS policies enforce tenant data isolation for normal users
- **Do not assume** the database hides other tenants’ rows for every query (see platform super-admin note below)

**Usage Pattern:**

```typescript
const { effectiveTenantId: tenant_id } = useTenant();

// List/detail reads: always filter by active workspace tenant (defense in depth)
const { data } = await supabase.from('products').select('*').eq('tenant_id', tenant_id);
```

### Platform super-admin and client-side tenant scoping

**Context:** Migrations such as [`supabase/migrations/20260415120000_platform_super_admin_workspace_select.sql`](supabase/migrations/20260415120000_platform_super_admin_workspace_select.sql) add permissive `SELECT` policies using `public.is_tenants_platform_super_admin()`. PostgreSQL RLS combines policies with **OR**: if that predicate is true, **all rows** in the table can be visible unless the **query** restricts them.

**Implication:** For platform super-admins (or anyone matching that function), **unscoped** `select('*')` on tenant-scoped tables can return **every tenant’s data**. Workspace switching uses `effectiveTenantId` in the app; RLS does not know the “current workspace” unless you filter.

**Rules for new code:**

1. Any **multi-row** Supabase read from a tenant-scoped table or view should include `.eq('tenant_id', effectiveTenantId)` (or equivalent) when the UI is meant to show **one** workspace.
2. Hooks that take an optional `tenantId` must **not** run an unscoped list query when it is missing—return an empty list and skip the query (pattern: [`hooks/useUserGroups.ts`](hooks/useUserGroups.ts) `fetchGroups`).
3. Avoid fallbacks like “if no tenant, select all categories” for super-admins; use empty results instead (pattern: [`components/products/ProductDetailsTabs.tsx`](components/products/ProductDetailsTabs.tsx) `loadAll`).
4. Cross-tenant **writes** while impersonating a workspace may require explicit policies (e.g. [`supabase/migrations/20260421100000_products_platform_super_admin_write.sql`](supabase/migrations/20260421100000_products_platform_super_admin_write.sql) for `products` / `product_categories`), in addition to client `tenant_id` on inserts.

**Historical bug:** The products list used `vw_products_full` without a `tenant_id` filter; normal users were constrained by RLS, but super-admins saw all products. Fixed in [`hooks/useProducts.ts`](hooks/useProducts.ts) `fetchProducts`.

---

## Module System & Theming

### Three-Pillar Navigation System

**Sidebar Structure with 3 Color-Coded Pillars:**

| Pillar             | Color  | Hex     | Modules                                           |
| ------------------ | ------ | ------- | ------------------------------------------------- |
| **Business Core**  | Green  | #16a34a | Products, Customers, Suppliers, Warehouse, Orders |
| **Execution**      | Orange | #b45309 | Calendar, OKRs, Scheduler                         |
| **Analytics**      | Blue   | #2563eb | Forecast, Cost File, Inventory                    |
| **Administration** | Gray   | #6b7280 | Users, Groups, Settings, Navigation Manager       |
| **Account**        | Gray   | #6b7280 | Profile                                           |

### Module Theme Configuration for Pages

**Defined in:** `components/PageContainer.tsx`

```typescript
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
```

### Usage in Pages

```tsx
<PageContainer
  title="Products"
  module="businessCore" // or "analytics" or "execution"
>
  {children}
</PageContainer>
```

### Typography Standards

**Font:** Inter (via `next/font/google`)  
**Applied in:** `app/layout.tsx`

**Sizing:**

- `text-xs` - Helper text, captions, badges
- `text-sm` - Body copy, inputs, table cells
- `text-lg` / `text-xl` - Section titles, modal headers
- `text-3xl font-bold` - Page titles

### Dark Mode

**All components MUST support dark mode** using Tailwind's `dark:` variant:

```tsx
className = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white';
```

**Common patterns:**

- Background: `dark:bg-gray-900` (page), `dark:bg-gray-800` (cards)
- Text: `dark:text-white` (primary), `dark:text-gray-400` (secondary)
- Borders: `dark:border-gray-700`, `dark:border-gray-600`

---

## File Structure & Organization

### Directory Layout

```
trity/
├── app/                      # Next.js 14 App Router pages
│   ├── layout.tsx           # Root layout with Sidebar
│   ├── page.tsx             # Dashboard/Home page
│   │
│   ├── analytics/           # Analytics Pillar (Blue)
│   │   └── page.tsx         # Analytics dashboard
│   │
│   ├── products/            # Business Core Pillar (Green)
│   │   └── page.tsx         # Product management
│   ├── customers/
│   │   └── page.tsx         # Customer management
│   ├── suppliers/
│   │   └── page.tsx         # Supplier management
│   ├── warehouse/
│   │   └── page.tsx         # Warehouse operations
│   ├── stock-adjustments/
│   │   └── page.tsx         # Stock management
│   ├── purchase-orders/
│   │   └── page.tsx         # Purchase operations
│   ├── sales-orders/
│   │   └── page.tsx         # Sales operations
│   ├── order-fulfillment/
│   │   └── page.tsx         # Order fulfillment
│   │
│   ├── calendar/            # Execution Pillar (Orange)
│   │   └── page.tsx         # Calendar operations

│   ├── okrs/
│   │   └── page.tsx         # OKR tracking
│   ├── scheduler/
│   │   └── page.tsx         # Scheduling
│   │
│   ├── admin/               # Administration (Gray)
│   │   └── tenants/         # Multi-tenant management
│   ├── users/
│   │   └── page.tsx         # User management
│   ├── groups/
│   │   └── page.tsx         # User groups
│   ├── tenant-settings/
│   │   └── page.tsx         # Tenant configuration
│   ├── navigation-manager/
│   │   └── page.tsx         # Navigation structure management
│   ├── import-export/
│   │   └── page.tsx         # Data import/export
│   │
│   ├── profile/             # Account
│   │   └── page.tsx         # User profile
│   ├── login/
│   │   └── page.tsx         # Login page
│   ├── reset-password/
│   │   └── page.tsx         # Password reset
│   │
│   ├── diagnostics/         # Developer tools
│   │   └── page.tsx         # System diagnostics
│   └── test-supabase/       # Developer tools
│       └── page.tsx         # Connection testing
│
├── components/              # Reusable components
│   ├── PageContainer.tsx    # ⚠️ CRITICAL: Standard page wrapper with module theming
│   ├── LayoutSkeleton.tsx   # Loading skeleton
│   ├── LayoutWrapper.tsx    # Auth & layout wrapper
│   ├── ProtectedRoute.tsx   # Route protection component
│   ├── ProtectedAction.tsx  # Permission-aware action component
│   ├── navigation/
│   │   └── Sidebar.tsx      # ⚠️ CRITICAL: Dynamic sidebar with 3-pillar structure
│   │
│   ├── products/            # Product components
│   │   ├── ProductCreateModal.tsx
│   │   ├── ProductDetailsTabs.tsx
│   │   ├── PackingConfigurationsEditor.tsx
│   │   └── ... (other product components)
│   │
│   └── ... (other component groups)
│
├── hooks/                   # Custom React hooks
│   ├── usePermissions.ts    # Permission checking (RBAC)
│   ├── useFeatureFlags.ts   # Feature flag management
│   ├── useTenantDetails.ts  # Tenant data
│   ├── useTenantUsers.ts    # Tenant user management
│   ├── useTenantInvites.ts  # User invitations
│   ├── useUserGroups.ts     # User group operations
│   ├── useUsers.ts          # User management
│   ├── useProducts.ts       # Product CRUD operations
│   ├── useCalendar.ts       # Calendar data management

│   ├── useOKRs.ts           # OKR tracking
│   ├── useCustomers.ts      # Customer operations
│   ├── useProfile.ts        # User profile management
│   └── useImportExport.ts   # Import/export operations
│
├── lib/                     # Shared utilities
│   ├── supabaseClient.ts    # ⚠️ CRITICAL: Typed Supabase client singleton
│   ├── permissions.ts       # Permission utilities (RBAC)
│   ├── auditLog.ts          # Audit logging system
│   ├── featureFlags.ts      # Feature flag management
│   ├── navigation-hierarchy.ts    # Position-based hierarchy algorithm
│   ├── navigation-default.ts      # Default navigation structure
│   ├── ownerUtils.ts        # Owner assignment utilities
│   ├── gantt-utils.ts       # Gantt chart utilities
│   ├── importExportUtils.ts # Import/export helpers
│   ├── validation.ts        # Data validation
│   ├── sanitization.ts      # Input sanitization
│   ├── security.ts          # Security utilities (CSRF)
│   ├── statusConfig.ts      # Status configurations
│   ├── debugLog.ts          # Debug logging
│   └── ... (other utilities)
│
├── contexts/                # React contexts
│   └── TenantContext.tsx    # ⚠️ CRITICAL: Multi-tenant context provider
│
├── types/                   # TypeScript definitions
│   ├── database.ts          # ⚠️ AUTO-GENERATED: Do not edit manually
│   ├── navigation.ts        # Navigation interfaces
│   ├── access.ts            # Access control types (RBAC)
│   ├── product.ts           # Product interfaces
│   ├── calendar.ts          # Calendar interfaces
│   ├── customer.ts          # Customer interfaces
│   ├── workstream.ts        # Workstream interfaces
│   ├── okr.ts               # OKR interfaces
│   ├── profile.ts           # Profile interfaces
│   └── Supabase Snippet Public Schema Column Catalog.csv  # ⚠️ SCHEMA SOURCE OF TRUTH
│
├── providers/               # Context providers
│   └── AppProviders.tsx     # Application-level providers
│
├── supabase/
│   └── migrations/          # SQL migrations & queries
│
├── scripts/                 # Build & utility scripts
│   ├── generate-types.js    # ⚠️ Type generation from Supabase
│   ├── document-schema.js   # Schema documentation generator
│   └── discover-tables.js   # Table discovery utility
│
├── docs/                    # Documentation
│   ├── AI_PROMPT.md         # AI assistant guidelines
│   ├── SUPABASE_OPTIMIZATION_SUMMARY.md  # DB optimization details
│   └── TYPE_GENERATION.md   # Type generation guide
│
├── .env.local               # Local environment variables (not committed)
├── package.json             # Version 0.2.0+
├── tsconfig.json            # TypeScript config with @/* alias
├── tailwind.config.js       # Tailwind configuration
├── next.config.js           # Next.js configuration
├── postcss.config.js        # PostCSS configuration
├── README.md                # ✅ Quick-start guide
├── PROJECT_DOCUMENTATION.md # ✅ Complete technical docs
├── TRITY_CONTEXT.md         # ← This file (Updated Jan 31, 2026)
├── REFERENCE_FILES_INDEX.md # ✅ Master reference index
└── ... (other documentation)
```

---

## Development Workflow

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Copy .env.credentials to .env.local
# (Dev credentials are hardcoded in .env.credentials)

# 3. Generate database types
npm run generate:types

# 4. Start dev server
npm run dev
```

### Available Scripts

```json
{
  "dev": "next dev", // Start dev server
  "build": "next build", // Production build
  "start": "next start", // Start production server
  "lint": "next lint", // Run ESLint
  "generate:types": "node scripts/generate-types.js", // ⚠️ Generate DB types
  "document:schema": "node scripts/document-schema.js", // Generate schema docs
  "prepare": "husky" // Git hooks setup
}
```

### Type Generation Workflow

**When to run `npm run generate:types`:**

- After adding/modifying Supabase tables
- After changing column types
- When types/database.ts is out of sync

**What it does:**

- Connects to Supabase using hardcoded credentials
- Queries database schema
- Generates `types/database.ts` with complete type definitions

**Note:** This script uses the hardcoded Supabase credentials from `.env.credentials`

### Git Hooks (Husky)

**Pre-commit:** lint-staged runs on staged files

- Configured in `.lintstagedrc.js` (check file for exact rules)

---

## Do Not Touch Areas

### 🚨 CRITICAL: Do Not Modify Without Understanding

1. **`types/database.ts`**
   - Auto-generated file
   - Changes will be overwritten by `npm run generate:types`
   - To modify types, change the database schema in Supabase, then regenerate

2. **`lib/supabaseClient.ts`**
   - Single source of typed Supabase client
   - Used by all hooks and components
   - Breaking this breaks everything

3. **`lib/audit.ts`**
   - Core multi-tenant audit pattern
   - Used by all CRUD operations
   - Changes here affect all database writes

4. **`hooks/useNavigation.ts` (lines 91-148)**
   - Position-based hierarchy algorithm
   - Complex sorting and parent-child organization logic
   - Breaking this breaks the entire navigation system

5. **`components/PageContainer.tsx`**
   - Module theming system foundation
   - All pages depend on this component
   - Changes affect visual consistency across entire app

6. **`types/Supabase Snippet Public Schema Column Catalog.csv`**
   - Schema source of truth
   - Referenced by documentation and comments
   - Only update from Supabase exports

### ⚠️ Proceed with Caution

1. **`app/layout.tsx`**
   - Root layout with Sidebar
   - Changes affect every page

2. **`components/navigation/Sidebar.tsx`**
   - Dynamic navigation rendering
   - Tightly coupled with useNavigation hook

3. **`scripts/generate-types.js`**
   - Type generation logic
   - Contains hardcoded table list (lines 15-40)

---

## AI Usage Rules

### When Modifying This Project, AI Must:

1. **Always Use Existing Patterns**
   - Use `PageContainer` with correct module for new pages
   - Use `withAuditForInsert`/`withAuditForUpdate` for all database writes
   - Follow the component structure convention
   - Use `@/*` import paths

2. **Never Invent Architecture**
   - Prefer extending existing auth, RLS, and multi-tenant patterns over ad hoc bypasses
   - Don't add new global styles - use Tailwind classes
   - Don't create new utility files without checking if they exist

3. **Database Operations**
   - Always check if audit helpers are needed
   - Always include `tenant_id` in context; RLS and policies enforce isolation where enabled
   - Use typed Supabase client from `lib/supabaseClient`
   - Never bypass the Supabase client

4. **Type Safety**
   - Never use `any` without justification
   - Import types from `types/database.ts` for Supabase tables
   - Define interfaces for component props
   - Use proper TypeScript syntax

5. **Consistency**
   - Match existing file naming conventions
   - Use the same button styles as existing pages
   - Follow the same dark mode pattern
   - Use module colors from the three-module system

6. **Documentation**
   - Update `types/Supabase Snippet Public Schema Column Catalog.csv` if schema changes
   - Add JSDoc comments for complex functions
   - Don't modify README.md or PROJECT_DOCUMENTATION.md unless explicitly asked

### When Creating New Features:

1. Check if similar functionality exists elsewhere
2. Reuse existing components and hooks
3. Follow the page structure pattern (stats cards → toolbar → content)
4. Use the appropriate module color
5. Support dark mode from the start
6. Include proper error handling
7. Add loading states

### When Debugging:

1. Check `types/database.ts` for correct table structure
2. Verify Supabase connection (use `/test-supabase` page)
3. Check browser console for errors
4. If you see permission errors, inspect RLS policies and JWT claims for the signed-in user
5. Check if audit helpers are properly applied

---

## Known Gaps & TODOs

### Partially complete or follow-up work

1. **Authentication & sessions**
   - Supabase Auth, login, and `ProtectedRoute` are in use; edge cases (multi-tenant switching vs API `tenant_id`) may need product decisions

2. **RLS**
   - Policies exist per table/migration; new tables must ship with RLS and tenant rules

3. **Audit logging**
   - Helpers and `audit_logs` exist; not every CRUD path may emit audit rows — search for `withAuditForInsert` / `auditLog` usage when touching sensitive writes

4. **Rate limiting**
   - `/api/ai/chat` and `/api/ai/assistant` use Upstash (20 requests per user per hour in production); broader API or Supabase query throttling is not global

5. **Testing**
   - Vitest is configured; coverage is not exhaustive

6. **Analytics Dashboard**
   - Route exists (`/analytics`)
   - Page is placeholder only
   - No data visualization library installed

### Inconsistencies Detected

1. **Calendar Table Name**
   - Code references both `calendar` and `calendar_entries`
   - **Action needed:** Verify actual table name in Supabase

2. **useProducts_old.ts**
   - Old hook file present
   - Not deleted after refactoring
   - **Action needed:** Confirm if safe to delete

3. **validation.ts and security.ts**
   - Utility files created
   - No references found in codebase
   - **Action needed:** Confirm if integrated or pending

4. **Audit Helper Usage**
   - Helpers defined in `lib/audit.ts`
   - Usage not verified across all CRUD operations
   - **Action needed:** Audit all database write operations

5. **Environment Variables**
   - Hardcoded credentials in `.env.credentials`
   - Fallback to hardcoded values in `lib/supabaseClient.ts`
   - **Security concern:** Credentials committed to repository

### Module Assignment Conflicts

Current pages and their modules:

- `/products` → integration ✅
- `/calendar` → execution ✅
- `/analytics` → analytics (placeholder) 🚧
- `/navigation-manager` → integration ✅
- `/diagnostics` → system (no module) 🔧
- `/test-supabase` → system (no module) 🔧
- `/` (home) → no module

**No conflicts detected**

---

## Quick Reference for AI

### When asked to add a feature:

1. ✅ Use existing patterns from similar features
2. ✅ Check if components/hooks already exist
3. ✅ Use `PageContainer` with correct module
4. ✅ Support dark mode
5. ✅ Include audit fields (even if not enforced)
6. ✅ Follow TypeScript conventions
7. ✅ Update only what's necessary

### When asked to fix a bug:

1. ✅ Check database schema in CSV
2. ✅ Verify types in `types/database.ts`
3. ✅ Check Supabase connection
4. ✅ Review console errors
5. ✅ Respect RLS: use the typed Supabase client with the user session; don't assume bypass

### When asked to refactor:

1. ✅ Maintain backward compatibility
2. ✅ Don't touch auto-generated files
3. ✅ Update documentation if needed
4. ✅ Keep existing patterns

### Red Flags - Stop and Ask:

- ❌ "Bypass authentication" or disable RLS in production without explicit approval
- ❌ "Add RLS policies" without tenant / `auth.uid()` context
- ❌ "Change audit.ts" without understanding impact
- ❌ "Modify useNavigation position logic" without full context
- ❌ Large `types/database.ts` edits without running `npm run generate:types` when a Supabase link is available

---

## Conclusion

This context file reflects the Trity codebase as of **April 2026**. It aims to describe what exists; verify against the repo when in doubt.

**For AI:** Use this as your source of truth when working on this project. When in doubt, refer back to this file and the actual code.

**For Developers:** Keep this file updated as the codebase evolves. Regenerate it by pasting the original prompt.

---

**Document Status:** Updated for auth, RLS, AI security, and tooling  
**Last Full Scan:** April 12, 2026  
**Next Review:** When significant architecture changes occur

---

_End of Context Document_
