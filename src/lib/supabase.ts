import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof process !== 'undefined' &&
    (process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL)) ||
  'https://xsmcfrualbyswoccyicl.supabase.co';

const supabaseKey =
  (typeof process !== 'undefined' &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
  'sb_publishable_cO9Vc1J2pX7WE8LnyywbVQ_RhlD2AD8';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey)
  : null;
