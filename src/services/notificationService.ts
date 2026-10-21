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

      // Automatically unlock and resume audio on the very first user interaction anywhere on page
      const unlockEvents = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'];
      const autoUnlock = () => {
        this.unlockAudio();
      };
      unlockEvents.forEach((evt) => {
        window.addEventListener(evt, autoUnlock, { passive: true });
      });
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
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
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

  private persistentAudio: HTMLAudioElement | null = null;
  private repeatingAlarmTimer: any = null;
  private cachedAudioUrls: Record<string, string> = {};

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public unlockAudio(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Initialize and prime persistent HTML5 audio element
      if (typeof window !== 'undefined' && !this.persistentAudio) {
        this.persistentAudio = new Audio();
        this.persistentAudio.volume = 1.0;
      }
      // Pre-warm with a micro silent burst
      this.playHtmlAudioFallback('STEP_3', 0.001);
    } catch {}
  }

  // Synthesize audible chimes with Web Audio API & HTML5 Audio fallback
  public playSound(type: 'STEP_3' | 'NEXT' | 'CALLED') {
    const ctx = this.getAudioContext();

    const executeTones = (context: AudioContext) => {
      try {
        const now = context.currentTime;

        if (type === 'STEP_3') {
          // Double gentle chime (Aviso 1: Faltam poucas pessoas)
          this.playTone(context, 523.25, now, 0.22, 0.5); // C5
          this.playTone(context, 659.25, now + 0.18, 0.28, 0.55); // E5
        } else if (type === 'NEXT') {
          // High alert chime (Aviso 2: Você é o próximo)
          this.playTone(context, 659.25, now, 0.18, 0.6); // E5
          this.playTone(context, 880.0, now + 0.16, 0.22, 0.65); // A5
          this.playTone(context, 987.77, now + 0.35, 0.45, 0.7); // B5
        } else {
          // Energetic loud alert chime (Aviso 3: CHEGOU SUA VEZ NA CADEIRA!)
          // 1st Fanfare Pass
          this.playTone(context, 523.25, now, 0.16, 0.7); // C5
          this.playTone(context, 659.25, now + 0.14, 0.16, 0.75); // E5
          this.playTone(context, 783.99, now + 0.28, 0.18, 0.8); // G5
          this.playTone(context, 1046.5, now + 0.44, 0.55, 0.85); // C6 (High C)

          // 2nd Fanfare Pass (0.65s later)
          this.playTone(context, 659.25, now + 0.7, 0.16, 0.75); // E5
          this.playTone(context, 783.99, now + 0.84, 0.18, 0.8); // G5
          this.playTone(context, 1046.5, now + 1.0, 0.7, 0.9); // High C6
        }
      } catch (e) {
        console.warn('Audio tone error:', e);
      }
    };

    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => executeTones(ctx)).catch(() => executeTones(ctx));
      } else {
        executeTones(ctx);
      }
    }

    // Secondary Audio Engine: HTML5 synthetic tone (guaranteed playback on mobile)
    this.playHtmlAudioFallback(type, 0.9);
  }

  // Generates and plays an audible synthetic WAV tone via HTML5 Audio element
  private playHtmlAudioFallback(type: 'STEP_3' | 'NEXT' | 'CALLED', maxVol: number = 0.8): void {
    if (typeof window === 'undefined') return;
    try {
      let dataUrl = this.cachedAudioUrls[type];
      if (!dataUrl) {
        const sampleRate = 8000;
        const durationSec = type === 'CALLED' ? 1.0 : 0.45;
        const totalSamples = Math.floor(sampleRate * durationSec);
        const buffer = new Uint8Array(44 + totalSamples);

        const writeStr = (offset: number, str: string) => {
          for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
        };
        const write32 = (offset: number, val: number) => {
          buffer[offset] = val & 0xff;
          buffer[offset + 1] = (val >> 8) & 0xff;
          buffer[offset + 2] = (val >> 16) & 0xff;
          buffer[offset + 3] = (val >> 24) & 0xff;
        };
        const write16 = (offset: number, val: number) => {
          buffer[offset] = val & 0xff;
          buffer[offset + 1] = (val >> 8) & 0xff;
        };

        writeStr(0, 'RIFF');
        write32(4, 36 + totalSamples);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        write32(16, 16);
        write16(20, 1);
        write16(22, 1);
        write32(24, sampleRate);
        write32(28, sampleRate);
        write16(32, 1);
        write16(34, 8);
        writeStr(36, 'data');
        write32(40, totalSamples);

        const freq1 = type === 'CALLED' ? 880 : type === 'NEXT' ? 784 : 587;
        const freq2 = type === 'CALLED' ? 1046 : type === 'NEXT' ? 988 : 659;
        for (let i = 0; i < totalSamples; i++) {
          const t = i / sampleRate;
          const currentFreq = t < (durationSec / 2) ? freq1 : freq2;
          const decay = Math.max(0.1, 1 - (t / durationSec));
          const sample = Math.sin(2 * Math.PI * currentFreq * t) * decay;
          buffer[44 + i] = Math.floor((sample + 1) * 127.5);
        }

        let binary = '';
        for (let i = 0; i < buffer.length; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        dataUrl = `data:audio/wav;base64,${btoa(binary)}`;
        this.cachedAudioUrls[type] = dataUrl;
      }

      if (!this.persistentAudio) {
        this.persistentAudio = new Audio();
      }
      this.persistentAudio.src = dataUrl;
      this.persistentAudio.volume = Math.min(1, Math.max(0.01, maxVol));
      const playPromise = this.persistentAudio.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn('HTML5 audio auto-play suppressed:', err);
        });
      }
    } catch {}
  }

  // Start continuous repeating loud chime alarm until client confirms arrival or leaves
  public startRepeatingAlarm(type: 'CALLED' | 'NEXT' = 'CALLED', intervalMs: number = 4000) {
    this.stopRepeatingAlarm();
    this.playSound(type);
    this.vibrate([600, 200, 600, 200, 1000, 300, 1000]);

    this.repeatingAlarmTimer = setInterval(() => {
      this.playSound(type);
      this.vibrate([600, 200, 600, 200, 1000, 300, 1000]);
    }, intervalMs);
  }

  public stopRepeatingAlarm() {
    if (this.repeatingAlarmTimer) {
      clearInterval(this.repeatingAlarmTimer);
      this.repeatingAlarmTimer = null;
    }
  }

  private playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number = 0.3) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle'; // Richer sound than pure sine
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // Trigger device vibration via Vibration API with multi-pulse cadence
  public vibrate(pattern: number[]) {
    if (typeof window === 'undefined') return;
    if ('navigator' in window && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
        if (pattern.length > 2) {
          setTimeout(() => {
            try { navigator.vibrate(pattern); } catch {}
          }, 1500);
        }
      } catch (e) {
        console.warn('Vibration not permitted by device hardware/OS:', e);
      }
    }
    // Also dispatch a custom visual vibrate event for CSS pulsating animation
    window.dispatchEvent(new CustomEvent('barberos_vibrate', { detail: { pattern } }));
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
