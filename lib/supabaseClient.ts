import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

/**
 * Supabase client configuration
 * Uses environment variables from .env.credentials file
 * Falls back to hardcoded values for development
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wvqlpcraxorchrtpatph.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_DSUbUfO9Dsyg3v6FzKLnCg_oyIYJeCC';

/**
 * Initialize Supabase client with full type safety
 * This client instance is used throughout the application to interact with Supabase
 * The Database type provides autocomplete and type checking for all tables
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
