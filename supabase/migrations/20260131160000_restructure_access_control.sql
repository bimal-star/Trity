-- Restructure Access Control: Users, Groups, and Module Access
-- Date: 2026-01-31
-- Purpose: Implement group-based access control with user membership and granular module permissions

-- ============================================================================
-- PART 1: Enhance user_profiles - Add group-related columns
-- ============================================================================

-- Check if column exists before adding (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'primary_group_id'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN primary_group_id UUID REFERENCES public.user_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Auto-assign group based on tenant_invites when a user profile is created
CREATE OR REPLACE FUNCTION public.assign_group_from_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_group_id UUID;
BEGIN
  SELECT ti.group_id INTO invite_group_id
  FROM public.tenant_invites ti
  WHERE ti.tenant_id = NEW.tenant_id
    AND lower(ti.email) = lower(NEW.email)
    AND ti.group_id IS NOT NULL
  ORDER BY ti.created_at DESC
  LIMIT 1;

  IF invite_group_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET primary_group_id = invite_group_id
    WHERE id = NEW.id;

    INSERT INTO public.group_members (group_id, user_id, role, added_by)
    VALUES (invite_group_id, NEW.user_id, 'member', NEW.user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_group_from_invite ON public.user_profiles;
CREATE TRIGGER trg_assign_group_from_invite
AFTER INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_group_from_invite();

-- Add group_id to tenant_invites for initial group assignment
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'tenant_invites' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE public.tenant_invites
    ADD COLUMN group_id UUID REFERENCES public.user_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- PART 2: Create user_groups table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE SET NULL,
  updated_by UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE SET NULL,
  UNIQUE(tenant_id, name),
  CONSTRAINT name_not_empty CHECK (length(name) > 0)
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'user_groups' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.user_groups
    ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_groups_tenant ON public.user_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_tenant_name ON public.user_groups(tenant_id, name);

-- Enable RLS
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_groups
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_groups' AND policyname = 'user_groups_select'
  ) THEN
    CREATE POLICY user_groups_select ON public.user_groups
      FOR SELECT
      USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_groups' AND policyname = 'user_groups_insert'
  ) THEN
    CREATE POLICY user_groups_insert ON public.user_groups
      FOR INSERT
      WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_groups' AND policyname = 'user_groups_update'
  ) THEN
    CREATE POLICY user_groups_update ON public.user_groups
      FOR UPDATE
      USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
      )
      WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_groups' AND policyname = 'user_groups_delete'
  ) THEN
    CREATE POLICY user_groups_delete ON public.user_groups
      FOR DELETE
      USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'super_admin'
      );
  END IF;
END $$;

-- ============================================================================
-- PART 3: Create group_members junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  added_by UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE SET NULL,
  UNIQUE(group_id, user_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON public.group_members(group_id, user_id);

-- Enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members_select'
  ) THEN
    CREATE POLICY group_members_select ON public.group_members
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_members.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members_insert'
  ) THEN
    CREATE POLICY group_members_insert ON public.group_members
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_members.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
          AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members_update'
  ) THEN
    CREATE POLICY group_members_update ON public.group_members
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_members.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
          AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_members.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
          AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_members' AND policyname = 'group_members_delete'
  ) THEN
    CREATE POLICY group_members_delete ON public.group_members
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_members.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
          AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 4: Create user_module_access table (Individual User Access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_module_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, user_id, module_id),
  CONSTRAINT module_id_not_empty CHECK (length(module_id) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_module_access_tenant_user ON public.user_module_access(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_access_user_module ON public.user_module_access(user_id, module_id);

-- Enable RLS
ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_module_access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_module_access' AND policyname = 'user_module_access_select'
  ) THEN
    CREATE POLICY user_module_access_select ON public.user_module_access
      FOR SELECT
      USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        AND (
          user_id = auth.uid()
          OR (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_module_access' AND policyname = 'user_module_access_insert'
  ) THEN
    CREATE POLICY user_module_access_insert ON public.user_module_access
      FOR INSERT
      WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_module_access' AND policyname = 'user_module_access_update'
  ) THEN
    CREATE POLICY user_module_access_update ON public.user_module_access
      FOR UPDATE
      USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
      )
      WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_module_access' AND policyname = 'user_module_access_delete'
  ) THEN
    CREATE POLICY user_module_access_delete ON public.user_module_access
      FOR DELETE
      USING (
        tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;
END $$;

-- ============================================================================
-- PART 5: Create group_module_access table (Group-Based Access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_module_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, module_id),
  CONSTRAINT module_id_not_empty CHECK (length(module_id) > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_module_access_group ON public.group_module_access(group_id);
CREATE INDEX IF NOT EXISTS idx_group_module_access_group_module ON public.group_module_access(group_id, module_id);

-- Enable RLS
ALTER TABLE public.group_module_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_module_access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_module_access' AND policyname = 'group_module_access_select'
  ) THEN
    CREATE POLICY group_module_access_select ON public.group_module_access
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_module_access.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_module_access' AND policyname = 'group_module_access_insert'
  ) THEN
    CREATE POLICY group_module_access_insert ON public.group_module_access
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_module_access.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
          AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_module_access' AND policyname = 'group_module_access_update'
  ) THEN
    CREATE POLICY group_module_access_update ON public.group_module_access
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_module_access.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
          AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_module_access.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
          AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_module_access' AND policyname = 'group_module_access_delete'
  ) THEN
    CREATE POLICY group_module_access_delete ON public.group_module_access
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_groups ug
          WHERE ug.id = group_module_access.group_id
          AND ug.tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid())
          AND (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'super_admin'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration establishes a comprehensive access control system:
--
-- 1. user_groups: Groups that organize users
-- 2. group_members: Users' memberships in groups
-- 3. user_module_access: Individual user-specific module permissions (overrides)
-- 4. group_module_access: Group-level module permissions (inherited by members)
--
-- Access Resolution Logic:
-- - Admin/super_admin have all module access by default
-- - Members inherit module access from their group(s)
-- - Individual user_module_access entries can override group permissions
-- - Roles (member/admin/super_admin) still control administrative actions
