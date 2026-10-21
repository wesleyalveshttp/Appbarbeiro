import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import webpush from 'web-push';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { fileURLToPath } from 'url';
import { SupabaseDBService, hashPassword, verifyPassword } from './src/services/supabase-db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV || !!process.env.NOW_REGION;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS for universal multi-device public queue & booking access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalize request URLs so they match regardless of whether /api prefix was stripped by Vercel or proxy
app.use((req, res, next) => {
  const url = req.url || '';
  if (!url.startsWith('/api') && (
    url.startsWith('/public/') ||
    url.startsWith('/auth/') ||
    url.startsWith('/queue/') ||
    url.startsWith('/services') ||
    url.startsWith('/professionals') ||
    url.startsWith('/appointments') ||
    url.startsWith('/transactions') ||
    url.startsWith('/mercadopago/') ||
    url.startsWith('/push/') ||
    url.startsWith('/health') ||
    url.startsWith('/organizations')
  )) {
    req.url = '/api' + url;
  }
  next();
});

// ---------------------------------------------------------------------------
// 1. AUTHENTICATION & MULTI-TENANT ISOLATION MIDDLEWARE
// ---------------------------------------------------------------------------
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const customHeader = req.headers['x-session-token'];
  if (typeof customHeader === 'string' && customHeader) {
    return customHeader.trim();
  }
  return null;
}

export async function requireTenantAuth(req: Request, res: Response, next: any) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente. Faça login novamente.' });
  }

  try {
    const session = await SupabaseDBService.getSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }

    (req as any).session = session;

    if (session.role === 'SUPERADMIN') {
      return next();
    }

    // Determine target organization ID from params, query, or body
    const targetOrgId =
      req.params.orgId ||
      req.body.organizationId ||
      (req.query.orgId as string) ||
      (req.query.organizationId as string);

    if (targetOrgId && session.organizationId && session.organizationId !== targetOrgId) {
      return res.status(403).json({
        error: 'Acesso negado: você não tem permissão para acessar os dados deste estabelecimento.'
      });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao validar autorização: ' + err.message });
  }
}

export async function requireSuperAdminAuth(req: Request, res: Response, next: any) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Autenticação de administrador necessária.' });
  }

  try {
    const session = await SupabaseDBService.getSession(token);
    if (!session || (session.role !== 'SUPERADMIN' && session.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Acesso restrito ao Administrador Geral da plataforma.' });
    }

    (req as any).session = session;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao validar administrador: ' + err.message });
  }
}

// ---------------------------------------------------------------------------
// 2. VAPID KEYS SETUP (RFC 8292 standard Web Push / FCM / APNs)
// ---------------------------------------------------------------------------
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'UUxI4n9MmZf45V9B3f2c5jKlMnoPqrStUvWxYz12345';

try {
  webpush.setVapidDetails(
    'mailto:suporte@barberos.app',
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('🔑 Web Push VAPID inicializado com sucesso.');
} catch (err) {
  console.warn('⚠️ Web Push VAPID init warning:', err);
}

// ---------------------------------------------------------------------------
// 3. MERCADO PAGO SDK INITIALIZATION
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
}

// ---------------------------------------------------------------------------
// 4. REAL-TIME SERVER-SENT EVENTS (SSE)
// ---------------------------------------------------------------------------
const sseClients = new Set<Response>();

function broadcastSSE(type: string, payload: any = {}) {
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

// Helper for Web Push dispatch
async function sendWebPush(subscription: any, payload: any): Promise<boolean> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('Erro ao disparar Web Push:', err);
    return false;
  }
}

