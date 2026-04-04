# Trity

A modern enterprise SaaS platform with Role-Based Access Control (RBAC), dynamic navigation, and multi-tenant support powered by Supabase.

## 🎯 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy [.env.credentials](.env.credentials) to `.env.local` and configure your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://wvqlpcraxorchrtpatph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DSUbUfO9Dsyg3v6FzKLnCg_oyIYJeCC
```

3. **Set up the database:**

Apply database changes with Supabase migrations (or run equivalent SQL in the Supabase SQL editor):

```bash
# Versioned migrations live in supabase/migrations/
# Use: npx supabase db push   (or your team’s migration workflow)
```

4. **Generate database types:**

```bash
npm run generate:types
```

5. **Start development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Features

- **Dynamic Navigation**: Navigation items are fetched from Supabase in real-time
- **Navigation Manager**: Drag-and-drop interface to manage navigation labels
- **Responsive Sidebar**: Collapsible sidebar design (collapsed: 80px, expanded: 240px)
- **Dark Mode Support**: Full light and dark theme compatibility
- **Enterprise-Grade Design**: Clean, minimalist, professional interface
- **TypeScript**: Fully typed with auto-generated Supabase types
- **Next.js 14**: Built with the latest Next.js App Router
- **Tailwind CSS**: Utility-first styling for rapid development
- **Type-Safe Database**: Full TypeScript type safety for all database operations

## Project Structure

```
trity/
├── app/                           # Next.js 14 App Router
│   ├── layout.tsx                # Root layout with Sidebar
│   ├── page.tsx                  # Dashboard/Home
│   │
│   ├── analytics/                # Analytics Pillar (Blue)
│   │   └── page.tsx
│   ├── products/                 # Business Core Pillar (Green)
│   │   └── page.tsx
│   ├── customers/
│   │   └── page.tsx
│   ├── suppliers/ (and more...)
│   │
│   ├── calendar/                 # Execution Pillar (Orange)
│   │   └── page.tsx
│   ├── workstreams/
│   │   └── page.tsx
│   ├── okrs/
│   │   └── page.tsx
│   │
│   ├── admin/                    # Administration (Gray)
│   │   └── tenants/
│   ├── users/
│   │   └── page.tsx
│   ├── groups/
│   │   └── page.tsx
│   ├── tenant-settings/
│   │   └── page.tsx
│   ├── navigation-manager/       # Navigation structure management
│   │   └── page.tsx
│   ├── import-export/
│   │   └── page.tsx
│   │
│   ├── profile/                  # Account
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   │
│   └── diagnostics/              # Developer tools
│       └── page.tsx
│
├── components/                   # Reusable components
│   ├── PageContainer.tsx         # Standard page wrapper with module colors
│   ├── LayoutSkeleton.tsx        # Loading skeleton
│   ├── LayoutWrapper.tsx         # Auth wrapper
│   ├── ProtectedRoute.tsx        # Route protection
│   ├── ProtectedAction.tsx       # Permission-aware actions
│   ├── navigation/
│   │   └── Sidebar.tsx           # Dynamic sidebar (3-pillar structure)
│   ├── products/                 # Product components
│   ├── ... (other groups)
│
├── hooks/                        # Custom React hooks
│   ├── usePermissions.ts         # RBAC permission checking
│   ├── useFeatureFlags.ts        # Feature flag management
│   ├── useTenantDetails.ts       # Tenant data
│   ├── useTenantUsers.ts         # Tenant users
│   ├── useUserGroups.ts          # User groups
│   ├── useUsers.ts               # User management
│   ├── useProducts.ts            # Product operations
│   ├── useCalendar.ts            # Calendar data
│   ├── useWorkstreams.ts         # Workstream operations
│   ├── useOKRs.ts                # OKR tracking
│   ├── useCustomers.ts           # Customer operations
│   ├── useProfile.ts             # User profile
│   └── ... (other hooks)
│
├── lib/                          # Shared utilities
│   ├── supabaseClient.ts         # Typed Supabase client
│   ├── permissions.ts            # RBAC utilities
│   ├── auditLog.ts               # Audit logging
│   ├── featureFlags.ts           # Feature management
│   ├── navigation-hierarchy.ts   # Position-based hierarchy algorithm
│   ├── navigation-default.ts     # Default navigation structure
│   ├── ... (other utilities)
│
├── contexts/                     # React contexts
│   └── TenantContext.tsx         # Multi-tenant context
│
├── types/                        # TypeScript definitions
│   ├── database.ts               # Auto-generated Supabase types
│   ├── navigation.ts             # Navigation interfaces
│   ├── access.ts                 # RBAC types
│   ├── product.ts                # Product types
│   ├── ... (other types)
│
├── providers/                    # Context providers
│   └── AppProviders.tsx          # App-level providers
│
├── supabase/
│   └── migrations/               # Timestamped SQL migrations (Supabase)
│
├── scripts/                      # Build & utility scripts
│   ├── generate-types.js         # Generate DB types
│   ├── document-schema.js        # Generate schema docs
│   └── discover-tables.js        # Table discovery
│
├── docs/                         # Documentation
│   ├── reference/                # Guides, audits, and reference indexes
│   ├── SUPABASE_OPTIMIZATION_SUMMARY.md
│   └── TYPE_GENERATION.md
│
└── Configuration Files
    ├── .env.credentials          # Environment variables
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── next.config.js
    └── postcss.config.js
