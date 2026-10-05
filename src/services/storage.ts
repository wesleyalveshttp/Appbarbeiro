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
  PaymentMethod
} from '../types';

const STORAGE_KEY = 'barberos_saas_data_v1';
const CURRENT_ORG_KEY = 'barberos_current_org_id';
const CURRENT_ROLE_KEY = 'barberos_current_user_role';

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
    id: 'gratuito',
    name: 'Gratuito',
    priceMonthly: 0,
    priceAnnual: 0,
    maxProfessionals: 1,
    maxAppointmentsPerMonth: 50,
    features: [
      '1 Profissional habilitado',
      'Até 50 agendamentos/mês',
      'Agenda digital diária',
      'Cadastro básico de clientes',
      'Link público padrão'
    ]
  },
  {
    id: 'profissional',
    name: 'Profissional',
    priceMonthly: 39.9,
    priceAnnual: 399.0,
    maxProfessionals: 5,
    maxAppointmentsPerMonth: -1,
    popular: true,
    features: [
      'Até 5 Profissionais',
      'Agendamentos ilimitados',
      'Fila de espera em tempo real',
      'Notificações no sistema',
      'Relatórios e métricas de desempenho',
      'Página personalizada com QR Code',
      'Histórico de clientes e atendimentos'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 79.9,
    priceAnnual: 799.0,
    maxProfessionals: -1,
    maxAppointmentsPerMonth: -1,
    features: [
      'Profissionais ilimitados',
      'Fila inteligente com estimativa ao vivo',
      'Camada de integração WhatsApp Oficial',
      'Módulo financeiro completo & DRE',
      'Controle de comissões individualizadas',
      'Relatórios avançados com exportação',
      'Personalização visual completa da marca',
      'Suporte prioritário VIP'
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
    name: 'Barbearia Dom Navalha',
    slug: 'dom-navalha',
    type: 'Barbearia',
    description: 'A melhor experiência em corte tradicional, barba na toalha quente e cuidados masculinos de alto padrão.',
    phone: '(11) 98765-4321',
    whatsapp: '11987654321',
    instagram: '@domnavalha.oficial',
    address: {
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1420',
      neighborhood: 'Bela Vista',
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
      autoNotifyAheadCount: 2,
      primaryColor: '#f59e0b',
      secondaryColor: '#0f172a',
      welcomeMessage: 'Bem-vindo à Dom Navalha! Agende seu horário ou acompanhe a fila ao vivo.',
      isOpenNow: true,
      whatsappApiConfigured: false
    },
    planId: 'premium',
    isActive: true,
    createdAt: '2026-01-10T10:00:00.000Z'
  };

  const org2: Organization = {
    id: 'org-glamour',
    name: 'Studio Glamour & Hair',
    slug: 'studio-glamour',
    type: 'Salão de beleza',
    description: 'Especialistas em mechas, visagismo, corte feminino e estética capilar.',
    phone: '(21) 97654-3210',
    whatsapp: '21976543210',
    instagram: '@studioglamour.rio',
    address: {
      cep: '22041-001',
      street: 'Rua Barata Ribeiro',
      number: '502',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ'
    },
    workingHours: [
      { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '10:00', closeTime: '16:00' },
      { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: false, openTime: '09:00', closeTime: '19:00' },
      { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '19:00' },
      { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '19:00' },
      { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '19:00' },
      { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:30', closeTime: '19:00' }
    ],
    settings: {
      maxLateMinutes: 20,
      cancellationHoursLimit: 3,
      queueMode: 'PER_PROFESSIONAL',
      autoNotifyAheadCount: 1,
      primaryColor: '#ec4899',
      secondaryColor: '#1e1b4b',
      welcomeMessage: 'Studio Glamour & Hair: Cuidando da sua beleza e bem-estar.',
      isOpenNow: true,
      whatsappApiConfigured: false
    },
    planId: 'profissional',
    isActive: true,
    createdAt: '2026-02-01T10:00:00.000Z'
  };

  const professionals: Professional[] = [
    {
      id: 'prof-1',
      organizationId: 'org-prime',
      name: 'João Mestre Navalha',
      email: 'joao@domnavalha.com.br',
      phone: '(11) 98765-1111',
      whatsapp: '11987651111',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      specialties: ['Corte Degradê Clássico', 'Barba Terapia', 'Navalhado'],
      serviceIds: ['srv-1', 'srv-2', 'srv-3', 'srv-4'],
      commissionPercent: 40,
      isActive: true,
      isAvailableToday: true,
      workingDays: [1, 2, 3, 4, 5, 6],
      createdAt: '2026-01-11T10:00:00.000Z'
    },
    {
      id: 'prof-2',
      organizationId: 'org-prime',
      name: 'Carlos Oliveira',
      email: 'carlos@domnavalha.com.br',
      phone: '(11) 98765-2222',
      whatsapp: '11987652222',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      specialties: ['Corte Moderno', 'Pigmentação de Barba', 'Freestyle'],
      serviceIds: ['srv-1', 'srv-2', 'srv-4', 'srv-5'],
      commissionPercent: 35,
      isActive: true,
      isAvailableToday: true,
      workingDays: [1, 2, 3, 4, 5, 6],
      createdAt: '2026-01-12T10:00:00.000Z'
    },
    {
      id: 'prof-3',
      organizationId: 'org-prime',
      name: 'Lucas Barbeiro',
      email: 'lucas@domnavalha.com.br',
      phone: '(11) 98765-3333',
      whatsapp: '11987653333',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      specialties: ['Fade Tradicional', 'Barboterapia', 'Sobrancelha'],
      serviceIds: ['srv-1', 'srv-3', 'srv-5'],
      commissionPercent: 35,
      isActive: true,
      isAvailableToday: true,
      workingDays: [2, 3, 4, 5, 6],
      createdAt: '2026-01-15T10:00:00.000Z'
    },
    // Org 2 professional
    {
      id: 'prof-4',
      organizationId: 'org-glamour',
      name: 'Juliana Paes Hair',
      email: 'juliana@studioglamour.com.br',
      phone: '(21) 98888-4444',
      whatsapp: '21988884444',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      specialties: ['Colorimetria', 'Corte em Camadas', 'Escova Modelada'],
      serviceIds: ['srv-6', 'srv-7'],
      commissionPercent: 45,
      isActive: true,
      isAvailableToday: true,
      workingDays: [2, 3, 4, 5, 6],
      createdAt: '2026-02-02T10:00:00.000Z'
    }
  ];

  const services: Service[] = [
    {
      id: 'srv-1',
      organizationId: 'org-prime',
      name: 'Corte Masculino Premium',
      description: 'Corte tesoura e máquina, lavagem refrescante e finalização com pomada modeladora.',
      price: 45,
      durationMinutes: 30,
      category: 'Cabelo',
      professionalIds: ['prof-1', 'prof-2', 'prof-3'],
      isActive: true,
      createdAt: '2026-01-10T11:00:00.000Z'
    },
    {
      id: 'srv-2',
      organizationId: 'org-prime',
      name: 'Combo Corte + Barba Terapia',
      description: 'Corte completo alinhado e barba com toalha quente, vapor de ozônio e óleos essenciais.',
      price: 80,
      durationMinutes: 60,
      category: 'Combos',
      professionalIds: ['prof-1', 'prof-2'],
      isActive: true,
      createdAt: '2026-01-10T11:00:00.000Z'
    },
    {
      id: 'srv-3',
      organizationId: 'org-prime',
      name: 'Barba Tradicional',
      description: 'Alinhamento com navalhete descartável, toalha quente e pós-barba balsâmico.',
      price: 40,
      durationMinutes: 30,
      category: 'Barba',
      professionalIds: ['prof-1', 'prof-3'],
      isActive: true,
      createdAt: '2026-01-10T11:00:00.000Z'
    },
    {
      id: 'srv-4',
      organizationId: 'org-prime',
      name: 'Pigmentação de Barba ou Cabelo',
      description: 'Disfarce de fios brancos e realce dos contornos faciais.',
      price: 35,
      durationMinutes: 20,
      category: 'Tratamentos',
      professionalIds: ['prof-1', 'prof-2'],
      isActive: true,
      createdAt: '2026-01-10T11:00:00.000Z'
    },
    {
      id: 'srv-5',
      organizationId: 'org-prime',
      name: 'Design de Sobrancelha na Navalha',
      description: 'Limpeza e alinhamento milimétrico das sobrancelhas.',
      price: 20,
      durationMinutes: 15,
      category: 'Rosto',
      professionalIds: ['prof-2', 'prof-3'],
      isActive: true,
      createdAt: '2026-01-10T11:00:00.000Z'
    },
    // Org 2 services
    {
      id: 'srv-6',
      organizationId: 'org-glamour',
      name: 'Corte e Escova Glamour',
      description: 'Visagismo, lavagem hidratante e escova modelada.',
      price: 120,
      durationMinutes: 50,
      category: 'Cabelo',
      professionalIds: ['prof-4'],
      isActive: true,
      createdAt: '2026-02-02T11:00:00.000Z'
    },
    {
      id: 'srv-7',
      organizationId: 'org-glamour',
      name: 'Hidratação Profunda & Reconstrução',
      description: 'Tratamento intensivo com ampola de queratina e selagem térmica.',
      price: 160,
      durationMinutes: 60,
      category: 'Tratamentos',
      professionalIds: ['prof-4'],
      isActive: true,
      createdAt: '2026-02-02T11:00:00.000Z'
    }
  ];

  const customers: Customer[] = [
    {
      id: 'cust-1',
      organizationId: 'org-prime',
      name: 'Pedro Henrique Ramos',
      phone: '(11) 99111-2233',
      whatsapp: '11991112233',
      email: 'pedro.ramos@email.com',
      notes: 'Prefere degradê na zero alta. Café expresso sem açúcar.',
      totalAppointments: 8,
      totalSpent: 480,
      favoriteProfessionalId: 'prof-1',
      favoriteServiceId: 'srv-2',
      lastVisit: today,
      createdAt: '2026-01-20T14:00:00.000Z'
    },
    {
      id: 'cust-2',
      organizationId: 'org-prime',
      name: 'Marcos Vinicius Silva',
      phone: '(11) 98222-3344',
      whatsapp: '11982223344',
      email: 'marcos.v@email.com',
      notes: 'Pele sensível no pescoço, usar loção calmante.',
      totalAppointments: 5,
      totalSpent: 225,
      favoriteProfessionalId: 'prof-2',
      favoriteServiceId: 'srv-1',
      lastVisit: today,
      createdAt: '2026-02-01T15:00:00.000Z'
    },
    {
      id: 'cust-3',
      organizationId: 'org-prime',
      name: 'André Carvalho',
      phone: '(11) 97333-4455',
      whatsapp: '11973334455',
      notes: 'Cliente pontual.',
      totalAppointments: 3,
      totalSpent: 165,
      favoriteProfessionalId: 'prof-1',
      favoriteServiceId: 'srv-1',
      lastVisit: '2026-03-28',
      createdAt: '2026-02-15T16:00:00.000Z'
    },
    {
      id: 'cust-4',
      organizationId: 'org-prime',
      name: 'Felipe Santana',
      phone: '(11) 96444-5566',
      whatsapp: '11964445566',
      totalAppointments: 2,
      totalSpent: 120,
      favoriteProfessionalId: 'prof-3',
      favoriteServiceId: 'srv-2',
      createdAt: '2026-03-01T10:00:00.000Z'
    },
    {
      id: 'cust-5',
      organizationId: 'org-prime',
      name: 'Rodrigo Medeiros',
      phone: '(11) 95555-6677',
      whatsapp: '11955556677',
      totalAppointments: 1,
      totalSpent: 45,
      favoriteProfessionalId: 'prof-1',
      favoriteServiceId: 'srv-1',
      createdAt: '2026-03-10T12:00:00.000Z'
    }
  ];

  const appointments: Appointment[] = [
    {
      id: 'apt-1',
      token: 'tok_pedro_live_01',
      organizationId: 'org-prime',
      customerId: 'cust-1',
      customerName: 'Pedro Henrique Ramos',
      customerPhone: '(11) 99111-2233',
      serviceId: 'srv-2',
      serviceName: 'Combo Corte + Barba Terapia',
      servicePrice: 80,
      durationMinutes: 60,
      professionalId: 'prof-1',
      professionalName: 'João Mestre Navalha',
      date: today,
      time: '14:00',
      status: 'NA CADEIRA',
      statusHistory: [
        { status: 'AGENDADO', timestamp: `${today}T10:00:00.000Z`, note: 'Agendado online' },
        { status: 'CHEGOU', timestamp: `${today}T13:55:00.000Z`, note: 'Chegou na recepção' },
        { status: 'NA CADEIRA', timestamp: `${today}T14:02:00.000Z`, note: 'Iniciou atendimento com João' }
      ],
      paymentStatus: 'PENDENTE',
      notes: 'Toalha quente e barba alinhada',
      arrivedAt: `${today}T13:55:00.000Z`,
      onChairAt: `${today}T14:02:00.000Z`,
      createdAt: `${today}T10:00:00.000Z`
    },
    {
      id: 'apt-2',
      token: 'tok_marcos_live_02',
      organizationId: 'org-prime',
      customerId: 'cust-2',
      customerName: 'Marcos Vinicius Silva',
      customerPhone: '(11) 98222-3344',
      serviceId: 'srv-1',
      serviceName: 'Corte Masculino Premium',
      servicePrice: 45,
      durationMinutes: 30,
      professionalId: 'prof-2',
      professionalName: 'Carlos Oliveira',
      date: today,
      time: '14:30',
      status: 'A CAMINHO',
      statusHistory: [
        { status: 'AGENDADO', timestamp: `${today}T09:30:00.000Z` },
        { status: 'CONFIRMADO', timestamp: `${today}T12:00:00.000Z` },
        { status: 'A CAMINHO', timestamp: `${today}T14:15:00.000Z`, note: 'Cliente informou que está a 5 min' }
      ],
      paymentStatus: 'PENDENTE',
      createdAt: `${today}T09:30:00.000Z`
    },
    {
      id: 'apt-3',
      token: 'tok_andre_live_03',
      organizationId: 'org-prime',
      customerId: 'cust-3',
      customerName: 'André Carvalho',
      customerPhone: '(11) 97333-4455',
      serviceId: 'srv-1',
      serviceName: 'Corte Masculino Premium',
      servicePrice: 45,
      durationMinutes: 30,
      professionalId: 'prof-1',
      professionalName: 'João Mestre Navalha',
      date: today,
      time: '11:00',
      status: 'FINALIZADO',
      statusHistory: [
        { status: 'AGENDADO', timestamp: `${today}T08:00:00.000Z` },
        { status: 'CHEGOU', timestamp: `${today}T10:58:00.000Z` },
        { status: 'NA CADEIRA', timestamp: `${today}T11:05:00.000Z` },
        { status: 'FINALIZADO', timestamp: `${today}T11:38:00.000Z`, note: 'Atendimento concluído com sucesso' }
      ],
      paymentMethod: 'PIX',
      paymentStatus: 'PAGO',
      commissionPaid: 18, // 40% of 45
      arrivedAt: `${today}T10:58:00.000Z`,
      onChairAt: `${today}T11:05:00.000Z`,
      finishedAt: `${today}T11:38:00.000Z`,
      reviewId: 'rev-1',
      createdAt: `${today}T08:00:00.000Z`
    },
    {
      id: 'apt-4',
      token: 'tok_felipe_live_04',
      organizationId: 'org-prime',
      customerId: 'cust-4',
      customerName: 'Felipe Santana',
      customerPhone: '(11) 96444-5566',
      serviceId: 'srv-2',
      serviceName: 'Combo Corte + Barba Terapia',
      servicePrice: 80,
      durationMinutes: 60,
      professionalId: 'prof-3',
      professionalName: 'Lucas Barbeiro',
      date: today,
      time: '15:30',
      status: 'CONFIRMADO',
      statusHistory: [
        { status: 'AGENDADO', timestamp: `${today}T11:15:00.000Z` },
        { status: 'CONFIRMADO', timestamp: `${today}T13:00:00.000Z` }
      ],
      paymentStatus: 'PENDENTE',
      createdAt: `${today}T11:15:00.000Z`
    },
    {
      id: 'apt-5',
      token: 'tok_rodrigo_live_05',
      organizationId: 'org-prime',
      customerId: 'cust-5',
      customerName: 'Rodrigo Medeiros',
      customerPhone: '(11) 95555-6677',
      serviceId: 'srv-1',
      serviceName: 'Corte Masculino Premium',
      servicePrice: 45,
      durationMinutes: 30,
      professionalId: 'prof-1',
      professionalName: 'João Mestre Navalha',
      date: today,
      time: '16:45',
      status: 'AGENDADO',
      statusHistory: [
        { status: 'AGENDADO', timestamp: `${today}T12:00:00.000Z` }
      ],
      paymentStatus: 'PENDENTE',
      createdAt: `${today}T12:00:00.000Z`
    }
  ];

  const queue: WaitingQueueItem[] = [
    {
      id: 'q-1',
      ticketNumber: 101,
      organizationId: 'org-prime',
      customerName: 'Lucas Martins',
      customerPhone: '(11) 94444-1234',
      serviceId: 'srv-1',
      serviceName: 'Corte Masculino Premium',
      preferredProfessionalId: 'prof-2',
      status: 'PROXIMO',
      joinedAt: `${today}T13:40:00.000Z`,
      notes: 'Sem preferência rígida, pode ser qualquer um disponível',
      estimatedWaitMinutes: 5
    },
    {
      id: 'q-2',
      ticketNumber: 102,
      organizationId: 'org-prime',
      customerName: 'Gabriel Souza',
      customerPhone: '(11) 93333-5678',
      serviceId: 'srv-2',
      serviceName: 'Combo Corte + Barba Terapia',
      preferredProfessionalId: 'prof-1',
      status: 'AGUARDANDO',
      joinedAt: `${today}T13:52:00.000Z`,
      notes: 'Prefere ser atendido pelo João',
      estimatedWaitMinutes: 25
    },
    {
      id: 'q-3',
      ticketNumber: 103,
      organizationId: 'org-prime',
      customerName: 'Matheus Costa',
      customerPhone: '(11) 92222-9012',
      serviceId: 'srv-3',
      serviceName: 'Barba Tradicional',
      status: 'AGUARDANDO',
      joinedAt: `${today}T14:10:00.000Z`,
      estimatedWaitMinutes: 45
    }
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      organizationId: 'org-prime',
      type: 'INCOME',
      category: 'Serviço',
      description: 'Atendimento André Carvalho - Corte Masculino Premium',
      amount: 45,
      paymentMethod: 'PIX',
      appointmentId: 'apt-3',
      professionalId: 'prof-1',
      date: today,
      createdAt: `${today}T11:38:00.000Z`
    },
    {
      id: 'tx-2',
      organizationId: 'org-prime',
      type: 'COMMISSION',
      category: 'Comissão',
      description: 'Comissão João Mestre Navalha (40%)',
      amount: -18,
      appointmentId: 'apt-3',
      professionalId: 'prof-1',
      date: today,
      createdAt: `${today}T11:38:00.000Z`
    },
    {
      id: 'tx-3',
      organizationId: 'org-prime',
      type: 'EXPENSE',
      category: 'Insumos',
      description: 'Compra de Lâminas descartáveis e toalhas térmicas',
      amount: -120,
      paymentMethod: 'CARTAO_DEBITO',
      date: today,
      createdAt: `${today}T09:00:00.000Z`
    },
    {
      id: 'tx-4',
      organizationId: 'org-prime',
      type: 'INCOME',
      category: 'Serviço',
      description: 'Atendimento do dia anterior - Pacote Barba & Cabelo',
      amount: 160,
      paymentMethod: 'CARTAO_CREDITO',
      date: '2026-03-29',
      createdAt: '2026-03-29T18:00:00.000Z'
    }
  ];

  const reviews: Review[] = [
    {
      id: 'rev-1',
      organizationId: 'org-prime',
      appointmentId: 'apt-3',
      customerName: 'André Carvalho',
      rating: 5,
      comment: 'Atendimento impecável do João! Barba na toalha quente e corte perfeito. Recomendo demais!',
      serviceName: 'Corte Masculino Premium',
      professionalName: 'João Mestre Navalha',
      createdAt: `${today}T12:00:00.000Z`
    },
    {
      id: 'rev-2',
      organizationId: 'org-prime',
      appointmentId: 'apt-old-1',
      customerName: 'Pedro Henrique Ramos',
      rating: 5,
      comment: 'Ambiente top, cerveja gelada enquanto espera e profissionais nota 10.',
      serviceName: 'Combo Corte + Barba Terapia',
      professionalName: 'João Mestre Navalha',
      createdAt: '2026-03-25T17:00:00.000Z'
    }
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      organizationId: 'org-prime',
      type: 'CUSTOMER_ARRIVED',
      title: 'Cliente chegou!',
      message: 'Pedro Henrique Ramos chegou na barbearia para o horário das 14:00.',
      timestamp: `${today}T13:55:00.000Z`,
      isRead: false
    },
    {
      id: 'notif-2',
      organizationId: 'org-prime',
      type: 'QUEUE_JOIN',
      title: 'Novo cliente na fila!',
      message: 'Matheus Costa entrou na fila de espera (Senha #103).',
      timestamp: `${today}T14:10:00.000Z`,
      isRead: false
    },
    {
      id: 'notif-3',
      organizationId: 'org-prime',
      type: 'STATUS_CHANGE',
      title: 'Cliente a caminho',
      message: 'Marcos Vinicius Silva avisou que está a caminho do horário das 14:30.',
      timestamp: `${today}T14:15:00.000Z`,
      isRead: true
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      organizationId: 'org-prime',
      userName: 'João Proprietário',
      action: 'ABERTURA_EXPEDIENTE',
      details: 'Estabelecimento aberto para atendimentos e fila digital',
      timestamp: `${today}T08:30:00.000Z`
    },
    {
      id: 'log-2',
      organizationId: 'org-prime',
      userName: 'Carlos Oliveira',
      action: 'CHAMAR_FILA',
      details: 'Lucas Martins (#101) colocado como PRÓXIMO',
      timestamp: `${today}T13:45:00.000Z`
    }
  ];

  return {
    organizations: [org1, org2],
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
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  // --- Session & Current Org Context ---
  static getCurrentOrgId(): string {
    if (typeof window === 'undefined') return 'org-prime';
    return localStorage.getItem(CURRENT_ORG_KEY) || 'org-prime';
  }

  static setCurrentOrgId(id: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CURRENT_ORG_KEY, id);
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
    return this.getDB().organizations.find(o => o.slug.toLowerCase() === slug.toLowerCase());
  }

  static createOrganization(data: Omit<Organization, 'id' | 'createdAt' | 'isActive'>): Organization {
    const db = this.getDB();
    const id = `org-${Date.now()}`;
    const newOrg: Organization = {
      ...data,
      id,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.organizations.push(newOrg);
    this.saveDB(db);
    this.logAudit(id, 'Novo Estabelecimento', `Estabelecimento ${newOrg.name} criado via onboarding`);
    broadcastEvent('ORGANIZATIONS_UPDATED');
    return newOrg;
  }

  static updateOrganization(id: string, updates: Partial<Organization>): Organization {
    const db = this.getDB();
    const index = db.organizations.findIndex(o => o.id === id);
    if (index === -1) throw new Error('Organização não encontrada');
    db.organizations[index] = { ...db.organizations[index], ...updates };
    this.saveDB(db);
    broadcastEvent('ORGANIZATION_UPDATED', { orgId: id });
    return db.organizations[index];
  }

  static toggleOrganizationStatus(id: string): Organization {
    const db = this.getDB();
    const org = db.organizations.find(o => o.id === id);
    if (!org) throw new Error('Organização não encontrada');
    org.isActive = !org.isActive;
    this.saveDB(db);
    broadcastEvent('ORGANIZATION_UPDATED', { orgId: id });
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
    broadcastEvent('PROFESSIONALS_UPDATED', { orgId: data.organizationId });
    return newProf;
  }

  static updateProfessional(id: string, updates: Partial<Professional>): Professional {
    const db = this.getDB();
    const idx = db.professionals.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Profissional não encontrado');
    db.professionals[idx] = { ...db.professionals[idx], ...updates };
    this.saveDB(db);
    broadcastEvent('PROFESSIONALS_UPDATED', { orgId: db.professionals[idx].organizationId });
    return db.professionals[idx];
  }

  static deleteProfessional(id: string): void {
    const db = this.getDB();
    const prof = db.professionals.find(p => p.id === id);
    if (!prof) return;
    db.professionals = db.professionals.filter(p => p.id !== id);
    this.saveDB(db);
    broadcastEvent('PROFESSIONALS_UPDATED', { orgId: prof.organizationId });
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
    broadcastEvent('SERVICES_UPDATED', { orgId: data.organizationId });
    return newSrv;
  }

  static updateService(id: string, updates: Partial<Service>): Service {
    const db = this.getDB();
    const idx = db.services.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Serviço não encontrado');
    db.services[idx] = { ...db.services[idx], ...updates };
    this.saveDB(db);
    broadcastEvent('SERVICES_UPDATED', { orgId: db.services[idx].organizationId });
    return db.services[idx];
  }

  static deleteService(id: string): void {
    const db = this.getDB();
    const srv = db.services.find(s => s.id === id);
    if (!srv) return;
    db.services = db.services.filter(s => s.id !== id);
    this.saveDB(db);
    broadcastEvent('SERVICES_UPDATED', { orgId: srv.organizationId });
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
      .filter(q => q.organizationId === orgId && (q.status === 'AGUARDANDO' || q.status === 'PROXIMO' || q.status === 'CHAMADO' || q.status === 'NA CADEIRA'))
      .sort((a, b) => a.ticketNumber - b.ticketNumber);
  }

  static getAllQueueHistory(orgId: string): WaitingQueueItem[] {
    const db = this.getDB();
    return db.queue.filter(q => q.organizationId === orgId);
  }

  static joinQueue(data: {
    organizationId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    preferredProfessionalId?: string;
    notes?: string;
  }): WaitingQueueItem {
    const db = this.getDB();
    const service = db.services.find(s => s.id === data.serviceId);
    if (!service) throw new Error('Serviço não encontrado');

    // Find latest ticket number for today
    const maxTicket = db.queue
      .filter(q => q.organizationId === data.organizationId)
      .reduce((max, item) => Math.max(max, item.ticketNumber), 100);

    const ticketNumber = maxTicket + 1;

    // Calculate position
    const activeWaiting = db.queue.filter(
      q => q.organizationId === data.organizationId && (q.status === 'AGUARDANDO' || q.status === 'PROXIMO')
    );
    const estimatedWaitMinutes = Math.max(10, activeWaiting.length * 20);

    const newQueueItem: WaitingQueueItem = {
      id: `q-${Date.now()}`,
      ticketNumber,
      organizationId: data.organizationId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: service.id,
      serviceName: service.name,
      preferredProfessionalId: data.preferredProfessionalId,
      status: activeWaiting.length === 0 ? 'PROXIMO' : 'AGUARDANDO',
      joinedAt: new Date().toISOString(),
      notes: data.notes,
      estimatedWaitMinutes
    };

    db.queue.push(newQueueItem);
    this.saveDB(db);

    this.createNotification({
      organizationId: data.organizationId,
      type: 'QUEUE_JOIN',
      title: 'Cliente entrou na fila!',
      message: `${data.customerName} entrou na fila para ${service.name} (Senha #${ticketNumber}).`
    });

    this.logAudit(data.organizationId, data.customerName, `Entrou na fila - Senha #${ticketNumber}`);
    broadcastEvent('QUEUE_UPDATED', { orgId: data.organizationId, queueItemId: newQueueItem.id });
    return newQueueItem;
  }

  static callQueueCustomer(
    queueId: string,
    assignedProfessionalId: string
  ): WaitingQueueItem {
    const db = this.getDB();
    const item = db.queue.find(q => q.id === queueId);
    if (!item) throw new Error('Item da fila não encontrado');

    const prof = db.professionals.find(p => p.id === assignedProfessionalId);
    item.status = 'CHAMADO';
    item.calledAt = new Date().toISOString();
    item.assignedProfessionalId = assignedProfessionalId;

    // Promote next waiting item to PROXIMO
    const nextItem = db.queue.find(
      q => q.organizationId === item.organizationId && q.status === 'AGUARDANDO' && q.id !== queueId
    );
    if (nextItem) {
      nextItem.status = 'PROXIMO';
      nextItem.estimatedWaitMinutes = 5;
    }

    this.saveDB(db);

    this.createNotification({
      organizationId: item.organizationId,
      type: 'QUEUE_CALLED',
      title: 'Cliente Chamado!',
      message: `${item.customerName} foi chamado para a cadeira de ${prof?.name || 'Barbeiro'}.`
    });

    this.logAudit(item.organizationId, prof?.name || 'Profissional', `Chamou cliente ${item.customerName} da fila`);
    broadcastEvent('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
    return item;
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
    return this.getDB().plans;
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
}
