# 🚀 SaaS Launch Guide — Trity

A step-by-step guide to launching your own SaaS product using the Trity platform.

---

## Overview

Trity is a ready-to-use enterprise SaaS boilerplate built on **Next.js 14**, **Supabase**, and **TypeScript**. It ships with:

- ✅ Multi-tenant architecture with full data isolation
- ✅ Role-Based Access Control (RBAC) — 3 tiers, 15 permissions
- ✅ User invitations, team groups, and tenant settings
- ✅ Audit logging and feature flags
- ✅ Dynamic navigation system
- ✅ Product, calendar, workstream, and OKR modules
- ✅ Dark mode and responsive design

This guide walks you through every stage: from provisioning your accounts to going live with your first paying tenant.

---

## Stage 1 — Prerequisites

Before you write a single line of code, gather the following:

| Requirement | Details |
|---|---|
| **Node.js 18+** | [nodejs.org](https://nodejs.org) |
| **npm 9+** | Bundled with Node.js |
| **Supabase account** | [supabase.com](https://supabase.com) — free tier is sufficient to start |
| **Vercel account** (recommended) | [vercel.com](https://vercel.com) — free tier available |
| **Git** | For version control |
| **Custom domain** (optional) | Any domain registrar (Namecheap, GoDaddy, etc.) |

---

## Stage 2 — Set Up the Database (Supabase)

Supabase is your backend: database, auth, storage, and realtime — all in one.

### 2.1 Create a New Supabase Project

1. Log in to [supabase.com](https://supabase.com) and click **New project**.
2. Give it a name (e.g., `my-saas-prod`).
3. Choose the region closest to your users.
4. Set a strong database password and save it securely.

### 2.2 Run Database Migrations

All schema migrations live in `supabase/migrations/`. Apply them via the Supabase SQL editor:

1. In your Supabase dashboard, open **SQL Editor**.
2. Open each `.sql` file inside `supabase/migrations/` in chronological order.
3. Paste and run each one.

> **Tip:** The authoritative schema reference is:  
> `types/Supabase Snippet Public Schema Column Catalog.csv`

### 2.3 Copy Your API Keys

From your Supabase project dashboard, go to **Settings → API** and copy:

- **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
- **Anon / Public key** — starts with `sb_publishable_...`

You will need these in the next stage.

### 2.4 Enable Row-Level Security (RLS)

For a production launch, enable RLS on every table to enforce tenant isolation at the database level:

```sql
-- Example: enable RLS on the products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Example policy: tenants can only see their own data
CREATE POLICY "tenant_isolation" ON products
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

See `SUPABASE_SECURITY_FIXES.md` for a full RLS setup checklist.

---

## Stage 3 — Configure the Application

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Set Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your_key_here
```

> **Security note:** Never commit `.env.local` to version control. It is already listed in `.gitignore`.

### 3.3 Generate TypeScript Types

Sync your TypeScript types with the live database schema:

```bash
npm run generate:types
```

Re-run this command any time you add or change database tables.

### 3.4 Verify the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the Trity dashboard.

---

## Stage 4 — Customise for Your SaaS

### 4.1 Brand Your Application

Update the following to reflect your product name and colours:

| File | What to change |
|---|---|
| `app/layout.tsx` | Page `<title>` and metadata |
| `tailwind.config.js` | Brand colour palette |
| `app/globals.css` | Global CSS overrides |
| `components/navigation/Sidebar.tsx` | Logo and sidebar header |
| `public/` | Favicon and logo assets |

### 4.2 Enable Only the Modules You Need

Trity ships with several modules. Disable the ones your SaaS doesn't require by toggling feature flags in the `tenants.settings` JSON column:

```json
{
  "product_management": true,
  "okrs": false,
  "workstreams": true,
  "advanced_calendar": false
}
```

Feature flags can be managed from **Tenant Settings → Features** once you are logged in as a Super Admin.

### 4.3 Configure the Navigation

Use the built-in **Navigation Manager** (`/navigation-manager`) to:

- Add, rename, or remove navigation items.
- Reorder items using drag-and-drop.
- Nest items to any depth using the dot-notation position system.

### 4.4 Set Up Supabase Authentication

Trity uses Supabase Auth. Enable and configure your preferred sign-in methods in the Supabase dashboard under **Authentication → Providers**:

- **Email + password** — recommended for most SaaS products.
- **Magic link** — passwordless, great for low-friction onboarding.
- **OAuth providers** — Google, GitHub, etc. — ideal if your audience already uses these.

After enabling a provider, update the redirect URL to your production domain in **Authentication → URL Configuration**.

---

## Stage 5 — Set Up Multi-Tenancy

### 5.1 Create Your First Tenant

Every user in Trity belongs to a **tenant** (organisation). To create your first tenant:

1. Go to **Admin → Tenants** in the dashboard.
2. Click **New Tenant** and fill in the name and settings.
3. Note the tenant `id` (UUID) — you will reference this when adding users.

### 5.2 Invite Your First Users

1. Go to **Users** in the dashboard.
2. Click **Invite User** and enter their email address.
3. Assign them a role:
   - **Member** — read-only access to enabled modules.
   - **Admin** — can manage users and settings within the tenant.
   - **Super Admin** — full platform access, including feature flags and multi-tenant management.

The invited user will receive an email with a sign-up link (powered by Supabase Auth).

### 5.3 Organise Users into Groups

Use **Users → Groups** to create teams. Groups help you:

- Scope workstreams and OKRs to specific teams.
- Simplify bulk permission management.
- Reflect your organisational structure inside the product.

---

## Stage 6 — Deploy to Production

### 6.1 Deploy with Vercel (Recommended)

Vercel is the fastest path to a production deployment for Next.js apps:

1. Push your repository to GitHub (or GitLab / Bitbucket).
2. Log in to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your repository.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**.

Vercel will automatically build and deploy on every push to your main branch.

### 6.2 Alternative: Self-Hosted Node.js

If you prefer to host on your own infrastructure (AWS, GCP, DigitalOcean, etc.):

```bash
# Build the production bundle
npm run build

# Start the production server
npm start
```

The app listens on port `3000` by default. Place it behind a reverse proxy (nginx or Caddy) for HTTPS.

### 6.3 Connect a Custom Domain

#### Vercel

1. In your Vercel project, go to **Settings → Domains**.
2. Add your domain (e.g., `app.yourproduct.com`).
3. Follow the DNS instructions (usually a CNAME or A record).

#### Supabase Auth — Update Redirect URLs

After connecting your domain, update Supabase Auth redirect URLs to prevent login errors:

1. Open your Supabase project → **Authentication → URL Configuration**.
2. Set **Site URL** to `https://app.yourproduct.com`.
3. Add `https://app.yourproduct.com/**` to the **Redirect URLs** allow-list.

### 6.4 Verify Security Headers

`next.config.js` ships with production-ready security headers:

- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy: strict-origin-when-cross-origin`

Run a header check after deploying using [securityheaders.com](https://securityheaders.com).

---

## Stage 7 — Pre-Launch Checklist

Work through this checklist before you announce your product:

### Infrastructure
- [ ] Supabase project created and migrations applied
- [ ] RLS policies enabled on all tables
- [ ] Environment variables set in production (not in source code)
- [ ] Custom domain connected with valid SSL certificate
- [ ] Supabase Auth redirect URLs updated to production domain

### Application
- [ ] Branding updated (name, logo, colours, favicon)
- [ ] Only relevant modules enabled via feature flags
- [ ] Navigation customised for your use case
- [ ] Dark mode tested
- [ ] Responsive layout tested on mobile

### Users & Tenants
- [ ] First tenant created
- [ ] Super Admin account created and verified
- [ ] Invite flow tested end-to-end (invite → email → sign-up → dashboard)
- [ ] RBAC roles tested (member, admin, super_admin behaviours verified)

### Security
- [ ] `.env.local` not committed to version control
- [ ] RLS policies verified with a test tenant
- [ ] Audit logging confirmed to be writing records
- [ ] Security headers verified at [securityheaders.com](https://securityheaders.com)

### Performance
- [ ] Production build (`npm run build`) completes without errors
- [ ] Supabase query performance reviewed (see `SUPABASE_PERFORMANCE_FIXES.md`)
- [ ] No N+1 queries in high-traffic pages

---

## Stage 8 — Post-Launch Operations

### Onboarding New Tenants

For each new customer:

1. Create a new **Tenant** record in Admin → Tenants.
2. Invite the customer's admin user and assign the **Admin** role.
3. The customer's admin can then invite their own team members.
4. Enable the features relevant to their subscription tier via feature flags.

### Monitoring & Audit Logs

- The **Audit Logs** table captures every create, update, and delete action with user, timestamp, and a diff of changes.
- Access audit logs from the Supabase dashboard → **Table Editor → audit_logs**, or build a UI view using the `view_audit_logs` permission.

### Scaling the Database

As your tenant count grows:

- Add database indexes for any new `tenant_id` filter columns.
- Consider Supabase **Connection Pooler** (PgBouncer) for high-concurrency workloads.
- Review the Supabase dashboard → **Reports** for slow queries.

### Continuous Deployment

With Vercel + GitHub, every merge to `main` triggers an automatic production deployment. Use **Preview Deployments** for every pull request so you can test changes before they reach production.

---

## Useful Commands Reference

```bash
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Build production bundle
npm start                # Run production server
npm run lint             # Run ESLint
npm run generate:types   # Regenerate TypeScript types from Supabase schema
npm run document:schema  # Generate schema documentation
```

---

## Further Reading

| Document | Contents |
|---|---|
| [`README.md`](README.md) | Quick-start and project overview |
| [`PROJECT_DOCUMENTATION.md`](PROJECT_DOCUMENTATION.md) | Full technical architecture |
| [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) | RBAC and access control deep-dive |
| [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md) | Permission matrix quick reference |
| [`SUPABASE_SECURITY_FIXES.md`](SUPABASE_SECURITY_FIXES.md) | RLS and security hardening |
| [`SUPABASE_PERFORMANCE_FIXES.md`](SUPABASE_PERFORMANCE_FIXES.md) | Query optimisation guide |

---

## 🎉 You're Live!

Once all checklist items are ticked, your SaaS is ready for customers. Start onboarding your first tenants and iterate based on their feedback.

For questions about architecture decisions or extending the platform, refer to [`TRITY_CONTEXT.md`](TRITY_CONTEXT.md) or open a GitHub issue.
