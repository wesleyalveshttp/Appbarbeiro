import {
  Organization,
  Professional,
  Service,
  Customer,
  Appointment,
  WaitingQueueItem,
  Transaction,
  Review,
  NotificationItem,
  AuditLog,
  SaaSPlan,
  AppointmentStatus,
  QueueStatus,
  PaymentMethod,
  AuthSession
} from '../types';
import { NotificationService } from './notificationService';

const STORAGE_KEY = 'barberos_saas_data_v7_real';
const CURRENT_ORG_KEY = 'barberos_current_org_id';
const CURRENT_ROLE_KEY = 'barberos_current_user_role';
const SUPER_ADMIN_PASSWORD_KEY = 'barberos_superadmin_password_custom';
const AUTH_SESSION_KEY = 'barberos_auth_session';
const SESSION_TOKEN_KEY = 'barberos_session_token';

// Real-time broadcast channel for multi-tab synchronization
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('barberos_realtime_events')
  : null;

export const broadcastEvent = (eventType: string, payload?: any) => {
  if (channel) {
    channel.postMessage({ type: eventType, payload, timestamp: Date.now() });
  }
  // Also dispatch local CustomEvent so the same window updates instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('barberos_local_event', { detail: { type: eventType, payload } }));
  }
};

export const subscribeToRealtimeEvents = (callback: (event: { type: string; payload?: any }) => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcast = (e: MessageEvent) => {
    callback(e.data);
  };
  const handleLocal = (e: Event) => {
    const custom = e as CustomEvent;
    callback(custom.detail);
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('barberos_local_event', handleLocal);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('barberos_local_event', handleLocal);
  };
};

// CROSS-DEVICE REAL-TIME SYNCHRONIZATION VIA SSE (Server-Sent Events) & POLLING
if (typeof window !== 'undefined') {
  let sseSource: EventSource | null = null;
  const initSSE = () => {
    try {
      if (sseSource) sseSource.close();
      sseSource = new EventSource('/api/events');
      sseSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'QUEUE_UPDATED' || data.type === 'DB_SYNCED') {
            StorageService.syncWithServer().then(() => {
              broadcastEvent('QUEUE_UPDATED', data.payload);
            });
          }
        } catch {}
      };
      sseSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch {}
  };

  initSSE();

  // Multi-device fallback polling every 3 seconds to ensure cross-device consistency
  setInterval(() => {
    StorageService.syncWithServer();
  }, 3000);

  // Initial sync immediately
  setTimeout(() => {
    StorageService.syncWithServer();
  }, 100);
}

export interface AppDatabase {
  organizations: Organization[];
  professionals: Professional[];
  services: Service[];
  customers: Customer[];
  appointments: Appointment[];
  queue: WaitingQueueItem[];
  transactions: Transaction[];
  reviews: Review[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  plans: SaaSPlan[];
}

const DEFAULT_PLANS: SaaSPlan[] = [
  {
    id: 'profissional',
    name: 'Plano Pro Mensal',
    priceMonthly: 79.9,
    priceAnnual: 958.8,
    maxProfessionals: -1,
    maxAppointmentsPerMonth: -1,
    popular: false,
    features: [
      'Uso 100% Completo do BarberOS',
      'Profissionais e cadeiras ilimitados',
      'Fila virtual de espera sem espera física',
      'Notificação automática no WhatsApp do cliente',
      'Painel operacional das cadeiras (Bancada)',
      'Agendamentos online 24/7 sem taxas por agendamento',
      'Módulo financeiro completo e comissões automáticas',
      'QR Codes personalizados prontos para balcão',
      'Pagamento flexível mês a mês (R$ 79,90/mês)'
    ]
  },
  {
    id: 'premium',
    name: 'Plano Pro Anual (R$ 838,80/ano)',
    priceMonthly: 69.9,
    priceAnnual: 838.8,
    maxProfessionals: -1,
    maxAppointmentsPerMonth: -1,
    popular: true,
    features: [
      'Valor total anual: R$ 838,80 à vista (Economia de R$ 120 no ano!)',
      'Parcele em até 12x no cartão (juros por conta do comprador)',
      'Equivalente a R$ 69,90/mês no valor à vista sem descontos',
      'Todas as ferramentas 100% Liberadas por 12 meses',
      'Fila virtual com chamada e notificações ao vivo',
      'Agendamento online 24/7 ilimitado',
      'Painel de cadeiras em tempo real para bancada',
      'Controle de caixa, fluxo e comissões por barbeiro',
      'Suporte VIP prioritário do dono da plataforma',
      'Garantia de preço congelado por 1 ano inteiro'
    ]
  }
];

// Helper to get formatted date string for today (YYYY-MM-DD)
const getTodayStr = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getSeedData = (): AppDatabase => {
  const today = getTodayStr();

  const org1: Organization = {
    id: 'org-prime',
    name: 'Minha Barbearia',
    slug: 'barbearia',
    type: 'Barbearia',
    description: 'Atendimento de alta qualidade, corte de cabelo moderno e tradicional, barba e estilo.',
    phone: '(11) 99999-0000',
    whatsapp: '11999990000',
    instagram: '@minhabarbearia',
    ownerEmail: 'dono@barbearia.com',
    ownerPassword: '123',
    ownerName: 'Dono da Barbearia',
    address: {
      cep: '01310-100',
      street: 'Rua Principal',
      number: '100',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP'
    },
    workingHours: [
      { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '15:00' },
      { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:30', lunchEnd: '13:30' },
      { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:30', lunchEnd: '13:30' },
      { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:30', lunchEnd: '13:30' },
      { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:30', lunchEnd: '13:30' },
      { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '08:30', closeTime: '21:00', hasLunchBreak: true, lunchStart: '12:30', lunchEnd: '13:30' },
      { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:00', closeTime: '19:00', hasLunchBreak: false }
    ],
    settings: {
      maxLateMinutes: 15,
      cancellationHoursLimit: 2,
      queueMode: 'SINGLE',
      autoNotifyAheadCount: 3,
      callToleranceMinutes: 3,
      allowToleranceRequest: true,
      primaryColor: '#f59e0b',
      secondaryColor: '#0f172a',
      welcomeMessage: 'Bem-vindo! Entre na nossa fila virtual pelo celular ou agende seu horário.',
      isOpenNow: true,
      whatsappApiConfigured: false
    },
    planId: 'premium',
    subscription: {
      status: 'PENDENTE',
      planName: 'Plano Pro Barbearia (R$ 79,90/mês)',
      priceMonthly: 79.9,
      trialDaysRemaining: 0,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isPaid: false,
      invoices: []
    },
    isActive: true,
    createdAt: '2026-01-10T10:00:00.000Z'
  };

  const professionals: Professional[] = [
    {
      id: 'prof-1',
      organizationId: 'org-prime',
      name: 'Barbeiro Responsável',
      email: 'barbeiro@barbearia.com',
      phone: '(11) 99999-0001',
      whatsapp: '11999990001',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      specialties: ['Corte Clássico & Fade', 'Barba Tradicional', 'Acabamento'],
      serviceIds: ['srv-1', 'srv-2', 'srv-3'],
      commissionPercent: 50,
      isActive: true,
      isAvailableToday: true,
      workingDays: [1, 2, 3, 4, 5, 6],
      createdAt: '2026-01-11T10:00:00.000Z'
    }
  ];

  const services: Service[] = [
    {
      id: 'srv-1',
      organizationId: 'org-prime',
      name: 'Corte Masculino',
      description: 'Corte na máquina e tesoura com lavagem e finalização.',
      price: 40,
      durationMinutes: 30,
      category: 'Cabelo',
      professionalIds: ['prof-1'],
      isActive: true,
      createdAt: '2026-01-10T11:00:00.000Z'
    },
    {
      id: 'srv-2',
      organizationId: 'org-prime',
      name: 'Barba Tradicional',
      description: 'Toalha quente, navalhete descartável e hidratação.',
      price: 35,
      durationMinutes: 30,
      category: 'Barba',
      professionalIds: ['prof-1'],
      isActive: true,
      createdAt: '2026-01-10T11:00:00.000Z'
    },
    {
      id: 'srv-3',
      organizationId: 'org-prime',
      name: 'Combo Corte + Barba',
      description: 'Corte completo e barba alinhada com toalha quente.',
      price: 70,
      durationMinutes: 50,
      category: 'Combos',
      professionalIds: ['prof-1'],
      isActive: true,
      createdAt: '2026-01-10T11:00:00.000Z'
    }
  ];

  // Zeroed metrics for clean first use
  const customers: Customer[] = [];
  const appointments: Appointment[] = [];
  const queue: WaitingQueueItem[] = [];
  const transactions: Transaction[] = [];
  const reviews: Review[] = [];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      organizationId: 'org-prime',
      type: 'STATUS_CHANGE',
      title: 'Métricas Zeradas & Primeiro Uso',
      message: 'Todas as métricas foram zeradas para uso real. Para usar o app 100%, o dono da barbearia deve realizar o pagamento mensal de R$ 79,90 no menu Assinatura.',
      timestamp: new Date().toISOString(),
      isRead: false
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      organizationId: 'org-prime',
      userName: 'Sistema',
      action: 'INICIALIZACAO',
      details: 'Plataforma BarberOS inicializada zerada para primeiro uso',
      timestamp: new Date().toISOString()
    }
  ];

  return {
    organizations: [org1],
    professionals,
    services,
    customers,
    appointments,
    queue,
    transactions,
    reviews,
    notifications,
    auditLogs,
    plans: DEFAULT_PLANS
  };
};

export class StorageService {
  static subscribeToRealtimeEvents = subscribeToRealtimeEvents;
  static broadcastEvent = broadcastEvent;

  static async syncWithServer(): Promise<AppDatabase | null> {
    if (typeof window === 'undefined') return null;
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const serverDb: AppDatabase = await res.json();
        if (serverDb && Array.isArray(serverDb.organizations)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverDb));
          broadcastEvent('DB_SYNCED');
          return serverDb;
        }
      }
    } catch (e) {
      console.warn('Network sync offline fallback', e);
    }
    return null;
  }

