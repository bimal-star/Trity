# Trity

A modern enterprise SaaS platform with Role-Based Access Control (RBAC), dynamic navigation, and multi-tenant support powered by Supabase.

## Quick Start

### Prerequisites

- Node.js 18+
- A Supabase account

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.credentials` to `.env.local` and configure your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. **Generate database types:**

```bash
npm run generate:types
```

4. **Start development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Features

- **Dynamic Navigation** with position-based hierarchy (dot-notation)
- **Navigation Manager** with drag-and-drop reordering
- **RBAC** with 3-tier hierarchy (Member / Admin / Super Admin) and 15 granular permissions
- **Multi-tenant architecture** with per-tenant schema isolation
- **Product management** with categories, pricing, barcodes, variants, BOMs
- **Calendar operations** with year-based views and inline editing
- **Customer management** with ERP-style entity/contact separation
- **Audit logging** of all significant user actions
- **Feature flags** per tenant
- **Dark mode** with full light/dark theme support
- **TypeScript** with auto-generated Supabase types
- **Next.js 14** App Router with Tailwind CSS

## Project Structure

```
trity/
├── app/                           # Next.js 14 App Router
│   ├── layout.tsx                 # Root layout with Sidebar
│   ├── page.tsx                   # Dashboard / Home
│   ├── analytics/                 # Analytics Pillar (Blue)
│   ├── products/                  # Business Core Pillar (Green)
│   ├── customers/
│   ├── calendar/                  # Execution Pillar (Purple)
│   ├── admin/tenants/             # Administration (Gray)
│   ├── users/
│   │   └── access/
│   ├── tenant-settings/
│   ├── navigation-manager/
│   ├── import-export/
│   ├── profile/                   # Account
│   ├── login/
│   └── reset-password/
│
├── components/                    # Reusable components
│   ├── PageContainer.tsx          # Standard page wrapper with module colors
│   ├── ProtectedRoute.tsx         # Route protection
│   ├── ProtectedAction.tsx        # Permission-aware actions
│   ├── navigation/Sidebar.tsx     # Dynamic sidebar (3-pillar structure)
│   └── products/                  # Product components
│
├── hooks/                         # Custom React hooks
├── lib/                           # Shared utilities
├── contexts/                      # React contexts
├── types/                         # TypeScript definitions
├── providers/                     # Context providers
├── scripts/                       # Build & utility scripts
├── supabase/migrations/           # Database migrations (SQL)
├── docs/                          # All project documentation
│
├── TRITY_CONTEXT.md               # Architecture & developer context
├── PROJECT_DOCUMENTATION.md       # Comprehensive technical docs
└── Configuration files            # package.json, tsconfig, tailwind, etc.
```

## Three-Pillar Navigation System

| Pillar | Color | Modules |
|--------|-------|---------|
| **Analytics** | Blue | Forecast, Cost File, Inventory |
| **Business Core** | Green | Products, Customers, Suppliers, Warehouse, Orders |
| **Execution** | Purple | Calendar, Scheduler |
| **Administration** | Gray | Users, Groups, Settings, Navigation Manager, Import/Export |
| **Account** | Gray | Profile |

## Database

Database schema is documented in [`docs/supabase-public-schema-catalog.csv`](docs/supabase-public-schema-catalog.csv).

Migrations live in `supabase/migrations/`. See [docs/](docs/) for Supabase optimization and security documentation.

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run generate:types   # Generate database types from Supabase
npm run document:schema  # Generate schema documentation
```

## Design System

**Font:** Inter (via `next/font/google`)

**Typography scale:** `text-xs` (captions) → `text-sm` (body) → `text-lg`/`text-xl` (section titles) → `text-3xl` (page titles)

**Module colors:** Green (Business Core), Blue (Analytics), Purple (Execution), Gray (Admin)

All components must support dark mode using Tailwind's `dark:` variant.

See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for the full design system specification.

## Documentation

- **[TRITY_CONTEXT.md](TRITY_CONTEXT.md)** — Architecture, conventions, and AI/developer context
- **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)** — Comprehensive technical documentation
- **[docs/](docs/)** — All other documentation (Supabase, RBAC, schema, design)

## License

MIT
