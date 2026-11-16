import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import webpush from 'web-push';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { fileURLToPath } from 'url';
import { SupabaseDBService, verifyPassword } from './src/services/supabase-db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV || !!process.env.NOW_REGION;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// 0. SECURITY HEADERS, PROXY TRUST & BODY LIMITS
// ---------------------------------------------------------------------------
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// HTTP Security Headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Enable CORS for universal multi-device public queue & booking access
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalize request URLs so they match regardless of whether /api prefix was stripped by Vercel or proxy
app.use((req: Request, _res: Response, next: NextFunction) => {
  const url = req.url || '';
  if (
    !url.startsWith('/api') &&
    (url.startsWith('/public/') ||
      url.startsWith('/auth/') ||
      url.startsWith('/queue/') ||
      url.startsWith('/services') ||
      url.startsWith('/professionals') ||
      url.startsWith('/appointments') ||
      url.startsWith('/transactions') ||
      url.startsWith('/customers') ||
      url.startsWith('/mercadopago/') ||
      url.startsWith('/push/') ||
      url.startsWith('/health') ||
      url.startsWith('/reminders') ||
      url.startsWith('/organizations') ||
      url.startsWith('/subscription/') ||
      url.startsWith('/admin/') ||
      url.startsWith('/superadmin/'))
  ) {
    req.url = '/api' + url;
  }
  next();
});

