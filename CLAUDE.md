# CLAUDE.md

This file helps AI assistants and developers onboard quickly to Trity and produce high-quality, low-regression changes.

## Project Snapshot

- **Project:** Trity (enterprise multi-tenant SaaS)
- **Architecture:** Next.js App Router frontend + Supabase (Postgres, Auth, RLS)
- **Primary concerns:** tenant isolation, RBAC/permissions, typed data access, consistent premium UI patterns
- **Default local URL:** `http://localhost:3100`

## Project Structure

Key directories and what they contain:

- `app/` - Next.js routes, layouts, route-level `loading.tsx`/`error.tsx` boundaries, and API handlers under `app/api/*`. Key route groups: `admin/` (tenant admin), `products/`, `customers/`, `suppliers/`, `warehouse/`, `purchase-orders/`, `purchase-invoices/`, `purchase-reports/`, `purchase-returns/`, `goods-receipt/`, `import-export/`, `ai-lab/`, `analytics/`, `calendar/`, `navigation-manager/`, `users/`.
- `app/api/` - API routes grouped by domain: `ai/` (OpenAI integration with Upstash rate limiting), `access/` (access control endpoints), `debug-client-log/` (client-side error logging).
- `components/` - Reusable UI grouped by domain (`products`, `customers`, `suppliers`, `warehouses`, `purchase`, `priceLists`, `navigation`, `layout`, `access`, `common`, `tenants`).
- `hooks/` - Data/business hooks (`useProducts`, `useSuppliers`, `useWarehouses`, `usePurchaseOrders`, `useSupplierInvoices`, `useGoodsReceipts`, `usePermissions`, `useFeatureFlags`, etc.), typically returning list/loading/error + CRUD helpers.
- `lib/` - Shared utilities and core logic (Supabase clients, permissions, navigation, sanitization/security, import-export helpers).
- `contexts/` - React context providers, especially tenant context.
- `types/` - TypeScript domain types + generated DB types (`types/database.ts`).
- `supabase/migrations/` - SQL migrations, policies, and schema evolution.
- `supabase/verify/` and `supabase/scripts/` - SQL verification and maintenance/purge scripts.
- `scripts/` - Local tooling for dev boot checks, type generation, schema docs, release versioning.
- `docs/` and root `*.md` docs - Architecture context, schema/type guides, and implementation notes.

## Main Technologies and Frameworks

- **Frontend:** Next.js 14 App Router, React 18, TypeScript (strict mode).
- **Styling:** Tailwind CSS (`darkMode: "class"`), global styles in `app/globals.css`.
- **Backend/data:** Supabase (`@supabase/supabase-js`), PostgreSQL, RLS policies.
- **Auth:** Supabase Auth for login/session/reset-password flows.
- **AI and platform integrations:** OpenAI SDK, Upstash Redis/rate-limit.
- **Icons:** lucide-react (use exclusively; do not introduce other icon sets).
- **Sanitization runtime:** dompurify (browser) + isomorphic-dompurify (server-side) — underpins `lib/sanitization.ts`.
- **Quality:** ESLint + Prettier, Husky + lint-staged pre-commit hooks.
- **Testing:** Vitest (`vitest.config.ts`, Node environment).
- **Build/analysis:** Next build/start, optional bundle analyzer via `ANALYZE=true`.

## Important Files and Their Purposes

Core runtime and layout:

