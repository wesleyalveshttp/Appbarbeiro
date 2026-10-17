-- ==============================================================================
-- BarberOS — Estrutura de Banco de Dados para Supabase (PostgreSQL)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. TABELA DE ORGANIZAÇÕES (BARBEARIAS)
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'Barbearia',
  description TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  owner_name TEXT,
  owner_email TEXT,
  owner_password TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  working_hours JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  plan_id TEXT DEFAULT 'premium',
  subscription JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice rápido por slug para fila e agendamento público
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- 2. TABELA DE SERVIÇOS
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

-- 3. TABELA DE PROFISSIONAIS (BARBEIROS)
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

-- 4. TABELA DE FILA VIRTUAL DE ESPERA
CREATE TABLE IF NOT EXISTS public.queue (
  id TEXT PRIMARY KEY,
  ticket_number INTEGER NOT NULL,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  service_id TEXT,
  service_name TEXT,
  preferred_professional_id TEXT,
  status TEXT NOT NULL DEFAULT 'AGUARDANDO',
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

-- 5. TABELA DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  service_id TEXT,
  service_name TEXT,
  professional_id TEXT,
  professional_name TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  total_price NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id, date);

-- 6. TABELA DE CLIENTES
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

-- 7. TABELA DE TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  type TEXT NOT NULL,
  category TEXT,
  payment_method TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  professional_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (Row Level Security - RLS)
-- Permite leitura pública de barbearias pelo slug e entrada na fila virtual
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Leitura pública para páginas de fila e agendamento
CREATE POLICY "Public read organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Public read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Public read professionals" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "Public read queue" ON public.queue FOR SELECT USING (true);
CREATE POLICY "Public insert queue" ON public.queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update queue" ON public.queue FOR UPDATE USING (true);

-- Acesso administrativo geral (via service_role ou auth)
CREATE POLICY "Service role full access orgs" ON public.organizations FOR ALL USING (true);
CREATE POLICY "Service role full access services" ON public.services FOR ALL USING (true);
CREATE POLICY "Service role full access professionals" ON public.professionals FOR ALL USING (true);
CREATE POLICY "Service role full access queue" ON public.queue FOR ALL USING (true);
CREATE POLICY "Service role full access appointments" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Service role full access customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Service role full access transactions" ON public.transactions FOR ALL USING (true);
