# Housekeeping Audit Summary

**Date:** January 26, 2025  
**Last Updated:** January 31, 2026  
**Scope:** Frontend codebase only. No database or Supabase schema changes.

---

## 1. Architecture (Verified)

- **Auth & session:** `TenantContext` (via `TenantProvider` in `AppProviders`) – single source. Session from `getSession()` at boot; `onAuthStateChange` for sign-in/out. Session refresh (e.g. tab return) does **not** trigger profile/tenant/features reload.
- **Profile:** `TenantContext` holds `profile`; `useProfile` wraps it and adds `updateProfile`. Profile loaded once and cached.
- **Tenant ID:** `TenantContext` holds `tenant_id`; cached in localStorage for rehydration.
- **Features (navigation):** `TenantContext` holds `navigationItems`; Sidebar reads from `useTenant()`. Single source.
- **Routing:** Root `layout` → `AppProviders` → `LayoutWrapper` → `Sidebar` + `Main` (children). Layout does not unmount on navigation. No pathname/router deps in TenantContext.
- **Providers:** `AppProviders` → `TenantProvider` only. No extra auth/nav providers.

---

## 2. Removed

### 2.1 Unused files (deleted)

| Item | Reason |
|------|--------|
| `hooks/useProducts_old.ts` | Deprecated; replaced by `useProducts`. Not imported anywhere. |
| `hooks/useNavigation.ts` | Unused. Navigation comes from `TenantContext` (`navigationItems`). Sidebar uses `useTenant()`, not `useNavigation`. |
| `components/AddCategoryModal.tsx` | Not imported anywhere. |
| `components/SectionSkeleton.tsx` | Not imported anywhere. |
| `components/LoadingSkeleton.tsx` | Only used by `SectionSkeleton`; removed with it. |
| `components/RouteErrorBoundary.tsx` | Not imported anywhere. |
| `components/ErrorBoundary.tsx` | Only used by `RouteErrorBoundary`; removed with it. |
| `app/test-supabase/page.tsx` | Temporary Supabase connection test page. |
| `app/diagnostics/page.tsx` | Temporary diagnostics page. |
| `lib/productRepository.ts` | Not imported. Product CRUD lives in `useProducts` + Supabase. |
| `lib/audit.ts` | Only used by `productRepository`; removed with it. |

### 2.2 Unused code inside files

| File | Change |
|------|--------|
| `components/ProtectedRoute.tsx` | Removed unused exports: `useAuth`, `useRequireRole`, `withAuth`, `AuthOnly`, `GuestOnly`. None were imported. Kept `ProtectedRoute` only. |
| `components/navigation/Sidebar.tsx` | Removed commented-out auto-collapse block, `findParentForPath`, `prevPathnameRef`, and the `useEffect` that only synced pathname. Dropped `useEffect` / `useRef` imports. |
| `components/projects/WorkstreamTaskModal.tsx` | Added missing `useTenant` import (it was used but not imported). |

### 2.3 Empty route folders

- `app/test-supabase/` and `app/diagnostics/` are now empty (pages deleted). If your environment can remove them, delete these folders manually. Otherwise they will 404 as there is no `page.tsx`.

---

## 3. Consolidations

| Change | Details |
|--------|---------|
| **Navigation / features** | Removed `useNavigation`. `TenantContext` is the only source for `navigationItems`. Sidebar uses `useTenant().navigationItems`. |
| **Auth helpers** | Removed `useAuth`, `useRequireRole`, `withAuth`, `AuthOnly`, `GuestOnly`. Pages use `ProtectedRoute` + `useTenant` directly. |

No duplicate hooks or providers remain for session, profile, `tenant_id`, or features.

---

## 4. Candidates for removal (manual confirmation)

Review before deleting:

| Item | Notes |
|------|--------|
| `lib/validation.ts` | Not imported. Generic validation helpers; may be used for future forms/signup. |
| `lib/sanitization.ts` | Not imported. Input sanitization; may be used later. |
| `lib/security.ts` | Not imported. CSRF etc.; may be used later. |
| `docs/guides/AI_PROMPT.md` | Reference only. |
| `MIGRATION_GUIDE_depends_on_workstream_id.md` | Migration guide. |
| `PROJECT_DOCUMENTATION.md` | Project docs. |
| `TRITY_CONTEXT.md` | Context docs. |
| `schema_analysis_report.md` | Schema analysis. |
| `supabase-multi-tenant-audit-report.md` | Audit report. |
| `docs/database/Supabase Snippet Public Schema Column Catalog.csv` | Schema reference. |

---

## 5. Preserved (do not remove)

- **Login, tenant, features:** All active login, tenant, and feature flows unchanged.
- **`useProfile`:** Used by profile, users, tenant-settings. Wraps TenantContext + update.
- **`LayoutSkeleton`:** Used by `LayoutWrapper` during rehydration.
- **`PageContainer`:** Used across pages.
- **All hooks** except `useNavigation` and `useProducts_old` are used.
- **All libs** except `audit` and `productRepository` are used or kept as candidates above.
- **Navigation:** Still driven by DB (`navigation` table); TenantContext fetches and caches it. `navigation-updated` listener kept.

---

## 6. Summary

- **Removed:** 11 files, 5 unused exports from `ProtectedRoute`, Sidebar cleanup, 1 missing-import fix.
- **Consolidated:** Navigation/features via TenantContext only; auth helpers removed in favor of `ProtectedRoute` + `useTenant`.
- **Candidates:** 3 lib modules + several docs/reference files; confirm before removal.
- **Stability:** No changes to DB, Supabase, or working auth/tenant/feature behavior. Layout and navigation remain instant without extra re-fetches.
