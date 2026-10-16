import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  writeBatch,
  DocumentData
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load config
let firebaseConfig: any = null;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not load firebase-applet-config.json:', e);
}

const app = !getApps().length && firebaseConfig ? initializeApp(firebaseConfig) : (getApps()[0] || null);
export const firestore = app && firebaseConfig ? getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined) : null;

export class CloudDBService {
  private static isInitialized = false;

  static isConfigured(): boolean {
    return !!firestore;
  }

  // 1. Sync full state from Cloud Firestore into local memory
  static async loadAllFromCloud(): Promise<{
    organizations?: any[];
    services?: any[];
    professionals?: any[];
    queue?: any[];
    appointments?: any[];
    customers?: any[];
    sessions?: any[];
  } | null> {
    if (!firestore) return null;
    try {
      const result: any = {
        organizations: [],
        services: [],
        professionals: [],
        queue: [],
        appointments: [],
        customers: [],
        sessions: []
      };

      const collectionsToLoad = ['organizations', 'services', 'professionals', 'queue', 'appointments', 'customers', 'sessions'];

      for (const colName of collectionsToLoad) {
        const colRef = collection(firestore, colName);
        const snapshot = await getDocs(colRef);
        snapshot.forEach((d) => {
          result[colName].push({ id: d.id, ...d.data() });
        });
      }

      return result;
    } catch (err) {
      console.warn('CloudDBService.loadAllFromCloud error:', err);
      return null;
    }
  }

  // 2. Persist single entity to Cloud Firestore
  static async saveEntity(colName: string, id: string, data: any): Promise<void> {
    if (!firestore || !id) return;
    try {
      const cleanId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const docRef = doc(firestore, colName, cleanId);
      // Clean undefined values (Firestore does not allow undefined)
      const sanitized = JSON.parse(JSON.stringify(data));
      await setDoc(docRef, { ...sanitized, _syncedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn(`CloudDBService.saveEntity failed for ${colName}/${id}:`, err);
    }
  }

  // 3. Delete single entity from Cloud Firestore
  static async deleteEntity(colName: string, id: string): Promise<void> {
    if (!firestore || !id) return;
    try {
      const cleanId = String(id).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const docRef = doc(firestore, colName, cleanId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn(`CloudDBService.deleteEntity failed for ${colName}/${id}:`, err);
    }
  }

  // 4. Batch push complete database to Firestore (e.g. at startup or sync)
  static async syncAllToCloud(db: any): Promise<void> {
    if (!firestore || !db) return;
    try {
      const entitiesMap: Record<string, any[]> = {
        organizations: db.organizations || [],
        services: db.services || [],
        professionals: db.professionals || [],
        queue: db.queue || [],
        appointments: db.appointments || [],
        customers: db.customers || [],
        sessions: db.sessions || []
      };

      for (const [colName, items] of Object.entries(entitiesMap)) {
        if (!Array.isArray(items) || items.length === 0) continue;
        for (const item of items) {
          if (!item.id) continue;
          await this.saveEntity(colName, item.id, item);
        }
      }
      console.log('☁️ Sincronização completa com o Cloud Firestore concluída com sucesso!');
    } catch (err) {
      console.warn('CloudDBService.syncAllToCloud error:', err);
    }
  }
}
