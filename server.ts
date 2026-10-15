import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import webpush from 'web-push';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// 1. DATA DIRECTORY & PERSISTENCE SETUP
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'db.json');
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
const SUBS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const LOGS_FILE = path.join(DATA_DIR, 'push_logs.json');

// ---------------------------------------------------------------------------
// 2. VAPID KEYS SETUP (RFC 8292 standard Web Push / FCM / APNs)
// ---------------------------------------------------------------------------
let vapidKeys: { publicKey: string; privateKey: string };
if (fs.existsSync(VAPID_FILE)) {
  try {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
  } catch {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
  }
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
}

webpush.setVapidDetails(
  'mailto:suporte@barberos.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

console.log('🔑 Web Push VAPID initialized.');

// ---------------------------------------------------------------------------
// 2.1 MERCADO PAGO SDK INITIALIZATION
// ---------------------------------------------------------------------------
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const MP_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

let mpClient: MercadoPagoConfig | null = null;
if (MP_ACCESS_TOKEN) {
  try {
    mpClient = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: { timeout: 10000 },
    });
    console.log('💳 Mercado Pago SDK initialized successfully.');
  } catch (err) {
    console.warn('⚠️ Erro ao inicializar Mercado Pago SDK:', err);
  }
} else {
  console.log('ℹ️ MERCADOPAGO_ACCESS_TOKEN não configurado no ambiente. Endpoints informarão configuração pendente.');
}
function getInitialSeed() {
  return {
    organizations: [
      {
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
      }
    ],
    professionals: [
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
    ],
    services: [
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
    ],
    customers: [],
    appointments: [],
    queue: [
      {
        id: 'q-seed-1',
        ticketNumber: 1,
        organizationId: 'org-prime',
        customerName: 'Lucas Oliveira',
        customerPhone: '(11) 98888-1111',
        serviceId: 'srv-1',
        serviceName: 'Corte Masculino',
        status: 'PROXIMO',
        joinedAt: new Date(Date.now() - 25 * 60000).toISOString(),
        estimatedWaitMinutes: 5,
        notifiedNext: true
      },
      {
        id: 'q-seed-2',
        ticketNumber: 2,
        organizationId: 'org-prime',
        customerName: 'Matheus Santos',
        customerPhone: '(11) 97777-2222',
        serviceId: 'srv-3',
        serviceName: 'Combo Corte + Barba',
        status: 'AGUARDANDO',
        joinedAt: new Date(Date.now() - 15 * 60000).toISOString(),
        estimatedWaitMinutes: 20
      },
      {
        id: 'q-seed-3',
        ticketNumber: 3,
        organizationId: 'org-prime',
        customerName: 'Gabriel Costa',
        customerPhone: '(11) 96666-3333',
        serviceId: 'srv-2',
        serviceName: 'Barba Tradicional',
        status: 'AGUARDANDO',
        joinedAt: new Date(Date.now() - 5 * 60000).toISOString(),
        estimatedWaitMinutes: 40
      }
    ],
    transactions: [],
    reviews: [],
    notifications: [],
    auditLogs: [],
    plans: [],
    sessions: []
  };
}

const DEFAULT_SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Anna123!@';

function readDB(): any {
  let db: any;
  if (!fs.existsSync(DB_FILE)) {
    db = getInitialSeed();
    db.config = { superAdminPassword: DEFAULT_SUPERADMIN_PASSWORD };
    writeDB(db);
    return db;
  }
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error reading db.json, recreating from seed:', e);
    db = getInitialSeed();
  }

  // Ensure sessions collection
  if (!Array.isArray(db.sessions)) {
    db.sessions = [];
  }

  // Ensure config & SaaS Owner Super Admin password Anna123!@
  if (!db.config) db.config = {};
  if (!db.config.superAdminPassword || db.config.superAdminPassword === 'admin123') {
    db.config.superAdminPassword = DEFAULT_SUPERADMIN_PASSWORD;
    writeDB(db);
  }

  return db;
}