```

## Core Features

### Three-Pillar Navigation System

- **Analytics Pillar (Blue)** - Reporting, forecasting, inventory insights
- **Business Core Pillar (Green)** - Core business entities: products, customers, suppliers, inventory
- **Execution Pillar (Orange)** - Planning & execution: calendar, workstreams, OKRs, scheduler
- **Administration (Gray)** - System management, user control, settings
- **Account** - Profile management

### Role-Based Access Control (RBAC)

- **3-tier hierarchy**: Member → Admin → Super Admin
- **15 granular permissions** covering all modules
- **Feature flags** to enable/disable features per tenant
- **Team groups** for organizing users
- **Audit logging** of all changes

### Database Features

- **Multi-tenant architecture** with full isolation
- **Type-safe Supabase** integration with auto-generated types
- **Audit trail system** tracking all user actions
- **Row-level security (RLS)** policies for data protection
- **Optimized queries** with 99.99% performance improvement

## Database Schema (Authoritative Source)

The file **`Supabase Snippet Public Schema Column Catalog.csv`** is the authoritative
source of truth for our Supabase database schema.

**Core Tables:**

- `tenants` - Multi-tenant organization data
- `user_profiles` - User account information with roles
- `calendar` - Calendar operations and planning
- `workstreams` - Project workstreams and tracking
- `workstream_tasks` - Tasks within workstreams
- `audit_logs` - Complete audit trail
- `cached_timezones` - Materialized view for timezone caching
- And 40+ more tables for products, inventory, orders, etc.

All INSERT and UPDATE operations must use the audit helpers:

- `logAuditAction()` for tracking changes
- `withAuditForInsert(user)` for new rows
- `withAuditForUpdate(user)` for updates

This ensures consistent multi-tenant, audit, and versioning behavior across the system.

## Navigation Manager

The **Navigation Manager** page ([/navigation-manager](/navigation-manager)) provides a drag-and-drop interface for managing navigation panel labels.

### Features

- **Add Labels**: Create new navigation items with a simple form
- **Drag & Drop**: Reorder labels using position-based hierarchy (dot-notation)
- **Nested Structure**: Create unlimited hierarchy depth (1, 1.1, 1.1.1, etc.)
- **Persistent Order**: Changes automatically save to Supabase
- **Delete Labels**: Remove unwanted navigation items
- **Real-time Updates**: Sidebar automatically refreshes via events

### Usage

1. Navigate to `/navigation-manager` in your application
2. Enter a label name in the left panel and click "Add Label"
3. Drag labels in the right panel to reorder them
4. Nest items by dragging them under parent items
5. Click the trash icon to delete a label
6. Changes are automatically synchronized with Supabase

### Position-Based Hierarchy

The navigation system uses dot-notation position strings for unlimited depth:

- `1`, `2`, `3` - Root level items (Pillars)
- `1.1`, `1.2`, `1.3` - Level 1 children
- `1.1.1`, `1.1.2` - Level 2 grandchildren
- And so on...

This approach provides:

- No foreign key constraints needed
- Easy drag-and-drop reorganization
- Efficient hierarchical queries
- Clean separation of concerns

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account

### Installation

1. Install dependencies:

```bash
npm install
```

2. Generate database types:

```bash
npm run generate:types
```

### Working with Products

- Navigate to the Products workspace at `/products` using the sidebar.
- Use the **New Product** button in the page header to open the create modal.
- Fill in master data, pricing thresholds, lifecycle details, tracking flags, tags, and assign categories.
- Saved products immediately appear in the product list and are available to all related views (variants, barcodes, pricing, BOMs, packing, metrics, and operations).

- **Error State**: Displays error message if fetch fails
- **Empty State**: Shows message when no navigation items exist
- **Responsive**: Works on all screen sizes
- **Accessible**: Includes ARIA labels and keyboard navigation

### useNavigation Hook

- Fetches navigation data from Supabase
- Manages loading and error states
- Automatically sorts items by ID
- Type-safe with TypeScript interfaces

## Customization

### Styling

The sidebar uses Tailwind CSS classes. Customize colors and spacing in:

- [components/navigation/Sidebar.tsx](components/navigation/Sidebar.tsx)
- [tailwind.config.js](tailwind.config.js)
- [app/globals.css](app/globals.css)

## Design System: Typography & Buttons

### Typography

- **Font family**: Inter (via `next/font/google`), applied globally in [app/layout.tsx](app/layout.tsx) using `inter.className`.
- **Base text**: `text-sm` for most body copy, inputs, and table cells.
- **Micro text**: `text-xs` for helper text, captions, badges, and uppercase labels (e.g., statistics labels, form hints).
- **Page titles**: `text-3xl font-bold` for primary page headings in [components/PageContainer.tsx](components/PageContainer.tsx).
- **Section titles / modal titles**: `text-lg`–`text-xl font-bold` for card and modal headers.
- **Numeric highlights**: `text-3xl font-bold` for key stat values in dashboard-style cards.

When adding new UI, prefer `text-sm` for readable body text, reserve `text-xs` for supporting metadata, and use `text-2xl`/`text-3xl` only for primary headings or key metrics.

### Button Sizing & Styles

The app uses a small/medium button scale with module-colored primaries and neutral secondary buttons.

- **Primary (module-colored, small)**
  - Usage: Toolbars, compact actions (e.g., calendar toolbar buttons).
  - Classes: `px-3 py-1.5 text-xs font-medium rounded-lg shadow-sm bg-{module}-600 hover:bg-{module}-700 text-white transition-colors flex items-center gap-2`.

- **Primary (module-colored, medium)**
  - Usage: Modal primary actions and key CTAs.
  - Classes: `px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm bg-{module}-600 hover:bg-{module}-700 active:bg-{module}-800 text-white transition-colors flex items-center justify-center gap-2`.

- **Secondary (neutral)**
  - Usage: Cancel / non-destructive actions next to primaries.
  - Classes: `px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm`.

- **Secondary (neutral, medium)**
  - Usage: Modal cancel/close buttons.
  - Classes: `px-4 py-2.5 text-sm font-semibold rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-650 transition-colors flex items-center justify-center gap-2`.

- **Icon buttons (small)**
  - Usage: Compact icon-only controls inside tables and toolbars.
  - Neutral icon: `p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`.
  - Module-colored icon: `p-1 text-{module}-600 hover:text-{module}-700 hover:bg-{module}-50 dark:hover:bg-{module}-900/20 rounded transition-colors`.

New pages and components should follow this typography and button scale to stay visually consistent with the existing Product and Calendar experiences.

## 🎨 Customization

### Module Color Theme

The application uses a three-module color system:

- **Integration**: Green (#16a34a / green-600) - Products, Navigation
- **Analytics**: Blue (#2563eb / blue-600) - Analytics, Reporting
- **Execution**: Purple (#9333ea / purple-600) - Calendar, Operations

### Styling Files

- [components/navigation/Sidebar.tsx](components/navigation/Sidebar.tsx) - Sidebar component
- [tailwind.config.js](tailwind.config.js) - Tailwind configuration
- [app/globals.css](app/globals.css) - Global styles

## 🚀 Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 📚 Documentation

For detailed technical documentation, architecture details, development guidelines, and design system patterns, see:

**→ [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)**

For audits, migration notes, and the full documentation index:

**→ [docs/reference/REFERENCE_FILES_INDEX.md](docs/reference/REFERENCE_FILES_INDEX.md)**

This comprehensive guide includes:

- Complete system architecture
- Detailed feature documentation
- Database schema specifications
- Security implementation
- Development guidelines & design patterns
- API documentation
- Testing strategy
- Deployment procedures

## 🔧 Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run generate:types   # Generate database types from Supabase
npm run document:schema  # Generate schema documentation
```

## 📖 Quick Reference

### Creating a New Page

1. Create route in `app/[page-name]/page.tsx`
2. Use `<PageContainer>` component with appropriate module color
3. Define custom hook in `hooks/use[Resource].ts` if needed
4. Create TypeScript interfaces in `types/[resource].ts`
5. Follow existing patterns from Calendar or Products pages

### Working with Supabase

1. Define your schema in Supabase dashboard
2. Run `npm run generate:types` to update TypeScript types
3. Use the typed `supabase` client from `lib/supabaseClient.ts`
4. Always use audit helpers for INSERT/UPDATE operations

### Adding a New Feature

1. Review [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for architecture patterns
2. Follow the module color system (Business Core/Analytics/Execution)
3. Use existing component patterns from the design system
4. Maintain TypeScript type safety throughout
5. Test in both light and dark modes

## 📄 License

MIT

---

**Need Help?** Check [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for comprehensive technical documentation and development guidelines.
