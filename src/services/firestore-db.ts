import crypto from 'crypto';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { firestore, CloudDBService } from './cloud-db.ts';

function cleanId(id: string): string {
  return String(id || '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 128);
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

function hashPasswordLocal(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export class FirestoreDBService {
  static isConfigured(): boolean {
    return CloudDBService.isConfigured();
  }

  static async checkReady(): Promise<boolean> {
    try {
      await getDocs(query(collection(firestore, 'organizations'), limit(1)));
      return true;
    } catch (err: any) {
      console.error('[FirestoreDBService.checkReady error]:', err?.message || err);
      return false;
    }
  }

  private static normalizeSlug(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private static maskCustomerName(name: string): string {
    if (!name) return 'Cliente';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  }

  private static mapOrgFromDb(row: any): any {
    if (!row) return null;
    const settings = row.settings || {};
    const defaultSubscription = {
      status: row.isActive === false ? 'PENDENTE' : 'ATIVA',
      planName: 'Plano Pro Barbearia (R$ 79,90/mês)',
      priceMonthly: 79.9,
      trialDaysRemaining: 0,
      nextBillingDate: '',
      isPaid: row.isActive !== false,
      invoices: [],
    };
    const subscription = row.subscription || settings.subscription || defaultSubscription;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type || 'Barbearia',
      description: row.description || '',
      phone: row.phone || '',
      whatsapp: row.whatsapp || '',
      instagram: row.instagram || '',
      ownerName: row.ownerName || row.owner_name || '',
      ownerEmail: row.ownerEmail || row.owner_email || '',
      ownerPassword: row.ownerPassword,
      ownerPasswordHash: row.ownerPasswordHash || row.owner_password_hash,
      ownerSalt: row.ownerSalt || row.owner_salt,
      address: row.address || {},
      workingHours: row.workingHours || row.working_hours || [],
      settings,
      planId: row.planId || row.plan_id || 'premium',
      subscription,
      isActive: row.isActive !== false && row.is_active !== false,
      createdAt: row.createdAt || row.created_at || new Date().toISOString(),
      updatedAt: row.updatedAt || row.updated_at || new Date().toISOString(),
    };
  }

  private static mapQueueItemFromDb(row: any): any {
    const rawNotes = String(row.notes || '');
    const respMatch = rawNotes.match(/\[RESP:(A_CAMINHO|PEDIU_TOLERANCIA|NAO_PODE)(?:@([^\]]+))?\]/);
    const derivedResponse =
      row.clientResponse ||
      row.client_response ||
      (respMatch ? respMatch[1] : undefined) ||
      (row.status === 'A_CAMINHO'
        ? 'A_CAMINHO'
        : row.status === 'PEDIU_TOLERANCIA'
        ? 'PEDIU_TOLERANCIA'
        : undefined);
    const derivedResponseTime =
      row.clientResponseTime ||
      row.client_response_time ||
      (respMatch && respMatch[2] ? respMatch[2] : undefined);
    const displayNotes = rawNotes.replace(/\s*\[RESP:[^\]]+\]/g, '').trim() || undefined;

    return {
      id: row.id,
      ticketNumber: Number(row.ticketNumber ?? row.ticket_number ?? 0),
      organizationId: row.organizationId || row.organization_id,
      customerName: row.customerName || row.customer_name || 'Cliente',
      customerPhone: row.customerPhone || row.customer_phone || '',
      serviceId: row.serviceId || row.service_id,
      serviceName: row.serviceName || row.service_name,
      preferredProfessionalId: row.preferredProfessionalId ?? row.preferred_professional_id ?? null,
      assignedProfessionalId: row.assignedProfessionalId ?? row.assigned_professional_id ?? null,
      status: row.status || 'AGUARDANDO',
      notes: displayNotes,
      joinedAt: row.joinedAt || row.joined_at || new Date().toISOString(),
      estimatedWaitMinutes: Number(row.estimatedWaitMinutes ?? row.estimated_wait_minutes ?? 15),
      notificationToken: row.notificationToken || row.notification_token,
      pushDeliveryStatus: row.pushDeliveryStatus || row.push_delivery_status,
      calledAt: row.calledAt || row.called_at,
      calledToleranceExpiresAt: row.calledToleranceExpiresAt || row.called_tolerance_expires_at,
      onChairAt: row.onChairAt || row.on_chair_at,
      finishedAt: row.finishedAt || row.finished_at,
      notified40Min: row.notified40Min,
      notified40MinAt: row.notified40MinAt,
      clientResponse: derivedResponse,
      clientResponseTime: derivedResponseTime,
      toleranceExtraMinutes: row.toleranceExtraMinutes,
    };
  }

  static async ensureDefaultSeed(): Promise<void> {
    try {
      const existing = await this.getOrganizationBySlug('barbearia');
      if (!existing) {
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
    } catch (err) {
      console.warn('[FirestoreDBService] ensureDefaultSeed warning:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATIONS
  // ---------------------------------------------------------------------------
  static async getOrganizationById(id: string): Promise<any | null> {
    if (!id) return null;
    const snap = await getDoc(doc(firestore, 'organizations', cleanId(id)));
    if (snap.exists()) {
      return this.mapOrgFromDb({ id: snap.id, ...snap.data() });
    }
    const all = await getDocs(collection(firestore, 'organizations'));
    for (const d of all.docs) {
      const data = d.data();
      if (d.id === id || data.id === id) {
        return this.mapOrgFromDb({ id: d.id, ...data });
      }
    }
    return null;
  }

  static async getOrganizationBySlug(slug: string): Promise<any | null> {
    if (!slug) return null;
    const cleanSlug = decodeURIComponent(slug).trim().toLowerCase();
    const normSlug = this.normalizeSlug(cleanSlug);

    const q = query(collection(firestore, 'organizations'), where('slug', '==', cleanSlug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return this.mapOrgFromDb({ id: d.id, ...d.data() });
    }

    const all = await getDocs(collection(firestore, 'organizations'));
    for (const d of all.docs) {
      const data = d.data();
      const oSlug = String(data.slug || '').trim().toLowerCase();
      const oId = String(data.id || d.id).trim().toLowerCase();
      if (oSlug === cleanSlug || this.normalizeSlug(oSlug) === normSlug || oId === cleanSlug) {
        return this.mapOrgFromDb({ id: d.id, ...data });
      }
    }
    return null;
  }

  static async getOrganizationByLogin(term: string): Promise<any | null> {
    const clean = term.trim().toLowerCase();
    const cleanPhone = clean.replace(/\D/g, '');
    const all = await getDocs(collection(firestore, 'organizations'));

    for (const d of all.docs) {
      const data = d.data();
      const email = String(data.ownerEmail || data.owner_email || '').trim().toLowerCase();
      const oSlug = String(data.slug || '').trim().toLowerCase();
      const oId = String(data.id || d.id).trim().toLowerCase();
      if (email === clean || oSlug === clean || oId === clean) {
        return this.mapOrgFromDb({ id: d.id, ...data });
      }
    }

    if (cleanPhone && cleanPhone.length >= 8) {
      for (const d of all.docs) {
        const data = d.data();
        const phone = String(data.phone || '').replace(/\D/g, '');
        const whatsapp = String(data.whatsapp || '').replace(/\D/g, '');
        if ((phone && phone.includes(cleanPhone)) || (whatsapp && whatsapp.includes(cleanPhone))) {
          return this.mapOrgFromDb({ id: d.id, ...data });
        }
      }
    }

    return null;
  }

  static async getAllOrganizations(): Promise<any[]> {
    const snap = await getDocs(collection(firestore, 'organizations'));
    const orgs = snap.docs.map((d) => this.mapOrgFromDb({ id: d.id, ...d.data() }));
    orgs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return orgs;
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
    const existing = await this.getOrganizationBySlug(org.slug);
    if (existing) {
      throw new Error(`O identificador "${org.slug}" já está em uso por outro estabelecimento.`);
    }

    let ownerPasswordHash: string | undefined;
    let ownerSalt: string | undefined;
    if (org.ownerPassword) {
      const h = hashPasswordLocal(org.ownerPassword);
      ownerPasswordHash = h.hash;
      ownerSalt = h.salt;
    }

    const nowIso = new Date().toISOString();
    const docData = stripUndefined({
      id: org.id,
      name: org.name.trim(),
      slug: org.slug.trim().toLowerCase(),
      type: org.type || 'Barbearia',
      description: org.description || '',
      phone: org.phone || '',
      whatsapp: org.whatsapp || '',
      instagram: org.instagram || '',
      ownerName: org.ownerName.trim(),
      ownerEmail: org.ownerEmail.trim().toLowerCase(),
      ownerPasswordHash,
      ownerSalt,
      address: org.address || {},
      workingHours: org.workingHours || [],
      settings: org.settings || {},
      planId: org.planId || 'premium',
      subscription: org.subscription || org.settings?.subscription,
      isActive: org.isActive !== false,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await setDoc(doc(firestore, 'organizations', cleanId(org.id)), docData);
    return this.mapOrgFromDb(docData);
  }

  static async updateOrganization(id: string, updates: Partial<any>): Promise<any> {
    const current = await this.getOrganizationById(id);

    if (!current) {
      if (updates.name) {
        let slug =
          (updates.slug || updates.name)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || `org-${id}`;
        const existingWithSlug = await this.getOrganizationBySlug(slug).catch(() => null);
        if (existingWithSlug && existingWithSlug.id !== id) {
          slug = `${slug}-${id.slice(0, 6)}`;
        }
        return this.createOrganization({
          id,
          name: updates.name,
          slug,
          type: updates.type || 'Barbearia',
          description: updates.description,
          phone: updates.phone,
          whatsapp: updates.whatsapp,
          instagram: updates.instagram,
          ownerName: updates.ownerName || 'Proprietário',
          ownerEmail: updates.ownerEmail || `admin-${id}@barberos.local`,
          ownerPassword: updates.ownerPassword,
          address: updates.address,
          workingHours: updates.workingHours,
          settings: updates.settings || {},
          planId: updates.planId || 'premium',
          isActive: updates.isActive !== false,
          subscription: updates.subscription,
        });
      }
      return { id, name: updates.name || 'Barbearia', slug: updates.slug || id, ...updates };
    }

    const patch: any = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.name !== undefined) patch.name = String(updates.name).trim();
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.whatsapp !== undefined) patch.whatsapp = updates.whatsapp;
    if (updates.instagram !== undefined) patch.instagram = updates.instagram;
    if (updates.ownerName !== undefined) patch.ownerName = updates.ownerName;
    if (updates.ownerEmail !== undefined) patch.ownerEmail = updates.ownerEmail;
    if (updates.address !== undefined) patch.address = updates.address;
    if (updates.workingHours !== undefined) patch.workingHours = updates.workingHours;
    if (updates.settings !== undefined) patch.settings = updates.settings;
    if (updates.planId !== undefined) patch.planId = updates.planId;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;

    if (updates.subscription !== undefined) {
      const existingSettings = updates.settings || current.settings || {};
      const mergedSub = {
        ...(current.subscription || {}),
        ...(existingSettings.subscription || {}),
        ...updates.subscription,
      };
      existingSettings.subscription = mergedSub;
      patch.settings = existingSettings;
      patch.subscription = mergedSub;
    }

    if (updates.ownerPassword) {
      const h = hashPasswordLocal(updates.ownerPassword);
      patch.ownerPasswordHash = h.hash;
      patch.ownerSalt = h.salt;
      patch.ownerPassword = null;
    }

    const merged = stripUndefined({ ...current, ...patch, id: current.id });
    await setDoc(doc(firestore, 'organizations', cleanId(current.id)), merged, { merge: true });
    return this.mapOrgFromDb(merged);
  }

  static async updateSubscriptionForOrg(
    organizationId: string,
    subscription: {
      status: 'ATIVA' | 'PENDENTE' | 'AGUARDANDO_APROVACAO' | 'TESTE_GRATIS' | 'VENCIDA';
      isPaid?: boolean;
      planName?: string;
      priceMonthly?: number;
      paymentMethod?: string;
      lastPaymentDate?: string;
      nextBillingDate?: string;
      paymentProofSentAt?: string;
      paymentProofNote?: string;
      invoices?: any[];
    }
  ): Promise<any> {
    const org = await this.getOrganizationById(organizationId);
    if (!org) throw new Error('Organização não encontrada');

    const currentSettings = org.settings || {};
    const existingSub = currentSettings.subscription || org.subscription || {};
    const updatedSub = {
      ...existingSub,
      ...subscription,
      status: subscription.status,
      isPaid: subscription.isPaid !== undefined ? subscription.isPaid : subscription.status === 'ATIVA',
      updatedAt: new Date().toISOString(),
    };
    currentSettings.subscription = updatedSub;

    const updatedOrg = await this.updateOrganization(organizationId, {
      settings: currentSettings,
      subscription: updatedSub,
      isActive: subscription.status === 'ATIVA' ? true : org.isActive,
    });

    try {
      await this.saveSubscription({
        id: `sub_${organizationId}`,
        organizationId,
        planId: org.planId || 'pro_monthly',
        status: subscription.status,
        amount: subscription.priceMonthly || 79.9,
        expiresAt: subscription.nextBillingDate
          ? new Date(subscription.nextBillingDate).toISOString()
          : undefined,
        metadata: {
          approvedAt: subscription.status === 'ATIVA' ? new Date().toISOString() : undefined,
          invoices: updatedSub.invoices,
          paymentProofNote: subscription.paymentProofNote,
        },
      });
    } catch (subErr) {
      console.warn('[FirestoreDBService] Subscriptions sync warning:', subErr);
    }

    return updatedOrg;
  }

  static async deleteOrganization(id: string): Promise<boolean> {
    const collections = ['services', 'professionals', 'queue', 'appointments', 'customers', 'transactions', 'sessions'];
    for (const col of collections) {
      try {
        const snap = await getDocs(query(collection(firestore, col), where('organizationId', '==', id)));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch {}
    }

    for (const subcol of ['subscriptions', 'push_subscriptions']) {
      try {
        const snap = await getDocs(collection(firestore, 'organizations', cleanId(id), subcol));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch {}
    }

    await deleteDoc(doc(firestore, 'organizations', cleanId(id)));
    return true;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC ESTABLISHMENT RESOLUTION
  // ---------------------------------------------------------------------------
  static async getPublicEstablishment(slug: string): Promise<{
    organization: any;
    services: any[];
    professionals: any[];
    queue: any[];
  } | null> {
    const cleanSlug = decodeURIComponent(slug).trim().toLowerCase();
    let org = await this.getOrganizationBySlug(cleanSlug);

    if (!org && (cleanSlug === 'barbearia' || cleanSlug === 'minha-barbearia' || cleanSlug === 'org-prime')) {
      await this.ensureDefaultSeed();
      org = await this.getOrganizationBySlug(cleanSlug);
    }

    if (!org) return null;

    if (org.isActive === false) {
      return {
        organization: org,
        isInactive: true,
        services: [],
        professionals: [],
        queue: [],
      } as any;
    }

    const orgId = org.id;
    const [allServices, allProfs, allQueue] = await Promise.all([
      this.getServicesForOrg(orgId),
      this.getProfessionalsForOrg(orgId),
      this.getQueueForOrganization(orgId),
    ]);

    const services = allServices.filter((s) => s.isActive !== false);
    const professionals = allProfs
      .filter((p) => p.isActive !== false)
      .map(({ commissionPercent, ...rest }) => rest);

    const activeStatuses = new Set([
      'AGUARDANDO',
      'PROXIMO',
      'CHAMADO',
      'EM_ATENDIMENTO',
      'NA CADEIRA',
      'A_CAMINHO',
      'PEDIU_TOLERANCIA',
    ]);

    const queue = allQueue
      .filter((q) => activeStatuses.has(q.status))
      .map((q) => ({
        id: q.id,
        ticketNumber: q.ticketNumber,
        organizationId: q.organizationId,
        customerName: this.maskCustomerName(q.customerName),
        serviceId: q.serviceId,
        serviceName: q.serviceName,
        preferredProfessionalId: q.preferredProfessionalId || null,
        status: q.status,
        joinedAt: q.joinedAt,
        estimatedWaitMinutes: q.estimatedWaitMinutes || 15,
        calledAt: q.calledAt,
        calledToleranceExpiresAt: q.calledToleranceExpiresAt,
        onChairAt: q.onChairAt,
        finishedAt: q.finishedAt,
        clientResponse: q.clientResponse,
        clientResponseTime: q.clientResponseTime,
      }));

    const { ownerPassword, ownerPasswordHash, ownerSalt, ownerEmail, invoices, ...safeOrg } = org;
    return {
      organization: safeOrg,
      services,
      professionals,
      queue,
    };
  }

  // ---------------------------------------------------------------------------
  // QUEUE
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
    const org =
      (await this.getOrganizationById(params.organizationId)) ||
      (await this.getOrganizationBySlug(params.organizationId));
    if (!org) {
      throw new Error('Estabelecimento não encontrado para ingressar na fila.');
    }
    if (org.isActive === false) {
      throw new Error('Este estabelecimento está temporariamente desativado.');
    }

    const cleanName = params.customerName ? params.customerName.trim() : '';
    if (cleanName.length < 2 || cleanName.length > 80) {
      throw new Error('Nome do cliente deve ter entre 2 e 80 caracteres.');
    }
    const cleanPhone = params.customerPhone ? params.customerPhone.trim() : '(Celular Web)';

    const services = await this.getServicesForOrg(org.id);
    const service = services.find((s) => s.id === params.serviceId && s.isActive !== false);
    if (!service) {
      throw new Error('Serviço selecionado não é válido para este estabelecimento.');
    }

    let resolvedProfId: string | null = null;
    if (params.preferredProfessionalId) {
      const profs = await this.getProfessionalsForOrg(org.id);
      const prof = profs.find((p) => p.id === params.preferredProfessionalId);
      if (prof) resolvedProfId = prof.id;
    }

    const currentQueue = await this.getQueueForOrganization(org.id);
    const maxTicket = currentQueue.reduce((max, item) => Math.max(max, Number(item.ticketNumber || 0)), 0);
    const ticketNumber = maxTicket + 1;

    const waitingCount = currentQueue.filter(
      (q) => q.status === 'AGUARDANDO' || q.status === 'PROXIMO'
    ).length;

    const isInitialNext = waitingCount === 0;
    const estimatedWaitMinutes = isInitialNext ? 5 : (waitingCount + 1) * 20;

    const newItemId = `queue_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const item = stripUndefined({
      id: newItemId,
      ticketNumber,
      organizationId: org.id,
      customerName: cleanName,
      customerPhone: cleanPhone,
      serviceId: service.id,
      serviceName: service.name,
      preferredProfessionalId: resolvedProfId,
      status: isInitialNext ? 'PROXIMO' : 'AGUARDANDO',
      notes: params.notes ? params.notes.trim() : null,
      joinedAt: new Date().toISOString(),
      estimatedWaitMinutes,
      notificationToken: params.notificationToken || `dev_${Date.now()}`,
      pushDeliveryStatus: 'NOT_ATTEMPTED',
    });

    await setDoc(doc(firestore, 'queue', cleanId(newItemId)), item);

    if (params.subscriptionData && params.notificationToken) {
      await this.savePushSubscription(org.id, params.notificationToken, params.subscriptionData);
    }

    return this.mapQueueItemFromDb(item);
  }

  static async getQueueForOrganization(organizationId: string): Promise<any[]> {
    const snap = await getDocs(
      query(collection(firestore, 'queue'), where('organizationId', '==', organizationId))
    );
    const list = snap.docs.map((d) => this.mapQueueItemFromDb({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.ticketNumber || 0) - (b.ticketNumber || 0));
    return list;
  }

  static async getQueueItemById(id: string, organizationId?: string): Promise<any | null> {
    if (!id) return null;
    const snap = await getDoc(doc(firestore, 'queue', cleanId(id)));
    if (!snap.exists()) return null;
    const mapped = this.mapQueueItemFromDb({ id: snap.id, ...snap.data() });
    if (organizationId && mapped.organizationId !== organizationId) return null;
    return mapped;
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
      notes?: string;
      ticketNumber?: number;
      clientResponse?: string;
      clientResponseTime?: string;
      toleranceExtraMinutes?: number;
      notified40Min?: boolean;
      notified40MinAt?: string;
    }
  ): Promise<any> {
    const ref = doc(firestore, 'queue', cleanId(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const rawCurrent = snap.data();
    if (rawCurrent.organizationId !== organizationId) return null;

    const patch: any = stripUndefined({ ...updates });
    if (updates.clientResponse !== undefined) {
      const baseNotes = updates.notes !== undefined ? updates.notes : rawCurrent.notes || '';
      const cleanedNotes = String(baseNotes || '')
        .replace(/\s*\[RESP:[^\]]+\]/g, '')
        .replace(/\s*\[Cliente já está indo[^\]]*\]/g, '')
        .trim();
      const timeTag = updates.clientResponseTime || new Date().toISOString();
      const humanLabel =
        updates.clientResponse === 'A_CAMINHO'
          ? '[Cliente já está indo]'
          : updates.clientResponse === 'PEDIU_TOLERANCIA'
          ? '[Pediu +3 min]'
          : '';
      patch.notes = `${cleanedNotes} ${humanLabel} [RESP:${updates.clientResponse}@${timeTag}]`.trim();
      patch.clientResponse = updates.clientResponse;
      patch.clientResponseTime = timeTag;
    }

    const merged = stripUndefined({ ...rawCurrent, ...patch, id: rawCurrent.id || snap.id });
    await setDoc(ref, merged, { merge: true });
    return this.mapQueueItemFromDb(merged);
  }

  static async removeQueueItem(id: string, organizationId: string): Promise<boolean> {
    const ref = doc(firestore, 'queue', cleanId(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) return true;
    if (snap.data().organizationId !== organizationId) {
      throw new Error('Acesso negado ao tentar remover item de outro estabelecimento.');
    }
    await deleteDoc(ref);
    return true;
  }

  // ---------------------------------------------------------------------------
  // SERVICES
  // ---------------------------------------------------------------------------
  static async getServicesForOrg(organizationId: string): Promise<any[]> {
    const snap = await getDocs(
      query(collection(firestore, 'services'), where('organizationId', '==', organizationId))
    );
    const list = snap.docs.map((d) => {
      const s = d.data();
      return {
        id: s.id || d.id,
        organizationId: s.organizationId,
        name: s.name,
        description: s.description || '',
        price: Number(s.price || 0),
        durationMinutes: Number(s.durationMinutes ?? s.duration_minutes ?? 30),
        category: s.category || 'Cabelo',
        professionalIds: s.professionalIds || s.professional_ids || [],
        isActive: s.isActive !== false && s.is_active !== false,
        createdAt: s.createdAt || s.created_at || new Date().toISOString(),
      };
    });
    list.sort((a, b) => a.price - b.price);
    return list;
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
    const row = stripUndefined({
      id: service.id,
      organizationId: service.organizationId,
      name: service.name.trim(),
      description: service.description || '',
      price: Number(service.price || 0),
      durationMinutes: Number(service.durationMinutes || 30),
      category: service.category || 'Cabelo',
      professionalIds: service.professionalIds || [],
      isActive: service.isActive !== false,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(firestore, 'services', cleanId(service.id)), row);
    return row;
  }

  static async updateService(id: string, organizationId: string, updates: any): Promise<any> {
    const ref = doc(firestore, 'services', cleanId(id));
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().organizationId !== organizationId) {
      throw new Error(`Serviço ${id} não encontrado para atualização`);
    }
    const merged = stripUndefined({
      ...snap.data(),
      ...updates,
      id: snap.data().id || id,
      organizationId,
      name: updates.name !== undefined ? String(updates.name).trim() : snap.data().name,
      price: updates.price !== undefined ? Number(updates.price) : snap.data().price,
      durationMinutes:
        updates.durationMinutes !== undefined
          ? Number(updates.durationMinutes)
          : snap.data().durationMinutes,
    });
    await setDoc(ref, merged, { merge: true });
    return merged;
  }

  static async deleteService(id: string, organizationId: string): Promise<boolean> {
    const ref = doc(firestore, 'services', cleanId(id));
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().organizationId === organizationId) {
      await deleteDoc(ref);
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // PROFESSIONALS
  // ---------------------------------------------------------------------------
  static async getProfessionalsForOrg(organizationId: string): Promise<any[]> {
    const snap = await getDocs(
      query(collection(firestore, 'professionals'), where('organizationId', '==', organizationId))
    );
    const list = snap.docs.map((d) => {
      const p = d.data();
      return {
        id: p.id || d.id,
        organizationId: p.organizationId,
        name: p.name,
        phone: p.phone || '',
        whatsapp: p.whatsapp || '',
        email: p.email || '',
        avatarUrl: p.avatarUrl || p.avatar_url || '',
        specialties: p.specialties || [],
        serviceIds: p.serviceIds || p.service_ids || [],
        commissionPercent: Number(p.commissionPercent ?? p.commission_percent ?? 50),
        isAvailableToday: p.isAvailableToday !== false && p.is_available_today !== false,
        workingDays: p.workingDays || p.working_days || [1, 2, 3, 4, 5, 6],
        isActive: p.isActive !== false && p.is_active !== false,
        createdAt: p.createdAt || p.created_at || new Date().toISOString(),
      };
    });
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return list;
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
    const row = stripUndefined({
      id: prof.id,
      organizationId: prof.organizationId,
      name: prof.name.trim(),
      phone: prof.phone || '',
      whatsapp: prof.whatsapp || '',
      email: prof.email || '',
      avatarUrl: prof.avatarUrl || '',
      specialties: prof.specialties || [],
      serviceIds: prof.serviceIds || [],
      commissionPercent: Number(prof.commissionPercent || 50),
      isAvailableToday: prof.isAvailableToday !== false,
      workingDays: prof.workingDays || [1, 2, 3, 4, 5, 6],
      isActive: prof.isActive !== false,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(firestore, 'professionals', cleanId(prof.id)), row);
    return row;
  }

  static async updateProfessional(id: string, organizationId: string, updates: any): Promise<any> {
    const ref = doc(firestore, 'professionals', cleanId(id));
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().organizationId !== organizationId) {
      throw new Error(`Profissional ${id} não encontrado para atualização`);
    }
    const merged = stripUndefined({
      ...snap.data(),
      ...updates,
      id: snap.data().id || id,
      organizationId,
      name: updates.name !== undefined ? String(updates.name).trim() : snap.data().name,
    });
    await setDoc(ref, merged, { merge: true });
    return merged;
  }

  static async deleteProfessional(id: string, organizationId: string): Promise<boolean> {
    const ref = doc(firestore, 'professionals', cleanId(id));
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().organizationId === organizationId) {
      await deleteDoc(ref);
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // APPOINTMENTS
  // ---------------------------------------------------------------------------
  static async getAppointmentsForOrg(organizationId: string, date?: string): Promise<any[]> {
    const snap = await getDocs(
      query(collection(firestore, 'appointments'), where('organizationId', '==', organizationId))
    );
    let list = snap.docs.map((d) => {
      const a = d.data();
      return {
        id: a.id || d.id,
        organizationId: a.organizationId,
        customerName: a.customerName || a.customer_name,
        customerPhone: a.customerPhone || a.customer_phone || '',
        serviceId: a.serviceId || a.service_id,
        serviceName: a.serviceName || a.service_name,
        professionalId: a.professionalId || a.professional_id,
        professionalName: a.professionalName || a.professional_name,
        date: a.date,
        time: a.time,
        status: a.status,
        totalPrice: Number(a.totalPrice ?? a.total_price ?? 0),
        notes: a.notes,
        reminderSent40Min: a.reminderSent40Min,
        reminderSent40MinAt: a.reminderSent40MinAt,
        createdAt: a.createdAt || a.created_at || new Date().toISOString(),
      };
    });
    if (date) {
      list = list.filter((a) => a.date === date);
    }
    list.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    return list;
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
    const row = stripUndefined({
      id: apt.id,
      organizationId: apt.organizationId,
      customerName: apt.customerName.trim(),
      customerPhone: apt.customerPhone || '',
      serviceId: apt.serviceId,
      serviceName: apt.serviceName,
      professionalId: apt.professionalId,
      professionalName: apt.professionalName,
      date: apt.date,
      time: apt.time,
      status: apt.status || 'PENDENTE',
      totalPrice: Number(apt.totalPrice || 0),
      notes: apt.notes || null,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(firestore, 'appointments', cleanId(apt.id)), row);
    return row;
  }

  static async updateAppointment(id: string, organizationId: string, updates: any): Promise<any> {
    const ref = doc(firestore, 'appointments', cleanId(id));
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().organizationId !== organizationId) {
      throw new Error(`Agendamento ${id} não encontrado para atualização`);
    }
    const merged = stripUndefined({
      ...snap.data(),
      ...updates,
      id: snap.data().id || id,
      organizationId,
    });
    await setDoc(ref, merged, { merge: true });
    return merged;
  }

  static async deleteAppointment(id: string, organizationId: string): Promise<boolean> {
    const ref = doc(firestore, 'appointments', cleanId(id));
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().organizationId === organizationId) {
      await deleteDoc(ref);
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // CUSTOMERS
  // ---------------------------------------------------------------------------
  static async getCustomersForOrg(organizationId: string): Promise<any[]> {
    const snap = await getDocs(
      query(collection(firestore, 'customers'), where('organizationId', '==', organizationId))
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
    return list;
  }

  static async createOrUpdateCustomer(cust: {
    id?: string;
    organizationId: string;
    name: string;
    phone?: string;
    email?: string;
    spentIncrement?: number;
  }): Promise<any> {
    const cleanPhone = cust.phone ? cust.phone.trim() : null;
    const existingList = await this.getCustomersForOrg(cust.organizationId);
    const existingCust: any = cleanPhone
      ? existingList.find((c: any) => c.phone === cleanPhone)
      : existingList.find((c: any) => cust.id && c.id === cust.id);

    if (existingCust) {
      const updated = stripUndefined({
        ...existingCust,
        name: cust.name.trim() || existingCust.name,
        email: cust.email || existingCust.email || null,
        totalAppointments: Number(existingCust.totalAppointments || 0) + 1,
        totalSpent: Number(existingCust.totalSpent || 0) + Number(cust.spentIncrement || 0),
        lastVisit: new Date().toISOString(),
      });
      await setDoc(doc(firestore, 'customers', cleanId(existingCust.id)), updated, { merge: true });
      return updated;
    } else {
      const newId = cust.id || `cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const row = stripUndefined({
        id: newId,
        organizationId: cust.organizationId,
        name: cust.name.trim(),
        phone: cleanPhone,
        email: cust.email || null,
        totalAppointments: 1,
        totalSpent: Number(cust.spentIncrement || 0),
        lastVisit: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(firestore, 'customers', cleanId(newId)), row);
      return row;
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSACTIONS
  // ---------------------------------------------------------------------------
  static async getTransactionsForOrg(organizationId: string): Promise<any[]> {
    const snap = await getDocs(
      query(collection(firestore, 'transactions'), where('organizationId', '==', organizationId))
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return list;
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
    const row = stripUndefined({
      id: tx.id,
      organizationId: tx.organizationId,
      description: tx.description,
      amount: Number(tx.amount || 0),
      type: tx.type,
      category: tx.category || null,
      paymentMethod: tx.paymentMethod || null,
      professionalId: tx.professionalId || null,
      date: tx.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(firestore, 'transactions', cleanId(tx.id)), row);
    return row;
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS (stored under organizations/{orgId}/subscriptions)
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
    const row = stripUndefined({
      id: sub.id,
      organizationId: sub.organizationId,
      planId: sub.planId,
      status: sub.status,
      payerEmail: sub.payerEmail || null,
      paymentId: sub.paymentId || null,
      preferenceId: sub.preferenceId || null,
      amount: Number(sub.amount || 0),
      expiresAt: sub.expiresAt || null,
      metadata: sub.metadata || {},
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    await setDoc(
      doc(firestore, 'organizations', cleanId(sub.organizationId), 'subscriptions', cleanId(sub.id)),
      row,
      { merge: true }
    );
    return row;
  }

  static async getSubscriptionForOrg(organizationId: string): Promise<any | null> {
    try {
      const snap = await getDocs(
        collection(firestore, 'organizations', cleanId(organizationId), 'subscriptions')
      );
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        return list[0];
      }
    } catch {}
    return null;
  }

  // ---------------------------------------------------------------------------
  // WEB PUSH SUBSCRIPTIONS (organizations/{orgId}/push_subscriptions + config/push_{tok})
  // ---------------------------------------------------------------------------
  static async savePushSubscription(organizationId: string, token: string, subscriptionData: any): Promise<void> {
    try {
      const docId = cleanId(`push_${token}`);
      const row = stripUndefined({
        id: docId,
        organization_id: organizationId,
        organizationId,
        notification_token: token,
        notificationToken: token,
        subscription_data: subscriptionData,
        subscriptionData,
        created_at: new Date().toISOString(),
      });
      await setDoc(
        doc(firestore, 'organizations', cleanId(organizationId), 'push_subscriptions', docId),
        row,
        { merge: true }
      );
      await setDoc(doc(firestore, 'config', docId), row, { merge: true });
    } catch {}
  }

  static async getPushSubscriptionsForOrg(organizationId: string): Promise<any[]> {
    try {
      const snap = await getDocs(
        collection(firestore, 'organizations', cleanId(organizationId), 'push_subscriptions')
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  }

  static async getPushSubscriptionByToken(token: string): Promise<any | null> {
    try {
      const docId = cleanId(`push_${token}`);
      const snap = await getDoc(doc(firestore, 'config', docId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch {
      return null;
    }
  }

  static async deletePushSubscription(token: string): Promise<void> {
    try {
      const docId = cleanId(`push_${token}`);
      const cfgSnap = await getDoc(doc(firestore, 'config', docId));
      if (cfgSnap.exists()) {
        const orgId = cfgSnap.data()?.organizationId || cfgSnap.data()?.organization_id;
        if (orgId) {
          await deleteDoc(
            doc(firestore, 'organizations', cleanId(orgId), 'push_subscriptions', docId)
          ).catch(() => {});
        }
        await deleteDoc(doc(firestore, 'config', docId)).catch(() => {});
      }
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // SESSIONS
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
    const row = stripUndefined({
      id: cleanId(session.token),
      token: session.token,
      userId: session.userId,
      role: session.role,
      organizationId: session.organizationId || null,
      userEmail: session.userEmail || null,
      userName: session.userName || null,
      expiresAt: session.expiresAt,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });
    await setDoc(doc(firestore, 'sessions', cleanId(session.token)), row);
    return row;
  }

  static async getSession(token: string): Promise<any | null> {
    if (!token) return null;
    const snap = await getDoc(doc(firestore, 'sessions', cleanId(token)));
    if (!snap.exists()) return null;
    const data = snap.data();
    const expiresAt = data.expiresAt || data.expires_at;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      await deleteDoc(snap.ref).catch(() => {});
      return null;
    }
    return {
      id: data.id || snap.id,
      token: data.token,
      userId: data.userId || data.user_id,
      role: data.role,
      organizationId: data.organizationId || data.organization_id,
      userEmail: data.userEmail || data.user_email,
      userName: data.userName || data.user_name,
      expiresAt,
      createdAt: data.createdAt || data.created_at,
    };
  }

  static async deleteSession(token: string): Promise<boolean> {
    if (!token) return false;
    try {
      await deleteDoc(doc(firestore, 'sessions', cleanId(token)));
      return true;
    } catch {
      return false;
    }
  }
}
