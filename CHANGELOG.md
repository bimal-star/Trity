# Changelog

All notable project changes are recorded here.

## 0.4.0 - 2026-05-25

Based on commits since `v0.3.2`.

### Features

- feat: nav redesign with BOM, cost card, logistics, and tenant document codes
- feat(products): premium record detail, image gallery, and usage flags
- Feature: Category UI change
- Feature: Category schema change

### Documentation

- docs: tidy SQL and reference documentation navigation (#3)

### Build & Chore

- chore(release): v0.3.3
- chore: stop tracking Claude Code local settings; gitignore settings.local.json

### Other

- Product UI changes
- Top Nav fixes and UI cleanup
- stable snapshot before nav redesign
- Super-admin tenant impersonation with RLS, audit, and dev auto-attach (#4)
- Add migration to extend tenant_role enum with super_admin
- Wire tenant context and UI for super-admin impersonation
- Add impersonation API routes and client helpers
- Add tenant impersonation migration and audit table types

## 0.3.3 - 2026-04-26

Based on commits since `v0.3.2`.

### Features

- Feature: Category UI change
- Feature: Category schema change

### Documentation

- docs: tidy SQL and reference documentation navigation (#3)

### Other

- Top Nav fixes and UI cleanup
- stable snapshot before nav redesign
- Super-admin tenant impersonation with RLS, audit, and dev auto-attach (#4)
- Add migration to extend tenant_role enum with super_admin
- Wire tenant context and UI for super-admin impersonation
- Add impersonation API routes and client helpers
- Add tenant impersonation migration and audit table types

## 0.3.2 - 2026-04-19

Based on commits since `v0.3.1`.

### Other

- pre-UI-polish snapshot

## Unreleased

### Bundle analyzer follow-ups

- **API auth:** Removed root `middleware.ts` (edge bundle). `/api/*` routes use `parseBearerToken` from `lib/api/requireBearer.ts` and return `401` when `Authorization: Bearer` is missing or invalid; `OPTIONS` handlers return `204` where needed.
- **Import/export:** Split `lib/importExport/core.ts` (pure logic) and `lib/importExport/io.ts` (CSV via dynamic `papaparse`). `lib/importExportUtils.ts` re-exports core only; callers load I/O with `await import('@/lib/importExport/io')`. **Excel / `xlsx` removed** — CSV only for imports, exports, and list downloads (`ExportFormatDropdown` is a single “Export CSV” action).
- **OpenAI / IDNA data:** `lib/openaiServer.ts` uses a cached dynamic `import('openai')` so `tr46` / `mappingTable.json` ship in a dedicated server chunk, not as a static dependency of every server module.

**Bundle analyzer (`npm run analyze`, Next 14.0.4, `webpack-bundle-analyzer` static HTML under `.next/analyze/`) — after these changes**

| Target                       | Before (baseline)                                                                                           | After (parsed, this run)                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Edge / `middleware.js`       | Prior root middleware pulled `next/server` on the edge runtime (large parsed middleware entry in analyzer). | **No edge webpack bundle** — `edge.html` has empty `chartData` (middleware removed).                                                |
| `papaparse`                  | Eagerly tied to shared import/export module graph.                                                          | **Client:** ~19 KB parsed in dedicated async chunk (e.g. `1812.*.js`). **Node:** ~21 KB parsed in chunk `9156.js`.                  |
| `tr46` / `mappingTable.json` | Pulled with static `openai` imports into broad server graphs.                                               | **~260 KB parsed** for `mappingTable.json` under chunk `7066.js` alongside `openai` (loaded when AI routes execute dynamic import). |

Reproduce module paths from reports: `node scripts/parse-analyze-html.cjs`.

## 0.2.3 - 2026-04-11

### Summary

- **Admin / tenants:** Tenant create–edit flow uses a dedicated form route with premium layout (sticky header save, full-width sections). Header save action is extracted for reliable Turbopack/SWC parsing; form submit uses an explicit `FormEvent` type import.
- **Dev experience:** `scripts/ensure-next-dev-static.cjs` runs before `next dev` (via `predev` / `predev:*` hooks and `dev:3101`) so `.next/static/development` exists and Next is less likely to hit ENOENT on `_buildManifest.js.tmp.*` (internal server errors after partial `.next` cleanup).
- **Platform data:** Subscription packages table and tenant `subscription_package_id` wiring (migrations under `supabase/migrations/`), super-admin navigation and admin UI hooks as implemented in-app.
- **Versioning:** Patch bump with changelog and README quick-start alignment (dev port `.env.local` instructions).

## 0.2.2 - 2026-04-10

### Summary

- **Supabase:** `provision_tenant_from_template` now maps template `role_resource_grants.role` values to canonical tenant roles (aligned with `lib/permissions` `normalizeTenantRole`). `role_resource_grants_role_check` allows `member`, `admin`, and `super_admin`; migration backfills and deduplicates existing rows before applying the constraint (see `supabase/migrations/20260415150000_fix_role_resource_grants_provision.sql`).
- **App:** Removed the bottom dev host ribbon (`DevHostRibbon`), `/api/debug-client-log`, `lib/clientDebugLog`, local debug ingest `fetch` calls, and `scripts/debug-session-log.cjs` usage from `next.config.js` / `check-dev-port.cjs`. The platform super-admin **Viewing workspace** banner at the top of the layout is unchanged.

### Features

- feat(products): polish catalog UI (selection, tabs, modal, confirmations)

### Other

- Remove `.env.credentials` from repo
- Remove committed env secrets
- Historical: multi-tenant data isolation with `tenant_id` filtering and RLS (milestone tagged v1.1.0 in commit history)
