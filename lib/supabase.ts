import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for browser/frontend operations (respects RLS)
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
) as SupabaseClient<Database>;

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
) as SupabaseClient<Database>;

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return !!(
    url && 
    url !== 'https://placeholder.supabase.co' && 
    url !== 'your-supabase-project-url' && 
    key && 
    !key.includes('placeholder')
  );
};

