// Production-grade Native Push & Remote Web Push Notification Service
// RFC 8292 Web Push Protocol (Google FCM / Apple APNs / Mozilla Autopush)
// Integrates: ServiceWorker, PushManager, VAPID, Web Audio API chime synthesizer, and navigator.vibrate

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushNotificationPayload {
  title: string;
  body: string;
  type: 'STEP_3' | 'NEXT' | 'CALLED';
  tag?: string;
  vibratePattern?: number[];
  ticketNumber?: number;
  url?: string;
}

export interface RemotePushSubscriptionResult {
  success: boolean;
  subscription?: PushSubscriptionJSON;
  deviceToken: string;
  error?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class NotificationServiceClass {
  private deviceToken: string | null = null;
  private audioCtx: AudioContext | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private currentSubscription: PushSubscription | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDeviceToken();
      this.initServiceWorkerAndListeners();
    }
  }

  private initDeviceToken(): string {
    const existing = localStorage.getItem('barberos_device_token');
    if (existing) {
      this.deviceToken = existing;
      return existing;
    }
    const newToken = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('barberos_device_token', newToken);
    this.deviceToken = newToken;
    return newToken;
  }

  public getDeviceToken(): string {
    return this.deviceToken || this.initDeviceToken();
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  public isVibrationSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'navigator' in window && 'vibrate' in navigator;
  }

  public isPushManagerSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'PushManager' in window && 'serviceWorker' in navigator;
  }

  public getPermissionStatus(): PushPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as PushPermissionState;
  }

  // Register Service Worker and listen for background messages
  public async initServiceWorkerAndListeners(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.swRegistration = reg;

      // Listen for push messages dispatched to active window
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};
        if (type === 'REMOTE_PUSH_RECEIVED' && payload) {
          console.log('🔔 Remote push notification received in foreground:', payload);
          this.playSound(payload.type);
          if (payload.vibratePattern) {
            this.vibrate(payload.vibratePattern);
          } else {
            this.vibrate([400, 150, 400, 150, 800, 200, 800]);
          }

          // Emit local event so components update immediately
          window.dispatchEvent(
            new CustomEvent('barberos_remote_push_alert', { detail: payload })
          );
        }
      });

      return reg;
    } catch (e) {
      console.warn('Service Worker registration warning:', e);
      return null;
    }
  }

  // Request browser Notification permission
  public async requestPermission(): Promise<PushPermissionState> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      this.getAudioContext(); // Unlock Web Audio context on user gesture
      return permission as PushPermissionState;
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return 'default';
    }
  }

  // Register device for REAL Remote Web Push (RFC 8292 / VAPID)
  public async subscribeToRemotePush(options?: {
    queueItemId?: string;
    customerPhone?: string;
    customerName?: string;
    organizationId?: string;
  }): Promise<RemotePushSubscriptionResult> {
    const deviceToken = this.getDeviceToken();

    if (!this.isPushManagerSupported()) {
      return {
        success: false,
        deviceToken,
        error: 'PushManager não suportado neste navegador.',
      };
    }

    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          deviceToken,
          error: 'Permissão de notificação não foi concedida pelo usuário.',
        };
      }

      // Ensure SW is ready
      let reg = this.swRegistration;
      if (!reg) {
        reg = await navigator.serviceWorker.ready;
        this.swRegistration = reg;
      }

      // Get VAPID public key from backend
      const vapidRes = await fetch('/api/push/vapid-public-key');
      if (!vapidRes.ok) {
        throw new Error('Falha ao obter chave pública VAPID do servidor');
      }
      const { publicKey } = await vapidRes.json();
      if (!publicKey) throw new Error('Chave VAPID pública indisponível');

      // Check existing subscription or subscribe new
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      this.currentSubscription = subscription;

      const subJSON = subscription.toJSON();

      // Send to backend database
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subJSON,
          deviceToken,
          queueItemId: options?.queueItemId,
          customerPhone: options?.customerPhone,
          customerName: options?.customerName,
          organizationId: options?.organizationId || 'org-prime',
          userAgent: navigator.userAgent,
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Falha ao registrar inscrição de push no backend');
      }

      return {
        success: true,
        subscription: subJSON,
        deviceToken,
      };
    } catch (e: any) {
      console.error('Remote Push subscription error:', e);
      return {
        success: false,
        deviceToken,
        error: e?.message || 'Erro ao registrar para notificações push remotas',
      };
    }
  }

  // Trigger test push directly from backend to this device
  public async sendTestPush(): Promise<{
    success: boolean;
    status: string;
    message: string;
  }> {
    const deviceToken = this.getDeviceToken();
    try {
      // First ensure subscribed
      if (!this.currentSubscription) {
        await this.subscribeToRemotePush();
      }

      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken,
          subscription: this.currentSubscription ? this.currentSubscription.toJSON() : null,
        }),
      });

      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        status: 'NETWORK_ERROR',
        message: e?.message || 'Falha ao conectar com o servidor para testar push',
      };
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  // Synthesize audible chimes with Web Audio API
  public playSound(type: 'STEP_3' | 'NEXT' | 'CALLED') {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (type === 'STEP_3') {
        // Double gentle chime (Aviso 1: Faltam poucas pessoas)
        this.playTone(ctx, 523.25, now, 0.2, 0.15); // C5
        this.playTone(ctx, 659.25, now + 0.18, 0.25, 0.2); // E5
      } else if (type === 'NEXT') {
        // High alert chime (Aviso 2: Você é o próximo)
        this.playTone(ctx, 659.25, now, 0.15, 0.2); // E5
        this.playTone(ctx, 880.0, now + 0.15, 0.2, 0.25); // A5
        this.playTone(ctx, 987.77, now + 0.32, 0.35, 0.3); // B5
      } else {
        // Energetic triumphant chime (Aviso 3: CHEGOU SUA VEZ!)
        this.playTone(ctx, 523.25, now, 0.15, 0.3); // C5
        this.playTone(ctx, 659.25, now + 0.14, 0.15, 0.3); // E5
        this.playTone(ctx, 783.99, now + 0.28, 0.15, 0.3); // G5
        this.playTone(ctx, 1046.5, now + 0.44, 0.5, 0.4); // C6 (High C)
        // Repeat fanfare after 0.7s
        this.playTone(ctx, 783.99, now + 0.8, 0.15, 0.25);
        this.playTone(ctx, 1046.5, now + 0.95, 0.6, 0.4);
      }
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  private playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number = 0.2) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // Trigger device vibration via Vibration API
  public vibrate(pattern: number[]) {
    if (typeof window === 'undefined' || !('navigator' in window)) return;
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('Vibration not permitted by device hardware/OS:', e);
      }
    }
  }

  // In-app direct dispatch fallback
  public async dispatchNotification(payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isSupported()) return false;

    const vibration =
      payload.vibratePattern ||
      (payload.type === 'CALLED'
        ? [400, 150, 400, 150, 800, 200, 800]
        : payload.type === 'NEXT'
        ? [300, 150, 300, 150, 300]
        : [250, 100, 250]);

    this.playSound(payload.type);
    this.vibrate(vibration);

    if (Notification.permission !== 'granted') {
      return false;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.active) {
          await registration.showNotification(payload.title, {
            body: payload.body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: payload.tag || `queue-${payload.type}-${Date.now()}`,
            renotify: true,
            requireInteraction: payload.type === 'CALLED',
            vibrate: vibration,
            data: {
              url: payload.url || (typeof window !== 'undefined' ? window.location.href : '/'),
              type: payload.type,
              ticketNumber: payload.ticketNumber,
            },
          } as any);
          return true;
        }
      }

      new Notification(payload.title, {
        body: payload.body,
        icon: '/icon.svg',
        tag: payload.tag || `queue-${payload.type}-${Date.now()}`,
      });
      return true;
    } catch (e) {
      console.warn('Native notification dispatch error:', e);
      return false;
    }
  }
}

export const NotificationService = new NotificationServiceClass();
