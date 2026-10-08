export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'PROFESSIONAL' | 'CLIENT';

export type AppointmentStatus =
  | 'AGENDADO'
  | 'CONFIRMADO'
  | 'A CAMINHO'
  | 'CHEGOU'
  | 'AGUARDANDO'
  | 'NA CADEIRA'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'FALTOU';

export type QueueStatus =
  | 'AGUARDANDO'
  | 'PROXIMO'
  | 'CHAMADO'
  | 'NA CADEIRA'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'DESISTIU';

export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'OUTRO';

export type EstablishmentType =
  | 'Barbearia'
  | 'Salão de beleza'
  | 'Studio'
  | 'Cabeleireiro'
  | 'Unhas'
  | 'Estética'
  | 'Outro';

export interface WorkingHours {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  dayName: string;
  isOpen: boolean;
  openTime: string; // "08:00"
  closeTime: string; // "20:00"
  hasLunchBreak?: boolean;
  lunchStart?: string; // "12:00"
  lunchEnd?: string; // "13:30"
}

export type SubscriptionStatus = 'ATIVA' | 'TESTE_GRATIS' | 'PENDENTE' | 'AGUARDANDO_APROVACAO' | 'VENCIDA';

export interface SubscriptionInvoice {
  id: string;
  date: string;
  amount: number;
  status: 'PAGO' | 'PENDENTE';
  paymentMethod: 'PIX' | 'CARTAO_CREDITO';
  receiptUrl?: string;
  description: string;
}

export interface OrgSubscription {
  status: SubscriptionStatus;
  planName: string;
  priceMonthly: number; // 79.90
  trialDaysRemaining?: number;
  nextBillingDate?: string;
  lastPaymentDate?: string;
  paymentMethod?: 'PIX' | 'CARTAO_CREDITO';
  isPaid: boolean;
  paymentProofSentAt?: string;
  paymentProofNote?: string;
  invoices: SubscriptionInvoice[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: EstablishmentType;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  phone: string;
  whatsapp: string;
  instagram?: string;
  // Account login credentials for the establishment owner
  ownerEmail?: string;
  ownerPassword?: string;
  ownerName?: string;
  address: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  workingHours: WorkingHours[];
  settings: {
    maxLateMinutes: number; // default 15 min
    cancellationHoursLimit: number; // default 2 hours
    queueMode: 'SINGLE' | 'PER_PROFESSIONAL';
    autoNotifyAheadCount: number; // default 2
    primaryColor: string;
    secondaryColor: string;
    welcomeMessage: string;
    isOpenNow: boolean;
    whatsappApiConfigured: boolean;
    whatsappApiKey?: string;
    whatsappPhoneNumberId?: string;
  };
  planId: 'gratuito' | 'profissional' | 'premium';
  subscription: OrgSubscription;
  isActive: boolean;
  createdAt: string;
}

export interface Professional {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  avatarUrl: string;
  specialties: string[];
  serviceIds: string[];
  commissionPercent: number; // e.g. 40 (meaning 40%)
  isActive: boolean;
  isAvailableToday: boolean;
  workingDays: number[]; // [1,2,3,4,5,6]
  customHours?: {
    start: string;
    end: string;
  };
  createdAt: string;
}

export interface Service {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number; // e.g. 30, 45, 60
  category: string;
  professionalIds: string[]; // which professionals perform this
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  avatarUrl?: string;
  notes?: string;
  totalAppointments: number;
  totalSpent: number;
  favoriteProfessionalId?: string;
  favoriteServiceId?: string;
  lastVisit?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  token: string; // for public tracking link /atendimento/{token}
  organizationId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  professionalId: string;
  professionalName: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  status: AppointmentStatus;
  statusHistory: {
    status: AppointmentStatus;
    timestamp: string;
    note?: string;
  }[];
  paymentMethod?: PaymentMethod;
  paymentStatus: 'PENDENTE' | 'PAGO' | 'REEMBOLSADO';
  commissionPaid?: number;
  notes?: string;
  arrivedAt?: string;
  onChairAt?: string;
  finishedAt?: string;
  reviewId?: string;
  createdAt: string;
}

export interface WaitingQueueItem {
  id: string;
  ticketNumber: number;
  organizationId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  preferredProfessionalId?: string; // or "ANY"
  assignedProfessionalId?: string;
  status: QueueStatus;
  joinedAt: string;
  calledAt?: string;
  onChairAt?: string;
  finishedAt?: string;
  notes?: string;
  estimatedWaitMinutes: number;
  // WhatsApp Automatic Notifications for Virtual Queue
  whatsappNotificationSent?: boolean;
  whatsappNotificationTime?: string;
  whatsappMessageText?: string;
  token?: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  role: UserRole;
  organizationId?: string;
  userEmail?: string;
  userName?: string;
  loggedAt?: string;
}

export interface Transaction {
  id: string;
  organizationId: string;
  type: 'INCOME' | 'EXPENSE' | 'COMMISSION';
  category: string;
  description: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  appointmentId?: string;
  professionalId?: string;
  date: string;
  createdAt: string;
}

export interface Review {
  id: string;
  organizationId: string;
  appointmentId: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  serviceName: string;
  professionalName: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  organizationId: string;
  type:
    | 'NEW_APPOINTMENT'
    | 'STATUS_CHANGE'
    | 'QUEUE_JOIN'
    | 'QUEUE_NEXT'
    | 'QUEUE_CALLED'
    | 'CUSTOMER_ARRIVED'
    | 'CUSTOMER_LATE'
    | 'REVIEW';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

export interface SaaSPlan {
  id: 'gratuito' | 'profissional' | 'premium';
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  maxProfessionals: number; // -1 for unlimited
  maxAppointmentsPerMonth: number; // -1 for unlimited
  features: string[];
  popular?: boolean;
}

export interface AuditLog {
  id: string;
  organizationId?: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}
