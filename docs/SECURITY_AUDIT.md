# Security audit — Trity (VSCode-Trity-LIVE)

**Scope:** Application code and configuration as of the audit date. **No secret values** appear in this document — variable **names** only.

**Method:** Static review of Next.js App Router API routes, Supabase usage, OpenAI integration, `next.config.js`, and representative SQL migrations.

---

## 1. API key management

### 1.1 OpenAI API key

- **Storage:** `OPENAI_API_KEY` is read from the server environment inside route handlers (not prefixed with `NEXT_PUBLIC_`, so it is **not** bundled to the browser).
- **Access:** Chat and Assistant routes read the key with `process.env.OPENAI_API_KEY?.trim()` and pass it into a server-side client factory.

```69:76:app/api/ai/chat/route.ts
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is not configured for AI (missing OPENAI_API_KEY).' },
      { status: 503 }
    );
  }
```

```47:54:app/api/ai/assistant/route.ts
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is not configured for AI (missing OPENAI_API_KEY).' },
      { status: 503 }
    );
  }
```

- **Related OpenAI configuration (server):** `OPENAI_ORG_ID` and `OPENAI_PROJECT_ID` are optional; `OPENAI_ASSISTANT_ID` is required for the Assistant route. All are read via `process.env` on the server.

```6:14:lib/openaiServer.ts
export function createOpenAIClient(apiKey: string): OpenAI {
  const organization = process.env.OPENAI_ORG_ID?.trim() || undefined;
  const project = process.env.OPENAI_PROJECT_ID?.trim() || undefined;
  return new OpenAI({
    apiKey,
    ...(organization ? { organization } : {}),
    ...(project ? { project } : {}),
  });
}
```

### 1.2 Supabase keys

- **Browser / shared client:** `lib/supabaseClient.ts` uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are embedded in client bundles and are **expected** for Supabase’s anon + RLS model.

