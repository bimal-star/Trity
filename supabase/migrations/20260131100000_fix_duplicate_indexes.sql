-- Fix duplicate indexes on workstream_tasks table
-- Supabase Linter WARN: duplicate_index
-- Tables: public.workstream_tasks has identical indexes {idx_tasks_workstream,idx_workstream_tasks_workstream_id}

-- Drop the older/redundant duplicate index
DROP INDEX IF EXISTS public.idx_tasks_workstream;

-- Keep idx_workstream_tasks_workstream_id as it follows the naming convention
-- Verify the remaining index exists
-- SELECT indexname FROM pg_indexes WHERE tablename = 'workstream_tasks';