function writeDB(data: any): void {
  try {
    const tempPath = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).substr(2, 5)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  } catch (err) {
    // Direct write fallback
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

function readSubscriptions(): any[] {
  if (!fs.existsSync(SUBS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeSubscriptions(subs: any[]): void {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
}

function readLogs(): any[] {
  if (!fs.existsSync(LOGS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeLogs(logs: any[]): void {
  // Keep last 200 logs
  const trimmed = logs.slice(-200);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}

function addLog(log: any) {
  const logs = readLogs();
  logs.push({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...log,
  });
  writeLogs(logs);
}

// ---------------------------------------------------------------------------
// 4. REAL-TIME SERVER-SENT EVENTS (SSE)
// ---------------------------------------------------------------------------
const sseClients = new Set<Response>();

function broadcastSSE(type: string, payload: any) {
  const message = `data: ${JSON.stringify({ type, payload, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ---------------------------------------------------------------------------
// 5. WEB PUSH DISPATCHER HELPER
// ---------------------------------------------------------------------------
interface PushSendResult {
  success: boolean;
  httpStatus?: number;
  error?: string;
  invalidToken?: boolean;
}

async function sendWebPush(subscription: any, payload: any): Promise<PushSendResult> {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return { success: false, error: 'Inscrição push inválida ou incompleta' };
  }

  try {
    const response = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        TTL: 60 * 20, // 20 minutes
        urgency: payload.type === 'CALLED' ? 'high' : 'normal',
      }
    );
    return {
      success: true,
      httpStatus: response.statusCode || 201,
    };
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.code;
    const isExpired = statusCode === 410 || statusCode === 404;
    return {
      success: false,
      httpStatus: statusCode,
      error: err?.message || 'Falha ao despachar notificação push',
      invalidToken: isExpired,
    };
  }
}

// ---------------------------------------------------------------------------
// 6. REST API ENDPOINTS
// ---------------------------------------------------------------------------

// Public VAPID Key for browser PushManager.subscribe()
app.get('/api/push/vapid-public-key', (req: Request, res: Response) => {
  res.json({
    publicKey: vapidKeys.publicKey,
    status: 'ACTIVE',
  });
});

// Register / associate device push subscription
app.post('/api/push/subscribe', (req: Request, res: Response) => {
  const {
    subscription,
    deviceToken,
    queueItemId,
    customerPhone,
    customerName,
    organizationId,
    userAgent,
  } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Push subscription endpoint é obrigatório' });
  }

  const subs = readSubscriptions();
  // Find existing by endpoint or deviceToken
  const existingIndex = subs.findIndex(
    (s) =>
      s.endpoint === subscription.endpoint ||
      (deviceToken && s.deviceToken === deviceToken)
  );

  const newSubRecord = {
    id: existingIndex >= 0 ? subs[existingIndex].id : `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    deviceToken: deviceToken || `dev_${Date.now()}`,
    queueItemId: queueItemId || null,
    customerPhone: customerPhone || null,
    customerName: customerName || null,
    organizationId: organizationId || 'org-prime',
    userAgent: userAgent || null,
    registeredAt: existingIndex >= 0 ? subs[existingIndex].registeredAt : new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    subs[existingIndex] = { ...subs[existingIndex], ...newSubRecord };
  } else {
    subs.push(newSubRecord);
  }
  writeSubscriptions(subs);

  // If queueItemId provided, link it in DB as well
  if (queueItemId) {
    const db = readDB();
    const item = db.queue.find((q: any) => q.id === queueItemId);
    if (item) {
      item.pushSubscriptionData = subscription;
      item.deviceRegisteredAt = new Date().toISOString();
      item.notificationToken = newSubRecord.deviceToken;
      writeDB(db);
      broadcastSSE('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId });
    }
  }

  console.log(`📱 Push subscription registered for device: ${newSubRecord.deviceToken.slice(0, 15)}...`);
  res.json({
    success: true,
    subscriptionId: newSubRecord.id,
    deviceToken: newSubRecord.deviceToken,
  });
});

// Test push dispatch directly to device
app.post('/api/push/test', async (req: Request, res: Response) => {
  const { subscription, deviceToken } = req.body;

  let targetSub = subscription;
  if (!targetSub && deviceToken) {
    const subs = readSubscriptions();
    const found = subs.find((s) => s.deviceToken === deviceToken);
    if (found) targetSub = found;
  }

  if (!targetSub) {
    return res.status(400).json({
      success: false,
      status: 'NO_DEVICE_REGISTERED',
      message: 'Nenhum dispositivo encontrado para envio do teste.',
    });
  }

  const payload = {
    title: '✂️ Teste de Notificação — BarberOS',
    body: 'Teste concluído! O envio remoto funcionou perfeitamente no seu aparelho.',
    type: 'CALLED',
    ticketNumber: 0,
    url: '/',
    vibratePattern: [300, 150, 300, 150, 600],
    tag: `test-push-${Date.now()}`,
  };

  const result = await sendWebPush(targetSub, payload);

  addLog({
    organizationId: 'org-prime',
    customerName: 'Dispositivo Teste',
    ticketNumber: 0,
    type: 'TEST',
    status: result.success ? 'DELIVERED_TO_PUSH_SERVICE' : 'PUSH_SERVICE_ERROR',
    httpStatus: result.httpStatus,
    endpointDomain: targetSub.endpoint ? new URL(targetSub.endpoint).hostname : 'unknown',
    message: result.success
      ? 'Teste entregue ao servidor push remoto (HTTP ' + result.httpStatus + ')'
      : result.error,
  });

  if (result.success) {
    res.json({
      success: true,
      status: 'DELIVERED_TO_PUSH_SERVICE',
      httpStatus: result.httpStatus,
      message: `Notificação push de teste enviada com sucesso (HTTP ${result.httpStatus})!`,
    });
  } else {
    res.status(500).json({
      success: false,
      status: 'PUSH_SERVICE_ERROR',
      httpStatus: result.httpStatus,
      message: result.error,
    });
  }
});

// Push dispatch logs
app.get('/api/push/logs/:orgId', (req: Request, res: Response) => {
  const { orgId } = req.params;
  const logs = readLogs();
  const filtered = logs.filter((l) => !orgId || l.organizationId === orgId).reverse();
  res.json({ logs: filtered });
});

// Complete Database Read & Sync
app.get('/api/db', (req: Request, res: Response) => {
  res.json(readDB());
});

app.post('/api/db/sync', (req: Request, res: Response) => {
  const incoming = req.body;
  if (!incoming) return res.status(400).json({ error: 'Payload vazio' });
  const db = readDB();

  // Smart merge organizations by ID to never erase registered accounts
  if (Array.isArray(incoming.organizations)) {
    const orgs = db.organizations || [];
    for (const inOrg of incoming.organizations) {
      const idx = orgs.findIndex((o: any) => o.id === inOrg.id);
      if (idx >= 0) {
        orgs[idx] = { ...orgs[idx], ...inOrg };
      } else {
        orgs.push(inOrg);
      }
    }
    db.organizations = orgs;
  }

  // Merge professionals by ID
  if (Array.isArray(incoming.professionals)) {
    const profs = db.professionals || [];
    for (const inProf of incoming.professionals) {
      const idx = profs.findIndex((p: any) => p.id === inProf.id);
      if (idx >= 0) {
        profs[idx] = { ...profs[idx], ...inProf };
      } else {
        profs.push(inProf);
      }
    }
    db.professionals = profs;
  }

  // Merge services by ID
  if (Array.isArray(incoming.services)) {
    const srvs = db.services || [];
    for (const inSrv of incoming.services) {
      const idx = srvs.findIndex((s: any) => s.id === inSrv.id);
      if (idx >= 0) {
        srvs[idx] = { ...srvs[idx], ...inSrv };
      } else {
        srvs.push(inSrv);
      }
    }
    db.services = srvs;
  }

  if (Array.isArray(incoming.customers)) db.customers = incoming.customers;
  if (Array.isArray(incoming.appointments)) db.appointments = incoming.appointments;
  if (Array.isArray(incoming.queue)) db.queue = incoming.queue;
  if (Array.isArray(incoming.transactions)) db.transactions = incoming.transactions;
  if (Array.isArray(incoming.reviews)) db.reviews = incoming.reviews;
  if (Array.isArray(incoming.notifications)) db.notifications = incoming.notifications;

  writeDB(db);
  broadcastSSE('DB_SYNCED', { timestamp: Date.now() });
  res.json({ success: true, updated: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 5. AUTHENTICATION & ACCOUNT REGISTRATION ENDPOINTS (DURABLE & SECURE)
// ---------------------------------------------------------------------------

// Register new establishment
app.post('/api/auth/register-organization', (req: Request, res: Response) => {
  const { organization, initialProfessional, initialService } = req.body;
  if (!organization || !organization.name || !organization.ownerEmail || !organization.ownerPassword) {
    return res.status(400).json({ error: 'Nome do salão, e-mail do proprietário e senha são obrigatórios.' });
  }

  const db = readDB();
  if (!Array.isArray(db.organizations)) db.organizations = [];
  if (!Array.isArray(db.professionals)) db.professionals = [];
  if (!Array.isArray(db.services)) db.services = [];

  const emailClean = organization.ownerEmail.trim().toLowerCase();

  // Check if owner email is already registered in any establishment
  const existingOrg = db.organizations.find(
    (o: any) => o.ownerEmail && o.ownerEmail.toLowerCase() === emailClean
  );
  if (existingOrg) {
    return res.status(409).json({
      error: `O e-mail "${organization.ownerEmail}" já está cadastrado no salão "${existingOrg.name}". Por favor, acesse sua conta pelo login ou utilize outro e-mail.`
    });
  }

  // Generate unique slug
  let baseSlug = organization.slug
    ? organization.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    : organization.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  if (!baseSlug) baseSlug = `salao-${Date.now()}`;

  let finalSlug = baseSlug;
  let counter = 1;
  while (db.organizations.some((o: any) => o.slug.toLowerCase() === finalSlug.toLowerCase())) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  const orgId = organization.id || `org-${Date.now()}`;
  const completeOrg = {
    ...organization,
    id: orgId,
    slug: finalSlug,
    ownerEmail: emailClean,
    ownerPassword: organization.ownerPassword.trim(),
    ownerName: organization.ownerName || organization.name,
    isActive: true,
    createdAt: new Date().toISOString(),
    subscription: organization.subscription || {
      status: 'PENDENTE',
      planName: 'Plano Pro Barbearia (R$ 79,90/mês)',
      priceMonthly: 79.9,
      trialDaysRemaining: 0,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isPaid: false,
      invoices: []
    }
  };

  db.organizations.push(completeOrg);

  let createdProf = null;
  if (initialProfessional) {
    createdProf = {
      ...initialProfessional,
      id: initialProfessional.id || `prof-${Date.now()}`,
      organizationId: orgId,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.professionals.push(createdProf);
  }

  let createdService = null;
  if (initialService) {
    createdService = {
      ...initialService,
      id: initialService.id || `srv-${Date.now()}`,
      organizationId: orgId,
      professionalIds: createdProf ? [createdProf.id] : [],
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.services.push(createdService);
    if (createdProf) {
      createdProf.serviceIds = [createdService.id];
    }
  }

  // Audit log
  if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
  db.auditLogs.push({
    id: `audit-${Date.now()}`,
    organizationId: orgId,
    userName: completeOrg.ownerName,
    action: `Estabelecimento "${completeOrg.name}" criado com sucesso`,
    timestamp: new Date().toISOString()
  });

  // Create and persist initial owner session in backend database
  const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
  const uid = `usr_owner_${orgId}`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const sessionRecord = {
    uid,
    userId: uid,
    token: sessionToken,
    sessionId: sessionToken,
    role: 'OWNER',
    organizationId: orgId,
    userEmail: completeOrg.ownerEmail,
    userName: completeOrg.ownerName || completeOrg.name,
    createdAt: nowIso,
    loggedAt: nowIso,
    lastActiveAt: nowIso,
    expiresAt,
    isAuthenticated: true,
  };

  if (!Array.isArray(db.sessions)) db.sessions = [];
  db.sessions.push(sessionRecord);

  writeDB(db);
  broadcastSSE('ORGANIZATIONS_UPDATED', { orgId });

  res.status(201).json({
    success: true,
    organization: completeOrg,
    professional: createdProf,
    service: createdService,
    session: sessionRecord
  });
});

// Owner Login with Backend Session Generation
app.post('/api/auth/login-owner', (req: Request, res: Response) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe seu e-mail/usuário e a senha.' });
  }

  const db = readDB();
  const term = login.trim().toLowerCase();
  const cleanPhone = term.replace(/\D/g, '');

  const org = (db.organizations || []).find((o: any) =>
    (o.ownerEmail && o.ownerEmail.toLowerCase() === term) ||
    (o.slug && o.slug.toLowerCase() === term) ||
    (o.name && o.name.toLowerCase() === term) ||
    (o.id && o.id.toLowerCase() === term) ||
    (cleanPhone && o.phone && o.phone.replace(/\D/g, '') === cleanPhone) ||
    (cleanPhone && o.whatsapp && o.whatsapp.replace(/\D/g, '') === cleanPhone)
  );

  if (!org) {
    return res.status(401).json({
      error: 'Nenhuma barbearia cadastrada com este e-mail ou usuário. Verifique a digitação ou crie sua conta grátis.'
    });
  }

  if (org.isActive === false) {
    return res.status(403).json({
      error: 'Este estabelecimento está bloqueado pelo administrador da plataforma.'
    });
  }

  const expectedPassword = org.ownerPassword || '123';
  if (password.trim() !== expectedPassword.trim()) {
    return res.status(401).json({
      error: 'Senha incorreta para esta barbearia. Verifique sua senha de acesso.'
    });
  }

  // Create and persist durable session in backend database
  const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
  const uid = `usr_owner_${org.id}`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const sessionRecord = {
    uid,
    userId: uid,
    token: sessionToken,
    sessionId: sessionToken,
    role: 'OWNER',
    organizationId: org.id,
    userEmail: org.ownerEmail || `${org.slug}@barberos.app`,
    userName: org.ownerName || org.name,
    createdAt: nowIso,
    loggedAt: nowIso,
    lastActiveAt: nowIso,
    expiresAt,
    isAuthenticated: true,
  };

  if (!Array.isArray(db.sessions)) db.sessions = [];
  // Keep active sessions fresh
  db.sessions.push(sessionRecord);
  writeDB(db);

  res.json({
    success: true,
    organization: org,
    session: sessionRecord
  });
});

// Super Admin (SaaS Owner) Login with Backend Session Generation
app.post('/api/auth/login-superadmin', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Informe a senha do Dono da SaaS.' });
  }

  const db = readDB();
  const currentAdminPass = db.config?.superAdminPassword || DEFAULT_SUPERADMIN_PASSWORD;

  if (password.trim() !== currentAdminPass.trim()) {
    return res.status(401).json({ error: 'Senha do Dono da SaaS (Super Admin) incorreta.' });
  }

  // Create and persist durable Super Admin session in backend database
  const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
  const uid = `usr_superadmin_master`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const sessionRecord = {
    uid,
    userId: uid,
    token: sessionToken,
    sessionId: sessionToken,
    role: 'SUPER_ADMIN',
    userEmail: 'admin@barberos.com.br',
    userName: 'Super Administrador (Dono da SaaS)',
    createdAt: nowIso,
    loggedAt: nowIso,
    lastActiveAt: nowIso,
    expiresAt,
    isAuthenticated: true,
  };

  if (!Array.isArray(db.sessions)) db.sessions = [];
  db.sessions.push(sessionRecord);
  writeDB(db);

  res.json({
    success: true,
    role: 'SUPER_ADMIN',
    session: sessionRecord
  });
});

// Save or Update Full User Session to Backend Database
app.post('/api/auth/session', (req: Request, res: Response) => {
  const incoming = req.body;
  if (!incoming || !incoming.role) {
    return res.status(400).json({ error: 'Sessão inválida: papel (role) é obrigatório.' });
  }

  const db = readDB();
  if (!Array.isArray(db.sessions)) db.sessions = [];

  const nowIso = new Date().toISOString();
  const sessionToken = incoming.token || incoming.sessionId || `sess_${crypto.randomBytes(24).toString('hex')}`;
  const uid = incoming.uid || incoming.userId || `usr_${incoming.role.toLowerCase()}_${Date.now()}`;
  const expiresAt = incoming.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const sessionRecord = {
    uid,
    userId: uid,
    token: sessionToken,
    sessionId: sessionToken,
    role: incoming.role,
    organizationId: incoming.organizationId || undefined,
    userEmail: incoming.userEmail || undefined,
    userName: incoming.userName || undefined,
    createdAt: incoming.createdAt || nowIso,
    loggedAt: incoming.loggedAt || nowIso,
    lastActiveAt: nowIso,
    expiresAt,
    isAuthenticated: true,
  };

  const existingIdx = db.sessions.findIndex(
    (s: any) => s.token === sessionToken || (s.uid === uid && s.role === incoming.role)
  );
  if (existingIdx >= 0) {
    db.sessions[existingIdx] = { ...db.sessions[existingIdx], ...sessionRecord };
  } else {
    db.sessions.push(sessionRecord);
  }

  writeDB(db);

  res.json({
    success: true,
    session: sessionRecord
  });
});

// Verify Session against Backend Database (Used on page reloads & across browser sessions)
app.post('/api/auth/session/verify', (req: Request, res: Response) => {
  const token = req.body?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Token de sessão não fornecido.' });
  }

  const db = readDB();
  if (!Array.isArray(db.sessions)) db.sessions = [];

  const session = db.sessions.find((s: any) => s.token === token || s.sessionId === token);
  if (!session) {
    return res.status(401).json({ valid: false, error: 'Sessão não encontrada no banco do servidor.' });
  }

  const now = Date.now();
  if (session.expiresAt && new Date(session.expiresAt).getTime() < now) {
    // Expired session: prune it
    db.sessions = db.sessions.filter((s: any) => s.token !== token && s.sessionId !== token);
    writeDB(db);
    return res.status(401).json({ valid: false, error: 'Sessão expirada. Faça login novamente.' });
  }

  // Sliding expiration window: update lastActiveAt and extend expiration
  session.lastActiveAt = new Date().toISOString();
  session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  session.isAuthenticated = true;
  writeDB(db);

  let organization = null;
  if (session.organizationId) {
    organization = (db.organizations || []).find((o: any) => o.id === session.organizationId) || null;
  }

  res.json({
    valid: true,
    session,
    organization
  });
});

// GET Session by Token (Direct query)
app.get('/api/auth/session/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const db = readDB();
  if (!Array.isArray(db.sessions)) db.sessions = [];

  const session = db.sessions.find((s: any) => s.token === token || s.sessionId === token);
  if (!session || (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now())) {
    return res.status(404).json({ valid: false, error: 'Sessão inválida ou expirada.' });
  }

  let organization = null;
  if (session.organizationId) {
    organization = (db.organizations || []).find((o: any) => o.id === session.organizationId) || null;
  }

  res.json({ valid: true, session, organization });
});

// Logout Session from Backend Database
app.post('/api/auth/session/logout', (req: Request, res: Response) => {
  const token = req.body?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) {
    const db = readDB();
    if (Array.isArray(db.sessions)) {
      db.sessions = db.sessions.filter((s: any) => s.token !== token && s.sessionId !== token);
      writeDB(db);
    }
  }
  res.json({ success: true, message: 'Sessão encerrada com sucesso no backend.' });
});

// Update Super Admin Password
app.post('/api/auth/update-superadmin-password', (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres.' });
  }

  const db = readDB();
  if (!db.config) db.config = {};
  db.config.superAdminPassword = newPassword.trim();
  writeDB(db);

  res.json({ success: true, message: 'Senha do Dono da SaaS atualizada com sucesso no servidor.' });
});

// Organization resolution endpoints (Public & Admin)
app.get('/api/organizations', (req: Request, res: Response) => {
  const db = readDB();
  res.json({ organizations: db.organizations || [] });
});

app.get('/api/organizations/slug/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const db = readDB();
  const rawTerm = decodeURIComponent(slug || '').trim().toLowerCase();
  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const normTerm = normalize(rawTerm);

  const orgs = db.organizations || [];
  // 1. Exact match (slug, id, name, or normalized equivalent)
  let org = orgs.find((o: any) => {
    if (!o) return false;
    const oSlug = (o.slug || '').toLowerCase();
    const oId = (o.id || '').toLowerCase();
    const oName = (o.name || '').toLowerCase();
    return (
      oSlug === rawTerm ||
      oId === rawTerm ||
      oName === rawTerm ||
      normalize(oSlug) === normTerm ||
      normalize(oName) === normTerm
    );
  });

  // 2. Fallback to prefix match if exact match not found
  if (!org && normTerm) {
    org = orgs.find((o: any) => {
      if (!o) return false;
      const oSlug = (o.slug || '').toLowerCase();
      const oName = (o.name || '').toLowerCase();
      return (
        normalize(oSlug).startsWith(normTerm) ||
        normalize(oName).startsWith(normTerm)
      );
    });
  }

  if (!org) {
    return res.status(404).json({ error: 'Estabelecimento não encontrado para este link.' });
  }
  res.json({ organization: org });
});

app.get('/api/organizations/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDB();
  const org = (db.organizations || []).find((o: any) => o.id === id);
  if (!org) {
    return res.status(404).json({ error: 'Organização não encontrada.' });
  }
  res.json({ organization: org });
});

// Organization Queue
app.get('/api/queue/:orgId', (req: Request, res: Response) => {
  const { orgId } = req.params;
  const db = readDB();
  const queue = (db.queue || []).filter((q: any) => q.organizationId === orgId);
  res.json({ queue });
});

app.get('/api/queue/item/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDB();
  const item = (db.queue || []).find((q: any) => q.id === id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  res.json({ item });
});

// CLIENT JOINS THE VIRTUAL QUEUE
app.post('/api/queue/join', (req: Request, res: Response) => {
  const {
    organizationId,
    customerName,
    customerPhone,
    serviceId,
    preferredProfessionalId,
    notes,
    notificationToken,
    subscription,
  } = req.body;

  if (!organizationId || !customerName || !serviceId) {
    return res.status(400).json({ error: 'Campos obrigatórios não fornecidos' });
  }

  const db = readDB();
  const service = db.services.find((s: any) => s.id === serviceId);
  if (!service) return res.status(400).json({ error: 'Serviço inválido' });

  // Calculate ticket number
  const orgQueue = db.queue.filter((q: any) => q.organizationId === organizationId);
  const maxTicket = orgQueue.reduce((max: number, q: any) => Math.max(max, q.ticketNumber || 0), 0);
  const ticketNumber = maxTicket + 1;

  // Active waiting
  const waitingCount = orgQueue.filter(
    (q: any) => q.status === 'AGUARDANDO' || q.status === 'PROXIMO'
  ).length;

  const isInitialNext = waitingCount === 0;
  const estimatedWaitMinutes = isInitialNext ? 5 : (waitingCount + 1) * 20;

  const newItem: any = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    ticketNumber,
    organizationId,
    customerName: customerName.trim(),
    customerPhone: customerPhone ? customerPhone.trim() : '(Celular Web)',
    serviceId: service.id,
    serviceName: service.name,
    preferredProfessionalId: preferredProfessionalId || undefined,
    status: isInitialNext ? 'PROXIMO' : 'AGUARDANDO',
    joinedAt: new Date().toISOString(),
    notes: notes ? notes.trim() : undefined,
    estimatedWaitMinutes,
    notificationToken: notificationToken || `dev_${Date.now()}`,
    deviceRegisteredAt: subscription ? new Date().toISOString() : undefined,
    pushSubscriptionData: subscription || undefined,
    pushDeliveryStatus: 'NOT_ATTEMPTED',
  };

  db.queue.push(newItem);
  writeDB(db);

  // If subscription was sent, save it in subs
  if (subscription) {
    const subs = readSubscriptions();
    subs.push({
      id: `sub_${Date.now()}`,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      deviceToken: newItem.notificationToken,
      queueItemId: newItem.id,
      customerPhone: newItem.customerPhone,
      customerName: newItem.customerName,
      organizationId,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });
    writeSubscriptions(subs);
  }

  broadcastSSE('QUEUE_UPDATED', { orgId: organizationId, queueItemId: newItem.id });

  console.log(`👤 Novo cliente na fila: ${newItem.customerName} (Senha #${ticketNumber})`);
  res.json({ success: true, item: newItem });
});

// BARBER: CHAMAR PRÓXIMO CLIENTE (Atomic with Concurrency Safety and Real Push)
app.post('/api/queue/call-next', async (req: Request, res: Response) => {
  const { organizationId, assignedProfId } = req.body;

  if (!organizationId) {
    return res.status(400).json({ error: 'organizationId é obrigatório' });
  }

  const db = readDB();

  // Find next eligible customer (order by ticketNumber)
  const eligibleItem = db.queue
    .filter(
      (q: any) =>
        q.organizationId === organizationId &&
        (q.status === 'PROXIMO' || q.status === 'AGUARDANDO')
    )
    .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber)[0];

  if (!eligibleItem) {
    return res.json({
      success: false,
      error: 'Não há clientes aguardando na fila no momento.',
    });
  }

  // Prevent concurrency if already called
  if (eligibleItem.status === 'CHAMADO' || eligibleItem.status === 'NA CADEIRA') {
    return res.json({
      success: false,
      error: 'Este cliente acabou de ser chamado por outro profissional.',
    });
  }

  // Identify professional
  const profId =
    assignedProfId ||
    eligibleItem.preferredProfessionalId ||
    db.professionals.find((p: any) => p.organizationId === organizationId && p.isActive)?.id ||
    db.professionals[0]?.id;

  const prof = db.professionals.find((p: any) => p.id === profId);
  const org = db.organizations.find((o: any) => o.id === organizationId);
  const orgName = org?.name || 'Barbearia';
  const profName = prof?.name || 'Barbeiro';

  const toleranceMinutes = org?.settings?.callToleranceMinutes || 3;
  const now = new Date();
  const toleranceExpiry = new Date(now.getTime() + toleranceMinutes * 60 * 1000);

  // Update Item Status
  eligibleItem.status = 'CHAMADO';
  eligibleItem.calledAt = now.toISOString();
  eligibleItem.calledToleranceExpiresAt = toleranceExpiry.toISOString();
  eligibleItem.assignedProfessionalId = profId;
  eligibleItem.clientResponse = undefined;
  eligibleItem.notifiedCalled = true;

  // Real Web Push Dispatch
  const subs = readSubscriptions();
  const customerSub =
    subs.find((s) => s.queueItemId === eligibleItem.id) ||
    subs.find((s) => s.deviceToken && s.deviceToken === eligibleItem.notificationToken) ||
    (eligibleItem.pushSubscriptionData ? { ...eligibleItem.pushSubscriptionData } : null);

  let pushDeliveryStatus: any = 'NO_DEVICE_REGISTERED';
  let pushMessage = 'Cliente não registrou dispositivo para push remoto (sem permissão ativada).';
  let pushHttpStatus: number | undefined = undefined;

  const pushPayload = {
    title: `✂️ CHEGOU SUA VEZ! — ${orgName}`,
    body: `Seu barbeiro ${profName} está pronto para atender você (${eligibleItem.serviceName}). Dirija-se à cadeira agora! (Senha #${eligibleItem.ticketNumber})`,
    type: 'CALLED',
    ticketNumber: eligibleItem.ticketNumber,
    url: `/fila/${org?.slug || 'barbearia'}?ticket=${eligibleItem.id}`,
    tag: `called-${eligibleItem.ticketNumber}`,
    vibratePattern: [400, 150, 400, 150, 800, 200, 800],
  };

  if (customerSub && customerSub.endpoint) {
    const pushResult = await sendWebPush(customerSub, pushPayload);
    if (pushResult.success) {
      pushDeliveryStatus = 'DELIVERED_TO_PUSH_SERVICE';
      pushHttpStatus = pushResult.httpStatus || 201;
      pushMessage = `Push entregue com sucesso aos servidores de push (Google FCM / Apple APNs - HTTP ${pushHttpStatus}).`;
    } else if (pushResult.invalidToken) {
      pushDeliveryStatus = 'INVALID_TOKEN_PURGED';
      pushHttpStatus = pushResult.httpStatus;
      pushMessage = 'Token push expirou ou foi desinstalado no aparelho do cliente. Inscrição removida.';
      // Purge invalid subscription
      const updatedSubs = subs.filter((s) => s.endpoint !== customerSub.endpoint);
      writeSubscriptions(updatedSubs);
    } else {
      pushDeliveryStatus = 'PUSH_SERVICE_ERROR';
      pushHttpStatus = pushResult.httpStatus;
      pushMessage = `Erro no envio remoto: ${pushResult.error}`;
    }
  }

  eligibleItem.pushDeliveryStatus = pushDeliveryStatus;
  eligibleItem.pushDeliveryMessage = pushMessage;
  eligibleItem.pushDeliveryTime = now.toISOString();
  eligibleItem.pushHttpStatus = pushHttpStatus;

  // Log Push Dispatch
  addLog({
    organizationId,
    queueItemId: eligibleItem.id,
    customerName: eligibleItem.customerName,
    ticketNumber: eligibleItem.ticketNumber,
    type: 'CALLED',
    status: pushDeliveryStatus,
    httpStatus: pushHttpStatus,
    endpointDomain: customerSub?.endpoint ? new URL(customerSub.endpoint).hostname : 'none',
    message: pushMessage,
  });

  // Promote remaining queue items: Position 1 becomes PROXIMO, and send Avisos
  const remainingWaiting = db.queue
    .filter(
      (q: any) =>
        q.organizationId === organizationId &&
        (q.status === 'AGUARDANDO' || q.status === 'PROXIMO') &&
        q.id !== eligibleItem.id
    )
    .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber);

  for (let idx = 0; idx < remainingWaiting.length; idx++) {
    const item = remainingWaiting[idx];
    const pos = idx + 1;

    if (pos === 1) {
      item.status = 'PROXIMO';
      item.estimatedWaitMinutes = 5;

      // Aviso 2 Push: Você é o próximo
      if (!item.notifiedNext) {
        item.notifiedNext = true;
        const sub = subs.find((s) => s.queueItemId === item.id || s.deviceToken === item.notificationToken);
        if (sub) {
          sendWebPush(sub, {
            title: `Você é o próximo da fila! 💈`,
            body: `Você é o próximo da fila na ${orgName}! Prepare-se para o atendimento (Senha #${item.ticketNumber}).`,
            type: 'NEXT',
            ticketNumber: item.ticketNumber,
            url: `/fila/${org?.slug || 'barbearia'}`,
            vibratePattern: [300, 150, 300, 150, 300],
            tag: `next-${item.ticketNumber}`,
          }).then((res) => {
            addLog({
              organizationId,
              queueItemId: item.id,
              customerName: item.customerName,
              ticketNumber: item.ticketNumber,
              type: 'NEXT',
              status: res.success ? 'DELIVERED_TO_PUSH_SERVICE' : 'PUSH_SERVICE_ERROR',
              httpStatus: res.httpStatus,
              message: res.success ? 'Aviso 2 entregue com sucesso' : res.error,
            });
          }).catch(() => {});
        }
      }
    } else {
      item.status = 'AGUARDANDO';
      item.estimatedWaitMinutes = pos * 15;

      // Aviso 1 Push: Faltam 3 pessoas
      if (pos <= 3 && !item.notifiedStep3) {
        item.notifiedStep3 = true;
        const sub = subs.find((s) => s.queueItemId === item.id || s.deviceToken === item.notificationToken);
        if (sub) {
          sendWebPush(sub, {
            title: `Aviso da Fila — ${orgName}`,
            body: `Está chegando sua vez! Faltam poucas pessoas à sua frente na ${orgName} (Senha #${item.ticketNumber}).`,
            type: 'STEP_3',
            ticketNumber: item.ticketNumber,
            url: `/fila/${org?.slug || 'barbearia'}`,
            vibratePattern: [250, 100, 250],
            tag: `step3-${item.ticketNumber}`,
          }).then((res) => {
            addLog({
              organizationId,
              queueItemId: item.id,
              customerName: item.customerName,
              ticketNumber: item.ticketNumber,
              type: 'STEP_3',
              status: res.success ? 'DELIVERED_TO_PUSH_SERVICE' : 'PUSH_SERVICE_ERROR',
              httpStatus: res.httpStatus,
              message: res.success ? 'Aviso 1 entregue com sucesso' : res.error,
            });
          }).catch(() => {});
        }
      }
    }
  }

  writeDB(db);

  // Broadcast to all devices via SSE
  broadcastSSE('QUEUE_UPDATED', {
    orgId: organizationId,
    queueItemId: eligibleItem.id,
    calledItem: eligibleItem,
    pushDeliveryStatus,
  });

  console.log(`📢 Cliente chamado: ${eligibleItem.customerName} (Status push: ${pushDeliveryStatus})`);

  res.json({
    success: true,
    item: eligibleItem,
    pushResult: {
      status: pushDeliveryStatus,
      httpStatus: pushHttpStatus,
      message: pushMessage,
      timestamp: now.toISOString(),
      recipient: eligibleItem.customerName,
    },
  });
});

