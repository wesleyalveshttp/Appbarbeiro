import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  Firestore
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// 1. ROBUST FIREBASE CONFIG RESOLUTION (Supports Vercel env, config file & fallback)
// ---------------------------------------------------------------------------
export function resolveFirebaseConfig(): any {
  // 1. Full JSON in Environment Variable
  if (process.env.FIREBASE_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.warn('Failed to parse process.env.FIREBASE_CONFIG:', e);
    }
  }

  // 2. Discrete Environment Variables
  const envApiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const envProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const envDatabaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID;

  if (envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      projectId: envProjectId,
      appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '1:439308416045:web:9e97d80e277b632d4af4a4',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      firestoreDatabaseId: envDatabaseId || 'ai-studio-barberosgestosaa-e7ca71ef-951e-4bef-9535-6db663a76ee9',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '439308416045'
    };
  }

  // 3. Local JSON file on disk
  const possiblePaths = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(process.cwd(), '..', 'firebase-applet-config.json'),
    '/app/applet/firebase-applet-config.json'
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch {}
  }

  // 4. Default provisioned project configuration
  return {
    projectId: 'gen-lang-client-0208879192',
    appId: '1:439308416045:web:9e97d80e277b632d4af4a4',
    apiKey: 'AIzaSyBFyh5Me55r-dFV9rKFqLOA8-buN8QPnX8',
    authDomain: 'gen-lang-client-0208879192.firebaseapp.com',
    firestoreDatabaseId: 'ai-studio-barberosgestosaa-e7ca71ef-951e-4bef-9535-6db663a76ee9',
    storageBucket: 'gen-lang-client-0208879192.firebasestorage.app',
    messagingSenderId: '439308416045'
  };
}

const firebaseConfig = resolveFirebaseConfig();
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const firestore: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// ---------------------------------------------------------------------------
// 2. CLOUD DATABASE SERVICE (Authoritative Firestore Persistence)
// ---------------------------------------------------------------------------
export class CloudDBService {
  private static cachedDB: any = null;
  private static lastCacheTime = 0;
  private static readonly CACHE_TTL_MS = 2500; // 2.5 seconds cache for high throughput

  static isConfigured(): boolean {
    return !!firestore;
  }

  static getDatabaseId(): string {
    return firebaseConfig?.firestoreDatabaseId || 'default';
  }

  static getProjectId(): string {
    return firebaseConfig?.projectId || '';
  }

  // Sanitize ID for Firestore document keys
  static cleanId(id: string): string {
    return String(id || '').replace(/[^a-zA-Z0-9_\-]/g, '_');
  }

