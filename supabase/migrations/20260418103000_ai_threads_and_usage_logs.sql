-- AI Assistant thread binding (per user + tenant) and usage logging for API routes.
-- OpenAI thread ids are stored server-side only; clients never send or receive raw thread_ ids.

CREATE TABLE IF NOT EXISTS public.ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  thread_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  route text NOT NULL CHECK (route IN ('chat', 'assistant')),
  model text NOT NULL,
  message_count integer NOT NULL CHECK (message_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_tenant_created_at_idx
  ON public.ai_usage_logs (tenant_id, created_at DESC);

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Tenant membership helper pattern (matches other public.* RLS)
CREATE POLICY ai_threads_select ON public.ai_threads
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.tenant_id = ai_threads.tenant_id
    )
  );

CREATE POLICY ai_threads_insert ON public.ai_threads
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.tenant_id = ai_threads.tenant_id
    )
  );

CREATE POLICY ai_threads_update ON public.ai_threads
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.tenant_id = ai_threads.tenant_id
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.tenant_id = ai_threads.tenant_id
    )
  );

CREATE POLICY ai_threads_delete ON public.ai_threads
  FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.tenant_id = ai_threads.tenant_id
    )
  );

CREATE POLICY ai_usage_logs_select ON public.ai_usage_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT up.tenant_id
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY ai_usage_logs_insert ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND tenant_id IN (
      SELECT up.tenant_id
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_threads TO authenticated;
GRANT SELECT, INSERT ON public.ai_usage_logs TO authenticated;
