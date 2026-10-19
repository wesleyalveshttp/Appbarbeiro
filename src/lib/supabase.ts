import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe public client for browser/client-side use
// NEVER uses or exposes SUPABASE_SERVICE_ROLE_KEY
const getEnvVar = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // Vite client-side fallback
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch {}
  return '';
};

const publicSupabaseUrl =
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnvVar('VITE_SUPABASE_URL') ||
  getEnvVar('SUPABASE_URL') ||
  'https://xsmcfrualbyswoccyicl.supabase.co';

const publicSupabaseKey =
  getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('SUPABASE_ANON_KEY') ||
  'sb_publishable_cO9Vc1J2pX7WE8LnyywbVQ_RhlD2AD8';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(publicSupabaseUrl && publicSupabaseKey && publicSupabaseUrl.startsWith('http'));
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createClient(publicSupabaseUrl, publicSupabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(publicSupabaseUrl, publicSupabaseKey)
  : null;