// ---------------------------------------------------------------------------
// 0.1 INPUT SANITIZATION, DATA STRIPPING & RATE LIMITING HELPERS
// ---------------------------------------------------------------------------
function sanitizeText(value: unknown, maxLength = 120): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>`]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizePhone(value: unknown, maxLength = 24): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[^\d+\-()\s]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeEmail(value: unknown): string {
  if (value === undefined || value === null) return '';
  return sanitizeText(value, 160).toLowerCase();
}

function sanitizeOrganization(org: any): any {
  if (!org || typeof org !== 'object') return org;
  const {
    ownerPassword: _op,
    ownerPasswordHash: _oph,
    ownerSalt: _os,
    passwordHash: _ph,
    password: _p,
    salt: _s,
    ...safe
  } = org;
  return safe;
}

function sanitizePublicOrganization(org: any): any {
  if (!org || typeof org !== 'object') return org;
  const safeSettings = org.settings && typeof org.settings === 'object'
    ? {
        maxLateMinutes: org.settings.maxLateMinutes,
        cancellationHoursLimit: org.settings.cancellationHoursLimit,
        queueMode: org.settings.queueMode,
        autoNotifyAheadCount: org.settings.autoNotifyAheadCount,
        callToleranceMinutes: org.settings.callToleranceMinutes,
        allowToleranceRequest: org.settings.allowToleranceRequest,
        primaryColor: org.settings.primaryColor,
        secondaryColor: org.settings.secondaryColor,
        welcomeMessage: org.settings.welcomeMessage,
        isOpenNow: org.settings.isOpenNow,
      }
    : {};
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    type: org.type,
    description: org.description,
    phone: org.phone,
    whatsapp: org.whatsapp,
    instagram: org.instagram,
    address: org.address,
    workingHours: org.workingHours,
    settings: safeSettings,
    isActive: org.isActive,
    createdAt: org.createdAt,
  };
}

function constantTimeEquals(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

function createRateLimiter(options: {
  windowMs: number;
  maxAttempts: number;
  keyPrefix: string;
  message: string;
}) {
  const buckets = new Map<string, RateLimitBucket>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt <= now) {
        buckets.delete(k);
      }
    }
  }, Math.min(options.windowMs, 5 * 60 * 1000));
  if (typeof cleanup.unref === 'function') {
    cleanup.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (existing.count >= options.maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: options.message,
        retryAfterSeconds,
      });
    }

    existing.count += 1;
    return next();
  };
}

// 10 attempts per 15 minutes for login/register routes
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  keyPrefix: 'auth',
  message: 'Muitas tentativas de autenticação deste IP. Aguarde 15 minutos e tente novamente.',
});

// 5 submissions per 10 minutes for public queue / booking routes
const publicSpamRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
  keyPrefix: 'public_spam',
  message: 'Limite de solicitações atingido para este dispositivo. Aguarde alguns minutos antes de tentar novamente.',
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

function isSuperAdminRole(role?: string): boolean {
  return role === 'SUPERADMIN' || role === 'SUPER_ADMIN';
}

export async function requireTenantAuth(req: Request, res: Response, next: NextFunction) {
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

    if (isSuperAdminRole(session.role)) {
      return next();
    }

    const isOrgResourceRoute = req.path.startsWith('/api/organizations');
    const targetOrgId =
      req.params?.orgId ||
      (isOrgResourceRoute ? req.params?.id : undefined) ||
      req.body?.organizationId ||
      req.body?.orgId ||
      (req.query?.orgId as string) ||
      (req.query?.organizationId as string);

    if (targetOrgId && session.organizationId && session.organizationId !== targetOrgId) {
      return res.status(403).json({
        error: 'Acesso negado: você não tem permissão para acessar os dados deste estabelecimento.',
      });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao validar autorização.' });
  }
}

export async function requireSuperAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Autenticação de administrador necessária.' });
  }

  try {
    const session = await SupabaseDBService.getSession(token);
    if (!session || !isSuperAdminRole(session.role)) {
      return res.status(403).json({ error: 'Acesso restrito ao Administrador Geral da plataforma.' });
    }

    (req as any).session = session;
    next();
  } catch {
    return res.status(500).json({ error: 'Erro ao validar administrador.' });
  }
}

// ---------------------------------------------------------------------------
// 2. SECRETS & CREDENTIALS (ENV-ONLY, ZERO HARDCODED SECRETS)
// ---------------------------------------------------------------------------
const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
const vapidSubject = (process.env.VAPID_SUBJECT || 'mailto:suporte@vendaiapro.com.br').trim();

let vapidConfigured = false;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
    console.log('🔑 Web Push VAPID inicializado com sucesso.');
  } catch (err: any) {
    console.warn('⚠️ Falha ao configurar Web Push VAPID:', err?.message || 'configuração inválida');
  }
} else {
  console.warn(
    `⚠️ [SEGURANÇA/CONFIG] VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY ausentes em process.env${IS_PRODUCTION ? ' (CRÍTICO em produção)' : ''}. Web Push desativado.`
  );
}

// ---------------------------------------------------------------------------
// 3. MERCADO PAGO SDK INITIALIZATION (ENV-ONLY)
// ---------------------------------------------------------------------------
const MP_ACCESS_TOKEN = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
const MP_WEBHOOK_SECRET = (process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim();
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

const OFFICIAL_PLAN_PRICES = {
  ANNUAL: 838.8,
  MONTHLY: 79.9,
} as const;

let mpClient: MercadoPagoConfig | null = null;
if (MP_ACCESS_TOKEN) {
  try {
    mpClient = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: { timeout: 10000 },
    });
    console.log('💳 Mercado Pago SDK inicializado com sucesso.');
  } catch (err: any) {
    console.warn('⚠️ Erro ao inicializar Mercado Pago SDK:', err?.message || 'erro desconhecido');
  }
} else {
  console.warn(
    `⚠️ [SEGURANÇA/CONFIG] MERCADOPAGO_ACCESS_TOKEN ausente em process.env${IS_PRODUCTION ? ' (CRÍTICO em produção)' : ''}.`
  );
}

if (!MP_WEBHOOK_SECRET) {
  console.warn(
    `⚠️ [SEGURANÇA/CONFIG] MERCADOPAGO_WEBHOOK_SECRET ausente em process.env${IS_PRODUCTION ? ' (CRÍTICO em produção)' : ''}.`
  );
}

let runtimeSuperAdminPassword = (process.env.SUPER_ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD || '').trim();
if (!runtimeSuperAdminPassword) {
  console.warn(
    `⚠️ [SEGURANÇA/CONFIG] SUPER_ADMIN_PASSWORD não configurada em process.env${IS_PRODUCTION ? ' (CRÍTICO em produção)' : ''}. Login Super Admin bloqueado até configuração.`
  );
}

// In-memory idempotency set for processed Mercado Pago payment IDs
const processedMpPaymentIds = new Set<string>();

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
    Connection: 'keep-alive',
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

// Helper for Web Push dispatch with high priority wakeup
async function sendWebPush(subscription: any, payload: any): Promise<boolean> {
  if (!vapidConfigured) {
    return false;
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 120,
      urgency: 'high',
    });
    return true;
  } catch (err: any) {
    console.warn('Erro ao disparar Web Push:', err?.message || 'erro desconhecido');
    return false;
  }
}

async function sendQueuePushNotification(
  orgId: string,
  token: string,
  title: string,
  body: string,
  options?: {
    type?: 'CALLED' | 'NEXT' | 'STEP_3' | 'REMINDER_40MIN' | string;
    ticketNumber?: number;
    url?: string;
    queueId?: string;
  }
) {
  if (!vapidConfigured) return;
  try {
    const subscriptions = await SupabaseDBService.getPushSubscriptionsForOrg(orgId);
    const type = options?.type || (title.includes('sua vez') || title.includes('chamando') ? 'CALLED' : 'NEXT');
    const isCalled = type === 'CALLED';

    const payload = {
      title,
      body,
      type,
      ticketNumber: options?.ticketNumber,
      queueId: options?.queueId,
      organizationId: orgId,
      url: options?.url || `/fila/${orgId}`,
      tag: `barberos-${type}-${options?.ticketNumber || Date.now()}`,
      vibratePattern: isCalled
        ? [600, 200, 600, 200, 1000, 250, 1000]
        : [350, 150, 350, 150, 350],
      requireInteraction: isCalled,
      silent: false,
      timestamp: Date.now(),
    };

    const matching = subscriptions.filter((s: any) => s.notification_token === token);
    if (matching.length > 0) {
      for (const sub of matching) {
        if (sub && sub.subscription_data) {
          await sendWebPush(sub.subscription_data, payload);
        }
      }
    } else {
      const latest = subscriptions[subscriptions.length - 1];
      if (latest && latest.subscription_data) {
        await sendWebPush(latest.subscription_data, payload);
      }
    }
  } catch (err) {
    console.warn('sendQueuePushNotification error:', err);
  }
}

// ---------------------------------------------------------------------------
// 5. PUBLIC WEB PUSH & HEALTH ENDPOINTS
// ---------------------------------------------------------------------------
app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
  if (!vapidPublicKey) {
    return res.status(503).json({
      error: 'VAPID_PUBLIC_KEY não configurada no servidor.',
      publicKey: null,
    });
  }
  return res.json({ publicKey: vapidPublicKey });
});

app.post('/api/push/subscribe', async (req: Request, res: Response) => {
  const organizationId = sanitizeText(req.body?.organizationId || req.body?.orgId, 100);
  const token = sanitizeText(req.body?.token || req.body?.deviceToken || req.body?.notificationToken, 200);
  const subscription = req.body?.subscription;

  if (!organizationId || !token || !subscription || typeof subscription !== 'object' || !subscription.endpoint) {
    return res.status(400).json({ error: 'Parâmetros de inscrição push incompletos (organizationId, token, subscription).' });
  }

  try {
    await SupabaseDBService.savePushSubscription(organizationId, token, subscription);
    return res.json({ success: true, message: 'Inscrição de notificação push registrada com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/push/logs/:orgId', requireTenantAuth, async (req: Request, res: Response) => {
  const { orgId } = req.params;
  try {
    const subs = await SupabaseDBService.getPushSubscriptionsForOrg(orgId);
    return res.json({
      logs: (subs || []).map((s: any) => ({
        id: s.id,
        token: s.notification_token,
        createdAt: s.created_at,
        status: 'REGISTERED',
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/test', async (req: Request, res: Response) => {
  try {
    const token = sanitizeText(req.body?.token || req.body?.deviceToken, 200);
    let subscription = req.body?.subscription;

    if (!subscription && token) {
      const found = await SupabaseDBService.getPushSubscriptionByToken(token);
      if (found) {
        subscription = found.subscription_data;
      }
    }

    const payload = {
      title: sanitizeText(req.body?.title, 120) || '✂️ BarberOS: Teste de Toque e Vibração',
      body: sanitizeText(req.body?.body, 240) || 'Alerta recebido com sucesso! Seu celular vibra e toca mesmo fora do app.',
      type: sanitizeText(req.body?.type, 40) || 'CALLED',
      ticketNumber: Number(req.body?.ticketNumber) || 99,
      url: sanitizeText(req.body?.url, 200) || '/',
      tag: `barberos-test-${Date.now()}`,
      vibratePattern: [600, 200, 600, 200, 1000, 250, 1000],
      requireInteraction: true,
      silent: false,
      timestamp: Date.now(),
    };

    if (subscription && vapidConfigured) {
      const sent = await sendWebPush(subscription, payload);
      return res.json({
        success: sent,
        status: sent ? 'SENT' : 'PUSH_SEND_FAILED',
        message: sent
          ? 'Notificação enviada ao aparelho com sucesso!'
          : 'Falha ao despachar notificação push para a chave do dispositivo.',
      });
    }

    return res.json({
      success: true,
      status: 'LOCAL_FALLBACK_OK',
      message: vapidConfigured
        ? 'Servidor pronto. Nenhuma inscrição remota ativa para esta sessão.'
        : 'Servidor pronto em modo local (VAPID não configurado no ambiente).',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, status: 'ERROR', error: err.message });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'BarberOS',
    version: '2.0.0',
    databaseBackend: SupabaseDBService.getActiveBackendName(),
    supabaseConfigured: SupabaseDBService.isConfigured(),
    mercadopagoConfigured: !!MP_ACCESS_TOKEN,
    vapidConfigured,
  });
});

app.get('/api/db', async (req: Request, res: Response) => {
  try {
    const token = extractToken(req);
    const session = token ? await SupabaseDBService.getSession(token).catch(() => null) : null;
    const isAdmin = session && isSuperAdminRole(session.role);

    const allOrgs = await SupabaseDBService.getAllOrganizations();

    let scopedOrgs = allOrgs;
    if (isAdmin) {
      scopedOrgs = allOrgs;
    } else if (session?.organizationId) {
      scopedOrgs = allOrgs.filter((o) => o.id === session.organizationId);
    } else {
      scopedOrgs = allOrgs.filter((o) => o.isActive !== false);
    }

    const services: any[] = [];
    const professionals: any[] = [];
    const queue: any[] = [];

    for (const org of scopedOrgs) {
      const [s, p, q] = await Promise.all([
        SupabaseDBService.getServicesForOrg(org.id).catch(() => []),
        SupabaseDBService.getProfessionalsForOrg(org.id).catch(() => []),
        SupabaseDBService.getQueueForOrganization(org.id).catch(() => []),
      ]);
      services.push(...s);

      if (isAdmin || (session?.organizationId && session.organizationId === org.id)) {
        professionals.push(...p);
        queue.push(...q);
      } else {
        // Public unauthenticated scope: strip commission/private info and mask queue PII
        professionals.push(
          ...p.map((prof: any) => {
            const { commissionPercent: _cp, email: _em, ...safeProf } = prof;
            return safeProf;
          })
        );
        queue.push(
          ...q
            .filter((item: any) =>
              ['AGUARDANDO', 'PROXIMO', 'CHAMADO', 'EM_ATENDIMENTO', 'NA CADEIRA', 'A_CAMINHO', 'PEDIU_TOLERANCIA'].includes(
                item.status
              )
            )
            .map((item: any) => ({
              id: item.id,
              ticketNumber: item.ticketNumber,
              organizationId: item.organizationId,
              customerName: SupabaseDBService.maskCustomerName(item.customerName),
              serviceId: item.serviceId,
              serviceName: item.serviceName,
              preferredProfessionalId: item.preferredProfessionalId,
              status: item.status,
              joinedAt: item.joinedAt,
              estimatedWaitMinutes: item.estimatedWaitMinutes,
              calledAt: item.calledAt,
              calledToleranceExpiresAt: item.calledToleranceExpiresAt,
              onChairAt: item.onChairAt,
            }))
        );
      }
    }

    const safeOrganizations = scopedOrgs.map((org) =>
      isAdmin || (session?.organizationId && session.organizationId === org.id)
        ? sanitizeOrganization(org)
        : sanitizePublicOrganization(org)
    );

    return res.json({
      organizations: safeOrganizations,
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
    return res.status(500).json({ error: 'Erro ao sincronizar banco de dados.' });
  }
});

app.post('/api/db/sync', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  if (!session) {
    return res.status(401).json({ error: 'Sessão não autorizada para sincronização.' });
  }

  const targetOrgId = session.organizationId;
  const isSuperAdmin = isSuperAdminRole(session.role);

  if (!targetOrgId && !isSuperAdmin) {
    return res.status(400).json({ error: 'Organização não identificada na sessão.' });
  }

  try {
    const payload = req.body || {};
    const syncedEntities: string[] = [];

    // 1. Organization details (protect privileged fields for non-SuperAdmin)
    const stripPrivilegedOrgFields = (orgObj: any) => {
      const clean = { ...orgObj };
      delete clean.id;
      delete clean.ownerPasswordHash;
      delete clean.ownerSalt;
      if (!isSuperAdmin) {
        delete clean.isActive;
        delete clean.subscription;
      }
      return clean;
    };

    if (payload.organization && targetOrgId) {
      try {
        await SupabaseDBService.updateOrganization(targetOrgId, stripPrivilegedOrgFields(payload.organization));
      } catch (orgErr: any) {
        console.warn(`[Sync] Falha ao atualizar organização ${targetOrgId}:`, orgErr.message);
      }
      syncedEntities.push('organization');
    } else if (Array.isArray(payload.organizations)) {
      for (const org of payload.organizations) {
        if (isSuperAdmin || org.id === targetOrgId) {
          try {
            await SupabaseDBService.updateOrganization(org.id, stripPrivilegedOrgFields(org));
          } catch (orgErr: any) {
            console.warn(`[Sync] Falha ao atualizar organização ${org.id}:`, orgErr.message);
          }
          syncedEntities.push(`organization:${org.id}`);
        }
      }
    }

    // 2. Services
    if (Array.isArray(payload.services) && targetOrgId) {
      for (const srv of payload.services) {
        if (srv.organizationId === targetOrgId) {
          try {
            await SupabaseDBService.updateService(srv.id, targetOrgId, srv);
          } catch {
            await SupabaseDBService.createService({ ...srv, organizationId: targetOrgId }).catch(() => null);
          }
        }
      }
      syncedEntities.push('services');
    }

    // 3. Professionals
    if (Array.isArray(payload.professionals) && targetOrgId) {
      for (const prof of payload.professionals) {
        if (prof.organizationId === targetOrgId) {
          try {
            await SupabaseDBService.updateProfessional(prof.id, targetOrgId, prof);
          } catch {
            await SupabaseDBService.createProfessional({ ...prof, organizationId: targetOrgId }).catch(() => null);
          }
        }
      }
      syncedEntities.push('professionals');
    }

    // 4. Appointments
    if (Array.isArray(payload.appointments) && targetOrgId) {
      for (const apt of payload.appointments) {
        if (apt.organizationId === targetOrgId) {
          try {
            await SupabaseDBService.updateAppointment(apt.id, targetOrgId, apt);
          } catch {
            await SupabaseDBService.createAppointment({ ...apt, organizationId: targetOrgId }).catch(() => null);
          }
        }
      }
      syncedEntities.push('appointments');
    }

    // 5. Customers
    if (Array.isArray(payload.customers) && targetOrgId) {
      for (const cust of payload.customers) {
        if (cust.organizationId === targetOrgId || !cust.organizationId) {
          await SupabaseDBService.createOrUpdateCustomer({
            ...cust,
            organizationId: targetOrgId,
          }).catch(() => null);
        }
      }
      syncedEntities.push('customers');
    }

    broadcastSSE('DB_SYNCED', { orgId: targetOrgId });
    return res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      entities: syncedEntities,
    });
  } catch (err: any) {
    console.error('Erro na sincronização /api/db/sync:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro ao persistir sincronização no banco de dados.',
    });
  }
});

app.get('/api/supabase/status', async (_req: Request, res: Response) => {
  const isConfigured = SupabaseDBService.isConfigured();
  if (!isConfigured) {
    return res.json({
      isConfigured: false,
      tablesReady: false,
      message: 'Banco de dados não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ou configure o Cloud Firestore.',
      schemaScript: 'supabase-schema.sql',
    });
  }

  const tablesReady = await SupabaseDBService.checkTablesReady(true);
  const backend = SupabaseDBService.getActiveBackendName();
  return res.json({
    isConfigured: true,
    tablesReady,
    backend,
    instructions: tablesReady
      ? backend === 'firestore'
        ? 'Banco de dados Cloud Firestore conectado e operacional.'
        : 'Banco de dados Supabase (PostgreSQL) conectado e tabelas verificadas.'
      : 'Tabelas não encontradas no schema cache. Execute supabase-schema.sql no SQL Editor do Supabase.',
    schemaScript: 'supabase-schema.sql',
  });
});

// ---------------------------------------------------------------------------
// 6. PUBLIC ESTABLISHMENT RESOLUTION (Pure Isolation, Zero Data Leakage)
// ---------------------------------------------------------------------------
app.get('/api/public/establishment/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  const rawTerm = sanitizeText(decodeURIComponent(slug || ''), 100).toLowerCase();

  if (!rawTerm) {
    return res.status(400).json({
      error: 'Identificador do estabelecimento não informado.',
      code: 'INVALID_SLUG',
      status: 400,
    });
  }

  try {
    const isConfigured = SupabaseDBService.isConfigured();
    if (!isConfigured) {
      return res.status(503).json({
        error: 'Banco de dados não configurado no ambiente.',
        code: 'SUPABASE_NOT_CONFIGURED',
        status: 503,
      });
    }

    const data = await SupabaseDBService.getPublicEstablishment(rawTerm);
    if (data && data.organization) {
      if ((data as any).isInactive) {
        return res.status(403).json({
          error: `O estabelecimento "${data.organization.name}" está temporariamente inativo ou com assinatura pendente.`,
          code: 'ESTABLISHMENT_INACTIVE',
          status: 403,
          organization: {
            id: data.organization.id,
            name: data.organization.name,
            slug: data.organization.slug,
            isActive: false,
          },
        });
      }
      return res.json({
        ...data,
        organization: sanitizePublicOrganization(data.organization),
      });
    }

    return res.status(404).json({
      error: `Estabelecimento "${rawTerm}" não encontrado no banco de dados.`,
      code: 'NOT_FOUND',
      status: 404,
      requestedSlug: rawTerm,
    });
  } catch (err: any) {
    const msg = err.message || '';
    console.error('Erro na consulta pública do estabelecimento:', msg);

    if (msg.includes('PGRST205') || msg.includes('Tabelas do Supabase não encontradas')) {
      return res.status(503).json({
        error: 'As tabelas do banco de dados ainda não foram inicializadas. Execute o script supabase-schema.sql no SQL Editor do Supabase.',
        code: 'TABLES_NOT_INITIALIZED',
        status: 503,
        schemaScript: 'supabase-schema.sql',
      });
    }

    if (msg.includes('permission') || msg.includes('row-level security') || msg.includes('JWT') || msg.includes('401') || msg.includes('403')) {
      return res.status(403).json({
        error: 'Falha de permissão de acesso ao banco de dados.',
        code: 'PERMISSION_DENIED',
        status: 403,
      });
    }

    return res.status(500).json({
      error: 'Erro interno ao consultar estabelecimento.',
      code: 'DATABASE_ERROR',
      status: 500,
    });
  }
});

// ---------------------------------------------------------------------------
// 7. PUBLIC VIRTUAL QUEUE & BOOKING (Anti-Spam Rate Limit & XSS Sanitization)
// ---------------------------------------------------------------------------
async function handlePublicQueueJoin(req: Request, res: Response) {
  const rawOrgId = req.body?.organizationId || req.body?.orgId;
  const rawName = req.body?.customerName ?? req.body?.clientName;
  const rawPhone = req.body?.customerPhone ?? req.body?.clientPhone;
  const rawServiceId = req.body?.serviceId;
  const rawProfId = req.body?.preferredProfessionalId;
  const rawNotes = req.body?.notes;
  const rawNotificationToken = req.body?.notificationToken;
  const subscription = req.body?.subscription;

  const organizationId = sanitizeText(rawOrgId, 100);
  const customerName = sanitizeText(rawName, 80);
  const customerPhone = sanitizePhone(rawPhone, 24);
  const serviceId = sanitizeText(rawServiceId, 100);
  const preferredProfessionalId = rawProfId ? sanitizeText(rawProfId, 100) : undefined;
  const notes = rawNotes ? sanitizeText(rawNotes, 300) : undefined;
  const notificationToken = rawNotificationToken ? sanitizeText(rawNotificationToken, 200) : undefined;

  if (!organizationId) {
    return res.status(400).json({ error: 'Identificação do estabelecimento é obrigatória.' });
  }
  if (!customerName || customerName.length < 2) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório (mínimo 2 caracteres válidos).' });
  }
  if (!serviceId) {
    return res.status(400).json({ error: 'Serviço é obrigatório.' });
  }
  if (rawPhone !== undefined && customerPhone.replace(/\D/g, '').length > 0 && customerPhone.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ error: 'Telefone informado é inválido.' });
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

    try {
      await sendQueuePushNotification(
        newItem.organizationId,
        newItem.notificationToken,
        'Você entrou na fila!',
        `Sua senha é #${newItem.ticketNumber}. Tempo estimado: ${newItem.estimatedWaitMinutes} min.`
      );
    } catch {}

    console.log(`👤 Novo cliente na fila: Senha #${newItem.ticketNumber} (${newItem.organizationId})`);
    return res.status(201).json({ success: true, item: newItem });
  } catch (err: any) {
    console.error('Erro ao registrar cliente na fila:', err?.message);
    return res.status(400).json({ success: false, error: err.message || 'Não foi possível ingressar na fila.' });
  }
}