// CALL SPECIFIC CUSTOMER
app.post('/api/queue/call-specific', async (req: Request, res: Response) => {
  const { queueId, assignedProfessionalId } = req.body;
  if (!queueId) return res.status(400).json({ error: 'queueId obrigatório' });

  const db = readDB();
  const item = db.queue.find((q: any) => q.id === queueId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  const org = db.organizations.find((o: any) => o.id === item.organizationId);
  const prof = db.professionals.find((p: any) => p.id === assignedProfessionalId) || db.professionals[0];
  const orgName = org?.name || 'Barbearia';
  const profName = prof?.name || 'Barbeiro';

  const now = new Date();
  const toleranceMinutes = org?.settings?.callToleranceMinutes || 3;
  const toleranceExpiry = new Date(now.getTime() + toleranceMinutes * 60 * 1000);

  item.status = 'CHAMADO';
  item.calledAt = now.toISOString();
  item.calledToleranceExpiresAt = toleranceExpiry.toISOString();
  item.assignedProfessionalId = prof?.id;
  item.clientResponse = undefined;
  item.notifiedCalled = true;

  const subs = readSubscriptions();
  const customerSub =
    subs.find((s) => s.queueItemId === item.id) ||
    subs.find((s) => s.deviceToken && s.deviceToken === item.notificationToken) ||
    item.pushSubscriptionData;

  let pushDeliveryStatus = 'NO_DEVICE_REGISTERED';
  let pushMessage = 'Cliente não registrou dispositivo para push remoto.';
  let pushHttpStatus: number | undefined = undefined;

  if (customerSub && customerSub.endpoint) {
    const pushResult = await sendWebPush(customerSub, {
      title: `✂️ CHEGOU SUA VEZ! — ${orgName}`,
      body: `Seu barbeiro ${profName} está pronto para atender você (${item.serviceName}). Dirija-se à cadeira agora! (Senha #${item.ticketNumber})`,
      type: 'CALLED',
      ticketNumber: item.ticketNumber,
      url: `/fila/${org?.slug || 'barbearia'}?ticket=${item.id}`,
      tag: `called-${item.ticketNumber}`,
      vibratePattern: [400, 150, 400, 150, 800, 200, 800],
    });

    if (pushResult.success) {
      pushDeliveryStatus = 'DELIVERED_TO_PUSH_SERVICE';
      pushHttpStatus = pushResult.httpStatus || 201;
      pushMessage = `Push entregue ao serviço de notificações remotas (HTTP ${pushHttpStatus}).`;
    } else {
      pushDeliveryStatus = pushResult.invalidToken ? 'INVALID_TOKEN_PURGED' : 'PUSH_SERVICE_ERROR';
      pushHttpStatus = pushResult.httpStatus;
      pushMessage = pushResult.error || 'Erro no envio push';
    }
  }

  item.pushDeliveryStatus = pushDeliveryStatus;
  item.pushDeliveryMessage = pushMessage;
  item.pushDeliveryTime = now.toISOString();
  item.pushHttpStatus = pushHttpStatus;

  writeDB(db);

  addLog({
    organizationId: item.organizationId,
    queueItemId: item.id,
    customerName: item.customerName,
    ticketNumber: item.ticketNumber,
    type: 'CALLED',
    status: pushDeliveryStatus,
    httpStatus: pushHttpStatus,
    message: pushMessage,
  });

  broadcastSSE('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });

  res.json({
    success: true,
    item,
    pushResult: {
      status: pushDeliveryStatus,
      httpStatus: pushHttpStatus,
      message: pushMessage,
      timestamp: now.toISOString(),
    },
  });
});

// CLIENT RESPONSE: "Estou indo", "Mais alguns minutos", "Não posso"
app.post('/api/queue/respond', (req: Request, res: Response) => {
  const { queueId, response } = req.body;
  if (!queueId || !response) return res.status(400).json({ error: 'Dados incompletos' });

  const db = readDB();
  const item = db.queue.find((q: any) => q.id === queueId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  const now = new Date();
  item.clientResponse = response;
  item.clientResponseTime = now.toISOString();

  if (response === 'A_CAMINHO') {
    item.status = 'A_CAMINHO';
  } else if (response === 'PEDIU_TOLERANCIA') {
    item.status = 'PEDIU_TOLERANCIA';
    item.toleranceExtraMinutes = 5;
    // Add 5 min to tolerance expiry
    const curExpiry = item.calledToleranceExpiresAt ? new Date(item.calledToleranceExpiresAt).getTime() : now.getTime();
    item.calledToleranceExpiresAt = new Date(curExpiry + 5 * 60000).toISOString();
  } else if (response === 'NAO_PODE') {
    item.status = 'DESISTIU';
    item.notes = (item.notes ? item.notes + ' | ' : '') + 'Cliente informou que não pode comparecer';
  }

  writeDB(db);
  broadcastSSE('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id, response });

  console.log(`📲 Resposta do cliente ${item.customerName}: ${response}`);
  res.json({ success: true, item });
});

// MOVE TO CHAIR
app.post('/api/queue/to-chair', (req: Request, res: Response) => {
  const { queueId, professionalId } = req.body;
  const db = readDB();
  const item = db.queue.find((q: any) => q.id === queueId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  item.status = 'NA CADEIRA';
  item.onChairAt = new Date().toISOString();
  if (professionalId) item.assignedProfessionalId = professionalId;

  writeDB(db);
  broadcastSSE('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
  res.json({ success: true, item });
});

// FINISH ATTENDANCE
app.post('/api/queue/finish', (req: Request, res: Response) => {
  const { queueId, paymentMethod } = req.body;
  const db = readDB();
  const item = db.queue.find((q: any) => q.id === queueId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  item.status = 'FINALIZADO';
  item.finishedAt = new Date().toISOString();

  writeDB(db);
  broadcastSSE('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
  res.json({ success: true, item });
});

// CANCEL / REMOVE FROM QUEUE
app.post('/api/queue/cancel', (req: Request, res: Response) => {
  const { queueId, reason } = req.body;
  const db = readDB();
  const item = db.queue.find((q: any) => q.id === queueId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  item.status = 'CANCELADO';
  item.notes = (item.notes ? item.notes + ' | ' : '') + (reason || 'Cancelado');

  writeDB(db);
  broadcastSSE('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
  res.json({ success: true, item });
});

// MARK NO-SHOW
app.post('/api/queue/mark-noshow', (req: Request, res: Response) => {
  const { queueId } = req.body;
  const db = readDB();
  const item = db.queue.find((q: any) => q.id === queueId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  item.status = 'NAO_COMPARECEU';
  writeDB(db);
  broadcastSSE('QUEUE_UPDATED', { orgId: item.organizationId, queueItemId: item.id });
  res.json({ success: true, item });
});

// REORDER QUEUE
app.post('/api/queue/reorder', (req: Request, res: Response) => {
  const { organizationId, orderedIds } = req.body;
  if (!organizationId || !Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  const db = readDB();
  orderedIds.forEach((id: string, index: number) => {
    const item = db.queue.find((q: any) => q.id === id);
    if (item && (item.status === 'AGUARDANDO' || item.status === 'PROXIMO')) {
      item.ticketNumber = index + 1;
      item.status = index === 0 ? 'PROXIMO' : 'AGUARDANDO';
      item.estimatedWaitMinutes = (index + 1) * 15;
    }
  });

  writeDB(db);
  broadcastSSE('QUEUE_UPDATED', { orgId: organizationId });
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// 6.2 MERCADO PAGO INTEGRATION ENDPOINTS (Official SDK & Real Webhook)
// ---------------------------------------------------------------------------

// Check Mercado Pago configuration status
app.get('/api/mercadopago/config-status', (req: Request, res: Response) => {
  res.json({
    isConfigured: !!MP_ACCESS_TOKEN,
    hasWebhookSecret: !!MP_WEBHOOK_SECRET,
    appUrl: APP_URL,
    configuredMessage: MP_ACCESS_TOKEN
      ? 'Mercado Pago pronto para pagamentos reais.'
      : 'Credenciais do Mercado Pago não configuradas. Adicione MERCADOPAGO_ACCESS_TOKEN na seção Secrets do Google AI Studio.',
  });
});

// Helper to determine pricing
function getPlanDetails(planType: 'MONTHLY' | 'ANNUAL') {
  if (planType === 'ANNUAL') {
    return {
      title: 'Plano BarberOS Pro Anual (12x R$ 69,90)',
      amount: 838.80,
      description: 'Acesso completo a todas as ferramentas por 12 meses',
      frequencyMonths: 12,
    };
  }
  return {
    title: 'Plano BarberOS Pro Mensal (R$ 79,90/mês)',
    amount: 79.90,
    description: 'Acesso completo a todas as ferramentas por 30 dias',
    frequencyMonths: 1,
  };
}

// Helper to sanitize payer data for Mercado Pago requirements (valid email, first/last name)
function sanitizePayer(rawEmail?: string, rawName?: string) {
  let email = (rawEmail || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    email = 'suporte@barberos.app';
  }

  const cleanName = (rawName || 'Assinante BarberOS').replace(/[^\p{L}\s]/gu, '').trim() || 'Assinante BarberOS';
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || 'Assinante';
  const lastName = nameParts.slice(1).join(' ') || 'BarberOS';

  return { email, firstName, lastName, fullName: `${firstName} ${lastName}` };
}

// Helper to parse Mercado Pago API error safely without leaking credentials
function parseMercadoPagoError(err: any): { status: number; message: string; details: string } {
  const status = typeof err?.status === 'number' ? err.status : 500;
  let message = err?.message || 'Falha na comunicação com o Mercado Pago';
  let details = '';

  if (Array.isArray(err?.causes) && err.causes.length > 0) {
    details = err.causes.map((c: any) => c.description || c.code || JSON.stringify(c)).join('; ');
  } else if (err?.error && typeof err.error === 'string') {
    details = err.error;
  }

  // Friendly messages for known HTTP error codes
  if (status === 401) {
    message = 'Credenciais inválidas ou não autorizadas no Mercado Pago (HTTP 401). Verifique o MERCADOPAGO_ACCESS_TOKEN.';
  } else if (status === 403) {
    message = 'Acesso não permitido pela conta do Mercado Pago (HTTP 403). Verifique as permissões da chave.';
  } else if (status === 400 || status === 422) {
    message = `Dados da cobrança rejeitados pelo Mercado Pago (HTTP ${status}): ${details || message}`;
  } else if (status === 404) {
    message = 'Recurso não encontrado no Mercado Pago (HTTP 404).';
  } else if (status >= 500) {
    message = `Erro nos servidores do Mercado Pago (HTTP ${status}). Tente novamente em instantes.`;
  }

  return { status, message, details };
}

// 1. Create Checkout (Checkout Pro preference or PIX Payment)
app.post('/api/mercadopago/create-checkout', async (req: Request, res: Response) => {
  const { organizationId, planType = 'ANNUAL', paymentMethodType = 'CHECKOUT_PRO', payerEmail, payerName } = req.body;

  if (!organizationId) {
    return res.status(400).json({ error: 'organizationId é obrigatório' });
  }

  const db = readDB();
  const org = (db.organizations || []).find((o: any) => o.id === organizationId);
  if (!org) {
    return res.status(404).json({ error: 'Organização não encontrada no sistema' });
  }

  if (!MP_ACCESS_TOKEN || !mpClient) {
    return res.status(503).json({
      error: 'MERCADOPAGO_NOT_CONFIGURED',
      message: 'MERCADOPAGO_ACCESS_TOKEN não configurado no ambiente. Configure a variável no Google AI Studio (Settings → Secrets).',
      isConfigured: false,
    });
  }

  const plan = getPlanDetails(planType);
  const externalReference = `sub_${org.id}_${planType}_${Date.now()}`;

  try {
    const payer = sanitizePayer(payerEmail || org.ownerEmail, payerName || org.ownerName || org.name);

    if (paymentMethodType === 'PIX') {
      // Create transparent PIX Payment via Payments API
      const payment = new Payment(mpClient);

      const paymentResponse = await payment.create({
        body: {
          transaction_amount: plan.amount,
          description: plan.title,
          payment_method_id: 'pix',
          external_reference: externalReference,
          notification_url: `${APP_URL}/api/mercadopago/webhook`,
          payer: {
            email: payer.email,
            first_name: payer.firstName,
            last_name: payer.lastName,
          },
        },
      });

      const pointOfInteraction = paymentResponse.point_of_interaction?.transaction_data;
      const qrCode = pointOfInteraction?.qr_code;
      const qrCodeBase64 = pointOfInteraction?.qr_code_base64;
      const ticketUrl = pointOfInteraction?.ticket_url;

      // Register invoice pending in organization
      if (!org.subscription) {
        org.subscription = {
          status: 'PENDENTE',
          planName: plan.title,
          priceMonthly: planType === 'ANNUAL' ? 69.90 : 79.90,
          isPaid: false,
          invoices: [],
        };
      }
      org.subscription.currentPaymentId = String(paymentResponse.id);

      const invoice = {
        id: `inv_mp_${paymentResponse.id}`,
        date: new Date().toISOString().split('T')[0],
        amount: plan.amount,
        status: (paymentResponse.status === 'approved' ? 'PAGO' : 'PENDENTE') as any,
        paymentMethod: 'PIX' as const,
        description: `${plan.title} (Mercado Pago ID #${paymentResponse.id})`,
        mpPaymentId: String(paymentResponse.id),
        mpStatus: paymentResponse.status,
        mpStatusDetail: paymentResponse.status_detail,
        mpQrCode: qrCode,
        mpQrCodeBase64: qrCodeBase64,
        receiptUrl: ticketUrl,
      };

      org.subscription.invoices = org.subscription.invoices || [];
      org.subscription.invoices.unshift(invoice);

      writeDB(db);
      broadcastSSE('SUBSCRIPTION_UPDATED', { orgId: org.id, status: org.subscription.status });

      return res.json({
        success: true,
        type: 'PIX',
        paymentId: paymentResponse.id,
        status: paymentResponse.status,
        statusDetail: paymentResponse.status_detail,
        qrCode,
        qrCodeBase64,
        ticketUrl,
        externalReference,
        amount: plan.amount,
        planTitle: plan.title,
      });
    }

    // Default: Checkout Pro Preference (supports credit card, installments, PIX, boleto)
    const preference = new Preference(mpClient);
    const prefResponse = await preference.create({
      body: {
        items: [
          {
            id: `plan_${planType.toLowerCase()}`,
            title: plan.title,
            description: plan.description,
            quantity: 1,
            unit_price: plan.amount,
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: payer.fullName,
          email: payer.email,
          phone: {
            area_code: '11',
            number: (org.phone || '999990000').replace(/\D/g, '').slice(-8) || '99990000',
          },
        },
        back_urls: {
          success: `${APP_URL}/?mp_status=success&org_id=${org.id}`,
          pending: `${APP_URL}/?mp_status=pending&org_id=${org.id}`,
          failure: `${APP_URL}/?mp_status=failure&org_id=${org.id}`,
        },
        auto_return: 'approved',
        notification_url: `${APP_URL}/api/mercadopago/webhook`,
        external_reference: externalReference,
        statement_descriptor: 'BARBEROS PRO',
      },
    });

    if (!org.subscription) {
      org.subscription = {
        status: 'PENDENTE',
        planName: plan.title,
        priceMonthly: planType === 'ANNUAL' ? 69.90 : 79.90,
        isPaid: false,
        invoices: [],
      };
    }
    org.subscription.currentPreferenceId = prefResponse.id;

    writeDB(db);

    res.json({
      success: true,
      type: 'CHECKOUT_PRO',
      preferenceId: prefResponse.id,
      initPoint: prefResponse.init_point,
      sandboxInitPoint: prefResponse.sandbox_init_point,
      externalReference,
      amount: plan.amount,
      planTitle: plan.title,
    });
  } catch (err: any) {
    const parsed = parseMercadoPagoError(err);
    console.error(`❌ [Mercado Pago API] Status ${parsed.status} - Mensagem: ${parsed.message} ${parsed.details ? `(Detalhes: ${parsed.details})` : ''}`);
    res.status(parsed.status >= 400 && parsed.status < 600 ? parsed.status : 500).json({
      error: 'MERCADOPAGO_API_ERROR',
      statusCode: parsed.status,
      message: parsed.message,
      details: parsed.details || undefined,
    });
  }
});

// 2. Consult Payment Status by Payment ID
app.get('/api/mercadopago/payment-status/:paymentId', async (req: Request, res: Response) => {
  const { paymentId } = req.params;

  if (!MP_ACCESS_TOKEN || !mpClient) {
    return res.status(503).json({
      error: 'MERCADOPAGO_NOT_CONFIGURED',
      message: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
    });
  }

  try {
    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: paymentId });

    // If payment is approved, activate subscription automatically
    let subscriptionUpdated = false;
    if (paymentData.status === 'approved') {
      const extRef = paymentData.external_reference || '';
      // format: sub_{orgId}_{planType}_{timestamp}
      const parts = extRef.split('_');
      const orgId = parts[1];
      const planType = parts[2] as 'MONTHLY' | 'ANNUAL';

      if (orgId) {
        const db = readDB();
        const org = (db.organizations || []).find((o: any) => o.id === orgId);
        if (org) {
          const plan = getPlanDetails(planType === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY');
          const todayIso = new Date().toISOString().split('T')[0];
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + (planType === 'ANNUAL' ? 365 : 30));
          const nextBillingDate = nextDate.toISOString().split('T')[0];

          if (!org.subscription) {
            org.subscription = {
              status: 'ATIVA',
              planName: plan.title,
              priceMonthly: planType === 'ANNUAL' ? 69.90 : 79.90,
              isPaid: true,
              invoices: [],
            };
          }

          org.subscription.status = 'ATIVA';
          org.subscription.isPaid = true;
          org.subscription.lastPaymentDate = todayIso;
          org.subscription.nextBillingDate = nextBillingDate;
          org.subscription.paymentMethod = paymentData.payment_method_id === 'pix' ? 'PIX' : 'CARTAO_CREDITO';

          // Update or add invoice
          const existingInv = (org.subscription.invoices || []).find(
            (inv: any) => inv.mpPaymentId === String(paymentId)
          );
          if (existingInv) {
            existingInv.status = 'PAGO';
            existingInv.mpStatus = 'approved';
          } else {
            org.subscription.invoices = org.subscription.invoices || [];
            org.subscription.invoices.unshift({
              id: `inv_mp_${paymentId}`,
              date: todayIso,
              amount: paymentData.transaction_amount || plan.amount,
              status: 'PAGO',
              paymentMethod: paymentData.payment_method_id === 'pix' ? 'PIX' : 'CARTAO_CREDITO',
              description: `${plan.title} - Aprovado via Mercado Pago (#${paymentId})`,
              mpPaymentId: String(paymentId),
              mpStatus: 'approved',
              receiptUrl: paymentData.point_of_interaction?.transaction_data?.ticket_url,
            });
          }

          writeDB(db);
          broadcastSSE('SUBSCRIPTION_UPDATED', { orgId: org.id, status: 'ATIVA' });
          subscriptionUpdated = true;
          console.log(`✅ Assinatura ativada com sucesso para org ${org.name} via consulta #${paymentId}`);
        }
      }
    }

    res.json({
      success: true,
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
      paymentMethod: paymentData.payment_method_id,
      dateApproved: paymentData.date_approved,
      subscriptionUpdated,
    });
  } catch (err: any) {
    const parsed = parseMercadoPagoError(err);
    console.error(`❌ [Mercado Pago Status #${paymentId}] Status ${parsed.status} - ${parsed.message}`);
    res.status(parsed.status >= 400 && parsed.status < 600 ? parsed.status : 500).json({
      error: 'MERCADOPAGO_STATUS_ERROR',
      statusCode: parsed.status,
      message: parsed.message,
      details: parsed.details || undefined,
    });
  }
});

// 3. Webhook from Mercado Pago (IPN / Webhooks)
app.post('/api/mercadopago/webhook', async (req: Request, res: Response) => {
  console.log('🔔 Webhook Mercado Pago recebido:', req.query, req.body);

  // Validate webhook signature if secret configured
  if (MP_WEBHOOK_SECRET) {
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;
    if (xSignature) {
      // Signature verification according to Mercado Pago docs: ts, v1
      try {
        const parts = xSignature.split(',');
        let ts = '';
        let v1 = '';
        for (const p of parts) {
          const [k, v] = p.split('=');
          if (k.trim() === 'ts') ts = v.trim();
          if (k.trim() === 'v1') v1 = v.trim();
        }
        if (ts && v1) {
          const dataId = req.query['data.id'] || req.body?.data?.id || '';
          const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
          const hmac = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
          if (hmac !== v1) {
            console.warn('⚠️ Webhook Mercado Pago signature mismatch');
          } else {
            console.log('🛡️ Webhook Mercado Pago assinatura verificada com sucesso');
          }
        }
      } catch (signErr) {
        console.warn('Erro ao validar assinatura do webhook:', signErr);
      }
    }
  }

  // Answer 200 immediately to Mercado Pago
  res.status(200).send('OK');

  if (!MP_ACCESS_TOKEN || !mpClient) {
    console.warn('Webhook recebido, mas MERCADOPAGO_ACCESS_TOKEN não está configurado.');
    return;
  }

  // Process event asynchronously
  try {
    const topic = req.query.topic || req.body.type || req.query.type;
    const dataId = req.query['data.id'] || req.body?.data?.id || req.query.id;

    if (topic === 'payment' && dataId) {
      const payment = new Payment(mpClient);
      const paymentData = await payment.get({ id: String(dataId) });

      console.log(`💳 Webhook processando pagamento #${dataId} com status: ${paymentData.status}`);

      if (paymentData.status === 'approved') {
        const extRef = paymentData.external_reference || '';
        const parts = extRef.split('_');
        const orgId = parts[1];
        const planType = parts[2] as 'MONTHLY' | 'ANNUAL';

        if (orgId) {
          const db = readDB();
          const org = (db.organizations || []).find((o: any) => o.id === orgId);
          if (org) {
            const plan = getPlanDetails(planType === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY');
            const todayIso = new Date().toISOString().split('T')[0];
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + (planType === 'ANNUAL' ? 365 : 30));
            const nextBillingDate = nextDate.toISOString().split('T')[0];

            if (!org.subscription) {
              org.subscription = {
                status: 'ATIVA',
                planName: plan.title,
                priceMonthly: planType === 'ANNUAL' ? 69.90 : 79.90,
                isPaid: true,
                invoices: [],
              };
            }

            org.subscription.status = 'ATIVA';
            org.subscription.isPaid = true;
            org.subscription.lastPaymentDate = todayIso;
            org.subscription.nextBillingDate = nextBillingDate;
            org.subscription.paymentMethod = paymentData.payment_method_id === 'pix' ? 'PIX' : 'CARTAO_CREDITO';

            const existingInv = (org.subscription.invoices || []).find(
              (inv: any) => inv.mpPaymentId === String(dataId)
            );
            if (existingInv) {
              existingInv.status = 'PAGO';
              existingInv.mpStatus = 'approved';
            } else {
              org.subscription.invoices = org.subscription.invoices || [];
              org.subscription.invoices.unshift({
                id: `inv_mp_${dataId}`,
                date: todayIso,
                amount: paymentData.transaction_amount || plan.amount,
                status: 'PAGO',
                paymentMethod: paymentData.payment_method_id === 'pix' ? 'PIX' : 'CARTAO_CREDITO',
                description: `${plan.title} - Aprovado via Mercado Pago Webhook (#${dataId})`,
                mpPaymentId: String(dataId),
                mpStatus: 'approved',
                receiptUrl: paymentData.point_of_interaction?.transaction_data?.ticket_url,
              });
            }

            writeDB(db);
            broadcastSSE('SUBSCRIPTION_UPDATED', { orgId: org.id, status: 'ATIVA' });
            console.log(`🎉 [Webhook] Assinatura da barbearia ${org.name} ativada com sucesso!`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro ao processar payload do webhook do Mercado Pago:', err);
  }
});

// 4. Authenticated Subscription Status Endpoint
app.get('/api/subscription/status/:orgId', (req: Request, res: Response) => {
  const { orgId } = req.params;
  const db = readDB();
  const org = (db.organizations || []).find((o: any) => o.id === orgId);
  if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

  res.json({
    organizationId: org.id,
    organizationName: org.name,
    subscription: org.subscription || {
      status: 'PENDENTE',
      planName: 'Plano Pro BarberOS',
      priceMonthly: 79.9,
      isPaid: false,
      invoices: [],
    },
    mercadopagoConfigured: !!MP_ACCESS_TOKEN,
  });
});

// ---------------------------------------------------------------------------
// 7. VITE DEV SERVER OR STATIC PROD SERVING
// ---------------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'));

  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`💈 BarberOS Fila Virtual Server (Production) running on http://0.0.0.0:${PORT}`);
    });
  } else {
    // HMR is disabled in AI Studio environment to prevent WebSocket closed errors
    const isHmrDisabled = process.env.DISABLE_HMR !== 'false';
    const httpServer = http.createServer(app);

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`💈 BarberOS Fila Virtual Server (Dev Mode) running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
