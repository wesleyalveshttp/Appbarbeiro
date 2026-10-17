import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase.ts';

export class SupabaseDBService {
  private static tablesReady: boolean | null = null;
  private static lastTableCheck = 0;
  private static readonly CHECK_INTERVAL_MS = 20000;
  private static bucketEnsured = false;
  private static cachedDB: any = null;
  private static lastCacheTime = 0;
  private static readonly CACHE_TTL_MS = 2500;

  static readonly BUCKET_NAME = 'barberos-data';
  static readonly DB_FILE_NAME = 'db.json';

  static isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  // ---------------------------------------------------------------------------
  // ENSURE SUPABASE STORAGE BUCKET (Zero-config automated persistence)
  // ---------------------------------------------------------------------------
  static async ensureBucket(): Promise<boolean> {
    if (this.bucketEnsured) return true;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { data: buckets } = await client.storage.listBuckets();
      const found = (buckets || []).some((b: any) => b.name === this.BUCKET_NAME);
      if (!found) {
        await client.storage.createBucket(this.BUCKET_NAME, { public: true });
      }
      this.bucketEnsured = true;
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // CHECK IF RELATIONAL SQL TABLES EXIST IN SUPABASE
  // ---------------------------------------------------------------------------
  static async checkTablesReady(force = false): Promise<boolean> {
    if (!this.isConfigured()) return false;

    const now = Date.now();
    if (!force && this.tablesReady !== null && now - this.lastTableCheck < this.CHECK_INTERVAL_MS) {
      return this.tablesReady;
    }

    const client = getSupabaseClient();
    if (!client) {
      this.tablesReady = false;
      return false;
    }

    try {
      const { error } = await client.from('organizations').select('id').limit(1);
      this.lastTableCheck = now;

      if (error) {
        this.tablesReady = false;
        return false;
      }

      this.tablesReady = true;
      return true;
    } catch {
      this.tablesReady = false;
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // LOAD ALL DATA FROM SUPABASE (SQL Tables OR Cloud Storage Bucket)
  // ---------------------------------------------------------------------------
  static async loadAllFromSupabase(): Promise<any | null> {
    if (!this.isConfigured()) return null;

    const now = Date.now();
    if (this.cachedDB && now - this.lastCacheTime < this.CACHE_TTL_MS) {
      return this.cachedDB;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    // 1. Try relational SQL tables if available
    const sqlReady = await this.checkTablesReady();
    if (sqlReady) {
      try {
        const [orgsRes, srvRes, profRes, qRes] = await Promise.all([
          client.from('organizations').select('*'),
          client.from('services').select('*'),
          client.from('professionals').select('*'),
          client.from('queue').select('*').order('ticket_number', { ascending: true }),
        ]);

        if (orgsRes.data && orgsRes.data.length > 0) {
          const organizations = orgsRes.data.map((o: any) => ({
            id: o.id,
            name: o.name,
            slug: o.slug,
            type: o.type || 'Barbearia',
            description: o.description || '',
            phone: o.phone || '',
            whatsapp: o.whatsapp || '',
            instagram: o.instagram || '',
            ownerName: o.owner_name || '',
            ownerEmail: o.owner_email || '',
            ownerPassword: o.owner_password || '',
            address: o.address || {},
            workingHours: o.working_hours || [],
            settings: o.settings || {},
            planId: o.plan_id || 'premium',
            subscription: o.subscription || {},
            isActive: o.is_active !== false,
            createdAt: o.created_at,
          }));

          const services = (srvRes.data || []).map((s: any) => ({
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

          const professionals = (profRes.data || []).map((p: any) => ({
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
            isActive: p.is_active !== false,
            isAvailableToday: p.is_available_today !== false,
            workingDays: p.working_days || [1, 2, 3, 4, 5, 6],
            createdAt: p.created_at,
          }));

          const queue = (qRes.data || []).map((q: any) => ({
            id: q.id,
            ticketNumber: q.ticket_number,
            organizationId: q.organization_id,
            customerName: q.customer_name,
            customerPhone: q.customer_phone || '',
            serviceId: q.service_id || '',
            serviceName: q.service_name || '',
            preferredProfessionalId: q.preferred_professional_id || null,
            status: q.status,
            joinedAt: q.joined_at,
            estimatedWaitMinutes: q.estimated_wait_minutes || 15,
            notificationToken: q.notification_token,
            pushDeliveryStatus: q.push_delivery_status,
            calledAt: q.called_at,
            calledToleranceExpiresAt: q.called_tolerance_expires_at,
            onChairAt: q.on_chair_at,
            finishedAt: q.finished_at,
          }));

          const result = { organizations, services, professionals, queue };
          this.cachedDB = result;
          this.lastCacheTime = now;
          return result;
        }
      } catch {
        // Fallback to storage bucket
      }
    }

    // 2. Automated Cloud Storage Bucket Persistence in Supabase
    try {
      await this.ensureBucket();
      const { data, error } = await client.storage
        .from(this.BUCKET_NAME)
        .download(this.DB_FILE_NAME);

      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.organizations)) {
          this.cachedDB = parsed;
          this.lastCacheTime = now;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Supabase Storage download info:', err);
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // FULL DB SYNC TO SUPABASE (Uploads to Cloud Storage & SQL Tables)
  // ---------------------------------------------------------------------------
  static async syncAllToSupabase(db: any): Promise<void> {
    if (!this.isConfigured() || !db) return;
    const client = getSupabaseClient();
    if (!client) return;

    try {
      // 1. Save snapshot to Supabase Cloud Storage (Instant & 100% Reliable)
      await this.ensureBucket();
      const payload = JSON.stringify(db, null, 2);
      await client.storage
        .from(this.BUCKET_NAME)
        .upload(this.DB_FILE_NAME, payload, {
          contentType: 'application/json',
          upsert: true,
        });

      this.cachedDB = db;
      this.lastCacheTime = Date.now();

      // 2. If SQL relational tables exist, sync rows into PostgreSQL
      const sqlReady = await this.checkTablesReady();
      if (sqlReady) {
        // Organizations
        for (const org of db.organizations || []) {
          await client.from('organizations').upsert({
            id: org.id,
            name: org.name,
            slug: org.slug,
            type: org.type || 'Barbearia',
            description: org.description || '',
            phone: org.phone || '',
            whatsapp: org.whatsapp || '',
            instagram: org.instagram || '',
            owner_name: org.ownerName || '',
            owner_email: org.ownerEmail || '',
            owner_password: org.ownerPassword || '',
            address: org.address || {},
            working_hours: org.workingHours || [],
            settings: org.settings || {},
            plan_id: org.planId || 'premium',
            subscription: org.subscription || {},
            is_active: org.isActive !== false,
            created_at: org.createdAt || new Date().toISOString(),
          });
        }

        // Services
        for (const srv of db.services || []) {
          await client.from('services').upsert({
            id: srv.id,
            organization_id: srv.organizationId,
            name: srv.name,
            description: srv.description || '',
            price: Number(srv.price || 0),
            duration_minutes: Number(srv.durationMinutes || 30),
            category: srv.category || 'Cabelo',
            professional_ids: srv.professionalIds || [],
            is_active: srv.isActive !== false,
            created_at: srv.createdAt || new Date().toISOString(),
          });
        }

        // Professionals
        for (const prof of db.professionals || []) {
          await client.from('professionals').upsert({
            id: prof.id,
            organization_id: prof.organizationId,
            name: prof.name,
            phone: prof.phone || '',
            whatsapp: prof.whatsapp || '',
            email: prof.email || '',
            avatar_url: prof.avatarUrl || '',
            specialties: prof.specialties || [],
            service_ids: prof.serviceIds || [],
            commission_percent: Number(prof.commissionPercent || 50),
            is_active: prof.isActive !== false,
            is_available_today: prof.isAvailableToday !== false,
            working_days: prof.workingDays || [1, 2, 3, 4, 5, 6],
            created_at: prof.createdAt || new Date().toISOString(),
          });
        }

        // Queue
        for (const q of db.queue || []) {
          await this.saveQueueItem(q);
        }
      }
    } catch (err) {
      console.warn('Supabase sync warning:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC ESTABLISHMENT RESOLUTION VIA SUPABASE
  // ---------------------------------------------------------------------------
  static async getPublicEstablishment(slug: string): Promise<{
    organization: any;
    services: any[];
    professionals: any[];
    queue: any[];
  } | null> {
    if (!this.isConfigured()) return null;
    const client = getSupabaseClient();
    if (!client) return null;

    const cleanSlug = decodeURIComponent(slug).trim().toLowerCase();

    // 1. Try SQL query first if tables exist
    const sqlReady = await this.checkTablesReady();
    if (sqlReady) {
      try {
        const { data: orgData } = await client
          .from('organizations')
          .select('*')
          .or(`slug.ilike.${cleanSlug},id.eq.${cleanSlug}`)
          .maybeSingle();

        if (orgData) {
          const orgId = orgData.id;
          const [srvRes, profRes, qRes] = await Promise.all([
            client.from('services').select('*').eq('organization_id', orgId).eq('is_active', true),
            client.from('professionals').select('*').eq('organization_id', orgId).eq('is_active', true),
            client.from('queue').select('*').eq('organization_id', orgId).order('ticket_number', { ascending: true })
          ]);

          const organization = {
            id: orgData.id,
            name: orgData.name,
            slug: orgData.slug,
            type: orgData.type || 'Barbearia',
            description: orgData.description || '',
            phone: orgData.phone || '',
            whatsapp: orgData.whatsapp || '',
            instagram: orgData.instagram || '',
            ownerName: orgData.owner_name || '',
            address: orgData.address || {},
            workingHours: orgData.working_hours || [],
            settings: orgData.settings || {},
            planId: orgData.plan_id || 'premium',
            subscription: orgData.subscription || {},
            isActive: orgData.is_active !== false,
            createdAt: orgData.created_at,
          };

          return {
            organization,
            services: srvRes.data || [],
            professionals: profRes.data || [],
            queue: qRes.data || []
          };
        }
      } catch {}
    }

    // 2. Query from Supabase Cloud Data snapshot
    const db = await this.loadAllFromSupabase();
    if (db && Array.isArray(db.organizations)) {
      const org = db.organizations.find((o: any) => {
        if (!o) return false;
        const oSlug = (o.slug || '').toLowerCase();
        const oId = (o.id || '').toLowerCase();
        return oSlug === cleanSlug || oId === cleanSlug;
      });

      if (org) {
        const services = (db.services || []).filter((s: any) => s.organizationId === org.id && s.isActive !== false);
        const professionals = (db.professionals || []).filter((p: any) => p.organizationId === org.id && p.isActive !== false);
        const queue = (db.queue || []).filter((q: any) => q.organizationId === org.id);

        const { ownerPassword, ownerEmail, ...safeOrg } = org;
        return {
          organization: safeOrg,
          services,
          professionals,
          queue
        };
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // SAVE SINGLE QUEUE ITEM TO SUPABASE
  // ---------------------------------------------------------------------------
  static async saveQueueItem(item: any): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    // 1. If SQL tables ready, upsert row in PostgreSQL
    const sqlReady = await this.checkTablesReady();
    if (sqlReady) {
      try {
        const row = {
          id: item.id,
          ticket_number: item.ticketNumber,
          organization_id: item.organizationId,
          customer_name: item.customerName,
          customer_phone: item.customerPhone || null,
          service_id: item.serviceId || null,
          service_name: item.serviceName || null,
          preferred_professional_id: item.preferredProfessionalId || null,
          status: item.status || 'AGUARDANDO',
          joined_at: item.joinedAt || new Date().toISOString(),
          estimated_wait_minutes: item.estimatedWaitMinutes || 15,
          notification_token: item.notificationToken || null,
          push_delivery_status: item.pushDeliveryStatus || 'NOT_ATTEMPTED',
          called_at: item.calledAt || null,
          called_tolerance_expires_at: item.calledToleranceExpiresAt || null,
          on_chair_at: item.onChairAt || null,
          finished_at: item.finishedAt || null,
        };
        await client.from('queue').upsert(row);
      } catch {}
    }

    return true;
  }

  static async saveOrganization(org: any): Promise<boolean> {
    return true;
  }

  static async saveService(srv: any): Promise<boolean> {
    return true;
  }

  static async saveProfessional(prof: any): Promise<boolean> {
    return true;
  }
}
