import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in .env.local or .env.credentials (exact names), stop the dev server, delete the .next folder, then run npm run dev again.'
  );
}

/**
 * Supabase client with generated Database types — used app-wide for data access.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
