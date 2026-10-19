-- ==============================================================================
-- BarberOS — PostgreSQL Database Schema & Security for Supabase
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/xsmcfrualbyswoccyicl/sql
-- ==============================================================================

-- Habilita extensão pgcrypto se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABELA DE ORGANIZAÇÕES (BARBEARIAS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'Barbearia',
  description TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_password_hash TEXT,
  owner_salt TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  working_hours JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  plan_id TEXT DEFAULT 'premium',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_email ON public.organizations(owner_email);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(is_active);

-- ------------------------------------------------------------------------------
-- 2. TABELA DE SERVIÇOS (ISOLADO POR TENANT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  category TEXT DEFAULT 'Cabelo',
  professional_ids JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_org ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_org_active ON public.services(organization_id, is_active);

-- ------------------------------------------------------------------------------
-- 3. TABELA DE PROFISSIONAIS (ISOLADO POR TENANT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professionals (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  avatar_url TEXT,
  specialties JSONB DEFAULT '[]'::jsonb,
  service_ids JSONB DEFAULT '[]'::jsonb,
  commission_percent NUMERIC(5, 2) DEFAULT 50.00,
  is_active BOOLEAN DEFAULT TRUE,
  is_available_today BOOLEAN DEFAULT TRUE,
  working_days JSONB DEFAULT '[1,2,3,4,5,6]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professionals_org ON public.professionals(organization_id);
CREATE INDEX IF NOT EXISTS idx_professionals_org_active ON public.professionals(organization_id, is_active);

-- ------------------------------------------------------------------------------
-- 4. TABELA DE FILA VIRTUAL DE ESPERA (ISOLADO POR TENANT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue (
  id TEXT PRIMARY KEY,
  ticket_number INTEGER NOT NULL,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  service_id TEXT,
  service_name TEXT NOT NULL,
  preferred_professional_id TEXT,
  assigned_professional_id TEXT,
  status TEXT NOT NULL DEFAULT 'AGUARDANDO',
  notes TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  estimated_wait_minutes INTEGER DEFAULT 15,
  notification_token TEXT,
  push_delivery_status TEXT DEFAULT 'NOT_ATTEMPTED',
  called_at TIMESTAMPTZ,
  called_tolerance_expires_at TIMESTAMPTZ,
  on_chair_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_org_status ON public.queue(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_ticket ON public.queue(organization_id, ticket_number);
CREATE INDEX IF NOT EXISTS idx_queue_joined ON public.queue(joined_at);

-- ------------------------------------------------------------------------------
-- 5. TABELA DE AGENDAMENTOS (ISOLADO POR TENANT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  service_id TEXT,
  service_name TEXT NOT NULL,
  professional_id TEXT,
  professional_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  total_price NUMERIC(10, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON public.appointments(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_org_status ON public.appointments(organization_id, status);

-- ------------------------------------------------------------------------------
-- 6. TABELA DE CLIENTES (DADOS PRIVADOS DO ESTABELECIMENTO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_appointments INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0.00,
  last_visit TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON public.customers(organization_id, phone);

-- ------------------------------------------------------------------------------
-- 7. TABELA DE TRANSAÇÕES FINANCEIRAS (CONFIDENCIAL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  type TEXT NOT NULL,
  category TEXT,
  payment_method TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  professional_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_org ON public.transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON public.transactions(organization_id, date);

-- ------------------------------------------------------------------------------
-- 8. ASSINATURAS SAAS E PAGAMENTOS MERCADO PAGO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'pro_monthly',
  status TEXT NOT NULL DEFAULT 'TRIAL',
  payer_email TEXT,
  payment_id TEXT,
  preference_id TEXT,
  amount NUMERIC(10, 2) DEFAULT 0.00,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);

-- ------------------------------------------------------------------------------
-- 9. INSCRIÇÕES WEB PUSH
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_token TEXT NOT NULL,
  subscription_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_token ON public.push_subscriptions(notification_token);
CREATE INDEX IF NOT EXISTS idx_push_org ON public.push_subscriptions(organization_id);

-- ------------------------------------------------------------------------------
-- 10. SESSÕES AUTENTICADAS MULTI-TENANT (SEGURANÇA POR TOKEN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_org ON public.sessions(organization_id);

-- ==============================================================================
-- VIEWS PÚBLICAS SEGURAS (Elimina vazamento de senhas, hashes, salts e telefones)
-- ==============================================================================

-- View pública de estabelecimentos (SEM senhas, SEM salts, SEM e-mail do dono)
CREATE OR REPLACE VIEW public.public_establishments AS
  SELECT
    id,
    name,
    slug,
    type,
    description,
    phone,
    whatsapp,
    instagram,
    address,
    working_hours,
    settings,
    is_active,
    created_at
  FROM public.organizations
  WHERE is_active = TRUE;

GRANT SELECT ON public.public_establishments TO anon, authenticated;

-- View pública de profissionais (SEM comissão financeira ou notas internas)
CREATE OR REPLACE VIEW public.public_professionals AS
  SELECT
    id,
    organization_id,
    name,
    phone,
    whatsapp,
    avatar_url,
    specialties,
    service_ids,
    is_available_today,
    working_days,
    is_active
  FROM public.professionals
  WHERE is_active = TRUE;

GRANT SELECT ON public.public_professionals TO anon, authenticated;

-- View pública de serviços
CREATE OR REPLACE VIEW public.public_services AS
  SELECT
    id,
    organization_id,
    name,
    description,
    price,
    duration_minutes,
    category,
    professional_ids,
    is_active
  FROM public.services
  WHERE is_active = TRUE;

GRANT SELECT ON public.public_services TO anon, authenticated;

-- View pública de fila (Nome abreviado, SEM telefone pessoal, SEM tokens)
CREATE OR REPLACE VIEW public.public_queue AS
  SELECT
    id,
    ticket_number,
    organization_id,
    customer_name,
    service_id,
    service_name,
    preferred_professional_id,
    status,
    joined_at,
    estimated_wait_minutes,
    called_at,
    called_tolerance_expires_at,
    on_chair_at,
    finished_at
  FROM public.queue
  WHERE status IN ('AGUARDANDO', 'PROXIMO', 'CHAMADO', 'EM_ATENDIMENTO');

GRANT SELECT ON public.public_queue TO anon, authenticated;

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas existentes
DO $$ 
BEGIN
  EXECUTE (
    SELECT COALESCE(string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';', ' '), '')
    FROM pg_policies 
    WHERE schemaname = 'public'
  );
END $$;

-- 1. BLOQUEIO ESTRITO DE ESCRITA ANÔNIMA EM TODAS AS TABELAS
-- Nenhuma modificação administrativa ou direta é permitida por anon
CREATE POLICY "Deny anon all organizations" ON public.organizations FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all services" ON public.services FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all professionals" ON public.professionals FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all queue" ON public.queue FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all appointments" ON public.appointments FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all customers" ON public.customers FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all transactions" ON public.transactions FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all subscriptions" ON public.subscriptions FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all push_subscriptions" ON public.push_subscriptions FOR ALL TO anon USING (FALSE);
CREATE POLICY "Deny anon all sessions" ON public.sessions FOR ALL TO anon USING (FALSE);

-- 2. ACESSO IRRESTRITO EXCLUSIVO AO BACKEND SEGURO (SERVICE_ROLE)
-- Todas as operações autoritativas passam pelo servidor BarberOS
CREATE POLICY "Service role full access organizations" ON public.organizations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access services" ON public.services FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access professionals" ON public.professionals FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access queue" ON public.queue FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access appointments" ON public.appointments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access customers" ON public.customers FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access transactions" ON public.transactions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access subscriptions" ON public.subscriptions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access push_subscriptions" ON public.push_subscriptions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access sessions" ON public.sessions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
