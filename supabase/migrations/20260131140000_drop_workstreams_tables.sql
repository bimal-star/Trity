-- Drop workstreams schema tables
-- This migration removes all workstreams-related tables from the database
-- Date: January 31, 2026

-- Drop workstream_tasks table first (has foreign key to workstreams)
DROP TABLE IF EXISTS public.workstream_tasks CASCADE;

-- Drop workstreams table
DROP TABLE IF EXISTS public.workstreams CASCADE;

-- Drop any associated types or enums if they exist
DROP TYPE IF EXISTS public.workstream_status CASCADE;
DROP TYPE IF EXISTS public.workstream_task_status CASCADE;
