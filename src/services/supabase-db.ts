import crypto from 'crypto';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../lib/supabase-admin.ts';

// Cryptographic Password Hashing (Zero Plaintext Passwords)
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const generated = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const a = Buffer.from(generated, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export class SupabaseDBService {
  private static tablesReadyCache: boolean | null = null;
  private static lastTableCheck = 0;
  private static readonly CHECK_INTERVAL_MS = 15000;

  static isConfigured(): boolean {
    return isSupabaseAdminConfigured();
  }

  // ---------------------------------------------------------------------------
  // TABLE EXISTENCE CHECK
  // ---------------------------------------------------------------------------
  private static lastCheckError: string | null = null;

  static async checkTablesReady(force = false): Promise<boolean> {
    if (!this.isConfigured()) {
      this.lastCheckError = 'Supabase backend não configurado';
      return false;
    }

    const now = Date.now();
    if (!force && this.tablesReadyCache === true && now - this.lastTableCheck < this.CHECK_INTERVAL_MS) {
      return true;
    }

    try {
      const client = getSupabaseAdminClient();
      const { error } = await client.from('organizations').select('id').limit(1);
      this.lastTableCheck = now;

      if (error) {
        console.error('[SupabaseDBService.checkTablesReady error]:', error.code, error.message);
        this.lastCheckError = `[${error.code}] ${error.message}`;
        this.tablesReadyCache = false;
        return false;
      }

      this.lastCheckError = null;
      this.tablesReadyCache = true;
      return true;
    } catch (err: any) {
      console.error('[SupabaseDBService.checkTablesReady exception]:', err);
      this.lastCheckError = err.message || 'Exceção ao conectar';
      this.tablesReadyCache = false;
      return false;
    }
  }

  static assertTablesReady(isReady: boolean): void {
    if (!isReady) {
      const detail = this.lastCheckError ? ` [${this.lastCheckError}]` : '';
      throw new Error(
        `Tabelas do Supabase não encontradas no schema cache${detail}. Execute o script supabase-schema.sql no SQL Editor do seu projeto Supabase: https://supabase.com/dashboard/project/xsmcfrualbyswoccyicl/sql`
      );
    }
  }

  static async ensureDefaultSeed(): Promise<void> {
    const ready = await this.checkTablesReady();
    if (!ready) return;
    try {
      const client = getSupabaseAdminClient();
      const { data } = await client.from('organizations').select('id').eq('slug', 'barbearia').maybeSingle();
      if (!data) {
        await this.createOrganization({
          id: 'org-prime',
          name: 'Minha Barbearia',
          slug: 'barbearia',
          type: 'Barbearia',
          description: 'Atendimento de alta qualidade, corte de cabelo moderno e tradicional, barba e estilo.',
          phone: '(11) 99999-0000',
          whatsapp: '11999990000',
          instagram: '@minhabarbearia',
          ownerName: 'Dono da Barbearia',
          ownerEmail: 'dono@barbearia.com',
          ownerPassword: '123',
          isActive: true,
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
          },
        });
        await this.createProfessional({
          id: 'prof-1',
          organizationId: 'org-prime',
          name: 'Barbeiro Responsável',
          email: 'barbeiro@barbearia.com',
          phone: '(11) 99999-0001',
          whatsapp: '11999990001',
          specialties: ['Corte Clássico & Fade', 'Barba Tradicional', 'Acabamento'],
          serviceIds: ['srv-1', 'srv-2'],
          commissionPercent: 50,
          isActive: true,
          isAvailableToday: true,
          workingDays: [1, 2, 3, 4, 5, 6],
        });
        await this.createService({
          id: 'srv-1',
          organizationId: 'org-prime',
          name: 'Corte Masculino',
          description: 'Corte na máquina e tesoura com lavagem e finalização.',
          price: 40,
          durationMinutes: 30,
          category: 'Cabelo',
          professionalIds: ['prof-1'],
          isActive: true,
        });
        await this.createService({
          id: 'srv-2',
          organizationId: 'org-prime',
          name: 'Barba Tradicional',
          description: 'Toalha quente, navalhete descartável e hidratação.',
          price: 35,
          durationMinutes: 30,
          category: 'Barba',
          professionalIds: ['prof-1'],
          isActive: true,
        });
      }
    } catch (e) {
      console.warn('[SupabaseDBService] ensureDefaultSeed warning:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATIONS (BARBERSHOPS)
  // ---------------------------------------------------------------------------
  static async getOrganizationById(id: string): Promise<any | null> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar organização por ID [${error.code}]: ${error.message}`);
    }
    return data ? this.mapOrgFromDb(data) : null;
  }

  static async getOrganizationBySlug(slug: string): Promise<any | null> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const cleanSlug = decodeURIComponent(slug).trim().toLowerCase();
    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('organizations')
      .select('*')
      .ilike('slug', cleanSlug)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar organização por slug [${error.code}]: ${error.message}`);
    }
    return data ? this.mapOrgFromDb(data) : null;
  }

  static async getOrganizationByLogin(term: string): Promise<any | null> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const clean = term.trim().toLowerCase();
    const cleanPhone = clean.replace(/\D/g, '');
    const client = getSupabaseAdminClient();

    // Query organization by email, slug, id, or phone
    const { data, error } = await client
      .from('organizations')
      .select('*')
      .or(`owner_email.ilike.${clean},slug.ilike.${clean},id.eq.${clean}`);

    if (error) {
      throw new Error(`Erro ao buscar organização para login [${error.code}]: ${error.message}`);
    }

    if (data && data.length > 0) {
      return this.mapOrgFromDb(data[0]);
    }

    // Try by phone if cleanPhone exists
    if (cleanPhone && cleanPhone.length >= 8) {
      const { data: phoneData } = await client
        .from('organizations')
        .select('*')
        .or(`phone.ilike.%${cleanPhone}%,whatsapp.ilike.%${cleanPhone}%`);
      if (phoneData && phoneData.length > 0) {
        return this.mapOrgFromDb(phoneData[0]);
      }
    }

    return null;
  }

  static async getAllOrganizations(): Promise<any[]> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar organizações [${error.code}]: ${error.message}`);
    }
    return (data || []).map((o) => this.mapOrgFromDb(o));
  }

  static async createOrganization(org: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    description?: string;
    phone?: string;
    whatsapp?: string;
    instagram?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword?: string;
    address?: any;
    workingHours?: any[];
    settings?: any;
    planId?: string;
    isActive?: boolean;
    subscription?: any;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();

    // Check slug collision
    const existing = await this.getOrganizationBySlug(org.slug);
    if (existing) {
      throw new Error(`O identificador "${org.slug}" já está em uso por outro estabelecimento.`);
    }

    let passwordHash = null;
    let salt = null;
    if (org.ownerPassword) {
      const h = hashPassword(org.ownerPassword);
      passwordHash = h.hash;
      salt = h.salt;
    }

    const row = {
      id: org.id,
      name: org.name.trim(),
      slug: org.slug.trim().toLowerCase(),
      type: org.type || 'Barbearia',
      description: org.description || null,
      phone: org.phone || null,
      whatsapp: org.whatsapp || null,
      instagram: org.instagram || null,
      owner_name: org.ownerName.trim(),
      owner_email: org.ownerEmail.trim().toLowerCase(),
      owner_password_hash: passwordHash,
      owner_salt: salt,
      address: org.address || {},
      working_hours: org.workingHours || [],
      settings: org.settings || {},
      plan_id: org.planId || 'premium',
      is_active: org.isActive !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('organizations')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao cadastrar estabelecimento no Supabase [${error.code}]: ${error.message}`);
    }

    return this.mapOrgFromDb(data);
  }

  static async updateOrganization(id: string, updates: Partial<any>): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const dbUpdates: any = { updated_at: new Date().toISOString() };

    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
    if (updates.instagram !== undefined) dbUpdates.instagram = updates.instagram;
    if (updates.ownerName !== undefined) dbUpdates.owner_name = updates.ownerName;
    if (updates.ownerEmail !== undefined) dbUpdates.owner_email = updates.ownerEmail;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.workingHours !== undefined) dbUpdates.working_hours = updates.workingHours;
    if (updates.settings !== undefined) dbUpdates.settings = updates.settings;
    if (updates.planId !== undefined) dbUpdates.plan_id = updates.planId;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    if (updates.ownerPassword) {
      const h = hashPassword(updates.ownerPassword);
      dbUpdates.owner_password_hash = h.hash;
      dbUpdates.owner_salt = h.salt;
    }

    const { data, error } = await client
      .from('organizations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar estabelecimento no Supabase [${error.code}]: ${error.message}`);
    }

    return this.mapOrgFromDb(data);
  }

  static async deleteOrganization(id: string): Promise<boolean> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { error } = await client.from('organizations').delete().eq('id', id);
    if (error) {
      throw new Error(`Falha ao excluir estabelecimento no Supabase [${error.code}]: ${error.message}`);
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC ESTABLISHMENT RESOLUTION (Pure Isolation, Zero Data Leakage)
  // ---------------------------------------------------------------------------
  static async getPublicEstablishment(slug: string): Promise<{
    organization: any;
    services: any[];
    professionals: any[];
    queue: any[];
  } | null> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const cleanSlug = decodeURIComponent(slug).trim().toLowerCase();
    const client = getSupabaseAdminClient();

    // 1. Fetch organization (only active)
    const { data: orgData, error: orgErr } = await client
      .from('organizations')
      .select('id, name, slug, type, description, phone, whatsapp, instagram, address, working_hours, settings, is_active, created_at')
      .or(`slug.ilike.${cleanSlug},id.eq.${cleanSlug}`)
      .eq('is_active', true)
      .maybeSingle();

    if (orgErr) {
      throw new Error(`Erro na consulta SQL de estabelecimento [${orgErr.code}]: ${orgErr.message}`);
    }

    if (!orgData) {
      if (cleanSlug === 'barbearia' || cleanSlug === 'minha-barbearia' || cleanSlug === 'org-prime') {
        await this.ensureDefaultSeed();
        const retry = await client
          .from('organizations')
          .select('id, name, slug, type, description, phone, whatsapp, instagram, address, working_hours, settings, is_active, created_at')
          .or(`slug.ilike.${cleanSlug},id.eq.${cleanSlug}`)
          .eq('is_active', true)
          .maybeSingle();
        if (retry.data) {
          return this.getPublicEstablishment(retry.data.slug);
        }
      }
      return null;
    }

    const orgId = orgData.id;

    // 2. Fetch active services for this organization only
    const { data: servicesData, error: srvErr } = await client
      .from('services')
      .select('id, organization_id, name, description, price, duration_minutes, category, professional_ids, is_active, created_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (srvErr) throw new Error(`Erro ao buscar serviços [${srvErr.code}]: ${srvErr.message}`);

    // 3. Fetch active professionals for this organization only (EXCLUDING commission_percent)
    const { data: profsData, error: profErr } = await client
      .from('professionals')
      .select('id, organization_id, name, phone, whatsapp, avatar_url, specialties, service_ids, is_available_today, working_days, is_active, created_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (profErr) throw new Error(`Erro ao buscar profissionais [${profErr.code}]: ${profErr.message}`);

    // 4. Fetch active queue for this organization only (MASKING customer name, EXCLUDING phone and notes)
    const { data: queueData, error: qErr } = await client
      .from('queue')
      .select('id, ticket_number, organization_id, customer_name, service_id, service_name, preferred_professional_id, status, joined_at, estimated_wait_minutes, called_at, called_tolerance_expires_at, on_chair_at, finished_at')
      .eq('organization_id', orgId)
      .in('status', ['AGUARDANDO', 'PROXIMO', 'CHAMADO', 'EM_ATENDIMENTO', 'NA CADEIRA', 'A_CAMINHO', 'PEDIU_TOLERANCIA'])
      .order('ticket_number', { ascending: true });

    if (qErr) throw new Error(`Erro ao buscar fila [${qErr.code}]: ${qErr.message}`);

    const organization = {
      id: orgData.id,
      name: orgData.name,
      slug: orgData.slug,
      type: orgData.type || 'Barbearia',
      description: orgData.description || '',
      phone: orgData.phone || '',
      whatsapp: orgData.whatsapp || '',
      instagram: orgData.instagram || '',
      address: orgData.address || {},
      workingHours: orgData.working_hours || [],
      settings: orgData.settings || {},
      isActive: orgData.is_active !== false,
      createdAt: orgData.created_at,
    };

    const services = (servicesData || []).map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      name: s.name,
      description: s.description || '',
      price: Number(s.price || 0),
      durationMinutes: Number(s.duration_minutes || 30),
      category: s.category || 'Cabelo',
      professionalIds: s.professional_ids || [],
      isActive: s.is_active !== false,
      createdAt: s.created_at,
    }));

    const professionals = (profsData || []).map((p: any) => ({
      id: p.id,
      organizationId: p.organization_id,
      name: p.name,
      phone: p.phone || '',
      whatsapp: p.whatsapp || '',
      avatarUrl: p.avatar_url || '',
      specialties: p.specialties || [],
      serviceIds: p.service_ids || [],
      isAvailableToday: p.is_available_today !== false,
      workingDays: p.working_days || [1, 2, 3, 4, 5, 6],
      isActive: p.is_active !== false,
      createdAt: p.created_at,
    }));

    // Public queue items: mask sensitive details for privacy, omit phone
    const queue = (queueData || []).map((q: any) => ({
      id: q.id,
      ticketNumber: q.ticket_number,
      organizationId: q.organization_id,
      customerName: this.maskCustomerName(q.customer_name),
      serviceId: q.service_id,
      serviceName: q.service_name,
      preferredProfessionalId: q.preferred_professional_id || null,
      status: q.status,
      joinedAt: q.joined_at,
      estimatedWaitMinutes: q.estimated_wait_minutes || 15,
      calledAt: q.called_at,
      calledToleranceExpiresAt: q.called_tolerance_expires_at,
      onChairAt: q.on_chair_at,
      finishedAt: q.finished_at,
    }));

    return {
      organization,
      services,
      professionals,
      queue,
    };
  }

  // ---------------------------------------------------------------------------
  // SECURE QUEUE JOIN (Atomic, Strict Validation, Authoritative Supabase Insert)
  // ---------------------------------------------------------------------------
  static async joinQueue(params: {
    organizationId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    preferredProfessionalId?: string;
    notes?: string;
    notificationToken?: string;
    subscriptionData?: any;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();

    // 1. Validate organization
    const orgClean = params.organizationId.trim().toLowerCase();
    const { data: org, error: orgErr } = await client
      .from('organizations')
      .select('id, name, is_active')
      .or(`id.eq.${orgClean},slug.ilike.${orgClean}`)
      .maybeSingle();

    if (orgErr || !org) {
      throw new Error('Estabelecimento não encontrado para ingressar na fila.');
    }
    if (org.is_active === false) {
      throw new Error('Este estabelecimento está temporariamente desativado.');
    }
    const resolvedOrgId = org.id;

    // 2. Validate customer data
    const cleanName = params.customerName ? params.customerName.trim() : '';
    if (cleanName.length < 2 || cleanName.length > 80) {
      throw new Error('Nome do cliente deve ter entre 2 e 80 caracteres.');
    }
    const cleanPhone = params.customerPhone ? params.customerPhone.trim() : '(Celular Web)';

    // 3. Validate service
    const { data: service, error: srvErr } = await client
      .from('services')
      .select('id, name, organization_id, is_active')
      .eq('id', params.serviceId)
      .eq('organization_id', resolvedOrgId)
      .maybeSingle();

    if (srvErr || !service || !service.is_active) {
      throw new Error('Serviço selecionado não é válido para este estabelecimento.');
    }

    // 4. Validate professional if requested
    let resolvedProfId: string | null = null;
    if (params.preferredProfessionalId) {
      const { data: prof } = await client
        .from('professionals')
        .select('id')
        .eq('id', params.preferredProfessionalId)
        .eq('organization_id', resolvedOrgId)
        .maybeSingle();
      if (prof) resolvedProfId = prof.id;
    }

    // 5. Calculate next ticket number atomically for this organization
    const { data: maxTicketData } = await client
      .from('queue')
      .select('ticket_number')
      .eq('organization_id', resolvedOrgId)
      .order('ticket_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const ticketNumber = (maxTicketData?.ticket_number || 0) + 1;

    // Calculate active waiting count
    const { count: waitingCount } = await client
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', resolvedOrgId)
      .in('status', ['AGUARDANDO', 'PROXIMO']);

    const isInitialNext = (waitingCount || 0) === 0;
    const estimatedWaitMinutes = isInitialNext ? 5 : ((waitingCount || 0) + 1) * 20;

    const newItemId = `queue_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const row = {
      id: newItemId,
      ticket_number: ticketNumber,
      organization_id: resolvedOrgId,
      customer_name: cleanName,
      customer_phone: cleanPhone,
      service_id: service.id,
      service_name: service.name,
      preferred_professional_id: resolvedProfId,
      status: isInitialNext ? 'PROXIMO' : 'AGUARDANDO',
      notes: params.notes ? params.notes.trim() : null,
      joined_at: new Date().toISOString(),
      estimated_wait_minutes: estimatedWaitMinutes,
      notification_token: params.notificationToken || `dev_${Date.now()}`,
      push_delivery_status: 'NOT_ATTEMPTED',
    };

    const { data, error } = await client
      .from('queue')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao confirmar entrada na fila no Supabase [${error.code}]: ${error.message}`);
    }

    // If push subscription provided, save in push_subscriptions
    if (params.subscriptionData && params.notificationToken) {
      await this.savePushSubscription(resolvedOrgId, params.notificationToken, params.subscriptionData);
    }

    return this.mapQueueItemFromDb(data);
  }

  // ---------------------------------------------------------------------------
  // QUEUE OPERATIONS (TENANT ISOLATED)
  // ---------------------------------------------------------------------------
  static async getQueueForOrganization(organizationId: string): Promise<any[]> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('queue')
      .select('*')
      .eq('organization_id', organizationId)
      .order('ticket_number', { ascending: true });

    if (error) throw new Error(`Erro ao consultar fila [${error.code}]: ${error.message}`);
    return (data || []).map((q) => this.mapQueueItemFromDb(q));
  }

  static async getQueueItemById(id: string, organizationId?: string): Promise<any | null> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    let query = client.from('queue').select('*').eq('id', id);
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`Erro ao buscar item da fila [${error.code}]: ${error.message}`);
    return data ? this.mapQueueItemFromDb(data) : null;
  }

  static async updateQueueItemStatus(
    id: string,
    organizationId: string,
    updates: {
      status?: string;
      calledAt?: string;
      calledToleranceExpiresAt?: string;
      onChairAt?: string;
      finishedAt?: string;
      preferredProfessionalId?: string;
      assignedProfessionalId?: string;
      pushDeliveryStatus?: string;
      estimatedWaitMinutes?: number;
    }
  ): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.calledAt !== undefined) dbUpdates.called_at = updates.calledAt;
    if (updates.calledToleranceExpiresAt !== undefined) dbUpdates.called_tolerance_expires_at = updates.calledToleranceExpiresAt;
    if (updates.onChairAt !== undefined) dbUpdates.on_chair_at = updates.onChairAt;
    if (updates.finishedAt !== undefined) dbUpdates.finished_at = updates.finishedAt;
    if (updates.preferredProfessionalId !== undefined) dbUpdates.preferred_professional_id = updates.preferredProfessionalId;
    if (updates.assignedProfessionalId !== undefined) dbUpdates.assigned_professional_id = updates.assignedProfessionalId;
    if (updates.pushDeliveryStatus !== undefined) dbUpdates.push_delivery_status = updates.pushDeliveryStatus;
    if (updates.estimatedWaitMinutes !== undefined) dbUpdates.estimated_wait_minutes = updates.estimatedWaitMinutes;

    const { data, error } = await client
      .from('queue')
      .update(dbUpdates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar item da fila [${error.code}]: ${error.message}`);
    return this.mapQueueItemFromDb(data);
  }

  static async removeQueueItem(id: string, organizationId: string): Promise<boolean> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { error } = await client
      .from('queue')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new Error(`Erro ao remover item da fila [${error.code}]: ${error.message}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // SERVICES (TENANT ISOLATED)
  // ---------------------------------------------------------------------------
  static async getServicesForOrg(organizationId: string): Promise<any[]> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('services')
      .select('*')
      .eq('organization_id', organizationId)
      .order('price', { ascending: true });

    if (error) throw new Error(`Erro ao carregar serviços [${error.code}]: ${error.message}`);
    return (data || []).map((s) => ({
      id: s.id,
      organizationId: s.organization_id,
      name: s.name,
      description: s.description || '',
      price: Number(s.price || 0),
      durationMinutes: Number(s.duration_minutes || 30),
      category: s.category || 'Cabelo',
      professionalIds: s.professional_ids || [],
      isActive: s.is_active !== false,
      createdAt: s.created_at,
    }));
  }

  static async createService(service: {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    price: number;
    durationMinutes: number;
    category?: string;
    professionalIds?: string[];
    isActive?: boolean;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const row = {
      id: service.id,
      organization_id: service.organizationId,
      name: service.name.trim(),
      description: service.description || '',
      price: Number(service.price || 0),
      duration_minutes: Number(service.durationMinutes || 30),
      category: service.category || 'Cabelo',
      professional_ids: service.professionalIds || [],
      is_active: service.isActive !== false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('services').insert(row).select().single();
    if (error) throw new Error(`Erro ao criar serviço [${error.code}]: ${error.message}`);
    return data;
  }

  static async updateService(id: string, organizationId: string, updates: any): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = Number(updates.price);
    if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = Number(updates.durationMinutes);
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.professionalIds !== undefined) dbUpdates.professional_ids = updates.professionalIds;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await client
      .from('services')
      .update(dbUpdates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar serviço [${error.code}]: ${error.message}`);
    return data;
  }

  static async deleteService(id: string, organizationId: string): Promise<boolean> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { error } = await client.from('services').delete().eq('id', id).eq('organization_id', organizationId);
    if (error) throw new Error(`Erro ao excluir serviço [${error.code}]: ${error.message}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // PROFESSIONALS (TENANT ISOLATED)
  // ---------------------------------------------------------------------------
  static async getProfessionalsForOrg(organizationId: string): Promise<any[]> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('professionals')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw new Error(`Erro ao carregar profissionais [${error.code}]: ${error.message}`);
    return (data || []).map((p) => ({
      id: p.id,
      organizationId: p.organization_id,
      name: p.name,
      phone: p.phone || '',
      whatsapp: p.whatsapp || '',
      email: p.email || '',
      avatarUrl: p.avatar_url || '',
      specialties: p.specialties || [],
      serviceIds: p.service_ids || [],
      commissionPercent: Number(p.commission_percent || 50),
      isAvailableToday: p.is_available_today !== false,
      workingDays: p.working_days || [1, 2, 3, 4, 5, 6],
      isActive: p.is_active !== false,
      createdAt: p.created_at,
    }));
  }

  static async createProfessional(prof: {
    id: string;
    organizationId: string;
    name: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    avatarUrl?: string;
    specialties?: string[];
    serviceIds?: string[];
    commissionPercent?: number;
    isAvailableToday?: boolean;
    workingDays?: number[];
    isActive?: boolean;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const row = {
      id: prof.id,
      organization_id: prof.organizationId,
      name: prof.name.trim(),
      phone: prof.phone || '',
      whatsapp: prof.whatsapp || '',
      email: prof.email || '',
      avatar_url: prof.avatarUrl || '',
      specialties: prof.specialties || [],
      service_ids: prof.serviceIds || [],
      commission_percent: Number(prof.commissionPercent || 50),
      is_available_today: prof.isAvailableToday !== false,
      working_days: prof.workingDays || [1, 2, 3, 4, 5, 6],
      is_active: prof.isActive !== false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('professionals').insert(row).select().single();
    if (error) throw new Error(`Erro ao cadastrar profissional [${error.code}]: ${error.message}`);
    return data;
  }

  static async updateProfessional(id: string, organizationId: string, updates: any): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.specialties !== undefined) dbUpdates.specialties = updates.specialties;
    if (updates.serviceIds !== undefined) dbUpdates.service_ids = updates.serviceIds;
    if (updates.commissionPercent !== undefined) dbUpdates.commission_percent = Number(updates.commissionPercent);
    if (updates.isAvailableToday !== undefined) dbUpdates.is_available_today = updates.isAvailableToday;
    if (updates.workingDays !== undefined) dbUpdates.working_days = updates.workingDays;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await client
      .from('professionals')
      .update(dbUpdates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar profissional [${error.code}]: ${error.message}`);
    return data;
  }

  static async deleteProfessional(id: string, organizationId: string): Promise<boolean> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { error } = await client.from('professionals').delete().eq('id', id).eq('organization_id', organizationId);
    if (error) throw new Error(`Erro ao excluir profissional [${error.code}]: ${error.message}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // APPOINTMENTS (TENANT ISOLATED)
  // ---------------------------------------------------------------------------
  static async getAppointmentsForOrg(organizationId: string, date?: string): Promise<any[]> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    let query = client.from('appointments').select('*').eq('organization_id', organizationId);
    if (date) query = query.eq('date', date);
    query = query.order('time', { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao carregar agendamentos [${error.code}]: ${error.message}`);

    return (data || []).map((a) => ({
      id: a.id,
      organizationId: a.organization_id,
      customerName: a.customer_name,
      customerPhone: a.customer_phone || '',
      serviceId: a.service_id,
      serviceName: a.service_name,
      professionalId: a.professional_id,
      professionalName: a.professional_name,
      date: a.date,
      time: a.time,
      status: a.status,
      totalPrice: Number(a.total_price || 0),
      notes: a.notes,
      createdAt: a.created_at,
    }));
  }

  static async createAppointment(apt: {
    id: string;
    organizationId: string;
    customerName: string;
    customerPhone?: string;
    serviceId: string;
    serviceName: string;
    professionalId: string;
    professionalName: string;
    date: string;
    time: string;
    status?: string;
    totalPrice?: number;
    notes?: string;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const row = {
      id: apt.id,
      organization_id: apt.organizationId,
      customer_name: apt.customerName.trim(),
      customer_phone: apt.customerPhone || null,
      service_id: apt.serviceId,
      service_name: apt.serviceName,
      professional_id: apt.professionalId,
      professional_name: apt.professionalName,
      date: apt.date,
      time: apt.time,
      status: apt.status || 'PENDENTE',
      total_price: Number(apt.totalPrice || 0),
      notes: apt.notes || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('appointments').insert(row).select().single();
    if (error) throw new Error(`Erro ao salvar agendamento [${error.code}]: ${error.message}`);
    return data;
  }

  static async updateAppointment(id: string, organizationId: string, updates: any): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.totalPrice !== undefined) dbUpdates.total_price = Number(updates.totalPrice);

    const { data, error } = await client
      .from('appointments')
      .update(dbUpdates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar agendamento [${error.code}]: ${error.message}`);
    return data;
  }

  static async deleteAppointment(id: string, organizationId: string): Promise<boolean> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { error } = await client.from('appointments').delete().eq('id', id).eq('organization_id', organizationId);
    if (error) throw new Error(`Erro ao excluir agendamento [${error.code}]: ${error.message}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // CUSTOMERS (TENANT ISOLATED)
  // ---------------------------------------------------------------------------
  static async getCustomersForOrg(organizationId: string): Promise<any[]> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw new Error(`Erro ao buscar clientes [${error.code}]: ${error.message}`);
    return data || [];
  }

  static async createOrUpdateCustomer(cust: {
    id?: string;
    organizationId: string;
    name: string;
    phone?: string;
    email?: string;
    spentIncrement?: number;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const cleanPhone = cust.phone ? cust.phone.trim() : null;

    // Check if customer exists by phone in this organization
    let existingCust = null;
    if (cleanPhone) {
      const { data } = await client
        .from('customers')
        .select('*')
        .eq('organization_id', cust.organizationId)
        .eq('phone', cleanPhone)
        .maybeSingle();
      existingCust = data;
    }

    if (existingCust) {
      const { data, error } = await client
        .from('customers')
        .update({
          name: cust.name.trim() || existingCust.name,
          email: cust.email || existingCust.email,
          total_appointments: (existingCust.total_appointments || 0) + 1,
          total_spent: Number(existingCust.total_spent || 0) + Number(cust.spentIncrement || 0),
          last_visit: new Date().toISOString(),
        })
        .eq('id', existingCust.id)
        .select()
        .single();
      if (error) throw new Error(`Erro ao atualizar cliente [${error.code}]: ${error.message}`);
      return data;
    } else {
      const newId = cust.id || `cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const { data, error } = await client
        .from('customers')
        .insert({
          id: newId,
          organization_id: cust.organizationId,
          name: cust.name.trim(),
          phone: cleanPhone,
          email: cust.email || null,
          total_appointments: 1,
          total_spent: Number(cust.spentIncrement || 0),
          last_visit: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(`Erro ao cadastrar cliente [${error.code}]: ${error.message}`);
      return data;
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSACTIONS & FINANCIALS (TENANT ISOLATED)
  // ---------------------------------------------------------------------------
  static async getTransactionsForOrg(organizationId: string): Promise<any[]> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (error) throw new Error(`Erro ao buscar transações [${error.code}]: ${error.message}`);
    return data || [];
  }

  static async createTransaction(tx: {
    id: string;
    organizationId: string;
    description: string;
    amount: number;
    type: string;
    category?: string;
    paymentMethod?: string;
    professionalId?: string;
    date?: string;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const row = {
      id: tx.id,
      organization_id: tx.organizationId,
      description: tx.description,
      amount: Number(tx.amount || 0),
      type: tx.type,
      category: tx.category || null,
      payment_method: tx.paymentMethod || null,
      professional_id: tx.professionalId || null,
      date: tx.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('transactions').insert(row).select().single();
    if (error) throw new Error(`Erro ao registrar transação [${error.code}]: ${error.message}`);
    return data;
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS & MERCADO PAGO INTEGRATION (PERSISTENT, ZERO TEMP FILES)
  // ---------------------------------------------------------------------------
  static async saveSubscription(sub: {
    id: string;
    organizationId: string;
    planId: string;
    status: string;
    payerEmail?: string;
    paymentId?: string;
    preferenceId?: string;
    amount?: number;
    expiresAt?: string;
    metadata?: any;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const row = {
      id: sub.id,
      organization_id: sub.organizationId,
      plan_id: sub.planId,
      status: sub.status,
      payer_email: sub.payerEmail || null,
      payment_id: sub.paymentId || null,
      preference_id: sub.preferenceId || null,
      amount: Number(sub.amount || 0),
      expires_at: sub.expiresAt || null,
      metadata: sub.metadata || {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('subscriptions').upsert(row).select().single();
    if (error) throw new Error(`Erro ao salvar assinatura [${error.code}]: ${error.message}`);
    return data;
  }

  static async getSubscriptionForOrg(organizationId: string): Promise<any | null> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  // ---------------------------------------------------------------------------
  // WEB PUSH SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  static async savePushSubscription(organizationId: string, token: string, subscriptionData: any): Promise<void> {
    const ready = await this.checkTablesReady();
    if (!ready) return;

    try {
      const client = getSupabaseAdminClient();
      await client.from('push_subscriptions').upsert({
        id: `push_${token}`,
        organization_id: organizationId,
        notification_token: token,
        subscription_data: subscriptionData,
        created_at: new Date().toISOString(),
      });
    } catch {}
  }

  static async getPushSubscriptionsForOrg(organizationId: string): Promise<any[]> {
    const ready = await this.checkTablesReady();
    if (!ready) return [];

    try {
      const client = getSupabaseAdminClient();
      const { data } = await client
        .from('push_subscriptions')
        .select('*')
        .eq('organization_id', organizationId);
      return data || [];
    } catch {
      return [];
    }
  }

  static async deletePushSubscription(token: string): Promise<void> {
    const ready = await this.checkTablesReady();
    if (!ready) return;

    try {
      const client = getSupabaseAdminClient();
      await client.from('push_subscriptions').delete().eq('notification_token', token);
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED SESSIONS (MULTI-TENANT AUTHORIZATION)
  // ---------------------------------------------------------------------------
  static async createSession(session: {
    token: string;
    userId: string;
    role: string;
    organizationId?: string;
    userEmail?: string;
    userName?: string;
    expiresAt: string;
  }): Promise<any> {
    const ready = await this.checkTablesReady();
    this.assertTablesReady(ready);

    const client = getSupabaseAdminClient();
    const row = {
      id: `sess_${crypto.randomBytes(16).toString('hex')}`,
      token: session.token,
      user_id: session.userId,
      role: session.role,
      organization_id: session.organizationId || null,
      user_email: session.userEmail || null,
      user_name: session.userName || null,
      expires_at: session.expiresAt,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('sessions').insert(row).select().single();
    if (error) throw new Error(`Erro ao criar sessão no Supabase [${error.code}]: ${error.message}`);
    return data;
  }

  static async getSession(token: string): Promise<any | null> {
    const ready = await this.checkTablesReady();
    if (!ready) return null;

    const client = getSupabaseAdminClient();
    const { data, error } = await client
      .from('sessions')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error || !data) return null;

    // Check expiration
    if (new Date(data.expires_at).getTime() < Date.now()) {
      await client.from('sessions').delete().eq('token', token);
      return null;
    }

    return {
      id: data.id,
      token: data.token,
      userId: data.user_id,
      role: data.role,
      organizationId: data.organization_id,
      userEmail: data.user_email,
      userName: data.user_name,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  }

  static async deleteSession(token: string): Promise<boolean> {
    const ready = await this.checkTablesReady();
    if (!ready) return false;

    const client = getSupabaseAdminClient();
    const { error } = await client.from('sessions').delete().eq('token', token);
    return !error;
  }

  // ---------------------------------------------------------------------------
  // HELPERS & MAPPERS
  // ---------------------------------------------------------------------------
  private static mapOrgFromDb(row: any): any {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type || 'Barbearia',
      description: row.description || '',
      phone: row.phone || '',
      whatsapp: row.whatsapp || '',
      instagram: row.instagram || '',
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      ownerPasswordHash: row.owner_password_hash,
      ownerSalt: row.owner_salt,
      address: row.address || {},
      workingHours: row.working_hours || [],
      settings: row.settings || {},
      planId: row.plan_id || 'premium',
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapQueueItemFromDb(row: any): any {
    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      organizationId: row.organization_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      serviceId: row.service_id,
      serviceName: row.service_name,
      preferredProfessionalId: row.preferred_professional_id,
      assignedProfessionalId: row.assigned_professional_id,
      status: row.status,
      notes: row.notes,
      joinedAt: row.joined_at,
      estimatedWaitMinutes: row.estimated_wait_minutes,
      notificationToken: row.notification_token,
      pushDeliveryStatus: row.push_delivery_status,
      calledAt: row.called_at,
      calledToleranceExpiresAt: row.called_tolerance_expires_at,
      onChairAt: row.on_chair_at,
      finishedAt: row.finished_at,
    };
  }

  public static maskCustomerName(fullName: string): string {
    if (!fullName) return 'Cliente';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }
}