```4:16:lib/supabaseClient.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
// ...
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

- **API routes:** Handlers resolve URL + anon key through `getSupabaseUrlAndAnonKey()`, which prefers `NEXT_PUBLIC_*` but also accepts `SUPABASE_URL` and `SUPABASE_ANON_KEY` for deployments that want server-only names.

```6:17:lib/supabasePublicEnv.ts
export function getSupabaseUrlAndAnonKey(): { url: string; anonKey: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    '';
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
```

- **Service role:** `SUPABASE_SERVICE_ROLE_KEY` appears only in `scripts/get-tenant-id.js` (CLI/script context). It is **not** referenced in `app/` API routes in this audit.

### 1.3 Other secrets / credential loading

- **`next.config.js`** loads standard Next env files, then merges **`.env.credentials`** so keys can live outside default Next env files. Values from `.env.local` / standard env **take precedence** when already set (non-empty).

```5:47:next.config.js
loadEnvConfig(projectDir);
mergeEnvFromFile('.env.credentials');
```

- **`NEXT_PUBLIC_TEMPLATE_TENANT_ID`** is used for template-tenant resolution (see `lib/templateTenant.ts`); the `NEXT_PUBLIC_` prefix means it is **exposed to the client** if set.

---

## 2. API route protection

### 2.1 Inventory

The repository defines **three** App Router API handlers:

| Route                     | File                             |
| ------------------------- | -------------------------------- |
| `POST /api/ai/chat`       | `app/api/ai/chat/route.ts`       |
| `POST /api/ai/assistant`  | `app/api/ai/assistant/route.ts`  |
| `POST /api/access/update` | `app/api/access/update/route.ts` |

### 2.2 Authentication pattern (all three)

1. Parse `Authorization: Bearer <access_token>`.
2. Create a Supabase client with the **anon key** and `global.headers.Authorization` set to that bearer token.
3. Call `supabase.auth.getUser()`; reject with **401** if missing/invalid.

Example (chat):

```86:98:app/api/ai/chat/route.ts
  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
```

### 2.3 Authorization beyond “logged in”

- **`/api/access/update`:** After authentication, the handler loads `user_profiles`, resolves admin/super_admin, and enforces tenant scope (non–super-admin cannot set `target_tenant_id` outside their own tenant).

```91:107:app/api/access/update/route.ts
    const isAdmin =
      currentResolvedRole === 'admin' || currentResolvedRole === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // ...
    if (!isPlatformSuper && tenantScope !== currentProfile.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
```

- **`/api/ai/chat` and `/api/ai/assistant`:** Any **valid** Supabase session is sufficient. There is **no** check for tenant, role, or feature flag in these routes.

### 2.4 Next.js `middleware`

- **No `middleware.ts` / `middleware.js`** was found at the project root. Edge middleware is **not** used for auth, rate limits, or route gating.

### 2.5 “Unprotected” API surface

- There are **no** public API routes without the bearer + `getUser()` check among the three handlers.
- **Residual risk:** AI endpoints are **authenticated but not role-scoped** — any logged-in user can consume OpenAI quota and send arbitrary chat content (see §6).

---

## 3. Data flow to OpenAI

### 3.1 Chat completions (`POST /api/ai/chat`)

**Sent to OpenAI:**

- The `messages` array from the JSON body, after validation: roles limited to `user` | `assistant` | `system`, non-empty string content, max **30** messages, max **12 000** characters per message (`normalizeMessages`).

```27:40:app/api/ai/chat/route.ts
function normalizeMessages(raw: unknown): { role: ChatRole; content: string }[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: { role: ChatRole; content: string }[] = [];
  for (const item of raw as IncomingMessage[]) {
    const role = item?.role;
    const content = item?.content;
    if (role !== 'user' && role !== 'assistant' && role !== 'system') return null;
    if (typeof content !== 'string' || !content.trim()) return null;
    const trimmed = content.trim();
    if (trimmed.length > MAX_MESSAGE_CHARS) return null;
    out.push({ role, content: trimmed });
  }
  if (out.length > MAX_MESSAGES) return null;
  return out;
}
```

- **`model`:** Taken from the request body if non-empty string; otherwise defaults to `gpt-4o-mini`. **There is no server-side allowlist** — a client can request another model string OpenAI accepts.

```129:130:app/api/ai/chat/route.ts
  const model =
    typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;
```

- **`include_project_docs === true`:** Server loads fixed documentation excerpts and merges them into the system message (or prepends a system message).

```122:127:app/api/ai/chat/route.ts
  const includeProjectDocs = body.include_project_docs === true;
  let messagesForModel = messages;
  if (includeProjectDocs) {
    const docs = await loadProjectDocsContext();
    messagesForModel = mergeProjectDocsIntoMessages(messages, docs);
  }
```

**Project docs loader (no user-controlled paths):**

```7:13:lib/projectDocsContext.ts
const ALLOWED_FILES = [
  'README.md',
  'TRITY_CONTEXT.md',
  'SUPABASE_INTEGRATION_STATUS.md',
  'QUICK_REFERENCE.md',
] as const;
```

**Not automatically included:** Tenant names, user PII from the database, or `user_profiles` are **not** injected by the server into prompts. **However**, the **client** supplies system + user messages; users can paste sensitive data themselves.

**Client usage (AI Lab):** The page wraps content in `ProtectedRoute`, attaches the session access token, and sends a system prompt plus conversation turns (`app/ai-lab/page.tsx`).

### 3.2 Assistants API (`POST /api/ai/assistant`)

**Sent to OpenAI:**

- A user message string from the body.
- Optional `thread_id` (must start with `thread_`) to continue a thread; otherwise a new thread is created.

```96:116:app/api/ai/assistant/route.ts
  const message =
    typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null;
  // ...
  const existingThreadId =
    typeof body.thread_id === 'string' && body.thread_id.startsWith('thread_')
      ? body.thread_id.trim()
      : null;
  // ...
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
```

**Implications:**

- Assistant **instructions** and **tools** are defined in the OpenAI dashboard for `OPENAI_ASSISTANT_ID`, not in this repo’s prompts.
- **Thread isolation:** With a **single** server API key, thread IDs are a shared namespace. If a client supplied another user’s `thread_id`, the server would operate on that thread (ID secrecy is the main barrier). Consider documenting this as a **trust / product** risk for multi-user deployments.

---

## 4. Supabase and RLS

### 4.1 Client initialization in API routes

Pattern: `createClient(url, anonKey, { global: { headers: { Authorization: Bearer <user JWT> } } })` so PostgREST evaluates policies as the **end user**, not the service role.

### 4.2 RLS enforcement

- RLS is defined and adjusted in SQL under `supabase/migrations/`. Examples include tenant-scoped policies using `auth.uid()` and subqueries on `user_profiles` / `tenant_id` (e.g. `20260131000000_optimize_rls_auth_calls.sql`, customer policies, storage policies, `user_module_access`).
- With the **anon key + user JWT**, Supabase enforces these policies on data API calls made with that client.

### 4.3 Multi-tenancy

- **`TenantedSupabaseClient`** (`lib/supabaseSchemaClient.ts`) documents schema-per-tenant as a future direction; **current behavior** routes tenant data tables through the same `public` client, with comments stating reliance on **`tenant_id` + RLS** rather than separate PostgreSQL schemas today.

```98:108:lib/supabaseSchemaClient.ts
    // For now, we route to public schema and rely on RLS + tenant_id column
    return dynamicSupabase.from(tableName);
```

- **Tenant selection** for the SPA is handled in app context (`TenantContext`, login flow, etc.); API routes for AI do not re-validate tenant for authorization.

---

## 5. Environment variables (names only)

| Variable                         | Typical exposure                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | **Client + server** (bundled)                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | **Client + server** (bundled)                                                         |
| `NEXT_PUBLIC_TEMPLATE_TENANT_ID` | **Client + server** (bundled)                                                         |
| `SUPABASE_URL`                   | Server (optional alias in `getSupabaseUrlAndAnonKey`)                                 |
| `SUPABASE_ANON_KEY`              | Server (optional alias)                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`      | **Server / scripts only** (`scripts/get-tenant-id.js`) — must never be `NEXT_PUBLIC_` |
| `OPENAI_API_KEY`                 | **Server only**                                                                       |
| `OPENAI_ORG_ID`                  | **Server only**                                                                       |
| `OPENAI_PROJECT_ID`              | **Server only**                                                                       |
| `OPENAI_ASSISTANT_ID`            | **Server only**                                                                       |

**Additional loading:** `.env.credentials` merged in `next.config.js` (same key names as above).

---

## 6. Known vulnerabilities, gaps, and notes

1. **No API rate limiting** — AI routes can be abused for cost or DoS by any authenticated user. Documentation elsewhere in the repo mentions rate limiting as a future item; it is **not** implemented in these handlers.
2. **Unrestricted `model` parameter** on `/api/ai/chat` — cost and capability depend on client-supplied model strings.
3. **AI routes lack role/tenant authorization** — contrast with `/api/access/update`.
4. **Shared OpenAI key + client-supplied `thread_id`** — Assistants threads are not per-user in application logic; mitigate with opaque IDs, monitoring, or per-user OpenAI projects/keys if required.
5. **CSRF utilities unused on API routes** — `lib/security.ts` provides CSRF helpers; **no** API route imports or validates them. Same-site cookie policies and JWT-in-header patterns reduce classic CSRF risk for these JSON `fetch` calls, but the helpers are not enforced server-side.
6. **CSP** includes `'unsafe-inline'` and `'unsafe-eval'` for scripts (see `next.config.js`) — common for Next.js but weakens XSS containment.
7. **Navigation manager UI** surfaces a destructive SQL hint when errors look RLS-related (`ALTER TABLE public.navigation DISABLE ROW LEVEL SECURITY`) — risky if copied into production databases (`app/navigation-manager/page.tsx` around the RLS error helper text).
8. **Stale documentation:** `TRITY_CONTEXT.md` states items “not implemented” (e.g. auth/RLS) that **are** present in the current codebase — do not rely on that file alone for security posture.
9. **TODOs (non-exhaustive):** `hooks/useUsers.ts` contains placeholders (`TODO: Implement based on your user management setup`, user search) — not direct security bugs but indicate incomplete areas.

---

## 7. Current middleware and HTTP security configuration

### 7.1 Next.js middleware

- **None** — no root `middleware.ts` / `middleware.js`.

### 7.2 Auth checks

- **Pages:** Client-side gating via `ProtectedRoute` + `TenantContext` / Supabase session (`components/ProtectedRoute.tsx`).
- **API:** Per-route bearer JWT validation to Supabase as described in §2.

### 7.3 Rate limiting

- **Not implemented** in application API code reviewed for this audit.

### 7.4 CORS

- No explicit `Access-Control-*` configuration was found in `next.config.js` or the three API routes. Next.js Route Handlers rely on default same-origin browser behavior for typical SPA `fetch` usage from the same deployment.

### 7.5 Security headers (global)

`next.config.js` sets **Content-Security-Policy** (with dynamic `connect-src` including Supabase hosts and `NEXT_PUBLIC_SUPABASE_URL`), **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, **Referrer-Policy**, **X-XSS-Protection**, and **Permissions-Policy**.

```84:124:next.config.js
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
              // ...
              connectSrcDirective(),
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy
        ],
      },
    ];
  },
```

---

## Summary

| Area                            | Assessment                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI secrets                  | **Good** — server-only env, not exposed to client bundles.                                                                      |
| Supabase anon key               | **Expected** — public anon key + RLS; service role confined to scripts in reviewed code.                                        |
| API authentication              | **Consistent** — all routes require valid Supabase JWT.                                                                         |
| API authorization               | **Mixed** — access update is admin/tenant-aware; AI routes are not.                                                             |
| Data to OpenAI                  | **Controlled docs path** for optional context; user/chat content is client-driven; model not allowlisted.                       |
| RLS / tenancy                   | **Database layer** — migrations show tenant-aware policies; app `tenantedSupabase` still uses public tables + RLS per comments. |
| Middleware / rate limits / CORS | **Gaps** — no middleware, no rate limits, no explicit CORS config in reviewed files.                                            |

---

_This document is a point-in-time technical review, not a penetration test or legal compliance attestation._
