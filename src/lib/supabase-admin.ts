import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Dedicated backend Supabase client using SUPABASE_SERVICE_ROLE_KEY
// CRITICAL SECURITY ENFORCEMENT: NEVER import this file in client-side components!
if (typeof window !== 'undefined') {
  throw new Error('VIOLAÇÃO DE SEGURANÇA: supabase-admin.ts não pode ser importado no navegador/cliente.');
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://xsmcfrualbyswoccyicl.supabase.co';

// SUPABASE_SERVICE_ROLE_KEY must be strictly loaded from backend environment variables.
// Supports common aliases used in Vercel and CI environments.
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ADMIN_KEY ||
  process.env.SUPABASE_KEY ||
  '';

export const isSupabaseAdminConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    serviceRoleKey &&
    supabaseUrl.startsWith('http') &&
    serviceRoleKey.length > 20
  );
};

export const getSupabaseAdminClient = (): SupabaseClient => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      'Configuração do Supabase backend ausente ou incompleta. Defina as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
