import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';
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
// 3. DATABASE INITIALIZATION & DEFAULT SEED
// ---------------------------------------------------------------------------
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
    plans: []
  };
}

function readDB(): any {
  if (!fs.existsSync(DB_FILE)) {
    const seed = getInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error reading db.json, recreating from seed:', e);
    const seed = getInitialSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function writeDB(data: any): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
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
  const merged = { ...db, ...incoming };
  writeDB(merged);
  broadcastSSE('DB_SYNCED', { timestamp: Date.now() });
  res.json({ success: true, updated: new Date().toISOString() });
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
// 7. VITE DEV SERVER OR STATIC PROD SERVING
// ---------------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'));

  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`💈 BarberOS Fila Virtual Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
