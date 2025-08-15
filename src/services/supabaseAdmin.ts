import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('[SupabaseAdmin] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
}

const createAdminClient = () =>
  createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      storageKey: 'sb-catloog-admin-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

const g = globalThis as any;
export const supabaseAdmin = (g.__sb_admin_client ||= createAdminClient());
