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
  private hasUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDeviceToken();
      this.initServiceWorkerAndListeners();

      // Silently unlock Web Audio on first gesture without making ANY sound
      const silentUnlock = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', silentUnlock, { once: true, passive: true });
      window.addEventListener('touchstart', silentUnlock, { once: true, passive: true });
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
        const { type, payload, playAlarm, action } = event.data || {};

        if (type === 'REMOTE_PUSH_RECEIVED' && payload) {
          console.log('🔔 Remote push notification received in client:', payload);
          // Only play ringtone if it's the customer's call or turn
          if (payload.isCalled || payload.type === 'CALLED') {
            this.startRepeatingAlarm('CALLED', 4000);
          } else if (payload.type === 'NEXT') {
            this.playSound('NEXT');
            this.vibrate([350, 150, 350, 150, 350]);
          }

          // Emit local event so components update immediately
          window.dispatchEvent(
            new CustomEvent('barberos_remote_push_alert', { detail: payload })
          );
        } else if (type === 'PUSH_NOTIFICATION_CLICKED') {
          console.log('🎯 Push notification clicked, focusing window and sounding confirmation chime:', { payload, action });
          this.unlockAudio();
          this.playSound('CALLED');
          this.vibrate([500, 150, 500, 150, 800]);

          window.dispatchEvent(
            new CustomEvent('barberos_push_clicked', { detail: { payload, action } })
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
      this.unlockAudio();
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

      // Send to backend database (passing both token and deviceToken)
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subJSON,
          token: deviceToken,
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
          token: deviceToken,
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
    if (this.hasUnlocked) return;
    this.hasUnlocked = true;
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Initialize persistent HTML5 audio element silently (ZERO touch sounds)
      if (typeof window !== 'undefined' && !this.persistentAudio) {
        this.persistentAudio = new Audio();
        this.persistentAudio.volume = 1.0;
      }
    } catch {}
  }

  // Synthesize authentic, pleasant calling ringtone with Web Audio & HTML5 Audio
  public playSound(type: 'STEP_3' | 'NEXT' | 'CALLED') {
    const ctx = this.getAudioContext();

    const executeTones = (context: AudioContext) => {
      try {
        const now = context.currentTime;

        if (type === 'STEP_3') {
          // Double gentle advisory chime (Faltam poucas pessoas)
          this.playTone(context, 523.25, now, 0.22, 0.4); // C5
          this.playTone(context, 659.25, now + 0.18, 0.28, 0.45); // E5
        } else if (type === 'NEXT') {
          // Alert chime (Você é o próximo)
          this.playTone(context, 659.25, now, 0.18, 0.6); // E5
          this.playTone(context, 880.0, now + 0.16, 0.22, 0.65); // A5
          this.playTone(context, 1046.5, now + 0.35, 0.45, 0.7); // C6
        } else {
          // REAL SHOP CALL RINGTONE / TOQUE DE CHAMADA (CHEGOU SUA VEZ NA CADEIRA!)
          // Melodic Bell Sequence: F#5 (740Hz) -> A#5 (932Hz) -> C#6 (1108Hz) -> F#6 (1480Hz)
          this.playBell(context, 739.99, now, 0.35, 0.85); // Note 1
          this.playBell(context, 932.33, now + 0.26, 0.35, 0.85); // Note 2
          this.playBell(context, 1108.73, now + 0.52, 0.4, 0.9); // Note 3
          this.playBell(context, 1479.98, now + 0.80, 0.95, 0.95); // Sustained Bell Ring

          // Double attention chime ring
          this.playBell(context, 1108.73, now + 1.35, 0.25, 0.8);
          this.playBell(context, 1479.98, now + 1.55, 0.75, 0.9);
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

    // Secondary Audio Engine: HTML5 melodic bell ringtone (guaranteed background playback on mobile)
    this.playHtmlAudioFallback(type, 0.95);
  }

  // Generates and plays a high-quality 22050Hz 16-bit WAV bell ringtone via HTML5 Audio element
  private playHtmlAudioFallback(type: 'STEP_3' | 'NEXT' | 'CALLED', maxVol: number = 0.95): void {
    if (typeof window === 'undefined') return;
    try {
      let dataUrl = this.cachedAudioUrls[type];
      if (!dataUrl) {
        const sampleRate = 22050;
        const durationSec = type === 'CALLED' ? 2.0 : 0.6;
        const totalSamples = Math.floor(sampleRate * durationSec);
        const bytesPerSample = 2; // 16-bit PCM
        const blockAlign = bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = totalSamples * bytesPerSample;
        const buffer = new Uint8Array(44 + dataSize);

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

        // RIFF header
        writeStr(0, 'RIFF');
        write32(4, 36 + dataSize);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        write32(16, 16); // PCM header size
        write16(20, 1);  // PCM format
        write16(22, 1);  // Mono
        write32(24, sampleRate);
        write32(28, byteRate);
        write16(32, blockAlign);
        write16(34, 16); // 16 bits
        writeStr(36, 'data');
        write32(40, dataSize);

        // Synthesis of high-fidelity melodic call chime (Ding-Dong-Ding-DONG)
        for (let i = 0; i < totalSamples; i++) {
          const t = i / sampleRate;
          let sample = 0;

          if (type === 'CALLED') {
            // 4-chime sequence: 0.0s, 0.26s, 0.52s, 0.80s
            const notes = [
              { start: 0.0, freq: 740, dur: 0.4 },
              { start: 0.26, freq: 932, dur: 0.4 },
              { start: 0.52, freq: 1108, dur: 0.45 },
              { start: 0.80, freq: 1480, dur: 1.1 },
            ];
            for (const n of notes) {
              if (t >= n.start && t < n.start + n.dur) {
                const noteT = t - n.start;
                const env = Math.exp(-3.5 * (noteT / n.dur));
                const s1 = Math.sin(2 * Math.PI * n.freq * noteT);
                const s2 = 0.35 * Math.sin(2 * Math.PI * n.freq * 2 * noteT); // 1st harmonic
                sample += (s1 + s2) * env * 0.7;
              }
            }
          } else if (type === 'NEXT') {
            const freq = t < 0.25 ? 784 : 988;
            const env = Math.exp(-4 * t);
            sample = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
          } else {
            const freq = 659;
            const env = Math.exp(-5 * t);
            sample = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
          }

          // Clamp to 16-bit signed integer
          sample = Math.max(-1, Math.min(1, sample));
          const intSample = Math.floor(sample < 0 ? sample * 32768 : sample * 32767);
          const byteOffset = 44 + i * 2;
          buffer[byteOffset] = intSample & 0xff;
          buffer[byteOffset + 1] = (intSample >> 8) & 0xff;
        }

        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < buffer.length; i += chunkSize) {
          const slice = buffer.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, slice as any);
        }
        dataUrl = `data:audio/wav;base64,${btoa(binary)}`;
        this.cachedAudioUrls[type] = dataUrl;
      }

      if (!this.persistentAudio) {
        this.persistentAudio = new Audio();
      }
      this.persistentAudio.src = dataUrl;
      this.persistentAudio.volume = Math.min(1, Math.max(0.1, maxVol));
      const playPromise = this.persistentAudio.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn('HTML5 audio auto-play suppressed:', err);
        });
      }
    } catch (e) {
      console.warn('playHtmlAudioFallback error:', e);
    }
  }

  // Start continuous repeating loud chime alarm until client confirms arrival or leaves
  public startRepeatingAlarm(type: 'CALLED' | 'NEXT' = 'CALLED', intervalMs: number = 4200) {
    this.stopRepeatingAlarm();
    this.playSound(type);
    this.vibrate([600, 200, 600, 200, 1000, 250, 1000]);

    this.repeatingAlarmTimer = setInterval(() => {
      this.playSound(type);
      this.vibrate([600, 200, 600, 200, 1000, 250, 1000]);
    }, intervalMs);
  }

  public stopRepeatingAlarm() {
    if (this.repeatingAlarmTimer) {
      clearInterval(this.repeatingAlarmTimer);
      this.repeatingAlarmTimer = null;
    }
  }

  // Rich bell tone with harmonics and natural decay
  private playBell(ctx: AudioContext, freq: number, startTime: number, duration: number, volume: number = 0.5) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'triangle'; // Rich fundamental
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sine'; // 2nd harmonic overtone
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
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