  // Normalization helper for slug matching
  static normalizeSlug(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  // -------------------------------------------------------------------------
  // DIRECT PUBLIC ESTABLISHMENT QUERY (Authoritative for /fila/:slug etc.)
  // -------------------------------------------------------------------------
  static async getPublicEstablishment(slug: string): Promise<{
    organization: any;
    services: any[];
    professionals: any[];
    queue: any[];
  } | null> {
    if (!slug) return null;
    const cleanTerm = decodeURIComponent(slug).trim().toLowerCase();
    const normalizedTerm = this.normalizeSlug(cleanTerm);

    try {
      // 1. Query Firestore organizations collection
      const orgsCol = collection(firestore, 'organizations');
      let orgDoc: any = null;

      // Exact slug match in Firestore
      const slugQuery = query(orgsCol, where('slug', '==', cleanTerm));
      const slugSnap = await getDocs(slugQuery);

      if (!slugSnap.empty) {
        const d = slugSnap.docs[0];
        orgDoc = { id: d.id, ...d.data() };
      } else {
        // Fallback: check document by exact ID or scan
        const docById = await getDoc(doc(orgsCol, this.cleanId(cleanTerm)));
        if (docById.exists()) {
          orgDoc = { id: docById.id, ...docById.data() };
        } else {
          // Scan all organizations if normalized match needed
          const allOrgsSnap = await getDocs(orgsCol);
          allOrgsSnap.forEach((d) => {
            const data: any = d.data();
            const oSlug = (data.slug || '').toLowerCase();
            const oId = d.id.toLowerCase();
            if (oSlug === cleanTerm || this.normalizeSlug(oSlug) === normalizedTerm || oId === cleanTerm) {
              orgDoc = { id: d.id, ...data };
            }
          });
        }
      }

      if (!orgDoc) {
        return null; // 404: Not found in database
      }

      const orgId = orgDoc.id;

      // 2. Fetch Services for this establishment
      const srvQuery = query(collection(firestore, 'services'), where('organizationId', '==', orgId));
      const srvSnap = await getDocs(srvQuery);
      const services: any[] = [];
      srvSnap.forEach((d) => {
        const data = d.data();
        if (data.isActive !== false) {
          services.push({ id: d.id, ...data });
        }
      });

      // 3. Fetch Professionals for this establishment
      const profQuery = query(collection(firestore, 'professionals'), where('organizationId', '==', orgId));
      const profSnap = await getDocs(profQuery);
      const professionals: any[] = [];
      profSnap.forEach((d) => {
        const data = d.data();
        if (data.isActive !== false) {
          professionals.push({ id: d.id, ...data });
        }
      });

      // 4. Fetch Queue for this establishment
      const queueQuery = query(collection(firestore, 'queue'), where('organizationId', '==', orgId));
      const queueSnap = await getDocs(queueQuery);
      const queue: any[] = [];
      queueSnap.forEach((d) => {
        queue.push({ id: d.id, ...d.data() });
      });

      // Sort queue by ticket number
      queue.sort((a, b) => (a.ticketNumber || 0) - (b.ticketNumber || 0));

      // Sanitize organization for public output (strip passwords, sensitive credentials)
      const { ownerPassword, ownerEmail, invoices, mercadopagoAccessToken, stripeSecretKey, ...safeOrg } = orgDoc;

      return {
        organization: safeOrg,
        services,
        professionals,
        queue
      };
    } catch (err: any) {
      console.error('CloudDBService.getPublicEstablishment error:', err);
      throw err; // Rethrow so caller distinguishes 500 from 404
    }
  }

  // -------------------------------------------------------------------------
  // PERSISTENCE METHODS (Awaited and confirmed against Firestore)
  // -------------------------------------------------------------------------
  static async saveEntity(colName: string, id: string, data: any): Promise<any> {
    if (!id) throw new Error('ID is required to save entity');
    const cleanId = this.cleanId(id);
    const docRef = doc(firestore, colName, cleanId);

    // Sanitize undefined fields (Firestore throws on undefined)
    const sanitized = JSON.parse(JSON.stringify(data));
    const payload = {
      ...sanitized,
      id: id,
      _updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });

    // Invalidate cache
    this.cachedDB = null;
    return payload;
  }

  static async deleteEntity(colName: string, id: string): Promise<void> {
    if (!id) return;
    const cleanId = this.cleanId(id);
    const docRef = doc(firestore, colName, cleanId);
    await deleteDoc(docRef);
    this.cachedDB = null;
  }

  // -------------------------------------------------------------------------
  // FULL DB LOAD (Used by API routes to maintain backward compatibility)
  // -------------------------------------------------------------------------
  static async loadAllFromCloud(forceFresh = false): Promise<any> {
    const now = Date.now();
    if (!forceFresh && this.cachedDB && now - this.lastCacheTime < this.CACHE_TTL_MS) {
      return this.cachedDB;
    }

    try {
      const result: any = {
        organizations: [],
        services: [],
        professionals: [],
        queue: [],
        appointments: [],
        customers: [],
        transactions: [],
        reviews: [],
        sessions: [],
        config: {}
      };

      const collectionsToLoad = [
        'organizations',
        'services',
        'professionals',
        'queue',
        'appointments',
        'customers',
        'transactions',
        'reviews',
        'sessions'
      ];

      for (const colName of collectionsToLoad) {
        const colRef = collection(firestore, colName);
        const snapshot = await getDocs(colRef);
        snapshot.forEach((d) => {
          result[colName].push({ id: d.id, ...d.data() });
        });
      }

      this.cachedDB = result;
      this.lastCacheTime = now;
      return result;
    } catch (err) {
      console.warn('CloudDBService.loadAllFromCloud warning:', err);
      if (this.cachedDB) return this.cachedDB;
      throw err;
    }
  }

  // Batch sync initial or existing DB to Firestore
  static async syncAllToCloud(db: any): Promise<void> {
    if (!db) return;
    try {
      const entitiesMap: Record<string, any[]> = {
        organizations: db.organizations || [],
        services: db.services || [],
        professionals: db.professionals || [],
        queue: db.queue || [],
        appointments: db.appointments || [],
        customers: db.customers || [],
        transactions: db.transactions || [],
        reviews: db.reviews || [],
        sessions: db.sessions || []
      };

      for (const [colName, items] of Object.entries(entitiesMap)) {
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!item.id) continue;
          await this.saveEntity(colName, item.id, item);
        }
      }
      this.cachedDB = null;
      console.log('☁️ Sincronização de todos os registros no Cloud Firestore concluída com sucesso!');
    } catch (err) {
      console.warn('CloudDBService.syncAllToCloud error:', err);
    }
  }
}
