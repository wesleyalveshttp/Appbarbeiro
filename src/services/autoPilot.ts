import { StorageService } from './storage';
import { WhatsAppService } from './whatsapp';
import { Organization, Appointment, WaitingQueueItem } from '../types';

export interface AutoPilotLog {
  id: string;
  timestamp: string;
  type: 'REMINDER_40MIN' | 'QUEUE_AUTO_CALL' | 'APPOINTMENT_READY' | 'QUEUE_TOLERANCE_HOLD';
  title: string;
  description: string;
  customerName: string;
  whatsappUrl?: string;
}

export class AutoPilotService {
  private static activeIntervals: Record<string, any> = {};
  private static logs: Record<string, AutoPilotLog[]> = {};
  private static listeners: ((logs: AutoPilotLog[]) => void)[] = [];

  // Play a pleasant high-tech chime using Web Audio API (Zero external mp3 files required)
  static playChime(type: 'reminder' | 'call' | 'finish' = 'reminder') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'call') {
        // Double ding for queue call
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'finish') {
        // Success chord
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      } else {
        // Pleasant bell for 40-minute automated reminder
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(987.77, now + 0.12); // B5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {
      // AudioContext might be blocked until user interacts with document
    }
  }

  static getLogs(orgId: string): AutoPilotLog[] {
    return this.logs[orgId] || [];
  }

  static addLog(orgId: string, log: Omit<AutoPilotLog, 'id' | 'timestamp'>) {
    if (!this.logs[orgId]) {
      this.logs[orgId] = [];
    }
    const newLog: AutoPilotLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    this.logs[orgId].unshift(newLog);
    // Keep max 50 logs
    if (this.logs[orgId].length > 50) {
      this.logs[orgId].pop();
    }
    this.notifyListeners(orgId);
  }

  static subscribe(fn: (logs: AutoPilotLog[]) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private static notifyListeners(orgId: string) {
    const list = this.getLogs(orgId);
    this.listeners.forEach(fn => fn(list));
  }

  // Main autonomous cycle: runs automatically in the background
  static async runCycle(organization: Organization): Promise<{
    remindersSent: number;
    queueCallsMade: number;
    actionsTaken: string[];
  }> {
    const orgId = organization.id;
    const settings = organization.settings || {};
    // Auto-pilot is enabled by default unless explicitly turned off
    const autoPilotActive = settings.autoPilotEnabled !== false;
    if (!autoPilotActive) {
      return { remindersSent: 0, queueCallsMade: 0, actionsTaken: [] };
    }

    const actionsTaken: string[] = [];
    let remindersSent = 0;
    let queueCallsMade = 0;

    // -------------------------------------------------------------------------
    // 1. AUTO 15-MINUTE REMINDER (AGENDAMENTO & FILA VIRTUAL)
    // -------------------------------------------------------------------------
    if (settings.autoSend40MinWhatsApp !== false) {
      try {
        const pending = StorageService.getPending40MinReminders(orgId);

        // Process appointment reminders
        for (const r of pending.appointments) {
          const apt = r.item as Appointment;
          // Mark sent in storage to avoid duplicate processing
          await StorageService.mark40MinReminderSent(apt.id, 'APPOINTMENT', orgId);

          this.addLog(orgId, {
            type: 'REMINDER_40MIN',
            title: '⚡ Lembrete 15min Enviado (Agendamento)',
            description: `Aviso preventivo automático para ${apt.customerName} (Horário: ${apt.time} - ${apt.serviceName}).`,
            customerName: apt.customerName,
            whatsappUrl: r.whatsappUrl,
          });

          // Optional: if autoOpenWhatsAppTab is enabled, launch tab
          if (settings.autoOpenWhatsAppTab) {
            window.open(r.whatsappUrl, '_blank', 'noopener,noreferrer');
          }

          this.playChime('reminder');
          remindersSent++;
          actionsTaken.push(`Lembrete 15 min enviado para ${apt.customerName}`);
        }

        // Process virtual queue reminders
        for (const q of pending.queue) {
          const item = q.item as WaitingQueueItem;
          await StorageService.mark40MinReminderSent(item.id, 'QUEUE', orgId);

          this.addLog(orgId, {
            type: 'REMINDER_40MIN',
            title: '⚡ Lembrete 15min Enviado (Fila Virtual)',
            description: `Aviso preventivo automático para ${item.customerName} (Senha #${item.ticketNumber} - tempo estimado ~${item.estimatedWaitMinutes || 15} min).`,
            customerName: item.customerName,
            whatsappUrl: q.whatsappUrl,
          });

          if (settings.autoOpenWhatsAppTab) {
            window.open(q.whatsappUrl, '_blank', 'noopener,noreferrer');
          }

          this.playChime('reminder');
          remindersSent++;
          actionsTaken.push(`Lembrete 15 min de fila enviado para ${item.customerName} (Senha #${item.ticketNumber})`);
        }
      } catch (err) {
        console.error('[AutoPilot] Erro ao processar lembretes 15 min:', err);
      }
    }

    // -------------------------------------------------------------------------
    // 2. AUTO-CHAMADA DA FILA (QUANDO CADEIRA ESTÁ LIVRE)
    // -------------------------------------------------------------------------
    if (settings.autoCallNextClient !== false) {
      try {
        const queue = StorageService.getQueue(orgId);
        const professionals = StorageService.getProfessionals(orgId).filter(p => p.isActive);
        const onChairQueue = queue.filter(q => q.status === 'NA CADEIRA');
        const calledQueue = queue.filter(q => q.status === 'CHAMADO' || q.status === 'A_CAMINHO' || q.status === 'PEDIU_TOLERANCIA');
        const waitingQueue = queue.filter(q => q.status === 'AGUARDANDO' || q.status === 'PROXIMO');

        // Total chairs = total active professionals (at least 1)
        const totalChairs = Math.max(1, professionals.length);
        const occupiedChairs = onChairQueue.length;

        // If there is an empty chair, no one is currently in calling phase, and someone is waiting
        if (occupiedChairs < totalChairs && calledQueue.length === 0 && waitingQueue.length > 0) {
          // Promote / Call the first waiting customer automatically!
          const nextCustomer = waitingQueue.sort((a, b) => a.ticketNumber - b.ticketNumber)[0];
          const availableProf = professionals.find(p => !onChairQueue.some((c: any) => c.assignedProfessionalId === p.id)) || professionals[0];

          await StorageService.callQueueCustomer(nextCustomer.id, availableProf?.id, orgId);

          this.addLog(orgId, {
            type: 'QUEUE_AUTO_CALL',
            title: '✂️ Próximo Chamado Automaticamente',
            description: `Cadeira livre identificada! ${nextCustomer.customerName} (Senha #${nextCustomer.ticketNumber}) foi chamado para a cadeira de ${availableProf?.name || 'Barbeiro'}.`,
            customerName: nextCustomer.customerName,
          });

          this.playChime('call');
          queueCallsMade++;
          actionsTaken.push(`Cliente ${nextCustomer.customerName} (Senha #${nextCustomer.ticketNumber}) chamado automaticamente`);
        }
      } catch (err) {
        console.error('[AutoPilot] Erro ao avançar fila automaticamente:', err);
      }
    }

    // -------------------------------------------------------------------------
    // 3. AUTO-VERIFICAÇÃO DE HORÁRIO DE AGENDAMENTOS DO DIA
    // -------------------------------------------------------------------------
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const apts = StorageService.getAppointments(orgId, todayStr);
      for (const apt of apts) {
        if (apt.status === 'AGENDADO' || apt.status === 'CONFIRMADO') {
          const [h, m] = apt.time.split(':').map(Number);
          const aptMinutes = h * 60 + m;
          // If within -5 min to +15 min of scheduled time, auto-mark as CHEGOU / PRONTO
          if (currentMinutes >= aptMinutes - 5 && currentMinutes <= aptMinutes + 30) {
            StorageService.updateAppointmentStatus(apt.id, 'CHEGOU');
            this.addLog(orgId, {
              type: 'APPOINTMENT_READY',
              title: '💈 Agendamento Pronto para a Cadeira',
              description: `Horário de ${apt.customerName} (${apt.time} - ${apt.serviceName}) chegou. Pronto para sentar na cadeira!`,
              customerName: apt.customerName,
            });
            actionsTaken.push(`Agendamento de ${apt.customerName} marcado como pronto`);
          }
        }
      }
    } catch (err) {
      console.error('[AutoPilot] Erro ao sincronizar horários de agendamento:', err);
    }

    return { remindersSent, queueCallsMade, actionsTaken };
  }

  // Start continuous autonomous background loop
  static startAutoPilot(organization: Organization, intervalMs = 15000) {
    const orgId = organization.id;
    if (this.activeIntervals[orgId]) {
      clearInterval(this.activeIntervals[orgId]);
    }

    // Run first cycle immediately
    this.runCycle(organization).catch(() => {});

    // Set recurring timer
    this.activeIntervals[orgId] = setInterval(() => {
      this.runCycle(organization).catch(() => {});
    }, intervalMs);
  }

  static stopAutoPilot(orgId: string) {
    if (this.activeIntervals[orgId]) {
      clearInterval(this.activeIntervals[orgId]);
      delete this.activeIntervals[orgId];
    }
  }
}