- `app/layout.tsx` - Root app shell and global wrappers.
- `app/page.tsx` - Main dashboard/home entry route.
- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/loading.tsx` - Global UX boundaries.
- `components/LayoutWrapper.tsx` - App layout composition and shell behavior.
- `components/ProtectedRoute.tsx` - Route/session gate and auth redirect behavior.
- `components/ProtectedAction.tsx` - Action-level permission gate used inline within pages.
- `components/PageContainer.tsx` - Standard page chrome used across modules.

Security, auth, tenancy, permissions:

- `contexts/TenantContext.tsx` - Effective tenant resolution and tenant context.
- `lib/supabaseClient.ts` - Primary typed Supabase client for client-side use.
- `lib/supabaseSchemaClient.ts` - Tenancy/schema wrapper abstractions for data access.
- `lib/api/requireBearer.ts` - Bearer-token validation helper for API routes.
- `lib/permissions.ts` - Role/permission utilities and normalization patterns.
- `lib/permissionResolver.ts` - Permission resolution across role/user/group grants.
- `lib/accessControl.ts` - Access control helpers used alongside the permission system.
- `lib/featureFlags.ts` / `hooks/useFeatureFlags.ts` - Feature flag system; check before gating new capabilities.

Navigation and platform behavior:

- `components/navigation/Sidebar.tsx` - Main dynamic workspace navigation.
- `lib/navigation-hierarchy.ts` - Position-based hierarchy utilities.
- `lib/navigation-default.ts`, `lib/navigationSeed.ts`, `lib/navigationPillars.ts` - Navigation defaults and pillar structure.

Key lib utilities:

- `lib/premiumUi.ts` - Premium UI class helpers for consistent card/panel/badge styling — check here before writing custom Tailwind strings.
- `lib/validation.ts` - Input validation utilities.
- `lib/tenantCache.ts` - Tenant data caching layer.
- `lib/statusConfig.ts` - Shared status label/color configuration used across modules.
- `lib/importExport/core.ts` + `lib/importExport/io.ts` - Import/export pipeline (CSV only; `io.ts` is the sole static papaparse importer).

Data model and docs:

- `types/database.ts` - Generated Supabase DB types.
- `types/*.ts` - Domain models (`product`, `customer`, `supplier`, `warehouse`, etc.).
- `TRITY_CONTEXT.md` - Current architecture/convention context for AI/developers.
- `README.md` - Setup and command quick start.
- `REFERENCE_FILES_INDEX.md` - Index of high-value docs.
- `docs/TYPE_GENERATION.md` - Type generation workflow details.
- `docs/SCHEMA_ISOLATION_IMPLEMENTATION.md` / `SCHEMA_ISOLATION_SETUP.md` - Schema isolation architecture.
- `docs/PRODUCTS_MODULE_SCHEMA.md` - Products domain schema reference.
- `docs/TEMPLATE_TENANT_PROVISIONING.md` - Template tenant setup and provisioning.
- `docs/SECURITY_AUDIT.md` - Security audit notes and findings.
- `docs/SUPABASE_OPTIMIZATION_SUMMARY.md` - Supabase query/performance optimization notes.

## Coding Conventions and Patterns

### TypeScript and React

- Use strict TypeScript and explicit interfaces/types at boundaries.
- Use `'use client'` only where hooks/interactivity are required.
- Keep route files as `app/<route>/page.tsx` (App Router conventions).
- Use `@/*` absolute import alias from repo root (from `tsconfig.json`).
- Prefer feature/domain grouping over technical scattering (e.g., `components/products/*`).

### Data access and hooks

- Hooks are the primary UI data access layer (`hooks/use*.ts`).
- Common hook shape: list data + loading + error + CRUD/mutate + refresh.
- Tenant-scoped queries should include tenant filtering (usually `.eq('tenant_id', effectiveTenantId)`).
- Keep DB-facing fields snake_case where matching Supabase row shape to avoid brittle mapping.

### Permissions and security

- Use route-level gating (`ProtectedRoute`) and action-level permission checks (`ProtectedAction`/permission helpers).
- Prefer centralized permission logic in `lib/permissions.ts` and resolver utilities instead of ad-hoc checks.
- API routes should validate bearer/session context before data mutations (`lib/api/requireBearer.ts`).
- Keep input sanitization and security utilities in `lib/sanitization.ts` and `lib/security.ts` patterns.

### Styling and UI consistency

- Tailwind utilities are the default styling approach.
- Reuse existing premium/page primitives before creating new styling patterns.
- Preserve dark mode compatibility and existing module/pillar visual language.

### Lint and bundle guardrails

From `.eslintrc.json`:

- `xlsx` is restricted everywhere.
- Static `papaparse` imports are restricted to allowlisted files (`lib/csvDownload.ts` and `lib/importExport/io.ts`).
- `@typescript-eslint/no-explicit-any` is warning-level (with narrow file-specific overrides).

## How to Run, Build, Test

Install dependencies:

```bash
npm install
```

Local development:

```bash
npm run dev
```

- Default dev port is `3100` (Turbopack).
- Useful alternates: `npm run dev:webpack`, `npm run dev:3101`, `npm run dev:3000`.
- If the dev server behaves strangely, use `npm run dev:clean` to wipe `.next` and restart.

Build and run:

```bash
npm run build
npm start
```

Lint and tests:

```bash
npm run lint
npm test           # run once
npm run test:watch # watch mode
```

Schema/type and docs tooling:

```bash
npm run generate:types
npm run document:schema
```

Release versioning:

```bash
npm run release:patch  # bump patch, commit, and tag
npm run release:minor
npm run release:major
```

Bundle analysis:

```bash
npm run analyze
```

Windows-specific analyzer alternative:

```bash
npm run analyze:win
```

## Important Context for Future Work

- This repo is actively evolving and may have many concurrent unstaged/untracked changes; make focused edits and avoid broad refactors unless requested.
- Multi-tenant correctness is critical. Preserve RLS assumptions and tenant scoping in all new queries and APIs.
- Permission behavior is layered (role + direct grants + group grants + feature flags). Prefer existing resolvers over custom logic.
- Supabase schema changes should be migration-first (`supabase/migrations/*`) and followed by type regeneration.
- Reuse existing domain patterns when adding new entities: `app/<entity>`, `components/<entity>`, `hooks/use<Entity>.ts`, `types/<entity>.ts`.
- Read these first before major work: `TRITY_CONTEXT.md`, `README.md`, `REFERENCE_FILES_INDEX.md`, and relevant `docs/*` notes.

## Suggested Workflow for AI Assistants

1. Read `TRITY_CONTEXT.md` and `README.md` first.
2. Locate the target feature domain under `app/`, `components/`, `hooks/`, and `lib/`.
3. Follow existing naming and hook/data-access patterns before introducing new abstractions.
4. Keep changes minimal and tenant-safe; avoid touching unrelated areas.
5. Run lint/tests relevant to the changes before finalizing.

## Claude Review Feedback Format

When Claude reviews code, feedback should be structured as:

1. **Findings first (highest severity first):**
   - Bugs, regressions, security issues, permission/tenant leaks, data integrity risks, and missing tests.
   - Include file paths and concise evidence.
2. **Open questions/assumptions:**
   - Clarify uncertain requirements or potential edge-case ambiguities.
3. **Brief change summary last:**
   - One short section summarizing what was changed and why.

If no major findings exist, state that explicitly and call out residual risk/testing gaps.