  private static getDB(): AppDatabase {
    if (typeof window === 'undefined') return getSeedData();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = getSeedData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load storage, resetting to seed', e);
      const seed = getSeedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  private static saveDB(db: AppDatabase): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      // Durably sync with server Express backend
      fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db)
      }).catch(err => {
        console.warn('Background sync with server failed:', err);
      });
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  static async registerOrganizationOnServer(params: {
    organization: any;
    initialProfessional?: any;
    initialService?: any;
  }): Promise<{ success: boolean; organization?: Organization; error?: string }> {
    try {
      const res = await fetch('/api/auth/register-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Falha ao salvar estabelecimento no servidor.' };
      }

      // Merge into local cache
      const db = this.getDB();
      const existingIdx = db.organizations.findIndex(o => o.id === data.organization.id);
      if (existingIdx >= 0) {
        db.organizations[existingIdx] = data.organization;
      } else {
        db.organizations.push(data.organization);
      }
      if (data.professional && !db.professionals.some(p => p.id === data.professional.id)) {
        db.professionals.push(data.professional);
      }
      if (data.service && !db.services.some(s => s.id === data.service.id)) {
        db.services.push(data.service);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      this.setCurrentOrgId(data.organization.id);
      if (data.session) {
        this.setAuthSession(data.session);
      }
      broadcastEvent('ORGANIZATIONS_UPDATED');

      return { success: true, organization: data.organization };
    } catch (e: any) {
      console.error('Server registration error:', e);
      return { success: false, error: 'Falha de conexão com o servidor ao cadastrar barbearia: ' + (e?.message || 'Erro de rede') };
    }
  }

  // --- Session & Current Org Context ---
  static getCurrentOrgId(): string {
    if (typeof window === 'undefined') return '';
    // Priority 1: If authenticated session has an organizationId, that is authoritative
    const session = this.getAuthSession();
    if (session?.isAuthenticated && session.organizationId) {
      return session.organizationId;
    }
    // Priority 2: Saved organization in localStorage
    const saved = localStorage.getItem(CURRENT_ORG_KEY);
    const db = this.getDB();
    if (saved && db.organizations?.some(o => o.id === saved)) {
      return saved;
    }
    // Priority 3: Non-demo registered accounts (so user's real salon is preferred over demo)
    const custom = (db.organizations || []).find(o => o.id !== 'org-prime');
    if (custom) {
      return custom.id;
    }
    return db.organizations?.[0]?.id || '';
  }

  static setCurrentOrgId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CURRENT_ORG_KEY, id);
    const session = this.getAuthSession();
    if (session?.isAuthenticated && session.role === 'OWNER' && session.organizationId !== id) {
      session.organizationId = id;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    }
    broadcastEvent('ORG_CHANGED', { orgId: id });
  }

  static getCurrentRole(): { role: 'SUPER_ADMIN' | 'OWNER' | 'PROFESSIONAL' | 'CLIENT'; professionalId?: string } {
    if (typeof window === 'undefined') return { role: 'OWNER' };
    const saved = localStorage.getItem(CURRENT_ROLE_KEY);
    if (!saved) return { role: 'OWNER' };
    try {
      return JSON.parse(saved);
    } catch {
      return { role: 'OWNER' };
    }
  }

  static setCurrentRole(role: 'SUPER_ADMIN' | 'OWNER' | 'PROFESSIONAL' | 'CLIENT', professionalId?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CURRENT_ROLE_KEY, JSON.stringify({ role, professionalId }));
    broadcastEvent('ROLE_CHANGED', { role, professionalId });
  }

  // --- Organizations ---
  static getAllOrganizations(): Organization[] {
    return this.getDB().organizations;
  }

  static getOrganizationById(id: string): Organization | undefined {
    return this.getDB().organizations.find(o => o.id === id);
  }

  static getOrganizationBySlug(slug: string): Organization | undefined {
    if (!slug) return undefined;
    const clean = decodeURIComponent(slug).trim().toLowerCase();
    const normalize = (str: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    const normTerm = normalize(clean);

    const orgs = this.getDB().organizations;
    // Strict match by slug or exact ID - NO PREFIX MATCH AND NO DEMO FALLBACK
    return orgs.find(o => {
      if (!o) return false;
      const oSlug = (o.slug || '').toLowerCase();
      const oId = (o.id || '').toLowerCase();
      return oSlug === clean || normalize(oSlug) === normTerm || oId === clean;
    });
  }

  // Authoritative fetch of establishment, services, professionals, and queue for public pages (/fila/:slug, /agendar/:slug, /b/:slug)
  static async fetchPublicEstablishmentFull(slug: string): Promise<{
    status: 'SUCCESS' | 'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR';
    data?: {
      organization: Organization;
      services: Service[];
      professionals: Professional[];
      queue: WaitingQueueItem[];
    };
    error?: string;
    statusCode?: number;
  }> {
    if (!slug) return { status: 'NOT_FOUND', error: 'Endereço da barbearia não informado.', statusCode: 404 };
    const clean = decodeURIComponent(slug).trim().toLowerCase();
    try {
      const res = await fetch(`/api/public/establishment/${encodeURIComponent(clean)}`);
      const contentType = res.headers.get('content-type') || '';

      let data: any = null;
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {}
      }

      if (res.status === 404) {
        return {
          status: 'NOT_FOUND',
          statusCode: 404,
          error: data?.error || `Estabelecimento "${clean}" não encontrado no banco de dados.`
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          status: 'SERVER_ERROR',
          statusCode: res.status,
          error: data?.error || 'Falha de permissão de acesso ao banco de dados Supabase.'
        };
      }

      if (res.status === 503 || res.status >= 500) {
        return {
          status: 'SERVER_ERROR',
          statusCode: res.status,
          error: data?.error || 'Instabilidade no servidor ou banco de dados Supabase.'
        };
      }

      if (res.ok && data && data.organization) {
        if (data.organization) {
          const db = this.getDB();
          const orgIdx = db.organizations.findIndex(o => o.id === data.organization.id);
          if (orgIdx >= 0) {
            db.organizations[orgIdx] = { ...db.organizations[orgIdx], ...data.organization };
          } else {
            db.organizations.push(data.organization);
          }

          if (Array.isArray(data.services)) {
            const otherServices = db.services.filter(s => s.organizationId !== data.organization.id);
            db.services = [...otherServices, ...data.services];
          }
          if (Array.isArray(data.professionals)) {
            const otherProfs = db.professionals.filter(p => p.organizationId !== data.organization.id);
            db.professionals = [...otherProfs, ...data.professionals];
          }
          if (Array.isArray(data.queue)) {
            const otherQueue = db.queue.filter(q => q.organizationId !== data.organization.id);
            db.queue = [...otherQueue, ...data.queue];
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          } catch {}

          return {
            status: 'SUCCESS',
            statusCode: 200,
            data
          };
        }
      }

      return {
        status: res.status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR',
        statusCode: res.status,
        error: data?.error || `Não foi possível carregar as informações de "${clean}".`
      };
    } catch (err: any) {
      console.warn('Network error fetching public establishment:', err);
      return {
        status: 'NETWORK_ERROR',
        error: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.'
      };
    }
  }

  static async fetchPublicEstablishment(slug: string): Promise<{
    organization: Organization;
    services: Service[];
    professionals: Professional[];
    queue: WaitingQueueItem[];
  } | null> {
    const result = await this.fetchPublicEstablishmentFull(slug);
    if (result.status === 'SUCCESS' && result.data) {
      return result.data;
    }
    return null;
  }

  static async fetchOrganizationBySlug(slug: string): Promise<Organization | null> {
    const data = await this.fetchPublicEstablishment(slug);
    return data ? data.organization : null;
  }

  static createOrganization(
    data: Omit<Organization, 'id' | 'createdAt' | 'isActive' | 'subscription'> & {
      subscription?: Organization['subscription'];
      ownerEmail?: string;
      ownerPassword?: string;
      ownerName?: string;
    }
  ): Organization {
    const db = this.getDB();
    const id = `org-${Date.now()}`;
    const newOrg: Organization = {
      ...data,
      id,
      ownerEmail: data.ownerEmail || `dono@${data.slug || 'barbearia'}.com.br`,
      ownerPassword: data.ownerPassword || '123',
      ownerName: data.ownerName || data.name,
      subscription: data.subscription || {
        status: 'PENDENTE',
        planName: 'Plano Pro Barbearia (R$ 79,90/mês)',
        priceMonthly: 79.9,
        trialDaysRemaining: 0,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isPaid: false,
        invoices: []
      },
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.organizations.push(newOrg);
    this.saveDB(db);
    this.logAudit(id, 'Novo Estabelecimento', `Estabelecimento ${newOrg.name} criado via onboarding`);
    broadcastEvent('ORGANIZATIONS_UPDATED');
    return newOrg;
  }

  static getAuthToken(): string {
    if (typeof window === 'undefined') return '';
    const session = this.getAuthSession();
    return session.token || localStorage.getItem(SESSION_TOKEN_KEY) || '';
  }

  static updateOrganization(id: string, updates: Partial<Organization>): Organization {
    const db = this.getDB();
    const index = db.organizations.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Organização não encontrada');
    db.organizations[index] = { ...db.organizations[index], ...updates };
    this.saveDB(db);

    const token = this.getAuthToken();
    fetch(`/api/organizations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    }).catch(err => console.warn('Server update organization failed:', err));

    broadcastEvent('ORGANIZATION_UPDATED', { orgId: id });
    return db.organizations[index];
  }

  static toggleOrganizationStatus(id: string): Organization {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === id);
    if (!org) throw new Error('Organização não encontrada');
    org.isActive = !org.isActive;
    this.saveDB(db);

    const token = this.getAuthToken();
    fetch(`/api/organizations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ isActive: org.isActive })
    }).catch(err => console.warn('Server toggle organization failed:', err));

    broadcastEvent('ORGANIZATION_UPDATED', { orgId: id });
    return org;
  }

  static deleteOrganization(id: string): void {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === id);
    if (!org) return;

    // Filter out the organization
    db.organizations = db.organizations.filter(o => o.id !== id);

    // Filter out all associated entities for clean deletion
    db.professionals = db.professionals.filter(p => p.organizationId !== id);
    db.services = db.services.filter(s => s.organizationId !== id);
    db.customers = db.customers.filter(c => c.organizationId !== id);
    db.appointments = db.appointments.filter(a => a.organizationId !== id);
    db.queue = db.queue.filter(q => q.organizationId !== id);
    db.transactions = db.transactions.filter(t => t.organizationId !== id);
    db.reviews = db.reviews.filter(r => r.organizationId !== id);
    db.notifications = db.notifications.filter(n => n.organizationId !== id);

    // If current selected organization was deleted, switch to the first remaining one
    const currentActiveId = this.getCurrentOrgId();
    if (currentActiveId === id && db.organizations.length > 0) {
      this.setCurrentOrgId(db.organizations[0].id);
    }

    this.saveDB(db);

    const token = this.getAuthToken();
    fetch(`/api/organizations/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(err => console.warn('Server delete organization failed:', err));

    this.logAudit(id, 'Super Admin', `Estabelecimento "${org.name}" excluído permanentemente da plataforma`);
    broadcastEvent('ORGANIZATION_DELETED', { orgId: id });
    broadcastEvent('ORGANIZATIONS_UPDATED');
    broadcastEvent('ORG_CHANGED', { orgId: db.organizations[0]?.id });
  }

  static updateOwnerCredentials(orgId: string, email: string, password: string, name?: string): Organization {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organização não encontrada');

    org.ownerEmail = email.trim();
    org.ownerPassword = password.trim();
    if (name) org.ownerName = name.trim();

    this.saveDB(db);

    const token = this.getAuthToken();
    fetch(`/api/organizations/${orgId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ownerEmail: org.ownerEmail,
        ownerPassword: org.ownerPassword,
        ownerName: org.ownerName
      })
    }).catch(err => console.warn('Server update owner credentials failed:', err));

    this.logAudit(orgId, 'Proprietário', `Credenciais de login e senha atualizadas`);
    broadcastEvent('ORGANIZATION_UPDATED', { orgId });
    return org;
  }

  // --- Professionals ---
  static getProfessionals(orgId: string): Professional[] {
    return this.getDB().professionals.filter(p => p.organizationId === orgId);
  }

  static getProfessionalById(id: string): Professional | undefined {
    return this.getDB().professionals.find(p => p.id === id);
  }

  static createProfessional(data: Omit<Professional, 'id' | 'createdAt'>): Professional {
    const db = this.getDB();
    const id = `prof-${Date.now()}`;
    const newProf: Professional = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    db.professionals.push(newProf);
    this.saveDB(db);

    const token = this.getAuthToken();
    fetch('/api/professionals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newProf)
    }).catch(err => console.warn('Server create professional failed:', err));

    broadcastEvent('PROFESSIONALS_UPDATED', { orgId: data.organizationId });
    return newProf;
  }

  static updateProfessional(id: string, updates: Partial<Professional>): Professional {
    const db = this.getDB();
    const idx = db.professionals.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Profissional não encontrado');
    db.professionals[idx] = { ...db.professionals[idx], ...updates };
    this.saveDB(db);

    const token = this.getAuthToken();
    fetch(`/api/professionals/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    }).catch(err => console.warn('Server update professional failed:', err));

    broadcastEvent('PROFESSIONALS_UPDATED', { orgId: db.professionals[idx].organizationId });
    return db.professionals[idx];
  }

  static deleteProfessional(id: string): void {
    const db = this.getDB();
    const prof = db.professionals.find(p => p.id === id);
    if (!prof) return;
    const orgId = prof.organizationId;
    db.professionals = db.professionals.filter(p => p.id !== id);
    this.saveDB(db);

    const token = this.getAuthToken();
    fetch(`/api/professionals/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(err => console.warn('Server delete professional failed:', err));

    broadcastEvent('PROFESSIONALS_UPDATED', { orgId });
  }

  // --- Services ---
  static getServices(orgId: string): Service[] {
    return this.getDB().services.filter(s => s.organizationId === orgId);
  }

  static getServiceById(id: string): Service | undefined {
    return this.getDB().services.find(s => s.id === id);
  }

  static createService(data: Omit<Service, 'id' | 'createdAt'>): Service {
    const db = this.getDB();
    const id = `srv-${Date.now()}`;
    const newSrv: Service = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    db.services.push(newSrv);
    this.saveDB(db);

    const token = this.getAuthToken();
    fetch('/api/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newSrv)
    }).catch(err => console.warn('Server create service failed:', err));

    broadcastEvent('SERVICES_UPDATED', { orgId: data.organizationId });
    return newSrv;
  }

  static updateService(id: string, updates: Partial<Service>): Service {
    const db = this.getDB();
    const idx = db.services.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Serviço não encontrado');
    db.services[idx] = { ...db.services[idx], ...updates };
    this.saveDB(db);

    const token = this.getAuthToken();
    fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    }).catch(err => console.warn('Server update service failed:', err));

    broadcastEvent('SERVICES_UPDATED', { orgId: db.services[idx].organizationId });
    return db.services[idx];
  }

  static deleteService(id: string): void {
    const db = this.getDB();
    const srv = db.services.find(s => s.id === id);
    if (!srv) return;
    const orgId = srv.organizationId;
    db.services = db.services.filter(s => s.id !== id);
    this.saveDB(db);

    const token = this.getAuthToken();
    fetch(`/api/services/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(err => console.warn('Server delete service failed:', err));

    broadcastEvent('SERVICES_UPDATED', { orgId });
  }

  // --- Customers CRM ---
  static getCustomers(orgId: string): Customer[] {
    return this.getDB().customers.filter(c => c.organizationId === orgId);
  }

  static getCustomerById(id: string): Customer | undefined {
    return this.getDB().customers.find(c => c.id === id);
  }

  static findOrCreateCustomer(
    orgId: string,
    customerData: { name: string; phone: string; whatsapp?: string; email?: string }
  ): Customer {
    const db = this.getDB();
    const cleanPhone = customerData.phone.replace(/\D/g, '');
    let existing = db.customers.find(
      c => c.organizationId === orgId && c.phone.replace(/\D/g, '') === cleanPhone
    );

    if (existing) {
      if (customerData.name && existing.name !== customerData.name) {
        existing.name = customerData.name;
        this.saveDB(db);
      }
      return existing;
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      organizationId: orgId,
      name: customerData.name,
      phone: customerData.phone,
      whatsapp: customerData.whatsapp || cleanPhone,
      email: customerData.email,
      totalAppointments: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };
    db.customers.push(newCust);
    this.saveDB(db);
    broadcastEvent('CUSTOMERS_UPDATED', { orgId });
    return newCust;
  }

  static updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const db = this.getDB();
    const idx = db.customers.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado');
    db.customers[idx] = { ...db.customers[idx], ...updates };
    this.saveDB(db);
    broadcastEvent('CUSTOMERS_UPDATED', { orgId: db.customers[idx].organizationId });
    return db.customers[idx];
  }

  // --- Appointments ---
  static getAppointments(orgId: string, filterDate?: string): Appointment[] {
    const db = this.getDB();
    return db.appointments.filter(a => {
      if (a.organizationId !== orgId) return false;
      if (filterDate && a.date !== filterDate) return false;
      return true;
    });
  }

  static getAppointmentByToken(token: string): Appointment | undefined {
    return this.getDB().appointments.find(a => a.token === token);
  }

  static checkSlotConflict(
    orgId: string,
    professionalId: string,
    date: string,
    time: string,
    durationMinutes: number,
    excludeAppointmentId?: string
  ): boolean {
    const db = this.getDB();
    const [reqHour, reqMin] = time.split(':').map(Number);
    const reqStartMin = reqHour * 60 + reqMin;
    const reqEndMin = reqStartMin + durationMinutes;

    const existingAppointments = db.appointments.filter(
      a =>
        a.organizationId === orgId &&
        a.professionalId === professionalId &&
        a.date === date &&
        a.status !== 'CANCELADO' &&
        a.status !== 'FALTOU' &&
        a.id !== excludeAppointmentId
    );

    for (const apt of existingAppointments) {
      const [aptHour, aptMin] = apt.time.split(':').map(Number);
      const aptStartMin = aptHour * 60 + aptMin;
      const aptEndMin = aptStartMin + apt.durationMinutes;

      // Overlap check
      if (reqStartMin < aptEndMin && reqEndMin > aptStartMin) {
        return true; // conflict exists!
      }
    }

    return false;
  }

  static createAppointment(data: {
    organizationId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    professionalId: string;
    date: string;
    time: string;
    notes?: string;
  }): Appointment {
    const db = this.getDB();
    const service = db.services.find(s => s.id === data.serviceId);
    if (!service) throw new Error('Serviço não encontrado');

    const professional = db.professionals.find(p => p.id === data.professionalId);
    if (!professional) throw new Error('Profissional não encontrado');

    // Check conflict
    const hasConflict = this.checkSlotConflict(
      data.organizationId,
      data.professionalId,
      data.date,
      data.time,
      service.durationMinutes
    );
    if (hasConflict) {
      throw new Error('Horário indisponível para este profissional. Por favor, escolha outro horário.');
    }

    const customer = this.findOrCreateCustomer(data.organizationId, {
      name: data.customerName,
      phone: data.customerPhone
    });

    const token = `tok_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      token,
      organizationId: data.organizationId,
      customerId: customer.id,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      durationMinutes: service.durationMinutes,
      professionalId: professional.id,
      professionalName: professional.name,
      date: data.date,
      time: data.time,
      status: 'AGENDADO',
      statusHistory: [
        {
          status: 'AGENDADO',
          timestamp: new Date().toISOString(),
          note: 'Agendamento solicitado'
        }
      ],
      paymentStatus: 'PENDENTE',
      notes: data.notes,
      createdAt: new Date().toISOString()
    };

    db.appointments.push(newApt);
    this.saveDB(db);

    // Notify organization
    this.createNotification({
      organizationId: data.organizationId,
      type: 'NEW_APPOINTMENT',
      title: 'Novo Agendamento!',
      message: `${data.customerName} agendou ${service.name} para ${data.date} às ${data.time} com ${professional.name}.`,
      link: `/atendimento/${token}`
    });

    this.logAudit(data.organizationId, data.customerName, `Agendamento criado para ${data.date} às ${data.time}`);
    broadcastEvent('APPOINTMENT_UPDATED', { appointmentId: newApt.id, orgId: data.organizationId });
    return newApt;
  }

  static updateAppointmentStatus(
    id: string,
    newStatus: AppointmentStatus,
    options?: {
      note?: string;
      paymentMethod?: PaymentMethod;
    }
  ): Appointment {
    const db = this.getDB();
    const apt = db.appointments.find(a => a.id === id);
    if (!apt) throw new Error('Agendamento não encontrado');

    const previousStatus = apt.status;
    apt.status = newStatus;
    const nowIso = new Date().toISOString();

    apt.statusHistory.push({
      status: newStatus,
      timestamp: nowIso,
      note: options?.note
    });

    if (newStatus === 'CHEGOU' && !apt.arrivedAt) {
      apt.arrivedAt = nowIso;
    }
    if (newStatus === 'NA CADEIRA' && !apt.onChairAt) {
      apt.onChairAt = nowIso;
    }
    if (newStatus === 'FINALIZADO') {
      apt.finishedAt = nowIso;
      apt.paymentStatus = 'PAGO';
      if (options?.paymentMethod) {
        apt.paymentMethod = options.paymentMethod;
      } else if (!apt.paymentMethod) {
        apt.paymentMethod = 'PIX';
      }

      // Calculate commission for professional
      const prof = db.professionals.find(p => p.id === apt.professionalId);
      const commissionPercent = prof?.commissionPercent || 40;
      const commissionAmount = (apt.servicePrice * commissionPercent) / 100;
      apt.commissionPaid = commissionAmount;

      // Update customer stats
      const customer = db.customers.find(c => c.id === apt.customerId);
      if (customer) {
        customer.totalAppointments += 1;
        customer.totalSpent += apt.servicePrice;
        customer.lastVisit = apt.date;
        customer.favoriteProfessionalId = apt.professionalId;
        customer.favoriteServiceId = apt.serviceId;
      }

      // Register financial transactions
      this.createTransaction({
        organizationId: apt.organizationId,
        type: 'INCOME',
        category: 'Serviço',
        description: `Atendimento ${apt.customerName} - ${apt.serviceName}`,
        amount: apt.servicePrice,
        paymentMethod: apt.paymentMethod,
        appointmentId: apt.id,
        professionalId: apt.professionalId,
        date: apt.date
      });

      this.createTransaction({
        organizationId: apt.organizationId,
        type: 'COMMISSION',
        category: 'Comissão',
        description: `Comissão ${apt.professionalName} (${commissionPercent}%)`,
        amount: -commissionAmount,
        appointmentId: apt.id,
        professionalId: apt.professionalId,
        date: apt.date
      });

      this.createNotification({
        organizationId: apt.organizationId,
        type: 'STATUS_CHANGE',
        title: 'Atendimento Concluído',
        message: `Atendimento de ${apt.customerName} finalizado por ${apt.professionalName}. Faturamento: R$ ${apt.servicePrice.toFixed(2)}.`
      });
    }

    if (newStatus === 'A CAMINHO') {
      this.createNotification({
        organizationId: apt.organizationId,
        type: 'CUSTOMER_ARRIVED',
        title: 'Cliente a caminho!',
        message: `${apt.customerName} avisou que está a caminho do salão.`
      });
    }

    this.saveDB(db);
    this.logAudit(apt.organizationId, 'Sistema', `Status do agendamento alterado de ${previousStatus} para ${newStatus}`);
    broadcastEvent('APPOINTMENT_UPDATED', { appointmentId: apt.id, orgId: apt.organizationId, newStatus });
    return apt;
  }

  static rescheduleAppointment(id: string, newDate: string, newTime: string): Appointment {
    const db = this.getDB();
    const apt = db.appointments.find(a => a.id === id);
    if (!apt) throw new Error('Agendamento não encontrado');

    const conflict = this.checkSlotConflict(
      apt.organizationId,
      apt.professionalId,
      newDate,
      newTime,
      apt.durationMinutes,
      apt.id
    );
    if (conflict) {
      throw new Error('Horário indisponível para este profissional. Por favor escolha outro horário.');
    }

    apt.date = newDate;
    apt.time = newTime;
    apt.status = 'AGENDADO';
    apt.statusHistory.push({
      status: 'AGENDADO',
      timestamp: new Date().toISOString(),
      note: `Reagendado para ${newDate} às ${newTime}`
    });

    this.saveDB(db);
    broadcastEvent('APPOINTMENT_UPDATED', { appointmentId: apt.id, orgId: apt.organizationId });
    return apt;
  }

  // --- Real-Time Waiting Queue ---
  static getQueue(orgId: string): WaitingQueueItem[] {
    const db = this.getDB();
    return db.queue
      .filter(q =>
        q.organizationId === orgId &&
        (q.status === 'AGUARDANDO' ||
          q.status === 'PROXIMO' ||
          q.status === 'CHAMADO' ||
          q.status === 'A_CAMINHO' ||
          q.status === 'PEDIU_TOLERANCIA' ||
          q.status === 'NA CADEIRA')
      )
      .sort((a, b) => a.ticketNumber - b.ticketNumber);
  }

  static getQueueByCategories(orgId: string) {
    const db = this.getDB();
    const all = db.queue.filter(q => q.organizationId === orgId);
    return {
      waiting: all.filter(q => q.status === 'AGUARDANDO').sort((a, b) => a.ticketNumber - b.ticketNumber),
      next: all.filter(q => q.status === 'PROXIMO'),
      called: all.filter(q => q.status === 'CHAMADO' || q.status === 'A_CAMINHO' || q.status === 'PEDIU_TOLERANCIA'),
      onChair: all.filter(q => q.status === 'NA CADEIRA'),
      finished: all.filter(q => q.status === 'FINALIZADO'),
      cancelled: all.filter(q => q.status === 'CANCELADO' || q.status === 'DESISTIU'),
      noShow: all.filter(q => q.status === 'NAO_COMPARECEU'),
      all
    };
  }

  static getAllQueueHistory(orgId: string): WaitingQueueItem[] {
    const db = this.getDB();
    return (db.queue || []).filter(q => q.organizationId === orgId);
  }

  // Fetch real-time queue from server endpoint /api/queue/:orgId
  static async fetchQueue(orgId: string): Promise<WaitingQueueItem[]> {
    if (typeof window === 'undefined') return this.getAllQueueHistory(orgId);
    try {
      const res = await fetch(`/api/queue/${encodeURIComponent(orgId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.queue)) {
          const db = this.getDB();
          if (!Array.isArray(db.queue)) db.queue = [];

          // Keep queue items of other orgs, and update this org's queue
          const otherOrgsQueue = db.queue.filter(q => q.organizationId !== orgId);
          db.queue = [...otherOrgsQueue, ...data.queue];

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          } catch {}
          return data.queue;
        }
      }
    } catch (err) {
      console.warn('fetchQueue network error, using local queue:', err);
    }
    return this.getAllQueueHistory(orgId);
  }

  static async joinQueue(data: {
    organizationId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    preferredProfessionalId?: string;
    notes?: string;
    notificationToken?: string;
    subscription?: any;
  }): Promise<WaitingQueueItem> {
    const res = await fetch('/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let errorMsg = 'Não foi possível entrar na fila. Tente novamente.';
      try {
        const json = await res.json();
        if (json.error) errorMsg = json.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const json = await res.json();
    if (!json.success || !json.item) {
      throw new Error('O servidor não confirmou sua entrada na fila. Tente novamente.');
    }

    // Persist confirmed item to local cache
    const db = this.getDB();
    if (!Array.isArray(db.queue)) db.queue = [];
    const existingIdx = db.queue.findIndex(q => q.id === json.item.id);
    if (existingIdx >= 0) {
      db.queue[existingIdx] = json.item;
    } else {
      db.queue.push(json.item);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {}

    broadcastEvent('QUEUE_UPDATED', { orgId: json.item.organizationId, queueItemId: json.item.id });
    return json.item;
  }

  static joinQueueLocal(data: {
    organizationId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    preferredProfessionalId?: string;
    notes?: string;
    notificationToken?: string;
  }): WaitingQueueItem {
    const db = this.getDB();
    const service = db.services.find(s => s.id === data.serviceId);
    if (!service) throw new Error('Serviço não encontrado');

    const maxTicket = db.queue
      .filter(q => q.organizationId === data.organizationId)
      .reduce((max, item) => Math.max(max, item.ticketNumber), 100);
    const ticketNumber = maxTicket + 1;

    const activeWaiting = db.queue.filter(
      q => q.organizationId === data.organizationId && (q.status === 'AGUARDANDO' || q.status === 'PROXIMO')
    );
    const isInitialNext = activeWaiting.length === 0;

    const newQueueItem: WaitingQueueItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ticketNumber,
      organizationId: data.organizationId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: service.id,
      serviceName: service.name,
      preferredProfessionalId: data.preferredProfessionalId,
      status: isInitialNext ? 'PROXIMO' : 'AGUARDANDO',
      joinedAt: new Date().toISOString(),
      notes: data.notes,
      estimatedWaitMinutes: isInitialNext ? 5 : (activeWaiting.length + 1) * 20,
      notificationToken: data.notificationToken,
      deviceRegisteredAt: new Date().toISOString(),
      pushDeliveryStatus: 'NOT_ATTEMPTED',
    };

    db.queue.push(newQueueItem);
    this.saveDB(db);
    broadcastEvent('QUEUE_UPDATED', { orgId: data.organizationId, queueItemId: newQueueItem.id });
    return newQueueItem;
  }

  // Atomic "CHAMAR PRÓXIMO CLIENTE" via backend server with real push delivery
  static async callNextCustomer(
    orgId: string,
    assignedProfId?: string
  ): Promise<{ success: boolean; item?: WaitingQueueItem; error?: string; pushResult?: any }> {
    try {
      const res = await fetch('/api/queue/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, assignedProfId }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        await this.syncWithServer();
        broadcastEvent('QUEUE_UPDATED', { orgId, queueItemId: data.item.id, pushResult: data.pushResult });
      }
      return data;
    } catch (e: any) {
      console.warn('API call-next error, using local fallback:', e);
      return this.callNextCustomerLocal(orgId, assignedProfId);
    }
  }

  static callNextCustomerLocal(orgId: string, assignedProfId?: string): { success: boolean; item?: WaitingQueueItem; error?: string } {
    const db = this.getDB();
    const eligibleItem = db.queue
      .filter(q => q.organizationId === orgId && (q.status === 'PROXIMO' || q.status === 'AGUARDANDO'))
      .sort((a, b) => a.ticketNumber - b.ticketNumber)[0];

    if (!eligibleItem) {
      return { success: false, error: 'Não há clientes aguardando na fila no momento.' };
    }

    const profId =
      assignedProfId ||
      eligibleItem.preferredProfessionalId ||
      db.professionals.find(p => p.organizationId === orgId && p.isActive)?.id ||
      db.professionals[0]?.id;

    if (!profId) {
      return { success: false, error: 'Nenhum profissional disponível para atender.' };
    }

    try {
      const called = this.callQueueCustomerLocal(eligibleItem.id, profId);
      return { success: true, item: called };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao chamar cliente' };
    }
  }

  static async callQueueCustomer(
    queueId: string,
    assignedProfessionalId: string
  ): Promise<{ success: boolean; item: WaitingQueueItem; pushResult?: any }> {
    try {
      const res = await fetch('/api/queue/call-specific', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId, assignedProfessionalId }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        await this.syncWithServer();
        broadcastEvent('QUEUE_UPDATED', { queueItemId: data.item.id, pushResult: data.pushResult });
        return data;
      }
      throw new Error(data.error || 'Erro ao chamar cliente');
    } catch (e: any) {
      return { success: true, item: this.callQueueCustomerLocal(queueId, assignedProfessionalId) };
    }
  }

  static callQueueCustomerLocal(queueId: string, assignedProfessionalId: string): WaitingQueueItem {
    const db = this.getDB();
    const item = db.queue.find(q => q.id === queueId);
    if (!item) throw new Error('Item da fila não encontrado');

    const toleranceMinutes = db.organizations.find(o => o.id === item.organizationId)?.settings?.callToleranceMinutes || 3;
    const now = new Date();
    item.status = 'CHAMADO';
    item.calledAt = now.toISOString();
    item.calledToleranceExpiresAt = new Date(now.getTime() + toleranceMinutes * 60000).toISOString();
    item.assignedProfessionalId = assignedProfessionalId;
    item.notifiedCalled = true;

    this.recalculateQueueAlerts(db, item.organizationId, item.id);
    this.saveDB(db);

    broadcastEvent('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
    return item;
  }

  private static recalculateQueueAlerts(db: AppDatabase, orgId: string, excludeId?: string) {
    const waiting = db.queue
      .filter(q => q.organizationId === orgId && (q.status === 'AGUARDANDO' || q.status === 'PROXIMO') && q.id !== excludeId)
      .sort((a, b) => a.ticketNumber - b.ticketNumber);

    waiting.forEach((item, index) => {
      const position = index + 1;
      if (position === 1) {
        item.status = 'PROXIMO';
        item.estimatedWaitMinutes = 5;
      } else {
        item.status = 'AGUARDANDO';
        item.estimatedWaitMinutes = position * 15;
      }
    });
  }

  static async respondCalledQueueItem(
    queueId: string,
    response: 'A_CAMINHO' | 'PEDIU_TOLERANCIA' | 'NAO_PODE'
  ): Promise<WaitingQueueItem> {
    try {
      const res = await fetch('/api/queue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId, response }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        await this.syncWithServer();
        broadcastEvent('QUEUE_UPDATED', { queueItemId: queueId, response });
        return data.item;
      }
    } catch {}
    return this.respondCalledQueueItemLocal(queueId, response);
  }

  static respondCalledQueueItemLocal(
    queueId: string,
    response: 'A_CAMINHO' | 'PEDIU_TOLERANCIA' | 'NAO_PODE'
  ): WaitingQueueItem {
    const db = this.getDB();
    const item = db.queue.find(q => q.id === queueId);
    if (!item) throw new Error('Item da fila não encontrado');

    const now = new Date();
    item.clientResponse = response;
    item.clientResponseTime = now.toISOString();

    if (response === 'A_CAMINHO') {
      item.status = 'A_CAMINHO';
    } else if (response === 'PEDIU_TOLERANCIA') {
      item.status = 'PEDIU_TOLERANCIA';
      const curExpiry = item.calledToleranceExpiresAt ? new Date(item.calledToleranceExpiresAt) : now;
      item.calledToleranceExpiresAt = new Date(curExpiry.getTime() + 3 * 60000).toISOString();
      item.toleranceExtraMinutes = (item.toleranceExtraMinutes || 0) + 3;
    } else if (response === 'NAO_PODE') {
      item.status = 'DESISTIU';
      item.notes = `${item.notes || ''} [Cliente não pode comparecer]`;
      this.recalculateQueueAlerts(db, item.organizationId, item.id);
    }

    this.saveDB(db);
    broadcastEvent('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id, response });
    return item;
  }

  // Mark customer as no-show when tolerance window expires
  static markCalledCustomerNoShow(queueId: string): WaitingQueueItem {
    const db = this.getDB();
    const item = db.queue.find(q => q.id === queueId);
    if (!item) throw new Error('Item da fila não encontrado');

    item.status = 'NAO_COMPARECEU';
    item.notes = `${item.notes || ''} [Não compareceu após o tempo de tolerância]`;

    this.recalculateQueueAlerts(db, item.organizationId, item.id);
    this.saveDB(db);

    this.createNotification({
      organizationId: item.organizationId,
      type: 'QUEUE_CALLED',
      title: 'Cliente Não Compareceu',
      message: `${item.customerName} não compareceu dentro do prazo de tolerância. Próximo liberado.`
    });

    this.logAudit(item.organizationId, 'Sistema', `Cliente ${item.customerName} marcado como Não Compareceu`);
    broadcastEvent('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id, noShow: true });
    return item;
  }

  static getWhatsAppCallLink(queueId: string): string {
    const db = this.getDB();
    const item = db.queue.find(q => q.id === queueId);
    if (!item) return '';

    const cleanPhone = item.customerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = item.whatsappMessageText || `💈 Olá ${item.customerName}! É a sua vez na barbearia! Sua cadeira está pronta. Pode se aproximar para seu atendimento!`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  }

  static moveQueueToChair(queueId: string, professionalId?: string): WaitingQueueItem {
    const db = this.getDB();
    const item = db.queue.find(q => q.id === queueId);
    if (!item) throw new Error('Item da fila não encontrado');

    item.status = 'NA CADEIRA';
    item.onChairAt = new Date().toISOString();
    if (professionalId) item.assignedProfessionalId = professionalId;

    this.saveDB(db);
    broadcastEvent('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
    return item;
  }

  static finishQueueItem(queueId: string, paymentMethod: PaymentMethod = 'PIX'): WaitingQueueItem {
    const db = this.getDB();
    const item = db.queue.find(q => q.id === queueId);
    if (!item) throw new Error('Item da fila não encontrado');

    item.status = 'FINALIZADO';
    item.finishedAt = new Date().toISOString();

    const service = db.services.find(s => s.id === item.serviceId);
    const servicePrice = service?.price || 40;
    const prof = db.professionals.find(p => p.id === item.assignedProfessionalId);
    const commissionPercent = prof?.commissionPercent || 40;
    const commissionAmount = (servicePrice * commissionPercent) / 100;

    // Register income and commission
    this.createTransaction({
      organizationId: item.organizationId,
      type: 'INCOME',
      category: 'Fila / Avulso',
      description: `Atendimento Fila #${item.ticketNumber} - ${item.customerName}`,
      amount: servicePrice,
      paymentMethod,
      professionalId: item.assignedProfessionalId,
      date: getTodayStr()
    });

    this.createTransaction({
      organizationId: item.organizationId,
      type: 'COMMISSION',
      category: 'Comissão',
      description: `Comissão ${prof?.name || 'Barbeiro'} (${commissionPercent}%)`,
      amount: -commissionAmount,
      professionalId: item.assignedProfessionalId,
      date: getTodayStr()
    });

    this.saveDB(db);
    broadcastEvent('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
    return item;
  }

  static cancelQueueItem(queueId: string, reason?: string): WaitingQueueItem {
    const db = this.getDB();
    const item = db.queue.find(q => q.id === queueId);
    if (!item) throw new Error('Item da fila não encontrado');

    item.status = 'DESISTIU';
    if (reason) item.notes = `${item.notes || ''} [Cancelado: ${reason}]`;

    // Recalculate PROXIMO if needed
    const remaining = db.queue.filter(
      q => q.organizationId === item.organizationId && q.status === 'AGUARDANDO'
    );
    if (remaining.length > 0 && !db.queue.some(q => q.organizationId === item.organizationId && q.status === 'PROXIMO')) {
      remaining[0].status = 'PROXIMO';
    }

    this.saveDB(db);
    broadcastEvent('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
    return item;
  }

  // --- Transactions & Finance ---
  static getTransactions(orgId: string): Transaction[] {
    return this.getDB().transactions.filter(t => t.organizationId === orgId);
  }

  static createTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const db = this.getDB();
    const newTx: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    db.transactions.push(newTx);
    this.saveDB(db);
    broadcastEvent('FINANCE_UPDATED', { orgId: data.organizationId });
    return newTx;
  }

  // --- Reviews ---
  static getReviews(orgId: string): Review[] {
    return this.getDB().reviews.filter(r => r.organizationId === orgId);
  }

  static createReview(data: Omit<Review, 'id' | 'createdAt'>): Review {
    const db = this.getDB();
    const newRev: Review = {
      ...data,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    db.reviews.push(newRev);

    // Link review to appointment
    const apt = db.appointments.find(a => a.id === data.appointmentId);
    if (apt) {
      apt.reviewId = newRev.id;
    }

    this.saveDB(db);

    this.createNotification({
      organizationId: data.organizationId,
      type: 'REVIEW',
      title: 'Nova Avaliação!',
      message: `${data.customerName} avaliou o atendimento com ${data.rating} estrelas: "${data.comment}"`
    });

    broadcastEvent('REVIEWS_UPDATED', { orgId: data.organizationId });
    return newRev;
  }

  // --- Notifications ---
  static getNotifications(orgId: string): NotificationItem[] {
    return this.getDB()
      .notifications.filter(n => n.organizationId === orgId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static markNotificationAsRead(id: string): void {
    const db = this.getDB();
    const n = db.notifications.find(item => item.id === id);
    if (n) {
      n.isRead = true;
      this.saveDB(db);
      broadcastEvent('NOTIFICATIONS_UPDATED', { orgId: n.organizationId });
    }
  }

  static markAllNotificationsAsRead(orgId: string): void {
    const db = this.getDB();
    db.notifications.forEach(n => {
      if (n.organizationId === orgId) n.isRead = true;
    });
    this.saveDB(db);
    broadcastEvent('NOTIFICATIONS_UPDATED', { orgId });
  }

  static createNotification(data: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): NotificationItem {
    const db = this.getDB();
    const newNotif: NotificationItem = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    db.notifications.unshift(newNotif);
    this.saveDB(db);
    broadcastEvent('NOTIFICATIONS_UPDATED', { orgId: data.organizationId });
    return newNotif;
  }

  // --- Audit Logs ---
  static getAuditLogs(orgId?: string): AuditLog[] {
    const logs = this.getDB().auditLogs;
    if (orgId) return logs.filter(l => l.organizationId === orgId);
    return logs;
  }

  static logAudit(orgId: string | undefined, userName: string, details: string): void {
    const db = this.getDB();
    db.auditLogs.unshift({
      id: `log-${Date.now()}`,
      organizationId: orgId,
      userName,
      action: 'OPERACAO',
      details,
      timestamp: new Date().toISOString()
    });
    this.saveDB(db);
  }

  // --- SaaS Plans ---
  static getPlans(): SaaSPlan[] {
    const db = this.getDB();
    const hasAnnual838 = db.plans && db.plans.some(p => p.priceAnnual === 838.8 || p.name.includes('838,80'));
    if (!hasAnnual838 || db.plans.length === 0) {
      db.plans = DEFAULT_PLANS;
      this.saveDB(db);
    }
    return db.plans;
  }

  static updatePlanPrice(planId: string, priceMonthly: number, priceAnnual: number): void {
    const db = this.getDB();
    const p = db.plans.find(plan => plan.id === planId);
    if (p) {
      p.priceMonthly = priceMonthly;
      p.priceAnnual = priceAnnual;
      this.saveDB(db);
      broadcastEvent('PLANS_UPDATED');
    }
  }

  // --- Subscription Management (R$ 79,90/mês) ---
  static activateSubscription(
    orgId: string,
    paymentMethod: 'PIX' | 'CARTAO_CREDITO',
    receiptDescription?: string
  ): Organization {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organização não encontrada');

    const todayIso = new Date().toISOString().split('T')[0];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const nextBillingDate = nextDate.toISOString().split('T')[0];

    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const invoice = {
      id: invoiceId,
      date: todayIso,
      amount: 79.9,
      status: 'PAGO' as const,
      paymentMethod,
      description: receiptDescription || 'Mensalidade BarberOS Pro (R$ 79,90) - Acesso 100% Liberado'
    };

    if (!org.subscription) {
      org.subscription = {
        status: 'ATIVA',
        planName: 'Plano Pro BarberOS',
        priceMonthly: 79.9,
        isPaid: true,
        invoices: []
      };
    }

    org.subscription.status = 'ATIVA';
    org.subscription.isPaid = true;
    org.subscription.paymentMethod = paymentMethod;
    org.subscription.lastPaymentDate = todayIso;
    org.subscription.nextBillingDate = nextBillingDate;
    org.subscription.invoices.unshift(invoice);

    this.saveDB(db);

    this.createNotification({
      organizationId: org.id,
      type: 'STATUS_CHANGE',
      title: 'Assinatura Ativada com Sucesso!',
      message: `Pagamento de R$ 79,90 confirmado via ${paymentMethod === 'PIX' ? 'PIX Instantâneo' : 'Cartão de Crédito'}. O acesso a 100% das ferramentas do salão está liberado!`
    });

    this.logAudit(org.id, 'Proprietário', `Pagamento mensal de R$ 79,90 confirmado via ${paymentMethod}. Assinatura renovada até ${nextBillingDate}`);
    broadcastEvent('SUBSCRIPTION_UPDATED', { orgId, status: 'ATIVA' });
    return org;
  }

  static updateSubscriptionStatus(orgId: string, status: any): Organization {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organização não encontrada');

    if (!org.subscription) {
      org.subscription = {
        status,
        planName: 'Plano Pro BarberOS',
        priceMonthly: 79.9,
        isPaid: status === 'ATIVA',
        invoices: []
      };
    } else {
      org.subscription.status = status;
      org.subscription.isPaid = status === 'ATIVA';
    }

    this.saveDB(db);
    this.logAudit(org.id, 'Sistema', `Status da assinatura alterado para ${status}`);
    broadcastEvent('SUBSCRIPTION_UPDATED', { orgId, status });
    return org;
  }

  // --- SaaS Owner / Super Admin Payment Approval Workflow ---
  static requestSubscriptionApproval(
    orgId: string,
    proofNote?: string,
    paymentMethod: 'PIX' | 'CARTAO_CREDITO' = 'PIX'
  ): Organization {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organização não encontrada');

    if (!org.subscription) {
      org.subscription = {
        status: 'AGUARDANDO_APROVACAO',
        planName: 'Plano Pro Barbearia (R$ 79,90/mês)',
        priceMonthly: 79.9,
        isPaid: false,
        invoices: []
      };
    }

    org.subscription.status = 'AGUARDANDO_APROVACAO';
    org.subscription.paymentMethod = paymentMethod;
    org.subscription.paymentProofSentAt = new Date().toISOString();
    org.subscription.paymentProofNote = proofNote || 'Comprovante PIX de R$ 79,90 enviado para análise do Dono da SaaS';

    this.saveDB(db);

    this.createNotification({
      organizationId: org.id,
      type: 'STATUS_CHANGE',
      title: 'Comprovante Enviado para Análise',
      message: 'Seu comprovante de pagamento de R$ 79,90 foi enviado para o Dono da SaaS. O acesso 100% será liberado assim que confirmado.'
    });

    this.logAudit(org.id, 'Proprietário', `Comprovante de pagamento de R$ 79,90 enviado para aprovação do Dono da SaaS`);
    broadcastEvent('SUBSCRIPTION_UPDATED', { orgId, status: 'AGUARDANDO_APROVACAO' });
    return org;
  }

  static approveSubscription(orgId: string, approvedBy: string = 'Dono da SaaS'): Organization {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organização não encontrada');

    const todayIso = new Date().toISOString().split('T')[0];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const nextBillingDate = nextDate.toISOString().split('T')[0];

    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const invoice = {
      id: invoiceId,
      date: todayIso,
      amount: 79.9,
      status: 'PAGO' as const,
      paymentMethod: org.subscription?.paymentMethod || 'PIX',
      description: 'Mensalidade BarberOS Pro (R$ 79,90) - Confirmado pelo Dono da SaaS (100% Liberado)'
    };

    if (!org.subscription) {
      org.subscription = {
        status: 'ATIVA',
        planName: 'Plano Pro Barbearia (R$ 79,90/mês)',
        priceMonthly: 79.9,
        isPaid: true,
        invoices: []
      };
    }

    org.subscription.status = 'ATIVA';
    org.subscription.isPaid = true;
    org.subscription.lastPaymentDate = todayIso;
    org.subscription.nextBillingDate = nextBillingDate;
    org.subscription.invoices.unshift(invoice);

    this.saveDB(db);

    this.createNotification({
      organizationId: org.id,
      type: 'STATUS_CHANGE',
      title: '🎉 Pagamento Aprovado pelo Dono da SaaS!',
      message: `Seu pagamento mensal de R$ 79,90 foi confirmado pelo dono da plataforma! O acesso 100% às ferramentas da sua barbearia está liberado até ${nextBillingDate}.`
    });

    this.logAudit(org.id, approvedBy, `Acesso 100% liberado após confirmação do pagamento de R$ 79,90`);
    broadcastEvent('SUBSCRIPTION_UPDATED', { orgId, status: 'ATIVA' });
    return org;
  }

  static rejectSubscription(orgId: string, reason?: string): Organization {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === orgId);
    if (!org) throw new Error('Organização não encontrada');

    if (org.subscription) {
      org.subscription.status = 'PENDENTE';
      org.subscription.isPaid = false;
    }

    this.saveDB(db);

    this.createNotification({
      organizationId: org.id,
      type: 'STATUS_CHANGE',
      title: 'Pagamento Não Identificado',
      message: reason || 'O comprovante de R$ 79,90 não pôde ser confirmado. Por favor, envie o comprovante atualizado via WhatsApp.'
    });

    this.logAudit(org.id, 'Dono da SaaS', `Pagamento não confirmado: ${reason || 'Comprovante inválido ou pendente'}`);
    broadcastEvent('SUBSCRIPTION_UPDATED', { orgId, status: 'PENDENTE' });
    return org;
  }

  // --- Reset All Metrics for Clean State ---
  static resetAllMetrics(orgId?: string): void {
    const db = this.getDB();
    if (orgId) {
      db.appointments = db.appointments.filter(a => a.organizationId !== orgId);
      db.queue = db.queue.filter(q => q.organizationId !== orgId);
      db.customers = db.customers.filter(c => c.organizationId !== orgId);
      db.transactions = db.transactions.filter(t => t.organizationId !== orgId);
      db.reviews = db.reviews.filter(r => r.organizationId !== orgId);
    } else {
      db.appointments = [];
      db.queue = [];
      db.customers = [];
      db.transactions = [];
      db.reviews = [];
    }
    this.saveDB(db);
    this.logAudit(orgId, 'Administrador', 'Todas as métricas foram zeradas para primeiro uso');
    broadcastEvent('METRICS_RESET', { orgId });
  }

  // --- Authentication & Passwords ---
  static getSuperAdminPassword(): string {
    if (typeof window === 'undefined') return 'Anna123!@';
    const saved = localStorage.getItem(SUPER_ADMIN_PASSWORD_KEY);
    if (!saved || saved === 'admin123') {
      localStorage.setItem(SUPER_ADMIN_PASSWORD_KEY, 'Anna123!@');
      return 'Anna123!@';
    }
    return saved;
  }

  static async updateSuperAdminPassword(newPassword: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const cleanPass = newPassword.trim();
    localStorage.setItem(SUPER_ADMIN_PASSWORD_KEY, cleanPass);
    try {
      await fetch('/api/auth/update-superadmin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: cleanPass })
      });
    } catch {}
    this.logAudit('global', 'Super Admin', `Senha mestra do Super Admin alterada com sucesso`);
    broadcastEvent('SUPER_ADMIN_PASSWORD_UPDATED');
  }

  static getAuthSession(): AuthSession {
    if (typeof window === 'undefined') {
      return { isAuthenticated: false, uid: 'guest', role: 'OWNER' };
    }
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (raw) {
        const parsed: AuthSession = JSON.parse(raw);
        if (!parsed.uid) {
          parsed.uid = parsed.userId || `usr_${parsed.role?.toLowerCase() || 'owner'}_${parsed.organizationId || Date.now()}`;
        }
        return parsed;
      }
    } catch {}
    return { isAuthenticated: false, uid: 'guest', role: 'OWNER' };
  }

  static async saveSessionToBackend(session: AuthSession): Promise<AuthSession> {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          return data.session;
        }
      }
    } catch (err) {
      console.warn('Could not persist session to backend database:', err);
    }
    return session;
  }

  static setAuthSession(session: AuthSession): void {
    if (typeof window === 'undefined') return;

    // Ensure full session properties: UID, Token, Expiration, Role
    const nowIso = new Date().toISOString();
    const token = session.token || session.sessionId || localStorage.getItem(SESSION_TOKEN_KEY) || `sess_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const uid = session.uid || session.userId || `usr_${session.role.toLowerCase()}_${session.organizationId || Date.now()}`;
    const expiresAt = session.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const fullSession: AuthSession = {
      ...session,
      uid,
      userId: uid,
      token,
      sessionId: token,
      role: session.role,
      isAuthenticated: session.isAuthenticated !== false,
      loggedAt: session.loggedAt || nowIso,
      createdAt: session.createdAt || nowIso,
      lastActiveAt: nowIso,
      expiresAt,
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(fullSession));
    localStorage.setItem(SESSION_TOKEN_KEY, token);

    this.setCurrentRole(fullSession.role);
    if (fullSession.organizationId) {
      this.setCurrentOrgId(fullSession.organizationId);
    }

    // Persist full session (including UID and role) to backend database asynchronously
    this.saveSessionToBackend(fullSession);

    broadcastEvent('AUTH_SESSION_CHANGED', fullSession);
  }

  // Restore and verify user session from backend database on page reload or across browser sessions
  static async restoreSession(): Promise<AuthSession> {
    if (typeof window === 'undefined') {
      return { isAuthenticated: false, uid: 'guest', role: 'OWNER' };
    }

    const currentLocalSession = this.getAuthSession();
    const token = currentLocalSession.token || localStorage.getItem(SESSION_TOKEN_KEY);

    if (!token) {
      return currentLocalSession;
    }

    try {
      const res = await fetch('/api/auth/session/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.session) {
          const verifiedSession: AuthSession = {
            ...data.session,
            isAuthenticated: true,
          };

          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(verifiedSession));
          localStorage.setItem(SESSION_TOKEN_KEY, verifiedSession.token || token);

          this.setCurrentRole(verifiedSession.role);
          if (verifiedSession.organizationId) {
            this.setCurrentOrgId(verifiedSession.organizationId);
          }

          // If backend provided updated organization, sync into local database
          if (data.organization) {
            const db = this.getDB();
            const idx = db.organizations.findIndex(o => o.id === data.organization.id);
            if (idx >= 0) {
              db.organizations[idx] = data.organization;
            } else {
              db.organizations.push(data.organization);
            }
            if (Array.isArray(data.services)) {
              db.services = [...db.services.filter(s => s.organizationId !== data.organization.id), ...data.services];
            }
            if (Array.isArray(data.professionals)) {
              db.professionals = [...db.professionals.filter(p => p.organizationId !== data.organization.id), ...data.professionals];
            }
            if (Array.isArray(data.appointments)) {
              db.appointments = [...db.appointments.filter(a => a.organizationId !== data.organization.id), ...data.appointments];
            }
            if (Array.isArray(data.customers)) {
              db.customers = [...db.customers.filter(c => c.organizationId !== data.organization.id), ...data.customers];
            }
            if (Array.isArray(data.queue)) {
              db.queue = [...db.queue.filter(q => q.organizationId !== data.organization.id), ...data.queue];
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
          }

          broadcastEvent('AUTH_SESSION_CHANGED', verifiedSession);
          return verifiedSession;
        }
      } else if (res.status === 401) {
        console.warn('Backend session expired or revoked, clearing session.');
        localStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        const emptySession: AuthSession = { isAuthenticated: false, uid: 'guest', role: 'OWNER' };
        broadcastEvent('AUTH_SESSION_CHANGED', emptySession);
        return emptySession;
      }
    } catch (err) {
      console.warn('Offline or network error verifying backend session, using local cache:', err);
    }

    // Offline fallback: check local expiration
    if (currentLocalSession.isAuthenticated && currentLocalSession.expiresAt) {
      if (new Date(currentLocalSession.expiresAt).getTime() < Date.now()) {
        localStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        return { isAuthenticated: false, uid: 'guest', role: 'OWNER' };
      }
    }

    return currentLocalSession;
  }

  static async loginOwner(
    emailOrSlug: string,
    password: string
  ): Promise<{ success: boolean; organization?: Organization; error?: string }> {
    const term = emailOrSlug.trim();
    const cleanPass = password.trim();

    // 1. Try server authentication first (durable across browsers & devices)
    try {
      const res = await fetch('/api/auth/login-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: term, password: cleanPass })
      });
      const data = await res.json();
      if (res.ok && data.success && data.organization) {
        // Sync local DB cache with the loaded organization and all its data
        const db = this.getDB();
        const existingIdx = db.organizations.findIndex(o => o.id === data.organization.id);
        if (existingIdx >= 0) {
          db.organizations[existingIdx] = data.organization;
        } else {
          db.organizations.push(data.organization);
        }
        if (Array.isArray(data.services)) {
          db.services = [...db.services.filter(s => s.organizationId !== data.organization.id), ...data.services];
        }
        if (Array.isArray(data.professionals)) {
          db.professionals = [...db.professionals.filter(p => p.organizationId !== data.organization.id), ...data.professionals];
        }
        if (Array.isArray(data.appointments)) {
          db.appointments = [...db.appointments.filter(a => a.organizationId !== data.organization.id), ...data.appointments];
        }
        if (Array.isArray(data.customers)) {
          db.customers = [...db.customers.filter(c => c.organizationId !== data.organization.id), ...data.customers];
        }
        if (Array.isArray(data.queue)) {
          db.queue = [...db.queue.filter(q => q.organizationId !== data.organization.id), ...data.queue];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

        this.setAuthSession(data.session);
        this.setCurrentOrgId(data.organization.id);
        return { success: true, organization: data.organization };
      } else if (res.status === 401 || res.status === 403) {
        return { success: false, error: data.error };
      }
      return { success: false, error: data?.error || 'Falha ao autenticar no servidor.' };
    } catch (err: any) {
      console.error('Server login error:', err);
      return { success: false, error: 'Falha de conexão com o servidor ao autenticar: ' + (err?.message || 'Erro de rede') };
    }
  }

  static async loginSuperAdmin(password: string): Promise<{ success: boolean; error?: string }> {
    const cleanPass = password.trim();

    // 1. Try server backend authentication
    try {
      const res = await fetch('/api/auth/login-superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.setAuthSession(data.session);
        return { success: true };
      } else {
        return { success: false, error: data?.error || 'Senha incorreta do Administrador Geral.' };
      }
    } catch (err: any) {
      console.error('Server superadmin login error:', err);
      return { success: false, error: 'Falha de conexão com o servidor ao autenticar administrador: ' + (err?.message || 'Erro de rede') };
    }
  }

  static isSuperAdminAuthenticated(): boolean {
    const session = this.getAuthSession();
    return session.isAuthenticated && session.role === 'SUPER_ADMIN';
  }

  static async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    const session = this.getAuthSession();
    const token = session.token || localStorage.getItem(SESSION_TOKEN_KEY);

    if (token) {
      try {
        await fetch('/api/auth/session/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
      } catch (err) {
        console.warn('Error during backend session logout:', err);
      }
    }

    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    this.setCurrentRole('OWNER');
    broadcastEvent('AUTH_SESSION_CHANGED', { isAuthenticated: false, uid: 'guest', role: 'OWNER' });
  }
}