app.post(['/api/queue/join', '/api/public/queue'], publicSpamRateLimiter, handlePublicQueueJoin);

app.post('/api/public/appointments', publicSpamRateLimiter, async (req: Request, res: Response) => {
  const organizationId = sanitizeText(req.body?.organizationId || req.body?.orgId, 100);
  const customerName = sanitizeText(req.body?.customerName ?? req.body?.clientName, 80);
  const customerPhone = sanitizePhone(req.body?.customerPhone ?? req.body?.clientPhone, 24);
  const serviceId = sanitizeText(req.body?.serviceId, 100);
  const professionalId = sanitizeText(req.body?.professionalId, 100);
  const date = sanitizeText(req.body?.date, 20);
  const time = sanitizeText(req.body?.time, 10);
  const notes = req.body?.notes ? sanitizeText(req.body.notes, 300) : undefined;

  if (!organizationId || !customerName || customerName.length < 2 || !serviceId || !date || !time) {
    return res.status(400).json({ error: 'Dados do agendamento incompletos ou inválidos.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'Formato de data (YYYY-MM-DD) ou horário (HH:MM) inválido.' });
  }

  try {
    const org = await SupabaseDBService.getOrganizationById(organizationId);
    if (!org || org.isActive === false) {
      return res.status(404).json({ error: 'Estabelecimento não encontrado ou inativo.' });
    }

    const services = await SupabaseDBService.getServicesForOrg(organizationId);
    const service = services.find((s: any) => s.id === serviceId && s.isActive !== false);
    if (!service) {
      return res.status(400).json({ error: 'Serviço selecionado inválido para este estabelecimento.' });
    }

    const professionals = await SupabaseDBService.getProfessionalsForOrg(organizationId);
    const prof = professionalId
      ? professionals.find((p: any) => p.id === professionalId && p.isActive !== false)
      : professionals.find((p: any) => p.isActive !== false);

    if (!prof) {
      return res.status(400).json({ error: 'Profissional inválido ou indisponível.' });
    }

    const newApt = await SupabaseDBService.createAppointment({
      id: `apt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      organizationId,
      customerName,
      customerPhone,
      serviceId: service.id,
      serviceName: service.name,
      professionalId: prof.id,
      professionalName: prof.name,
      date,
      time,
      status: 'PENDENTE',
      totalPrice: Number(service.price || 0),
      notes,
    });

    broadcastSSE('APPOINTMENTS_UPDATED', { orgId: organizationId });
    return res.status(201).json({ success: true, appointment: newApt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao criar agendamento.' });
  }
});

app.get('/api/queue/item/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const item = await SupabaseDBService.getQueueItemById(id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado na fila.' });

    const token = extractToken(req);
    const session = token ? await SupabaseDBService.getSession(token).catch(() => null) : null;
    const isAuthorized = session && (isSuperAdminRole(session.role) || session.organizationId === item.organizationId);

    if (isAuthorized) {
      return res.json({ item });
    }

    const { customerPhone: _cp, notes: _n, ...safeItem } = item;
    return res.json({
      item: {
        ...safeItem,
        customerName: SupabaseDBService.maskCustomerName(item.customerName),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 8. AUTHENTICATION (REGISTER, LOGIN, SESSIONS + BRUTE-FORCE RATE LIMITING)
// ---------------------------------------------------------------------------
async function handleRegisterOrganization(req: Request, res: Response) {
  const { organization, initialProfessional, initialService } = req.body || {};
  if (!organization || !organization.name || !organization.ownerEmail || !organization.ownerPassword) {
    return res.status(400).json({ error: 'Nome do salão, e-mail do proprietário e senha são obrigatórios.' });
  }

  const emailClean = sanitizeEmail(organization.ownerEmail);
  const nameClean = sanitizeText(organization.name, 100);
  const ownerPasswordClean = String(organization.ownerPassword).trim();

  if (!emailClean || !emailClean.includes('@')) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }
  if (!nameClean || nameClean.length < 2) {
    return res.status(400).json({ error: 'Nome do estabelecimento inválido.' });
  }
  if (ownerPasswordClean.length < 3 || ownerPasswordClean.length > 128) {
    return res.status(400).json({ error: 'Senha inválida (mínimo 3 caracteres).' });
  }

  try {
    const existingUser = await SupabaseDBService.getOrganizationByLogin(emailClean).catch(() => null);
    if (existingUser) {
      return res.status(409).json({
        error: 'Já existe uma barbearia cadastrada com este e-mail. Por favor, faça login ou use outro e-mail.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    let baseSlug = organization.slug
      ? sanitizeText(organization.slug, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : nameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = `salao-${Date.now()}`;

    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existingSlug = await SupabaseDBService.getOrganizationBySlug(finalSlug).catch(() => null);
      if (!existingSlug) break;
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    const orgId = organization.id ? sanitizeText(organization.id, 80) : `org-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

    const completeOrg = {
      ...organization,
      id: orgId,
      name: nameClean,
      slug: finalSlug,
      ownerEmail: emailClean,
      ownerPassword: ownerPasswordClean,
      ownerName: sanitizeText(organization.ownerName || nameClean, 100),
      phone: sanitizePhone(organization.phone, 24),
      whatsapp: sanitizePhone(organization.whatsapp || organization.phone, 24),
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

    const savedOrg = await SupabaseDBService.createOrganization(completeOrg);

    let savedProf = null;
    if (initialProfessional && initialProfessional.name) {
      savedProf = await SupabaseDBService.createProfessional({
        ...initialProfessional,
        id: initialProfessional.id || `prof-${Date.now()}`,
        organizationId: orgId,
        name: sanitizeText(initialProfessional.name, 80),
        phone: sanitizePhone(initialProfessional.phone, 24),
        isActive: true,
      });
    }

    let savedService = null;
    if (initialService && initialService.name) {
      savedService = await SupabaseDBService.createService({
        ...initialService,
        id: initialService.id || `srv-${Date.now()}`,
        organizationId: orgId,
        name: sanitizeText(initialService.name, 80),
        professionalIds: savedProf ? [savedProf.id] : [],
        isActive: true,
      });
      if (savedProf) {
        await SupabaseDBService.updateProfessional(savedProf.id, orgId, {
          serviceIds: [savedService.id],
        });
      }
    }

    await SupabaseDBService.createSession(sessionRecord);

    broadcastSSE('ORGANIZATIONS_UPDATED', { orgId });

    return res.status(201).json({
      success: true,
      organization: sanitizeOrganization(savedOrg),
      professional: savedProf,
      service: savedService,
      session: sessionRecord,
    });
  } catch (err: any) {
    console.error('Falha de persistência durante cadastro:', err?.message);
    return res.status(500).json({
      success: false,
      error: `Falha ao salvar no banco de dados: ${err.message}`,
    });
  }
}

app.post(['/api/auth/register-organization', '/api/auth/register'], authRateLimiter, handleRegisterOrganization);

async function handleOwnerLogin(req: Request, res: Response) {
  const login = req.body?.login || req.body?.email;
  const password = req.body?.password;

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

    const trimmedPassword = String(password).trim();
    let isMatch = false;

    if (org.ownerPasswordHash && org.ownerSalt) {
      isMatch = verifyPassword(trimmedPassword, org.ownerPasswordHash, org.ownerSalt);
    } else if (org.ownerPassword) {
      isMatch = constantTimeEquals(trimmedPassword, String(org.ownerPassword).trim());
      if (isMatch) {
        await SupabaseDBService.updateOrganization(org.id, {
          ownerPassword: trimmedPassword,
        }).catch(() => null);
      }
    } else {
      return res.status(401).json({
        error: 'Credenciais de acesso não configuradas para esta barbearia.',
      });
    }

    if (!isMatch) {
      return res.status(401).json({
        error: 'Senha incorreta para esta barbearia. Verifique sua senha de acesso.',
      });
    }

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

    return res.json({
      success: true,
      organization: sanitizeOrganization(org),
      services,
      professionals,
      appointments,
      customers,
      queue,
      session: sessionRecord,
    });
  } catch (err: any) {
    console.error('Erro no login do proprietário:', err?.message);
    return res.status(500).json({ error: 'Erro interno ao autenticar proprietário.' });
  }
}

app.post(['/api/auth/login-owner', '/api/auth/login'], authRateLimiter, handleOwnerLogin);

async function handleSuperAdminLogin(req: Request, res: Response) {
  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Informe a senha de Administrador Geral.' });
  }

  const configuredPassword = runtimeSuperAdminPassword || (process.env.SUPER_ADMIN_PASSWORD || process.env.SUPERADMIN_PASSWORD || '').trim();
  if (!configuredPassword) {
    return res.status(401).json({
      error: 'Senha de administrador incorreta ou credencial de ambiente não configurada.',
    });
  }

  const rawInput = password.trim();
  if (!constantTimeEquals(rawInput, configuredPassword)) {
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
    userEmail: 'admin@vendaiapro.com.br',
    userName: 'Super Administrador',
    createdAt: nowIso,
    expiresAt,
  };

  try {
    await SupabaseDBService.createSession(sessionRecord);
  } catch (err: any) {
    return res.status(500).json({ error: 'Falha ao persistir sessão administrativa: ' + err.message });
  }

  return res.json({
    success: true,
    role: 'SUPER_ADMIN',
    session: sessionRecord,
  });
}

app.post(['/api/auth/login-superadmin', '/api/auth/superadmin/login'], authRateLimiter, handleSuperAdminLogin);

app.post('/api/auth/update-superadmin-password', requireSuperAdminAuth, async (req: Request, res: Response) => {
  const { newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres.' });
  }
  runtimeSuperAdminPassword = newPassword.trim();
  return res.json({ success: true, message: 'Senha do Super Admin atualizada com sucesso.' });
});

app.post('/api/auth/session/verify', async (req: Request, res: Response) => {
  const token = extractToken(req) || req.body?.token;
  if (!token) return res.status(401).json({ valid: false, error: 'Token ausente' });

  try {
    const session = await SupabaseDBService.getSession(token);
    if (!session) return res.status(401).json({ valid: false, error: 'Sessão inválida ou expirada' });
    return res.json({ valid: true, session });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message });
  }
});

app.get('/api/auth/session/:token', requireTenantAuth, async (req: Request, res: Response) => {
  const { token } = req.params;
  const callerSession = (req as any).session;
  if (!isSuperAdminRole(callerSession?.role) && callerSession?.token !== token) {
    return res.status(403).json({ error: 'Acesso negado a esta sessão.' });
  }
  try {
    const session = await SupabaseDBService.getSession(token);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    return res.json({ session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/session/logout', async (req: Request, res: Response) => {
  const token = extractToken(req) || req.body?.token;
  if (token) {
    await SupabaseDBService.deleteSession(token);
  }
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// 9. SUPER ADMIN GLOBAL ROUTES & ORGANIZATIONS MANAGEMENT (TENANT ISOLATED)
// ---------------------------------------------------------------------------
app.use('/api/superadmin', requireSuperAdminAuth);

app.get('/api/superadmin/organizations', async (_req: Request, res: Response) => {
  try {
    const orgs = await SupabaseDBService.getAllOrganizations();
    return res.json({ organizations: orgs.map(sanitizeOrganization) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/overview', async (_req: Request, res: Response) => {
  try {
    const orgs = await SupabaseDBService.getAllOrganizations();
    const active = orgs.filter((o) => o.isActive !== false).length;
    const paid = orgs.filter((o) => o.subscription?.status === 'ATIVA' || o.subscription?.isPaid).length;
    return res.json({
      totalOrganizations: orgs.length,
      activeOrganizations: active,
      paidSubscriptions: paid,
      organizations: orgs.map(sanitizeOrganization),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/cloud/sync', requireSuperAdminAuth, async (_req: Request, res: Response) => {
  try {
    const ready = await SupabaseDBService.checkTablesReady(true);
    return res.json({
      success: ready,
      backend: SupabaseDBService.getActiveBackendName(),
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/organizations', async (req: Request, res: Response) => {
  const token = extractToken(req);
  const session = token ? await SupabaseDBService.getSession(token).catch(() => null) : null;

  try {
    if (session && isSuperAdminRole(session.role)) {
      const orgs = await SupabaseDBService.getAllOrganizations();
      return res.json({ organizations: orgs.map(sanitizeOrganization) });
    }

    if (session && session.role === 'OWNER' && session.organizationId) {
      const org = await SupabaseDBService.getOrganizationById(session.organizationId);
      return res.json({ organizations: org ? [sanitizeOrganization(org)] : [] });
    }

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
    return res.json({ organizations: publicList });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/organizations/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const token = extractToken(req);
  const session = token ? await SupabaseDBService.getSession(token).catch(() => null) : null;

  try {
    const org = await SupabaseDBService.getOrganizationById(id);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada.' });

    const isAuthorized = session && (isSuperAdminRole(session.role) || session.organizationId === org.id);
    if (isAuthorized) {
      return res.json({ organization: sanitizeOrganization(org) });
    }

    return res.json({
      organization: sanitizePublicOrganization(org),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/organizations/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = (req as any).session;
  const isSuperAdmin = isSuperAdminRole(session?.role);

  const updates = { ...(req.body || {}) };
  delete updates.id;
  delete updates.ownerPasswordHash;
  delete updates.ownerSalt;
  if (!isSuperAdmin) {
    delete updates.isActive;
    delete updates.subscription;
  }

  try {
    const updated = await SupabaseDBService.updateOrganization(id, updates);
    broadcastSSE('ORGANIZATION_UPDATED', { orgId: id });
    broadcastSSE('ORGANIZATIONS_UPDATED');
    return res.json({ success: true, organization: sanitizeOrganization(updated) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin Toggle Organization Status (Block / Unblock) — SUPER ADMIN ONLY
app.post(
  ['/api/admin/organization/toggle-status', '/api/organizations/:id/toggle-status'],
  requireSuperAdminAuth,
  async (req: Request, res: Response) => {
    const orgId = req.params.id || req.body?.orgId || req.body?.id;
    if (!orgId) return res.status(400).json({ error: 'ID do estabelecimento é obrigatório.' });

    try {
      const current = await SupabaseDBService.getOrganizationById(orgId);
      if (!current) return res.status(404).json({ error: 'Estabelecimento não encontrado.' });

      const newActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : !current.isActive;
      const updated = await SupabaseDBService.updateOrganization(orgId, { isActive: newActive });

      broadcastSSE('ORGANIZATION_UPDATED', { orgId });
      broadcastSSE('ORGANIZATIONS_UPDATED');
      return res.json({ success: true, organization: sanitizeOrganization(updated), isActive: updated.isActive });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Admin Approve Subscription — SUPER ADMIN ONLY
app.post(
  ['/api/admin/subscription/approve', '/api/organizations/:id/approve-subscription'],
  requireSuperAdminAuth,
  async (req: Request, res: Response) => {
    const orgId = req.params.id || req.body?.orgId || req.body?.id;
    const approvedBy = sanitizeText(req.body?.approvedBy || 'Dono da SaaS', 80);
    if (!orgId) return res.status(400).json({ error: 'ID do estabelecimento é obrigatório.' });

    try {
      const org = await SupabaseDBService.getOrganizationById(orgId);
      if (!org) return res.status(404).json({ error: 'Estabelecimento não encontrado.' });

      const todayIso = new Date().toISOString().split('T')[0];
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      const nextBillingDate = nextDate.toISOString().split('T')[0];

      const invoiceId = `inv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const invoice = {
        id: invoiceId,
        date: todayIso,
        amount: 79.9,
        status: 'PAGO' as const,
        paymentMethod: org.subscription?.paymentMethod || 'PIX',
        description: `Mensalidade BarberOS Pro (R$ 79,90) - Confirmado por ${approvedBy} (100% Liberado)`,
      };

      const existingInvoices = Array.isArray(org.subscription?.invoices) ? org.subscription.invoices : [];

      const updated = await SupabaseDBService.updateSubscriptionForOrg(orgId, {
        status: 'ATIVA',
        isPaid: true,
        lastPaymentDate: todayIso,
        nextBillingDate,
        invoices: [invoice, ...existingInvoices],
      });

      broadcastSSE('SUBSCRIPTION_UPDATED', { orgId, status: 'ATIVA' });
      broadcastSSE('ORGANIZATION_UPDATED', { orgId });
      broadcastSSE('ORGANIZATIONS_UPDATED');
      return res.json({ success: true, organization: sanitizeOrganization(updated) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Admin Reject Subscription — SUPER ADMIN ONLY
app.post(
  ['/api/admin/subscription/reject', '/api/organizations/:id/reject-subscription'],
  requireSuperAdminAuth,
  async (req: Request, res: Response) => {
    const orgId = req.params.id || req.body?.orgId || req.body?.id;
    const reason = sanitizeText(req.body?.reason || 'Comprovante não identificado ou pendente', 200);
    if (!orgId) return res.status(400).json({ error: 'ID do estabelecimento é obrigatório.' });

    try {
      const updated = await SupabaseDBService.updateSubscriptionForOrg(orgId, {
        status: 'PENDENTE',
        isPaid: false,
        paymentProofNote: reason,
      });

      broadcastSSE('SUBSCRIPTION_UPDATED', { orgId, status: 'PENDENTE' });
      broadcastSSE('ORGANIZATION_UPDATED', { orgId });
      broadcastSSE('ORGANIZATIONS_UPDATED');
      return res.json({ success: true, organization: sanitizeOrganization(updated) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Admin Update Subscription Status — SUPER ADMIN ONLY
app.post(
  ['/api/admin/subscription/status', '/api/organizations/:id/subscription-status'],
  requireSuperAdminAuth,
  async (req: Request, res: Response) => {
    const orgId = req.params.id || req.body?.orgId || req.body?.id;
    const status = req.body?.status;
    if (!orgId || !status) return res.status(400).json({ error: 'orgId e status são obrigatórios.' });

    try {
      const isPaid = status === 'ATIVA';
      const updated = await SupabaseDBService.updateSubscriptionForOrg(orgId, {
        status,
        isPaid,
      });

      broadcastSSE('SUBSCRIPTION_UPDATED', { orgId, status });
      broadcastSSE('ORGANIZATION_UPDATED', { orgId });
      broadcastSSE('ORGANIZATIONS_UPDATED');
      return res.json({ success: true, organization: sanitizeOrganization(updated) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// Tenant / Salon Request Subscription Approval — TENANT PROTECTED
app.post('/api/admin/subscription/request-approval', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const orgId = sanitizeText(req.body?.orgId || req.body?.organizationId || session?.organizationId, 100);
  const proofNote = sanitizeText(req.body?.proofNote, 300);
  const paymentMethod = req.body?.paymentMethod === 'CARTAO_CREDITO' ? 'CARTAO_CREDITO' : 'PIX';

  if (!orgId) return res.status(400).json({ error: 'orgId é obrigatório.' });
  if (!isSuperAdminRole(session?.role) && session?.organizationId !== orgId) {
    return res.status(403).json({ error: 'Acesso negado a este estabelecimento.' });
  }

  try {
    const updated = await SupabaseDBService.updateSubscriptionForOrg(orgId, {
      status: 'AGUARDANDO_APROVACAO',
      isPaid: false,
      paymentMethod,
      paymentProofSentAt: new Date().toISOString(),
      paymentProofNote: proofNote || 'Comprovante PIX de R$ 79,90 enviado para análise do Dono da SaaS',
    });

    broadcastSSE('SUBSCRIPTION_UPDATED', { orgId, status: 'AGUARDANDO_APROVACAO' });
    broadcastSSE('ORGANIZATION_UPDATED', { orgId });
    broadcastSSE('ORGANIZATIONS_UPDATED');
    return res.json({ success: true, organization: sanitizeOrganization(updated) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Organization — TENANT PROTECTED (or SUPER ADMIN on /api/admin/organizations/:id)
app.delete('/api/organizations/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await SupabaseDBService.deleteOrganization(id);
    broadcastSSE('ORGANIZATION_DELETED', { orgId: id });
    broadcastSSE('ORGANIZATIONS_UPDATED');
    return res.json({ success: true, message: 'Organização excluída com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/organizations/:id', requireSuperAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await SupabaseDBService.deleteOrganization(id);
    broadcastSSE('ORGANIZATION_DELETED', { orgId: id });
    broadcastSSE('ORGANIZATIONS_UPDATED');
    return res.json({ success: true, message: 'Organização excluída com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 10. QUEUE OPERATIONS (STRICT TENANT ISOLATED & PROTECTED)
// ---------------------------------------------------------------------------
function assertQueueItemOwnership(session: any, item: any, res: Response): boolean {
  if (!item) {
    res.status(404).json({ error: 'Item não encontrado na fila.' });
    return false;
  }
  if (!isSuperAdminRole(session?.role) && session?.organizationId && item.organizationId !== session.organizationId) {
    res.status(403).json({ error: 'Acesso negado: este item pertence a outro estabelecimento.' });
    return false;
  }
  return true;
}

app.get('/api/queue/:orgId', async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const token = extractToken(req);
  const session = token ? await SupabaseDBService.getSession(token).catch(() => null) : null;
  const isAuthorized = session && (isSuperAdminRole(session.role) || session.organizationId === orgId);

  try {
    const queue = await SupabaseDBService.getQueueForOrganization(orgId);
    if (isAuthorized) {
      return res.json({ queue });
    }
    const safeQueue = queue
      .filter((item: any) =>
        ['AGUARDANDO', 'PROXIMO', 'CHAMADO', 'EM_ATENDIMENTO', 'NA CADEIRA', 'A_CAMINHO', 'PEDIU_TOLERANCIA'].includes(item.status)
      )
      .map((item: any) => ({
        id: item.id,
        ticketNumber: item.ticketNumber,
        organizationId: item.organizationId,
        customerName: SupabaseDBService.maskCustomerName(item.customerName),
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        preferredProfessionalId: item.preferredProfessionalId,
        status: item.status,
        joinedAt: item.joinedAt,
        estimatedWaitMinutes: item.estimatedWaitMinutes,
        calledAt: item.calledAt,
        calledToleranceExpiresAt: item.calledToleranceExpiresAt,
        onChairAt: item.onChairAt,
      }));
    return res.json({ queue: safeQueue });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao carregar fila: ' + err.message });
  }
});

app.post('/api/queue/call-next', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const organizationId = req.body?.organizationId || session?.organizationId;
  const assignedProfId = req.body?.assignedProfId;

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

    if (eligibleItem.notificationToken) {
      sendQueuePushNotification(
        organizationId,
        eligibleItem.notificationToken,
        '✂️ Chegou sua vez!',
        `Dirija-se ao atendimento agora! (Senha #${eligibleItem.ticketNumber})`,
        { type: 'CALLED', ticketNumber: eligibleItem.ticketNumber, queueId: eligibleItem.id }
      );
    }

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
          '💈 Sua vez está chegando! Prepare-se!',
          `Faltam poucos minutos para você sentar na cadeira (Senha #${nextWaiting.ticketNumber}). Aperte "Já estou indo!" para confirmar.`,
          { type: 'NEXT', ticketNumber: nextWaiting.ticketNumber, queueId: nextWaiting.id }
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
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/call-specific', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { queueId, organizationId, assignedProfessionalId } = req.body || {};
  if (!queueId) return res.status(400).json({ error: 'queueId é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!assertQueueItemOwnership(session, item, res)) return;

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
        `O barbeiro está te chamando para a cadeira agora! (Senha #${item.ticketNumber})`,
        { type: 'CALLED', ticketNumber: item.ticketNumber, queueId: item.id }
      );
    }

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
            '💈 Sua vez está chegando! Prepare-se!',
            `Faltam poucos minutos para você sentar na cadeira (Senha #${nextWaiting.ticketNumber}). Aperte "Já estou indo!" para confirmar.`,
            { type: 'NEXT', ticketNumber: nextWaiting.ticketNumber, queueId: nextWaiting.id }
          );
        }
      }
    }

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId });
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/recall', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { queueId, organizationId } = req.body || {};
  if (!queueId) return res.status(400).json({ error: 'queueId é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!assertQueueItemOwnership(session, item, res)) return;

    const targetOrgId = organizationId || item.organizationId;
    const now = new Date();
    const toleranceExpiry = new Date(now.getTime() + 4 * 60 * 1000);

    const recallCount = ((item as any).recallCount || 0) + 1;
    const notesUpdated = `${item.notes || ''} [Chamado novamente ${recallCount}x às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}]`.trim();

    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'CHAMADO',
      calledAt: now.toISOString(),
      calledToleranceExpiresAt: toleranceExpiry.toISOString(),
      notes: notesUpdated,
    });

    if (item.notificationToken) {
      sendQueuePushNotification(
        targetOrgId,
        item.notificationToken,
        '🔔 O Barbeiro está chamando você novamente!',
        `Sua senha #${item.ticketNumber} foi chamada mais uma vez! Por favor dirija-se à cadeira agora para iniciar o corte.`,
        { type: 'CALLED', ticketNumber: item.ticketNumber, queueId: item.id }
      );
    }

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId, recalled: true, recallCount });
    return res.json({ success: true, item: updated, recallCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Public customer response endpoint (Service Worker push action / public queue UI)
app.post('/api/queue/respond', async (req: Request, res: Response) => {
  const queueId = sanitizeText(req.body?.queueId, 100);
  const organizationId = req.body?.organizationId ? sanitizeText(req.body.organizationId, 100) : undefined;
  const response = sanitizeText(req.body?.response || req.body?.action, 40);

  if (!queueId || !response) {
    return res.status(400).json({ error: 'queueId e response (ou action) são obrigatórios.' });
  }
  if (!['A_CAMINHO', 'PEDIU_TOLERANCIA', 'NAO_PODE'].includes(response)) {
    return res.status(400).json({ error: 'Ação de resposta inválida.' });
  }

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!item) return res.status(404).json({ error: 'Item não encontrado na fila.' });

    const targetOrgId = organizationId || item.organizationId;
    const now = new Date();
    const updates: any = {
      clientResponse: response,
      clientResponseTime: now.toISOString(),
    };

    if (response === 'A_CAMINHO') {
      if (item.status === 'CHAMADO' || item.status === 'PEDIU_TOLERANCIA') {
        updates.status = 'A_CAMINHO';
      } else {
        updates.status = item.status;
      }
    } else if (response === 'PEDIU_TOLERANCIA') {
      updates.status = 'PEDIU_TOLERANCIA';
      const curExpiry = item.calledToleranceExpiresAt ? new Date(item.calledToleranceExpiresAt) : now;
      updates.calledToleranceExpiresAt = new Date(curExpiry.getTime() + 3 * 60000).toISOString();
      updates.toleranceExtraMinutes = ((item as any).toleranceExtraMinutes || 0) + 3;
    } else if (response === 'NAO_PODE') {
      updates.status = 'DESISTIU';
      updates.notes = `${item.notes || ''} [Cliente não pode comparecer]`.trim();
    }

    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, updates);
    broadcastSSE('QUEUE_UPDATED', {
      orgId: targetOrgId,
      queueItemId: queueId,
      clientResponse: response,
      status: updates.status,
    });

    console.log(`📡 Resposta do cliente recebida (${response}) para senha #${item.ticketNumber}`);
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/to-chair', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { queueId, organizationId, assignedProfessionalId } = req.body || {};
  if (!queueId) return res.status(400).json({ error: 'Dados incompletos: queueId é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!assertQueueItemOwnership(session, item, res)) return;

    const targetOrgId = organizationId || item.organizationId || session?.organizationId;
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
          '💈 Sua vez está chegando! Prepare-se!',
          `O cliente da sua frente sentou na cadeira (Senha #${nextInLine.ticketNumber}). Aperte "Já estou indo!" para confirmar.`,
          { type: 'NEXT', ticketNumber: nextInLine.ticketNumber, queueId: nextInLine.id }
        );
      }
    }

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId });
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/finish', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { queueId, organizationId } = req.body || {};
  if (!queueId) return res.status(400).json({ error: 'Dados incompletos: queueId é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!assertQueueItemOwnership(session, item, res)) return;

    const targetOrgId = organizationId || item.organizationId || session?.organizationId;
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
          '💈 Sua vez está chegando! Você é o próximo!',
          `O atendimento anterior terminou. Você assumiu o 1º lugar na fila (Senha #${firstInLine.ticketNumber}). Aperte "Já estou indo!"`,
          { type: 'NEXT', ticketNumber: firstInLine.ticketNumber, queueId: firstInLine.id }
        );
      }

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

    return res.json({ success: true, item: updated, promotedItem });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/cancel', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { queueId, organizationId, reason } = req.body || {};
  if (!queueId) return res.status(400).json({ error: 'Identificador do item é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!assertQueueItemOwnership(session, item, res)) return;

    const targetOrgId = organizationId || item.organizationId;
    if (!targetOrgId) return res.status(400).json({ error: 'organizationId não encontrado' });

    const safeReason = reason ? sanitizeText(reason, 120) : '';
    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'CANCELADO',
      notes: safeReason ? `[Cancelado: ${safeReason}]` : '[Cancelado]',
    });

    const queue = await SupabaseDBService.getQueueForOrganization(targetOrgId);
    const remainingWaiting = queue
      .filter((q: any) => (q.status === 'AGUARDANDO' || q.status === 'PROXIMO') && q.id !== queueId)
      .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber);

    if (remainingWaiting.length > 0 && !remainingWaiting.some((q: any) => q.status === 'PROXIMO')) {
      await SupabaseDBService.updateQueueItemStatus(remainingWaiting[0].id, targetOrgId, {
        status: 'PROXIMO',
        estimatedWaitMinutes: 5,
      }).catch(() => {});
    }

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId });
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/mark-noshow', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { queueId, organizationId } = req.body || {};
  if (!queueId) return res.status(400).json({ error: 'Identificador do item é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!assertQueueItemOwnership(session, item, res)) return;

    const targetOrgId = organizationId || item.organizationId;
    if (!targetOrgId) return res.status(400).json({ error: 'organizationId não encontrado' });

    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'NAO_COMPARECEU',
      notes: '[Não compareceu após ser chamado]',
    });

    const queue = await SupabaseDBService.getQueueForOrganization(targetOrgId);
    const remainingWaiting = queue
      .filter((q: any) => (q.status === 'AGUARDANDO' || q.status === 'PROXIMO') && q.id !== queueId)
      .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber);

    let promotedItem: any = null;
    if (remainingWaiting.length > 0 && !remainingWaiting.some((q: any) => q.status === 'PROXIMO')) {
      const firstInLine = remainingWaiting[0];
      promotedItem = await SupabaseDBService.updateQueueItemStatus(firstInLine.id, targetOrgId, {
        status: 'PROXIMO',
        estimatedWaitMinutes: 5,
      }).catch(() => null);

      if (firstInLine.notificationToken) {
        sendQueuePushNotification(
          targetOrgId,
          firstInLine.notificationToken,
          '✂️ Prepare-se: Você é o próximo!',
          `A cadeira foi liberada. Você agora é o 1º da fila (Senha #${firstInLine.ticketNumber})! Aperte "Já estou indo!"`,
          { type: 'NEXT', ticketNumber: firstInLine.ticketNumber, queueId: firstInLine.id }
        );
      }
    }

    broadcastSSE('QUEUE_UPDATED', {
      orgId: targetOrgId,
      queueItemId: queueId,
      promotedQueueItemId: promotedItem?.id,
      noShow: true,
    });
    return res.json({ success: true, item: updated, promotedItem });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/skip-and-call-next', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { currentQueueId, organizationId, assignedProfId, action = 'TO_CHAIR' } = req.body || {};
  const targetOrgId = organizationId || session?.organizationId;
  if (!targetOrgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    const queue = await SupabaseDBService.getQueueForOrganization(targetOrgId);
    let lateItem: any = null;
    if (currentQueueId) {
      lateItem = queue.find((q: any) => q.id === currentQueueId);
    }
    if (!lateItem) {
      lateItem = queue.find((q: any) => q.status === 'CHAMADO' || q.status === 'A_CAMINHO' || q.status === 'PEDIU_TOLERANCIA');
    }

    let updatedLateItem: any = null;
    if (lateItem) {
      const existingNotes = lateItem.notes || '';
      const notesUpdated = existingNotes.includes('[Vez mantida]')
        ? existingNotes
        : `${existingNotes} [Vez mantida - aguardando chegada]`.trim();

      updatedLateItem = await SupabaseDBService.updateQueueItemStatus(lateItem.id, targetOrgId, {
        status: 'PROXIMO',
        calledToleranceExpiresAt: null as any,
        notes: notesUpdated,
      });

      if (lateItem.notificationToken) {
        sendQueuePushNotification(
          targetOrgId,
          lateItem.notificationToken,
          '💈 Sua vez foi mantida!',
          'O barbeiro atendeu o próximo enquanto você chega. Sua prioridade está garantida na fila!',
          { type: 'NEXT', ticketNumber: lateItem.ticketNumber }
        );
      }
    }

    const remainingWaiting = queue
      .filter((q: any) => (q.status === 'AGUARDANDO' || q.status === 'PROXIMO') && (!lateItem || q.id !== lateItem.id))
      .sort((a: any, b: any) => a.ticketNumber - b.ticketNumber);

    if (remainingWaiting.length === 0) {
      broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId });
      return res.json({
        success: true,
        message: 'A vez do cliente foi mantida. Não há outros clientes aguardando na fila.',
        skippedItem: updatedLateItem,
        nextItem: null,
      });
    }

    const nextToAttend = remainingWaiting[0];
    let updatedNextItem: any = null;

    if (action === 'TO_CHAIR') {
      updatedNextItem = await SupabaseDBService.updateQueueItemStatus(nextToAttend.id, targetOrgId, {
        status: 'NA CADEIRA',
        onChairAt: new Date().toISOString(),
        assignedProfessionalId: assignedProfId || nextToAttend.preferredProfessionalId,
      });

      if (nextToAttend.notificationToken) {
        sendQueuePushNotification(
          targetOrgId,
          nextToAttend.notificationToken,
          '💈 Você está na cadeira!',
          `Seu atendimento de ${nextToAttend.serviceName} começou agora com o barbeiro!`,
          { type: 'CALLED', ticketNumber: nextToAttend.ticketNumber }
        );
      }
    } else {
      const now = new Date();
      const toleranceExpiry = new Date(now.getTime() + 5 * 60 * 1000);
      updatedNextItem = await SupabaseDBService.updateQueueItemStatus(nextToAttend.id, targetOrgId, {
        status: 'CHAMADO',
        calledAt: now.toISOString(),
        calledToleranceExpiresAt: toleranceExpiry.toISOString(),
        assignedProfessionalId: assignedProfId || nextToAttend.preferredProfessionalId,
      });

      if (nextToAttend.notificationToken) {
        sendQueuePushNotification(
          targetOrgId,
          nextToAttend.notificationToken,
          '✂️ Chegou sua vez!',
          `O barbeiro está te chamando para a cadeira agora! (Senha #${nextToAttend.ticketNumber})`,
          { type: 'CALLED', ticketNumber: nextToAttend.ticketNumber }
        );
      }
    }

    broadcastSSE('QUEUE_UPDATED', {
      orgId: targetOrgId,
      skippedQueueItemId: lateItem?.id,
      nextQueueItemId: nextToAttend.id,
    });

    return res.json({
      success: true,
      message: `Cliente ${lateItem?.customerName || 'anterior'} mantido na fila! Atendendo agora ${nextToAttend.customerName} (Senha #${nextToAttend.ticketNumber}).`,
      skippedItem: updatedLateItem,
      nextItem: updatedNextItem,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/hold-turn', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { queueId, organizationId } = req.body || {};
  if (!queueId) return res.status(400).json({ error: 'queueId é obrigatório' });

  try {
    const item = await SupabaseDBService.getQueueItemById(queueId);
    if (!assertQueueItemOwnership(session, item, res)) return;

    const targetOrgId = organizationId || item.organizationId;
    const existingNotes = item.notes || '';
    const notesUpdated = existingNotes.includes('[Vez mantida]')
      ? existingNotes
      : `${existingNotes} [Vez mantida - aguardando chegada]`.trim();

    const updated = await SupabaseDBService.updateQueueItemStatus(queueId, targetOrgId, {
      status: 'PROXIMO',
      calledToleranceExpiresAt: null as any,
      notes: notesUpdated,
    });

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: queueId });
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/swap-positions', requireTenantAuth, async (req: Request, res: Response) => {
  const session = (req as any).session;
  const { queueId1, queueId2, organizationId } = req.body || {};
  if (!queueId1 || !queueId2) return res.status(400).json({ error: 'queueId1 e queueId2 são obrigatórios' });

  try {
    const item1 = await SupabaseDBService.getQueueItemById(queueId1);
    if (!assertQueueItemOwnership(session, item1, res)) return;

    const item2 = await SupabaseDBService.getQueueItemById(queueId2);
    if (!assertQueueItemOwnership(session, item2, res)) return;

    const targetOrgId = organizationId || item1.organizationId;
    if (item2.organizationId !== targetOrgId) {
      return res.status(403).json({ error: 'Itens pertencem a estabelecimentos diferentes.' });
    }

    const ticket1 = item1.ticketNumber;
    const ticket2 = item2.ticketNumber;

    const tempTicket = -9999;
    await SupabaseDBService.updateQueueItemStatus(item1.id, targetOrgId, { ticketNumber: tempTicket });
    await SupabaseDBService.updateQueueItemStatus(item2.id, targetOrgId, { ticketNumber: ticket1 });
    await SupabaseDBService.updateQueueItemStatus(item1.id, targetOrgId, { ticketNumber: ticket2 });

    broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId });
    return res.json({ success: true, message: 'Posições trocadas com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    return res.json({ services });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', requireTenantAuth, async (req: Request, res: Response) => {
  const srvData = req.body || {};
  const orgId = srvData.organizationId || (req as any).session?.organizationId;
  if (!orgId || !srvData.name) {
    return res.status(400).json({ error: 'Nome do serviço e organização são obrigatórios.' });
  }

  try {
    const newService = await SupabaseDBService.createService({
      id: srvData.id || `srv-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      organizationId: orgId,
      name: sanitizeText(srvData.name, 80),
      description: sanitizeText(srvData.description, 300),
      price: Number(srvData.price || 0),
      durationMinutes: Number(srvData.durationMinutes || 30),
      category: sanitizeText(srvData.category, 60),
      professionalIds: srvData.professionalIds,
      isActive: srvData.isActive,
    });
    broadcastSSE('SERVICES_UPDATED', { orgId });
    return res.status(201).json({ success: true, service: newService });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body || {};
  const orgId = updates.organizationId || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    const updated = await SupabaseDBService.updateService(id, orgId, updates);
    broadcastSSE('SERVICES_UPDATED', { orgId });
    return res.json({ success: true, service: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    await SupabaseDBService.deleteService(id, orgId);
    broadcastSSE('SERVICES_UPDATED', { orgId });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    return res.json({ professionals });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/professionals', requireTenantAuth, async (req: Request, res: Response) => {
  const profData = req.body || {};
  const orgId = profData.organizationId || (req as any).session?.organizationId;
  if (!orgId || !profData.name) {
    return res.status(400).json({ error: 'Nome do profissional e organização são obrigatórios.' });
  }

  try {
    const newProf = await SupabaseDBService.createProfessional({
      id: profData.id || `prof-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      organizationId: orgId,
      name: sanitizeText(profData.name, 80),
      phone: sanitizePhone(profData.phone, 24),
      whatsapp: sanitizePhone(profData.whatsapp, 24),
      email: sanitizeEmail(profData.email),
      avatarUrl: profData.avatarUrl,
      specialties: profData.specialties,
      serviceIds: profData.serviceIds,
      commissionPercent: profData.commissionPercent,
      isAvailableToday: profData.isAvailableToday,
      workingDays: profData.workingDays,
      isActive: profData.isActive,
    });
    broadcastSSE('PROFESSIONALS_UPDATED', { orgId });
    return res.status(201).json({ success: true, professional: newProf });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/professionals/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body || {};
  const orgId = updates.organizationId || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    const updated = await SupabaseDBService.updateProfessional(id, orgId, updates);
    broadcastSSE('PROFESSIONALS_UPDATED', { orgId });
    return res.json({ success: true, professional: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/professionals/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    await SupabaseDBService.deleteProfessional(id, orgId);
    broadcastSSE('PROFESSIONALS_UPDATED', { orgId });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    return res.json({ appointments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', requireTenantAuth, async (req: Request, res: Response) => {
  const aptData = req.body || {};
  const orgId = aptData.organizationId || (req as any).session?.organizationId;
  if (!orgId || !aptData.customerName || !aptData.date || !aptData.time) {
    return res.status(400).json({ error: 'Dados do agendamento incompletos.' });
  }

  try {
    const newApt = await SupabaseDBService.createAppointment({
      id: aptData.id || `apt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      organizationId: orgId,
      customerName: sanitizeText(aptData.customerName, 80),
      customerPhone: sanitizePhone(aptData.customerPhone, 24),
      serviceId: sanitizeText(aptData.serviceId, 100),
      serviceName: sanitizeText(aptData.serviceName || 'Serviço', 80),
      professionalId: sanitizeText(aptData.professionalId, 100),
      professionalName: sanitizeText(aptData.professionalName || 'Profissional', 80),
      date: sanitizeText(aptData.date, 20),
      time: sanitizeText(aptData.time, 10),
      status: aptData.status || 'PENDENTE',
      totalPrice: Number(aptData.totalPrice || 0),
      notes: aptData.notes ? sanitizeText(aptData.notes, 300) : undefined,
    });
    broadcastSSE('APPOINTMENTS_UPDATED', { orgId });
    return res.status(201).json({ success: true, appointment: newApt });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body || {};
  const orgId = updates.organizationId || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    const updated = await SupabaseDBService.updateAppointment(id, orgId, updates);
    broadcastSSE('APPOINTMENTS_UPDATED', { orgId });
    return res.json({ success: true, appointment: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', requireTenantAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'organizationId é obrigatório' });

  try {
    await SupabaseDBService.deleteAppointment(id, orgId);
    broadcastSSE('APPOINTMENTS_UPDATED', { orgId });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 13.1 15-MINUTE WHATSAPP REMINDER ENDPOINTS (TENANT ISOLATED & PROTECTED)
// ---------------------------------------------------------------------------
const handleRemindersRequest = async (req: Request, res: Response) => {
  const { orgId } = req.params;
  if (!orgId) return res.status(400).json({ error: 'orgId é obrigatório' });

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowMs = Date.now();

    const [appointments, queue, org] = await Promise.all([
      SupabaseDBService.getAppointmentsForOrg(orgId, todayStr).catch(() => []),
      SupabaseDBService.getQueueForOrganization(orgId).catch(() => []),
      SupabaseDBService.getOrganizationById(orgId).catch(() => null),
    ]);

    const orgName = org?.name || 'Barbearia';

    const pendingAppointments = (appointments || [])
      .filter((a: any) => {
        if (a.date !== todayStr) return false;
        if (['CANCELADO', 'FINALIZADO', 'NA CADEIRA', 'FALTOU'].includes(a.status)) return false;
        if (a.reminderSent40Min) return false;
        try {
          const aptTimeMs = new Date(`${a.date}T${a.time}:00`).getTime();
          const minutesUntil = Math.round((aptTimeMs - nowMs) / 60000);
          return minutesUntil >= -5 && minutesUntil <= 20;
        } catch {
          return false;
        }
      })
      .map((a: any) => {
        const aptTimeMs = new Date(`${a.date}T${a.time}:00`).getTime();
        const minutesUntil = Math.max(0, Math.round((aptTimeMs - nowMs) / 60000));
        const rawPhone = (a.customerPhone || '').replace(/\D/g, '');
        const phone = rawPhone.length <= 11 && !rawPhone.startsWith('55') ? `55${rawPhone}` : rawPhone;
        const text = `Olá ${a.customerName}! 💈 Lembrando que seu corte na *${orgName}* está agendado para hoje às *${a.time}* (em aproximadamente ~15 minutos). Já estamos preparando tudo para você. Por favor, avise se houver algum imprevisto. Até logo! ✂️`;
        return {
          id: a.id,
          customerName: a.customerName,
          phone,
          serviceName: a.serviceName,
          time: a.time,
          minutesUntil,
          type: 'APPOINTMENT',
          whatsappText: text,
          whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
        };
      });

    const pendingQueue = (queue || [])
      .filter((q: any) => {
        if (q.status !== 'AGUARDANDO' && q.status !== 'PROXIMO') return false;
        if (q.notified40Min) return false;
        const wait = q.estimatedWaitMinutes || 15;
        return wait >= 3 && wait <= 20;
      })
      .map((q: any) => {
        const wait = q.estimatedWaitMinutes || 15;
        const rawPhone = (q.customerPhone || '').replace(/\D/g, '');
        const phone = rawPhone.length <= 11 && !rawPhone.startsWith('55') ? `55${rawPhone}` : rawPhone;
        const text = `Olá ${q.customerName}! 💈 Sua vez na *${orgName}* (Senha *#${q.ticketNumber}*) está prevista para daqui a aproximadamente *${wait} minutos*. Fique à vontade para ir se aproximando da barbearia! ✂️`;
        return {
          id: q.id,
          customerName: q.customerName,
          phone,
          serviceName: q.serviceName,
          minutesUntil: wait,
          ticketNumber: q.ticketNumber,
          type: 'QUEUE',
          whatsappText: text,
          whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
        };
      });

    return res.json({
      success: true,
      pendingAppointments,
      pendingQueue,
      totalPending: pendingAppointments.length + pendingQueue.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

app.get('/api/reminders/15min/:orgId', requireTenantAuth, handleRemindersRequest);
app.get('/api/reminders/40min/:orgId', requireTenantAuth, handleRemindersRequest);

app.post('/api/reminders/mark-sent', requireTenantAuth, async (req: Request, res: Response) => {
  const { id, type, organizationId } = req.body || {};
  const targetOrgId = organizationId || (req as any).session?.organizationId;
  if (!id || !type || !targetOrgId) {
    return res.status(400).json({ error: 'id, type e organizationId são obrigatórios' });
  }

  try {
    const nowIso = new Date().toISOString();
    if (type === 'APPOINTMENT') {
      await SupabaseDBService.updateAppointment(id, targetOrgId, {
        reminderSent40Min: true,
        reminderSent40MinAt: nowIso,
      } as any).catch(() => null);
      broadcastSSE('APPOINTMENTS_UPDATED', { orgId: targetOrgId, appointmentId: id });
    } else {
      await SupabaseDBService.updateQueueItemStatus(id, targetOrgId, {
        notified40Min: true,
        notified40MinAt: nowIso,
      } as any).catch(() => null);
      broadcastSSE('QUEUE_UPDATED', { orgId: targetOrgId, queueItemId: id });
    }

    return res.json({ success: true, id, type, sentAt: nowIso });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    return res.json({ customers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', requireTenantAuth, async (req: Request, res: Response) => {
  const orgId = (req.query.orgId as string) || (req as any).session?.organizationId;
  if (!orgId) return res.status(400).json({ error: 'orgId é obrigatório' });

  try {
    const transactions = await SupabaseDBService.getTransactionsForOrg(orgId);
    return res.json({ transactions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', requireTenantAuth, async (req: Request, res: Response) => {
  const txData = req.body || {};
  const orgId = txData.organizationId || (req as any).session?.organizationId;
  if (!orgId || !txData.description || txData.amount === undefined) {
    return res.status(400).json({ error: 'Dados da transação incompletos.' });
  }

  try {
    const newTx = await SupabaseDBService.createTransaction({
      id: txData.id || `tx-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      organizationId: orgId,
      description: sanitizeText(txData.description, 200),
      amount: Number(txData.amount),
      type: sanitizeText(txData.type || 'RECEITA', 40),
      category: txData.category ? sanitizeText(txData.category, 60) : undefined,
      paymentMethod: txData.paymentMethod ? sanitizeText(txData.paymentMethod, 40) : undefined,
      professionalId: txData.professionalId ? sanitizeText(txData.professionalId, 100) : undefined,
      date: txData.date,
    });
    return res.status(201).json({ success: true, transaction: newTx });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 15. MERCADO PAGO INTEGRATION & HARDENED SUBSCRIPTIONS
// ---------------------------------------------------------------------------
function resolveExpectedPlanPrice(planType?: string): number {
  return String(planType || '').toUpperCase() === 'ANNUAL'
    ? OFFICIAL_PLAN_PRICES.ANNUAL
    : OFFICIAL_PLAN_PRICES.MONTHLY;
}

function extractPaymentOrgAndPlan(paymentData: any): { orgId?: string; planType: 'ANNUAL' | 'MONTHLY' } {
  const metaOrgId = paymentData?.metadata?.organizationId || paymentData?.metadata?.organization_id;
  const metaPlan = paymentData?.metadata?.planType || paymentData?.metadata?.plan_type;

  const extRef = String(paymentData?.external_reference || '');
  const parts = extRef.split('_');
  // Format: sub_${orgId}_${planType}_${timestamp}
  const refPlan = parts.length >= 4 ? parts[parts.length - 2] : parts[2];
  const refOrgId = parts.length >= 4 ? parts.slice(1, parts.length - 2).join('_') : parts[1];

  const rawPlan = String(metaPlan || refPlan || 'MONTHLY').toUpperCase();
  const planType: 'ANNUAL' | 'MONTHLY' = rawPlan === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  return {
    orgId: metaOrgId || refOrgId || undefined,
    planType,
  };
}

async function activateSubscriptionFromMercadoPagoPayment(paymentData: any): Promise<{
  activated: boolean;
  alreadyProcessed?: boolean;
  reason?: string;
  orgId?: string;
}> {
  if (!paymentData || paymentData.status !== 'approved') {
    return { activated: false, reason: `Status não aprovado: ${paymentData?.status || 'desconhecido'}` };
  }

  const paymentId = String(paymentData.id || '');
  if (!paymentId) {
    return { activated: false, reason: 'ID de pagamento ausente' };
  }

  const { orgId, planType } = extractPaymentOrgAndPlan(paymentData);
  if (!orgId) {
    return { activated: false, reason: 'organizationId não identificado no pagamento' };
  }

  const expectedAmount = resolveExpectedPlanPrice(planType);
  const paidAmount = Number(paymentData.transaction_amount || 0);

  if (Number.isNaN(paidAmount) || paidAmount < expectedAmount - 0.01) {
    console.warn(
      `⚠️ [Segurança/MP] Divergência de valor no pagamento ${paymentId}: pago=${paidAmount}, esperado=${expectedAmount}`
    );
    return { activated: false, reason: 'Valor pago diverge do valor oficial do plano', orgId };
  }

  if (processedMpPaymentIds.has(paymentId)) {
    return { activated: true, alreadyProcessed: true, orgId };
  }

  const org = await SupabaseDBService.getOrganizationById(orgId).catch(() => null);
  if (!org) {
    return { activated: false, reason: 'Organização não encontrada', orgId };
  }

  const existingInvoices = Array.isArray(org.subscription?.invoices) ? org.subscription.invoices : [];
  const invoiceTag = `mp_${paymentId}`;
  if (existingInvoices.some((inv: any) => inv.id === invoiceTag)) {
    processedMpPaymentIds.add(paymentId);
    return { activated: true, alreadyProcessed: true, orgId };
  }

  const todayIso = new Date().toISOString().split('T')[0];
  const daysToAdd = planType === 'ANNUAL' ? 365 : 30;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  const nextBillingDate = nextDate.toISOString().split('T')[0];

  const invoice = {
    id: invoiceTag,
    date: todayIso,
    amount: expectedAmount,
    status: 'PAGO' as const,
    paymentMethod: paymentData.payment_method_id === 'pix' ? 'PIX' : 'CARTAO_CREDITO',
    description:
      planType === 'ANNUAL'
        ? `Plano Pro Anual BarberOS (R$ 838,80) - Mercado Pago #${paymentId}`
        : `Mensalidade BarberOS Pro (R$ 79,90) - Mercado Pago #${paymentId}`,
  };

  await SupabaseDBService.saveSubscription({
    id: `sub_pay_${paymentId}`,
    organizationId: orgId,
    planId: planType === 'ANNUAL' ? 'pro_annual' : 'pro_monthly',
    status: 'ATIVA',
    paymentId,
    amount: paidAmount,
    expiresAt: nextDate.toISOString(),
    metadata: {
      approvedAt: new Date().toISOString(),
      paymentMethod: paymentData.payment_method_id,
      planType,
    },
  });

  await SupabaseDBService.updateSubscriptionForOrg(orgId, {
    status: 'ATIVA',
    isPaid: true,
    planName: planType === 'ANNUAL' ? 'Plano Pro Anual BarberOS' : 'Plano Pro Mensal BarberOS',
    priceMonthly: planType === 'ANNUAL' ? 69.9 : 79.9,
    paymentMethod: invoice.paymentMethod,
    lastPaymentDate: todayIso,
    nextBillingDate,
    invoices: [invoice, ...existingInvoices],
  });

  processedMpPaymentIds.add(paymentId);

  broadcastSSE('SUBSCRIPTION_UPDATED', { orgId, status: 'ATIVA' });
  broadcastSSE('ORGANIZATION_UPDATED', { orgId });
  broadcastSSE('ORGANIZATIONS_UPDATED');
  console.log(`🎉 [MercadoPago] Assinatura ${planType} da barbearia ${orgId} ativada (Pagamento #${paymentId})`);
  return { activated: true, alreadyProcessed: false, orgId };
}

function verifyMercadoPagoWebhookSignature(req: Request): boolean {
  if (!MP_WEBHOOK_SECRET) return true;

  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  if (typeof xSignature !== 'string' || !xSignature.trim()) {
    return false;
  }

  let ts = '';
  let hash = '';
  for (const part of xSignature.split(',')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === 'ts') ts = v;
    if (k === 'v1') hash = v;
  }

  if (!ts || !hash || !/^[a-f0-9]+$/i.test(hash)) {
    return false;
  }

  const rawDataId = req.query['data.id'] || req.body?.data?.id || req.query.id;
  const dataId = rawDataId !== undefined && rawDataId !== null ? String(rawDataId) : '';
  const reqId = typeof xRequestId === 'string' ? xRequestId : '';

  const manifestParts: string[] = [];
  if (dataId) manifestParts.push(`id:${dataId};`);
  if (reqId) manifestParts.push(`request-id:${reqId};`);
  manifestParts.push(`ts:${ts};`);
  const manifest = manifestParts.join('');
  const fullManifest = `id:${dataId};request-id:${reqId};ts:${ts};`;

  const candidates = [manifest, fullManifest];
  const providedBuf = Buffer.from(hash.toLowerCase(), 'hex');

  for (const candidate of candidates) {
    const expectedHex = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(candidate).digest('hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return true;
    }
  }

  return false;
}

app.get('/api/mercadopago/config-status', (_req: Request, res: Response) => {
  const isConfigured = !!MP_ACCESS_TOKEN;
  return res.json({
    configured: isConfigured,
    isConfigured,
    webhookConfigured: !!MP_WEBHOOK_SECRET,
    hasWebhookSecret: !!MP_WEBHOOK_SECRET,
    appUrl: APP_URL,
    mode: MP_ACCESS_TOKEN.startsWith('TEST-') ? 'sandbox' : 'production',
    configuredMessage: isConfigured
      ? 'Mercado Pago configurado e pronto para pagamentos.'
      : 'MERCADOPAGO_ACCESS_TOKEN não configurado no ambiente.',
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

    return res.json({
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
    return res.status(500).json({ error: err.message });
  }
});

async function handleCreateMercadoPagoCheckout(req: Request, res: Response) {
  const session = (req as any).session;
  const organizationId = sanitizeText(req.body?.organizationId || session?.organizationId, 100);
  const rawPlanType = String(req.body?.planType || 'ANNUAL').toUpperCase();
  const planType: 'ANNUAL' | 'MONTHLY' = rawPlanType === 'MONTHLY' ? 'MONTHLY' : 'ANNUAL';
  const paymentMethodType = req.body?.paymentMethodType === 'PIX' ? 'PIX' : 'CHECKOUT_PRO';
  const payerEmail = sanitizeEmail(req.body?.payerEmail);
  const payerName = sanitizeText(req.body?.payerName, 100);

  if (!organizationId) {
    return res.status(400).json({ error: 'organizationId é obrigatório' });
  }
  if (!isSuperAdminRole(session?.role) && session?.organizationId && session.organizationId !== organizationId) {
    return res.status(403).json({ error: 'Acesso negado a este estabelecimento.' });
  }

  try {
    const org = await SupabaseDBService.getOrganizationById(organizationId);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada no banco de dados' });

    if (!MP_ACCESS_TOKEN || !mpClient) {
      return res.status(503).json({
        error: 'MERCADOPAGO_NOT_CONFIGURED',
        message: 'MERCADOPAGO_ACCESS_TOKEN não configurado.',
      });
    }

    // NEVER trust client-supplied price or amount: always compute server-side
    const amount = resolveExpectedPlanPrice(planType);
    const title = planType === 'ANNUAL' ? 'Plano Anual BarberOS' : 'Plano Mensal BarberOS';
    const externalReference = `sub_${org.id}_${planType}_${Date.now()}`;
    const metadataPayload = {
      organizationId: org.id,
      organization_id: org.id,
      planType,
      plan_type: planType,
    };

    if (paymentMethodType === 'PIX') {
      const payment = new Payment(mpClient);
      const paymentResponse = await payment.create({
        body: {
          transaction_amount: amount,
          description: title,
          payment_method_id: 'pix',
          external_reference: externalReference,
          notification_url: `${APP_URL}/api/mercadopago/webhook`,
          metadata: metadataPayload,
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
          planType,
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
          metadata: metadataPayload,
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
        metadata: { planType },
      });

      return res.json({
        success: true,
        type: 'CHECKOUT_PRO',
        preferenceId: prefResponse.id,
        initPoint: prefResponse.init_point,
        sandboxInitPoint: prefResponse.sandbox_init_point,
        amount,
        planTitle: title,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

app.post(['/api/mercadopago/create-checkout', '/api/mercadopago/create-preference'], requireTenantAuth, handleCreateMercadoPagoCheckout);

app.get('/api/mercadopago/payment-status/:paymentId', requireTenantAuth, async (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const session = (req as any).session;

  if (!MP_ACCESS_TOKEN || !mpClient) {
    return res.status(503).json({ error: 'MERCADOPAGO_NOT_CONFIGURED' });
  }

  try {
    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: String(paymentId) });
    const { orgId } = extractPaymentOrgAndPlan(paymentData);

    if (!isSuperAdminRole(session?.role) && orgId && session?.organizationId && orgId !== session.organizationId) {
      return res.status(403).json({ error: 'Acesso negado a este pagamento.' });
    }

    if (paymentData.status === 'approved') {
      await activateSubscriptionFromMercadoPagoPayment(paymentData);
    }

    return res.json({
      paymentId: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/mercadopago/webhook', async (req: Request, res: Response) => {
  if (!verifyMercadoPagoWebhookSignature(req)) {
    console.warn('⚠️ [Segurança] Webhook Mercado Pago rejeitado: assinatura HMAC ausente ou inválida.');
    return res.status(401).json({ error: 'Assinatura do webhook inválida ou ausente.' });
  }

  res.status(200).send('OK');

  if (!MP_ACCESS_TOKEN || !mpClient) return;

  try {
    const topic = req.query.topic || req.body?.type || req.query.type;
    const action = String(req.body?.action || '');
    const dataId = req.query['data.id'] || req.body?.data?.id || req.query.id;

    if ((topic === 'payment' || action.startsWith('payment.')) && dataId) {
      const payment = new Payment(mpClient);
      const paymentData = await payment.get({ id: String(dataId) });
      await activateSubscriptionFromMercadoPagoPayment(paymentData);
    }
  } catch (err: any) {
    console.error('Erro no processamento do webhook Mercado Pago:', err?.message || err);
  }
});

// ---------------------------------------------------------------------------
// 16. STRICT 404 FOR UNMATCHED /api/* (NEVER RETURN HTML FOR API CALLS)
// ---------------------------------------------------------------------------
app.all('/api/*', (req: Request, res: Response) => {
  return res.status(404).json({
    error: `Rota de API não encontrada: ${req.method} ${req.path}`,
    status: 404,
  });
});

// ---------------------------------------------------------------------------
// 16.1 SERVER-SIDE AUTONOMOUS ENGINE (PILOTO AUTOMÁTICO DE LEMBRETES & FILA)
// ---------------------------------------------------------------------------
async function runServerAutoPilotCycle() {
  try {
    const orgs = await SupabaseDBService.getAllOrganizations().catch(() => []);
    const todayStr = new Date().toISOString().split('T')[0];
    const nowMs = Date.now();

    for (const org of orgs) {
      if (!org.isActive) continue;
      const orgId = org.id;

      const [appointments, queue] = await Promise.all([
        SupabaseDBService.getAppointmentsForOrg(orgId, todayStr).catch(() => []),
        SupabaseDBService.getQueueForOrganization(orgId).catch(() => []),
      ]);

      for (const apt of appointments || []) {
        if (['CANCELADO', 'FINALIZADO', 'NA CADEIRA', 'FALTOU'].includes(apt.status)) continue;
        if (apt.reminderSent40Min) continue;
        try {
          const aptTimeMs = new Date(`${apt.date}T${apt.time}:00`).getTime();
          const minutesUntil = Math.round((aptTimeMs - nowMs) / 60000);
          if (minutesUntil >= -5 && minutesUntil <= 20) {
            await SupabaseDBService.updateAppointment(apt.id, orgId, {
              reminderSent40Min: true,
              reminderSent40MinAt: new Date().toISOString(),
            } as any).catch(() => null);

            broadcastSSE('AUTOPILOT_REMINDER', {
              orgId,
              type: 'APPOINTMENT',
              customerName: apt.customerName,
              serviceName: apt.serviceName,
              time: apt.time,
              minutesUntil,
            });
            broadcastSSE('APPOINTMENTS_UPDATED', { orgId, appointmentId: apt.id });
          }
        } catch {}
      }

      for (const q of queue || []) {
        if (q.status !== 'AGUARDANDO' && q.status !== 'PROXIMO') continue;
        if (q.notified40Min) continue;
        const wait = q.estimatedWaitMinutes || 15;
        if (wait >= 3 && wait <= 20) {
          await SupabaseDBService.updateQueueItemStatus(q.id, orgId, {
            notified40Min: true,
            notified40MinAt: new Date().toISOString(),
          } as any).catch(() => null);

          if (q.notificationToken) {
            sendQueuePushNotification(
              orgId,
              q.notificationToken,
              `💈 ${org.name}: Sua vez está chegando!`,
              `Sua previsão para sentar na cadeira (Senha #${q.ticketNumber}) é em ~${wait} minutos. Aperte "Já estou indo!" para confirmar!`,
              { type: 'REMINDER_15MIN', ticketNumber: q.ticketNumber, queueId: q.id }
            );
          }

          broadcastSSE('AUTOPILOT_REMINDER', {
            orgId,
            type: 'QUEUE',
            customerName: q.customerName,
            serviceName: q.serviceName,
            ticketNumber: q.ticketNumber,
            minutesUntil: wait,
          });
          broadcastSSE('QUEUE_UPDATED', { orgId, queueItemId: q.id });
        }
      }
    }
  } catch {
    // Suppress background errors
  }
}

if (!isVercel) {
  const autoPilotTimer = setInterval(runServerAutoPilotCycle, 30000);
  if (typeof autoPilotTimer.unref === 'function') {
    autoPilotTimer.unref();
  }
}

// ---------------------------------------------------------------------------
// 17. GLOBAL EXPRESS ERROR HANDLER (NEVER LEAKS STACK TRACES IN PRODUCTION)
// ---------------------------------------------------------------------------
function registerGlobalErrorHandler() {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Payload excede o limite máximo permitido (1MB).' });
    }
    if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
    }

    const status = Number(err?.status || err?.statusCode) || 500;
    console.error('[Global Error Handler]', err?.message || err);

    return res.status(status).json({
      error: IS_PRODUCTION ? 'Erro interno no servidor.' : err?.message || 'Erro interno no servidor.',
    });
  });
}

// ---------------------------------------------------------------------------
// 18. SERVER STARTUP & VITE (DEV OR PROD)
// ---------------------------------------------------------------------------
async function startServer() {
  SupabaseDBService.ensureDefaultSeed().catch((err) => {
    console.warn('[Startup] Supabase seed warning:', err.message);
  });

  const isProd = IS_PRODUCTION && fs.existsSync(path.resolve(__dirname, 'dist'));

  if (isProd) {
    app.use(['/fila/assets', '/agendar/assets', '/b/assets', '/atendimento/assets'], express.static(path.resolve(__dirname, 'dist', 'assets')));
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|json|webmanifest)$/i.test(req.path)) {
        return res.status(404).send('Asset not found');
      }
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
    registerGlobalErrorHandler();
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`💈 BarberOS Server (Production) running on http://0.0.0.0:${PORT}`);
    });
  } else {
    app.use(['/fila/assets', '/agendar/assets', '/b/assets', '/atendimento/assets'], (req, _res, next) => {
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
    registerGlobalErrorHandler();

    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`💈 BarberOS Server (Dev Mode) running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (isVercel || process.env.NODE_ENV === 'test') {
  registerGlobalErrorHandler();
}

const isMainModule =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(__filename) || process.argv[1].endsWith('server.ts'));

if (isMainModule && !isVercel && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  });
}

export default app;