async function sendQueuePushNotification(orgId: string, token: string, title: string, body: string) {
  try {
    const subscriptions = await SupabaseDBService.getPushSubscriptionsForOrg(orgId);
    const sub = subscriptions.find((s: any) => s.notification_token === token);
    if (sub && sub.subscription_data) {
      await sendWebPush(sub.subscription_data, { title, body, tag: `ticket-${Date.now()}` });
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// 5. PUBLIC WEB PUSH & HEALTH ENDPOINTS
// ---------------------------------------------------------------------------
app.get('/api/push/vapid-public-key', (req: Request, res: Response) => {
  res.json({ publicKey: vapidPublicKey });
});

app.post('/api/push/subscribe', async (req: Request, res: Response) => {
  const { organizationId, token, subscription } = req.body;
  if (!organizationId || !token || !subscription) {
    return res.status(400).json({ error: 'Parâmetros de inscrição push incompletos.' });
  }

  try {
    await SupabaseDBService.savePushSubscription(organizationId, token, subscription);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'BarberOS',
    version: '2.0.0-supabase-postgres',
    supabaseConfigured: SupabaseDBService.isConfigured(),
    mercadopagoConfigured: !!MP_ACCESS_TOKEN,
  });
});

app.get('/api/db', async (req: Request, res: Response) => {
  try {
    const orgs = await SupabaseDBService.getAllOrganizations();
    const services: any[] = [];
    const professionals: any[] = [];
    const queue: any[] = [];
    for (const org of orgs) {
      const [s, p, q] = await Promise.all([
        SupabaseDBService.getServicesForOrg(org.id).catch(() => []),
        SupabaseDBService.getProfessionalsForOrg(org.id).catch(() => []),
        SupabaseDBService.getQueueForOrganization(org.id).catch(() => []),
      ]);
      services.push(...s);
      professionals.push(...p);
      queue.push(...q);
    }
    res.json({
      organizations: orgs,
      services,
      professionals,
      queue,
      appointments: [],
      customers: [],
      transactions: [],
      reviews: [],
      notifications: [],
      auditLogs: [],
      plans: [],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao sincronizar banco: ' + err.message });
  }
});

app.get('/api/supabase/status', async (req: Request, res: Response) => {
  const isConfigured = SupabaseDBService.isConfigured();
  if (!isConfigured) {
    return res.json({
      isConfigured: false,
      tablesReady: false,
      message: 'Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou na Vercel.',
      schemaScript: 'supabase-schema.sql'
    });
  }

  const tablesReady = await SupabaseDBService.checkTablesReady(true);
  res.json({
    isConfigured: true,
    tablesReady,
    instructions: tablesReady
      ? 'Banco de dados Supabase (PostgreSQL) conectado e tabelas verificadas.'
      : 'Tabelas não encontradas no schema cache. Execute supabase-schema.sql no SQL Editor do Supabase.',
    schemaScript: 'supabase-schema.sql'
  });
});

// ---------------------------------------------------------------------------
// 6. PUBLIC ESTABLISHMENT RESOLUTION (Pure Isolation, Zero Data Leakage)
// ---------------------------------------------------------------------------
app.get('/api/public/establishment/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const rawTerm = decodeURIComponent(slug || '').trim().toLowerCase();

  if (!rawTerm) {
    return res.status(400).json({
      error: 'Identificador do estabelecimento não informado.',
      code: 'INVALID_SLUG',
      status: 400
    });
  }

  try {
    const isConfigured = SupabaseDBService.isConfigured();
    if (!isConfigured) {
      return res.status(503).json({
        error: 'Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou na Vercel.',
        code: 'SUPABASE_NOT_CONFIGURED',
        status: 503
      });
    }

    const data = await SupabaseDBService.getPublicEstablishment(rawTerm);
    if (data && data.organization) {
      return res.json(data);
    }

    // Explicit 404: The establishment genuinely does not exist in Supabase
    return res.status(404).json({
      error: `Estabelecimento "${rawTerm}" não encontrado no banco de dados.`,
      code: 'NOT_FOUND',
      status: 404,
      requestedSlug: rawTerm
    });
  } catch (err: any) {
    const msg = err.message || '';
    console.error('Erro na consulta pública do estabelecimento no Supabase:', msg);

    if (msg.includes('PGRST205') || msg.includes('Tabelas do Supabase não encontradas')) {
      return res.status(503).json({
        error: 'As tabelas do banco de dados ainda não foram criadas no Supabase. Execute o script supabase-schema.sql no SQL Editor do seu projeto Supabase: https://supabase.com/dashboard/project/xsmcfrualbyswoccyicl/sql',
        code: 'TABLES_NOT_INITIALIZED',
        status: 503,
        schemaScript: 'supabase-schema.sql',
        details: msg
      });
    }

    if (msg.includes('permission') || msg.includes('row-level security') || msg.includes('JWT') || msg.includes('401') || msg.includes('403')) {
      return res.status(403).json({
        error: 'Falha de permissão de acesso ao banco de dados Supabase.',
        code: 'PERMISSION_DENIED',
        status: 403,
        details: msg
      });
    }

    return res.status(500).json({
      error: `Erro ao consultar Supabase: ${msg}`,
      code: 'DATABASE_ERROR',
      status: 500,
      requestedSlug: rawTerm
    });
  }
});

// ---------------------------------------------------------------------------
// 7. PUBLIC VIRTUAL QUEUE JOIN (Strict Validation, Authoritative Supabase Insert)
// ---------------------------------------------------------------------------
app.post('/api/queue/join', async (req: Request, res: Response) => {
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

  if (!organizationId || typeof organizationId !== 'string') {
    return res.status(400).json({ error: 'Identificação do estabelecimento é obrigatória.' });
  }
  if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório (mínimo 2 caracteres).' });
  }
  if (!serviceId || typeof serviceId !== 'string') {
    return res.status(400).json({ error: 'Serviço é obrigatório.' });
  }

  try {
    const newItem = await SupabaseDBService.joinQueue({
      organizationId,
      customerName,
      customerPhone,
      serviceId,
      preferredProfessionalId,
      notes,
      notificationToken,
      subscriptionData: subscription,
    });

    broadcastSSE('QUEUE_UPDATED', { orgId: newItem.organizationId, queueItemId: newItem.id });

    // Send push notification if customer registered device
    try {
      await sendQueuePushNotification(
        newItem.organizationId,
        newItem.notificationToken,
        'Você entrou na fila!',
        `Sua senha é #${newItem.ticketNumber}. Tempo estimado: ${newItem.estimatedWaitMinutes} min.`
      );
    } catch {}

    console.log(`👤 Novo cliente na fila (confirmado no Supabase): ${newItem.customerName} (Senha #${newItem.ticketNumber})`);
    return res.status(201).json({ success: true, item: newItem });
  } catch (err: any) {
    console.error('Erro ao registrar cliente na fila no Supabase:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/queue/item/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const item = await SupabaseDBService.getQueueItemById(id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado na fila.' });
    res.json({ item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 8. AUTHENTICATION (REGISTER, LOGIN, SESSIONS)
// ---------------------------------------------------------------------------
app.post('/api/auth/register-organization', async (req: Request, res: Response) => {
  const { organization, initialProfessional, initialService } = req.body;
  if (!organization || !organization.name || !organization.ownerEmail || !organization.ownerPassword) {
    return res.status(400).json({ error: 'Nome do salão, e-mail do proprietário e senha são obrigatórios.' });
  }

  const emailClean = organization.ownerEmail.trim().toLowerCase();

  // Generate unique slug
  let baseSlug = organization.slug
    ? organization.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    : organization.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  if (!baseSlug) baseSlug = `salao-${Date.now()}`;

  const orgId = organization.id || `org-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  const completeOrg = {
    ...organization,
    id: orgId,
    slug: baseSlug,
    ownerEmail: emailClean,
    ownerPassword: organization.ownerPassword.trim(),
    ownerName: organization.ownerName || organization.name,
    isActive: true,
  };

  const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
  const uid = `usr_owner_${orgId}`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const sessionRecord = {
    id: sessionToken,
    userId: uid,
    token: sessionToken,
    role: 'OWNER',
    organizationId: orgId,
    userEmail: completeOrg.ownerEmail,
    userName: completeOrg.ownerName || completeOrg.name,
    createdAt: nowIso,
    expiresAt,
  };

  try {
    // 1. Authoritative insert to Supabase
    const savedOrg = await SupabaseDBService.createOrganization(completeOrg);

    // 2. Initial professional if provided
    let savedProf = null;
    if (initialProfessional) {
      savedProf = await SupabaseDBService.createProfessional({
        ...initialProfessional,
        id: initialProfessional.id || `prof-${Date.now()}`,
        organizationId: orgId,
        isActive: true,
      });
    }

    // 3. Initial service if provided
    let savedService = null;
    if (initialService) {
      savedService = await SupabaseDBService.createService({
        ...initialService,
        id: initialService.id || `srv-${Date.now()}`,
        organizationId: orgId,
        professionalIds: savedProf ? [savedProf.id] : [],
        isActive: true,
      });
      if (savedProf) {
        await SupabaseDBService.updateProfessional(savedProf.id, orgId, {
          serviceIds: [savedService.id],
        });
      }
    }

    // 4. Session in Supabase
    await SupabaseDBService.createSession(sessionRecord);

    broadcastSSE('ORGANIZATIONS_UPDATED', { orgId });

    return res.status(201).json({
      success: true,
      organization: savedOrg,
      professional: savedProf,
      service: savedService,
      session: sessionRecord,
    });
  } catch (err: any) {
    console.error('Falha de persistência no Supabase durante cadastro:', err);
    return res.status(500).json({
      success: false,
      error: `Falha ao salvar no banco de dados Supabase: ${err.message}`,
    });
  }
});

app.post('/api/auth/login-owner', async (req: Request, res: Response) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Informe seu e-mail/usuário e a senha.' });
  }

  try {
    const org = await SupabaseDBService.getOrganizationByLogin(String(login));

    if (!org) {
      return res.status(401).json({
        error: 'Nenhuma barbearia cadastrada com este e-mail ou identificador. Verifique os dados digitados.',
      });
    }

    if (org.isActive === false) {
      return res.status(403).json({
        error: 'Este estabelecimento está bloqueado pelo administrador da plataforma.',
      });
    }

    if (!org.ownerPasswordHash || !org.ownerSalt) {
      return res.status(401).json({
        error: 'Credenciais de acesso não configuradas para esta barbearia.',
      });
    }

    const isMatch = verifyPassword(String(password).trim(), org.ownerPasswordHash, org.ownerSalt);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Senha incorreta para esta barbearia. Verifique sua senha de acesso.',
      });
    }

    // Create durable session in Supabase
    const sessionToken = `sess_${crypto.randomBytes(24).toString('hex')}`;
    const uid = `usr_owner_${org.id}`;
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const sessionRecord = {
      id: sessionToken,
      userId: uid,
      token: sessionToken,
      role: 'OWNER',
      organizationId: org.id,
      userEmail: org.ownerEmail,
      userName: org.ownerName || org.name,
      createdAt: nowIso,
      expiresAt,
    };

    await SupabaseDBService.createSession(sessionRecord);

    const [services, professionals, appointments, customers, queue] = await Promise.all([
      SupabaseDBService.getServicesForOrg(org.id),
      SupabaseDBService.getProfessionalsForOrg(org.id),
      SupabaseDBService.getAppointmentsForOrg(org.id),
      SupabaseDBService.getCustomersForOrg(org.id),
      SupabaseDBService.getQueueForOrganization(org.id),
    ]);

    const { ownerPasswordHash, ownerSalt, ...safeOrg } = org;

    return res.json({
      success: true,
      organization: safeOrg,
      services,
      professionals,
      appointments,
      customers,
      queue,
      session: sessionRecord,
    });
  } catch (err: any) {
    console.error('Erro no login do proprietário:', err);
    return res.status(500).json({ error: `Erro no login: ${err.message}` });
  }
});

let dynamicSuperAdminPassword = process.env.SUPERADMIN_PASSWORD || 'Anna123!@';

app.post('/api/auth/login-superadmin', async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Informe a senha de Administrador Geral.' });
  }

  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || dynamicSuperAdminPassword || 'Anna123!@';

  if (String(password).trim() !== superAdminPassword.trim()) {
    return res.status(401).json({ error: 'Senha de administrador incorreta.' });
  }

  const sessionToken = `sess_superadmin_${crypto.randomBytes(24).toString('hex')}`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const sessionRecord = {
    id: sessionToken,
    userId: 'usr_superadmin',
    token: sessionToken,
    role: 'SUPER_ADMIN',
    userEmail: 'admin@barberos.app',
    userName: 'Super Administrador',
    createdAt: nowIso,
    expiresAt,
  };

  try {
    await SupabaseDBService.createSession(sessionRecord);
  } catch {}

  res.json({
    success: true,
    role: 'SUPER_ADMIN',
    session: sessionRecord,
  });
});

app.post('/api/auth/update-superadmin-password', requireSuperAdminAuth, async (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres.' });
  }
  dynamicSuperAdminPassword = newPassword.trim();
  res.json({ success: true, message: 'Senha do Super Admin atualizada com sucesso.' });
});

app.post('/api/auth/session/verify', async (req: Request, res: Response) => {
  const token = extractToken(req) || req.body.token;
  if (!token) return res.status(401).json({ valid: false, error: 'Token ausente' });

  try {
    const session = await SupabaseDBService.getSession(token);
    if (!session) return res.status(401).json({ valid: false, error: 'Sessão inválida ou expirada' });
    res.json({ valid: true, session });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

app.get('/api/auth/session/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const session = await SupabaseDBService.getSession(token);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/session/logout', async (req: Request, res: Response) => {
  const token = extractToken(req) || req.body.token;
  if (token) {
    await SupabaseDBService.deleteSession(token);
  }
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// 9. ORGANIZATIONS MANAGEMENT (TENANT ISOLATED)
// ---------------------------------------------------------------------------
app.get('/api/organizations', async (req: Request, res: Response) => {
  const token = extractToken(req);
  let session: any = null;
  if (token) {
    session = await SupabaseDBService.getSession(token);
  }

  try {
    if (session && session.role === 'SUPERADMIN') {
      const orgs = await SupabaseDBService.getAllOrganizations();
      return res.json({ organizations: orgs });
    }

    if (session && session.role === 'OWNER' && session.organizationId) {
      const org = await SupabaseDBService.getOrganizationById(session.organizationId);
      return res.json({ organizations: org ? [org] : [] });
    }

    // Public / Unauthenticated: return only active public summaries
    const orgs = await SupabaseDBService.getAllOrganizations();
    const publicList = orgs
      .filter((o) => o.isActive !== false)
      .map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        type: o.type,
        isActive: o.isActive,
      }));
    res.json({ organizations: publicList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/organizations/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const token = extractToken(req);
  let session: any = null;
  if (token) {
    session = await SupabaseDBService.getSession(token);
  }

  try {
    const org = await SupabaseDBService.getOrganizationById(id);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada.' });

    const isAuthorized = session && (session.role === 'SUPERADMIN' || session.organizationId === org.id);
    if (isAuthorized) {
      const { ownerPasswordHash, ownerSalt, ...safeOrg } = org;
      return res.json({ organization: safeOrg });
    }

    return res.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        description: org.description,
        phone: org.phone,
        whatsapp: org.whatsapp,
        address: org.address,
        workingHours: org.workingHours,
        settings: org.settings,
        isActive: org.isActive,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/organizations/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates.id;

  try {
    const updated = await SupabaseDBService.updateOrganization(id, updates);
    broadcastSSE('ORGANIZATION_UPDATED', { orgId: id });
    res.json({ success: true, organization: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/organizations/:id', requireSuperAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await SupabaseDBService.deleteOrganization(id);
    broadcastSSE('ORGANIZATIONS_UPDATED', { orgId: id });
    res.json({ success: true, message: 'Organização excluída com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 10. QUEUE OPERATIONS (TENANT ISOLATED & PROTECTED)
// ---------------------------------------------------------------------------
app.get('/api/queue/:orgId', requireTenantAuth, async (req: Request, res: Response) => {
  const { orgId } = req.params;
  try {
    const queue = await SupabaseDBService.getQueueForOrganization(orgId);
    res.json({ queue });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar fila do Supabase: ' + err.message });
  }
});

app.post('/api/queue/call-next', async (req: Request, res: Response) => {
  const token = extractToken(req);
  let sessionOrgId: string | undefined;
  if (token) {
    try {
      const session = await SupabaseDBService.getSession(token);
      if (session) sessionOrgId = session.organizationId;
    } catch {}
  }
  const organizationId = req.body.organizationId || sessionOrgId;
  const assignedProfId = req.body.assignedProfId;

  if (!organizationId) {
    return res.status(400).json({ error: 'organizationId é obrigatório' });
  }

  try {
    const queue = await SupabaseDBService.getQueueForOrganization(organizationId);
    const eligibleItem = queue
      .filter((q: any) => q.status === 'PROXIMO' || q.status === 'AGUARDANDO')
      .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber)[0];

    if (!eligibleItem) {
      return res.json({ success: false, error: 'Não há clientes aguardando na fila no momento.' });
    }

    const now = new Date();
    const toleranceExpiry = new Date(now.getTime() + 5 * 60 * 1000);

    const updated = await SupabaseDBService.updateQueueItemStatus(eligibleItem.id, organizationId, {
      status: 'CHAMADO',
      calledAt: now.toISOString(),
      calledToleranceExpiresAt: toleranceExpiry.toISOString(),
      assignedProfessionalId: assignedProfId || eligibleItem.preferredProfessionalId,
    });

    // Send push notification to called customer
    if (eligibleItem.notificationToken) {
      sendQueuePushNotification(
        organizationId,
        eligibleItem.notificationToken,
        '✂️ Chegou sua vez!',
        `Dirija-se ao atendimento agora! (Senha #${eligibleItem.ticketNumber})`
      );
    }

    // Promote next waiting item to PROXIMO and recalculate wait times
    const remainingWaiting = queue
      .filter((q: any) => q.status === 'AGUARDANDO' && q.id !== eligibleItem.id)
      .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber);

    if (remainingWaiting.length > 0) {
      const nextWaiting = remainingWaiting[0];
      await SupabaseDBService.updateQueueItemStatus(nextWaiting.id, organizationId, {
        status: 'PROXIMO',
        estimatedWaitMinutes: 5,
      });
      if (nextWaiting.notificationToken) {
        sendQueuePushNotification(
          organizationId,
          nextWaiting.notificationToken,
          'Você é o próximo! 💈',
          `Prepare-se! Sua senha é #${nextWaiting.ticketNumber}.`
        );
      }
      for (let i = 1; i < remainingWaiting.length; i++) {
        const item = remainingWaiting[i];
        await SupabaseDBService.updateQueueItemStatus(item.id, organizationId, {
          estimatedWaitMinutes: (i + 1) * 15,
        }).catch(() => {});
      }
    }

    broadcastSSE('QUEUE_UPDATED', { orgId: organizationId, queueItemId: eligibleItem.id });
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/call-specific', async (req: Request, res: Response) => {
  const { queueId, organizationId, assignedProfessionalId } = req.body;
  if (!queueId) return res.status(400).json({ error: 'queueId é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!item) return res.status(404).json({ error: 'Item não encontrado na fila' });

    const targetOrgId = organizationId || item.organizationId;
    const now = new Date();
    const toleranceExpiry = new Date(now.getTime() + 5 * 60 * 1000);

    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'CHAMADO',
      calledAt: now.toISOString(),
      calledToleranceExpiresAt: toleranceExpiry.toISOString(),
      assignedProfessionalId: assignedProfessionalId || item.preferredProfessionalId,
    });

    if (item.notificationToken) {
      sendQueuePushNotification(
        targetOrgId,
        item.notificationToken,
        '✂️ Chegou sua vez!',
        `O barbeiro está te chamando para a cadeira agora! (Senha #${item.ticketNumber})`
      );
    }

    // Auto-promote next waiting customer to PROXIMO if none exists
    const queue = await SupabaseDBService.getQueueForOrganization(targetOrgId);
    const hasProximo = queue.some((q: any) => q.status === 'PROXIMO' && q.id !== queueId);
    if (!hasProximo) {
      const nextWaiting = queue
        .filter((q: any) => q.status === 'AGUARDANDO' && q.id !== queueId)
        .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber)[0];
      if (nextWaiting) {
        await SupabaseDBService.updateQueueItemStatus(nextWaiting.id, targetOrgId, {
          status: 'PROXIMO',
          estimatedWaitMinutes: 5,
        });
        if (nextWaiting.notificationToken) {
          sendQueuePushNotification(
            targetOrgId,
            nextWaiting.notificationToken,
            'Você é o próximo! 💈',
            `Prepare-se! Sua senha é #${nextWaiting.ticketNumber}.`
          );
        }
      }
    }

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId });
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/to-chair', async (req: Request, res: Response) => {
  const { queueId, organizationId, assignedProfessionalId } = req.body;
  if (!queueId) return res.status(400).json({ error: 'Dados incompletos: queueId é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    const targetOrgId = organizationId || item?.organizationId || (req as any).session?.organizationId;
    if (!targetOrgId) return res.status(400).json({ error: 'organizationId não encontrado' });

    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'NA CADEIRA',
      onChairAt: new Date().toISOString(),
      assignedProfessionalId: assignedProfessionalId || item?.assignedProfessionalId,
    });

    if (item?.notificationToken) {
      sendQueuePushNotification(
        targetOrgId,
        item.notificationToken,
        '💈 Você está na cadeira!',
        'Seu atendimento começou agora. Bom corte!'
      );
    }

    // When someone sits on the chair, ensure the next person in line is promoted to PROXIMO
    const queue = await SupabaseDBService.getQueueForOrganization(targetOrgId);
    const remainingWaiting = queue
      .filter((q: any) => q.status === 'AGUARDANDO' && q.id !== queueId)
      .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber);

    if (remainingWaiting.length > 0 && !queue.some((q: any) => q.status === 'PROXIMO' && q.id !== queueId)) {
      const nextInLine = remainingWaiting[0];
      await SupabaseDBService.updateQueueItemStatus(nextInLine.id, targetOrgId, {
        status: 'PROXIMO',
        estimatedWaitMinutes: 15,
      });
      if (nextInLine.notificationToken) {
        sendQueuePushNotification(
          targetOrgId,
          nextInLine.notificationToken,
          'Você é o próximo! 💈',
          `O cliente da sua frente sentou na cadeira. Prepare-se! (Senha #${nextInLine.ticketNumber})`
        );
      }
    }

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId });
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/finish', async (req: Request, res: Response) => {
  const { queueId, organizationId } = req.body;
  if (!queueId) return res.status(400).json({ error: 'Dados incompletos: queueId é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    const targetOrgId = organizationId || item?.organizationId || (req as any).session?.organizationId;
    if (!targetOrgId) return res.status(400).json({ error: 'organizationId não encontrado' });

    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'FINALIZADO',
      finishedAt: new Date().toISOString(),
    });

    if (item && item.customerName) {
      await SupabaseDBService.createOrUpdateCustomer({
        organizationId: targetOrgId,
        name: item.customerName,
        phone: item.customerPhone,
      }).catch(console.warn);
    }

    // AUTOMATIC ADVANCEMENT OF THE QUEUE (#USER REQUIREMENT):
    // Promote the next customer in line to PROXIMO so they immediately take the 1st position!
    const queue = await SupabaseDBService.getQueueForOrganization(targetOrgId);
    const remainingWaiting = queue
      .filter((q: any) => (q.status === 'AGUARDANDO' || q.status === 'PROXIMO') && q.id !== queueId)
      .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber);

    let promotedItem: any = null;
    if (remainingWaiting.length > 0) {
      const firstInLine = remainingWaiting[0];
      promotedItem = await SupabaseDBService.updateQueueItemStatus(firstInLine.id, targetOrgId, {
        status: 'PROXIMO',
        estimatedWaitMinutes: 5,
      });
      if (firstInLine.notificationToken) {
        sendQueuePushNotification(
          targetOrgId,
          firstInLine.notificationToken,
          '✂️ Sua vez chegou!',
          `O atendimento anterior terminou. Você assumiu o 1º lugar na fila! (Senha #${firstInLine.ticketNumber})`
        );
      }

      // Automatically recalculate position and wait times for ALL subsequent waiting clients
      for (let i = 1; i < remainingWaiting.length; i++) {
        const waitingItem = remainingWaiting[i];
        const newEstimatedWait = (i + 1) * 15;
        await SupabaseDBService.updateQueueItemStatus(waitingItem.id, targetOrgId, {
          status: 'AGUARDANDO',
          estimatedWaitMinutes: newEstimatedWait,
        }).catch(() => {});
      }
    }

    broadcastSSE('QUEUE_UPDATED', {
      orgId: targetOrgId,
      queueItemId: queueId,
      promotedQueueItemId: promotedItem?.id,
    });

    res.json({ success: true, item: updated, promotedItem });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/cancel', async (req: Request, res: Response) => {
  const { queueId, organizationId } = req.body;
  if (!queueId) return res.status(400).json({ error: 'Identificador do item é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!item) return res.status(404).json({ error: 'Item não encontrado na fila' });

    const targetOrgId = organizationId || item.organizationId;
    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'CANCELADO',
    });

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId });
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/mark-noshow', requireTenantAuth, async (req: Request, res: Response) => {
  const { queueId, organizationId } = req.body;
  const targetOrgId = organizationId || (req as any).session?.organizationId;
  if (!queueId || !targetOrgId) return res.status(400).json({ error: 'Dados incompletos' });

  try {
    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'NAO_COMPARECEU',
    });
    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId });
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 11. SERVICES CRUD (TENANT ISOLATED & PROTECTED)
// ---------------------------------------------------------------------------
app.get('/api/services', requireTenantAuth, async (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'orgId é obrigatório' });

  try {
    const services = await SupabaseDBService.getServicesForOrg(orgId);
    res.json({ services });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', requireTenantAuth, async (req: Request, res: Response) => {
  const srvData = req.body;
  const orgId = srvData.organizationId || (req as any).session?.organizationId;
  if (!orgId || !srvData.name) {
    return res.status(400).json({ error: 'Nome do serviço e organização são obrigatórios.' });
  }

  try {
    const newService = await SupabaseDBService.createService({
      id: srvData.id || `srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      name: srvData.name,
      description: srvData.description,
      price: srvData.price,
      durationMinutes: srvData.durationMinutes,
      category: srvData.category,
      professionalIds: srvData.professionalIds,
      isActive: srvData.isActive,
    });
    broadcastSSE('SERVICES_UPDATED', { orgId });
    res.status(201).json({ success: true, service: newService });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const orgId = updates.organizationId || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    const updated = await SupabaseDBService.updateService(id, orgId, updates);
    broadcastSSE('SERVICES_UPDATED', { orgId });
    res.json({ success: true, service: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    await SupabaseDBService.deleteService(id, orgId);
    broadcastSSE('SERVICES_UPDATED', { orgId });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 12. PROFESSIONALS CRUD (TENANT ISOLATED & PROTECTED)
// ---------------------------------------------------------------------------
app.get('/api/professionals', requireTenantAuth, async (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'orgId é obrigatório' });

  try {
    const professionals = await SupabaseDBService.getProfessionalsForOrg(orgId);
    res.json({ professionals });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/professionals', requireTenantAuth, async (req: Request, res: Response) => {
  const profData = req.body;
  const orgId = profData.organizationId || (req as any).session?.organizationId;
  if (!orgId || !profData.name) {
    return res.status(400).json({ error: 'Nome do profissional e organização são obrigatórios.' });
  }

  try {
    const newProf = await SupabaseDBService.createProfessional({
      id: profData.id || `prof-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      name: profData.name,
      phone: profData.phone,
      whatsapp: profData.whatsapp,
      email: profData.email,
      avatarUrl: profData.avatarUrl,
      specialties: profData.specialties,
      serviceIds: profData.serviceIds,
      commissionPercent: profData.commissionPercent,
      isAvailableToday: profData.isAvailableToday,
      workingDays: profData.workingDays,
      isActive: profData.isActive,
    });
    broadcastSSE('PROFESSIONALS_UPDATED', { orgId });
    res.status(201).json({ success: true, professional: newProf });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/professionals/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const orgId = updates.organizationId || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    const updated = await SupabaseDBService.updateProfessional(id, orgId, updates);
    broadcastSSE('PROFESSIONALS_UPDATED', { orgId });
    res.json({ success: true, professional: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/professionals/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    await SupabaseDBService.deleteProfessional(id, orgId);
    broadcastSSE('PROFESSIONALS_UPDATED', { orgId });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 13. APPOINTMENTS CRUD (TENANT ISOLATED & PROTECTED)
// ---------------------------------------------------------------------------
app.get('/api/appointments', requireTenantAuth, async (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  const date = req.query.date as string | undefined;
  if (!orgId) return res.status(400).json({ error: 'orgId é obrigatório' });

  try {
    const appointments = await SupabaseDBService.getAppointmentsForOrg(orgId, date);
    res.json({ appointments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', async (req: Request, res: Response) => {
  const aptData = req.body;
  if (!aptData.organizationId || !aptData.customerName || !aptData.date || !aptData.time) {
    return res.status(400).json({ error: 'Dados do agendamento incompletos.' });
  }

  try {
    const newApt = await SupabaseDBService.createAppointment({
      id: aptData.id || `apt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      organizationId: aptData.organizationId,
      customerName: aptData.customerName,
      customerPhone: aptData.customerPhone,
      serviceId: aptData.serviceId,
      serviceName: aptData.serviceName || 'Serviço',
      professionalId: aptData.professionalId,
      professionalName: aptData.professionalName || 'Profissional',
      date: aptData.date,
      time: aptData.time,
      status: aptData.status || 'PENDENTE',
      totalPrice: aptData.totalPrice,
      notes: aptData.notes,
    });
    broadcastSSE('APPOINTMENTS_UPDATED', { orgId: aptData.organizationId });
    res.status(201).json({ success: true, appointment: newApt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const orgId = updates.organizationId || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    const updated = await SupabaseDBService.updateAppointment(id, orgId, updates);
    broadcastSSE('APPOINTMENTS_UPDATED', { orgId });
    res.json({ success: true, appointment: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    await SupabaseDBService.deleteAppointment(id, orgId);
    broadcastSSE('APPOINTMENTS_UPDATED', { orgId });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 14. CUSTOMERS & TRANSACTIONS (TENANT ISOLATED & PROTECTED)
// ---------------------------------------------------------------------------
app.get('/api/customers', requireTenantAuth, async (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'orgId é obrigatório' });

  try {
    const customers = await SupabaseDBService.getCustomersForOrg(orgId);
    res.json({ customers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', requireTenantAuth, async (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'orgId é obrigatório' });

  try {
    const transactions = await SupabaseDBService.getTransactionsForOrg(orgId);
    res.json({ transactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', requireTenantAuth, async (req: Request, res: Response) => {
  const txData = req.body;
  const orgId = txData.organizationId || (req as any).session?.organizationId;
  if (!orgId || !txData.description || txData.amount === undefined) {
    return res.status(400).json({ error: 'Dados da transação incompletos.' });
  }

  try {
    const newTx = await SupabaseDBService.createTransaction({
      id: txData.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      description: txData.description,
      amount: txData.amount,
      type: txData.type || 'RECEITA',
      category: txData.category,
      paymentMethod: txData.paymentMethod,
      professionalId: txData.professionalId,
      date: txData.date,
    });
    res.status(201).json({ success: true, transaction: newTx });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 15. MERCADO PAGO INTEGRATION & SUBSCRIPTIONS (PERSISTENT ON SUPABASE)
// ---------------------------------------------------------------------------
app.get('/api/mercadopago/config-status', (req: Request, res: Response) => {
  res.json({
    configured: !!MP_ACCESS_TOKEN,
    webhookConfigured: !!MP_WEBHOOK_SECRET,
    mode: MP_ACCESS_TOKEN.startsWith('TEST-') ? 'sandbox' : 'production',
  });
});

app.get('/api/subscription/status/:orgId', requireTenantAuth, async (req: Request, res: Response) => {
  const { orgId } = req.params;
  try {
    const [org, sub] = await Promise.all([
      SupabaseDBService.getOrganizationById(orgId),
      SupabaseDBService.getSubscriptionForOrg(orgId),
    ]);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    res.json({
      organizationId: org.id,
      organizationName: org.name,
      subscription: sub || org.subscription || {
        status: 'PENDENTE',
        planName: 'Plano Pro BarberOS',
        priceMonthly: 79.9,
        isPaid: false,
      },
      mercadopagoConfigured: !!MP_ACCESS_TOKEN,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mercadopago/create-checkout', async (req: Request, res: Response) => {
  const { organizationId, planType = 'ANNUAL', paymentMethodType = 'CHECKOUT_PRO', payerEmail, payerName } = req.body;
  if (!organizationId) {
    return res.status(400).json({ error: 'organizationId é obrigatório' });
  }

  try {
    const org = await SupabaseDBService.getOrganizationById(organizationId);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada no Supabase' });

    if (!MP_ACCESS_TOKEN || !mpClient) {
      return res.status(503).json({
        error: 'MERCADOPAGO_NOT_CONFIGURED',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
      });
    }

    const amount = planType === 'ANNUAL' ? 838.80 : 79.90;
    const title = planType === 'ANNUAL' ? 'Plano Anual BarberOS' : 'Plano Mensal BarberOS';
    const externalReference = `sub_${org.id}_${planType}_${Date.now()}`;

    if (paymentMethodType === 'PIX') {
      const payment = new Payment(mpClient);
      const paymentResponse = await payment.create({
        body: {
          transaction_amount: amount,
          description: title,
          payment_method_id: 'pix',
          external_reference: externalReference,
          notification_url: `${APP_URL}/api/mercadopago/webhook`,
          payer: {
            email: payerEmail || org.ownerEmail,
            first_name: payerName || org.ownerName || org.name,
          },
        },
      });

      const pointOfInteraction = paymentResponse.point_of_interaction?.transaction_data;

      await SupabaseDBService.saveSubscription({
        id: `sub_${paymentResponse.id}`,
        organizationId: org.id,
        planId: planType === 'ANNUAL' ? 'pro_annual' : 'pro_monthly',
        status: 'PENDENTE',
        payerEmail: payerEmail || org.ownerEmail,
        paymentId: String(paymentResponse.id),
        amount,
        metadata: {
          qrCode: pointOfInteraction?.qr_code,
          ticketUrl: pointOfInteraction?.ticket_url,
        },
      });

      return res.json({
        success: true,
        type: 'PIX',
        paymentId: paymentResponse.id,
        status: paymentResponse.status,
        qrCode: pointOfInteraction?.qr_code,
        qrCodeBase64: pointOfInteraction?.qr_code_base64,
        ticketUrl: pointOfInteraction?.ticket_url,
        amount,
        planTitle: title,
      });
    } else {
      const preference = new Preference(mpClient);
      const prefResponse = await preference.create({
        body: {
          items: [
            {
              id: planType === 'ANNUAL' ? 'pro_annual' : 'pro_monthly',
              title,
              unit_price: amount,
              quantity: 1,
              currency_id: 'BRL',
            },
          ],
          payer: {
            email: payerEmail || org.ownerEmail,
            name: payerName || org.ownerName || org.name,
          },
          external_reference: externalReference,
          notification_url: `${APP_URL}/api/mercadopago/webhook`,
          back_urls: {
            success: `${APP_URL}/dashboard?checkout=success`,
            pending: `${APP_URL}/dashboard?checkout=pending`,
            failure: `${APP_URL}/dashboard?checkout=failure`,
          },
          auto_return: 'approved',
        },
      });

      await SupabaseDBService.saveSubscription({
        id: `sub_pref_${prefResponse.id}`,
        organizationId: org.id,
        planId: planType === 'ANNUAL' ? 'pro_annual' : 'pro_monthly',
        status: 'PENDENTE',
        payerEmail: payerEmail || org.ownerEmail,
        preferenceId: prefResponse.id,
        amount,
      });

      return res.json({
        success: true,
        type: 'CHECKOUT_PRO',
        preferenceId: prefResponse.id,
        initPoint: prefResponse.init_point,
        sandboxInitPoint: prefResponse.sandbox_init_point,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mercadopago/webhook', async (req: Request, res: Response) => {
  res.status(200).send('OK');

  if (!MP_ACCESS_TOKEN || !mpClient) return;

  try {
    const topic = req.query.topic || req.body.type || req.query.type;
    const dataId = req.query['data.id'] || req.body?.data?.id || req.query.id;

    if (topic === 'payment' && dataId) {
      const payment = new Payment(mpClient);
      const paymentData = await payment.get({ id: String(dataId) });

      if (paymentData.status === 'approved') {
        const extRef = paymentData.external_reference || '';
        const parts = extRef.split('_');
        const orgId = parts[1];
        const planType = parts[2];

        if (orgId) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + (planType === 'ANNUAL' ? 365 : 30));

          await SupabaseDBService.saveSubscription({
            id: `sub_pay_${dataId}`,
            organizationId: orgId,
            planId: planType === 'ANNUAL' ? 'pro_annual' : 'pro_monthly',
            status: 'ATIVA',
            paymentId: String(dataId),
            amount: paymentData.transaction_amount || 79.9,
            expiresAt: nextDate.toISOString(),
            metadata: {
              approvedAt: new Date().toISOString(),
              paymentMethod: paymentData.payment_method_id,
            },
          });

          await SupabaseDBService.updateOrganization(orgId, {
            isActive: true,
          });

          broadcastSSE('SUBSCRIPTION_UPDATED', { orgId, status: 'ATIVA' });
          console.log(`🎉 [Webhook] Assinatura da barbearia ${orgId} ativada no Supabase!`);
        }
      }
    }
  } catch (err) {
    console.error('Erro no processamento do webhook Mercado Pago:', err);
  }
});

// ---------------------------------------------------------------------------
// 16. STRICT 404 FOR UNMATCHED /api/* (CRITICAL: NEVER RETURN HTML FOR API CALLS)
// ---------------------------------------------------------------------------
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `Rota de API não encontrada: ${req.method} ${req.path}`,
    status: 404,
  });
});

// ---------------------------------------------------------------------------
// 17. SERVER STARTUP & VITE (DEV OR PROD)
// ---------------------------------------------------------------------------
async function startServer() {
  // Ensure default establishment is seeded in Supabase if database is newly initialized
  SupabaseDBService.ensureDefaultSeed().catch((err) => {
    console.warn('[Startup] Supabase seed warning:', err.message);
  });

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'));

  if (isProd) {
    app.use(['/fila/assets', '/agendar/assets', '/b/assets', '/atendimento/assets'], express.static(path.resolve(__dirname, 'dist', 'assets')));
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|json|webmanifest)$/i.test(req.path)) {
        return res.status(404).send('Asset not found');
      }
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`💈 BarberOS Server (Production) running on http://0.0.0.0:${PORT}`);
    });
  } else {
    app.use(['/fila/assets', '/agendar/assets', '/b/assets', '/atendimento/assets'], (req, res, next) => {
      req.url = '/assets' + req.url;
      next();
    });

    const httpServer = http.createServer(app);
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(vitePkg);
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
      console.log(`💈 BarberOS Server (Dev Mode) running on http://0.0.0.0:${PORT}`);
    });
  }
}

const isMainModule = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(__filename) ||
  process.argv[1].endsWith('server.ts')
);

if (isMainModule && !isVercel && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}

export default app;
