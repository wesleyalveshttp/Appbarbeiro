import React, { useState, useEffect } from 'react';
import {
  Clock,
  MessageCircle,
  CheckCircle2,
  Send,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  Scissors
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Appointment, WaitingQueueItem } from '../../types';
import { WhatsAppService } from '../../services/whatsapp';

interface WhatsAppReminder40MinCardProps {
  organization: Organization;
  variant?: 'banner' | 'card';
  compact?: boolean;
}

export const WhatsAppReminder40MinCard: React.FC<WhatsAppReminder40MinCardProps> = ({
  organization,
  variant = 'card',
  compact = false,
}) => {
  const [reminders, setReminders] = useState<{
    appointments: any[];
    queue: any[];
  }>({ appointments: [], queue: [] });

  const [previewItem, setPreviewItem] = useState<{
    customerName: string;
    phone: string;
    text: string;
    url: string;
    type: 'APPOINTMENT' | 'QUEUE';
    id: string;
  } | null>(null);

  const [isExpanded, setIsExpanded] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const checkReminders = () => {
    const data = StorageService.getPending40MinReminders(organization.id);
    setReminders(data);
  };

  useEffect(() => {
    checkReminders();
    // Check every 15 seconds for clients reaching the 15-minute window
    const interval = setInterval(checkReminders, 15000);

    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      checkReminders();
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [organization.id]);

  const totalPending = reminders.appointments.length + reminders.queue.length;

  const handleSendReminder = async (itemData: {
    id: string;
    type: 'APPOINTMENT' | 'QUEUE';
    customerName: string;
    whatsappUrl: string;
  }) => {
    // 1. Mark as sent in system
    await StorageService.mark40MinReminderSent(itemData.id, itemData.type, organization.id);
    checkReminders();

    // 2. Open WhatsApp Web / App directly
    window.open(itemData.whatsappUrl, '_blank', 'noopener,noreferrer');

    setFeedback(`✅ Lembrete de 15 min aberto no WhatsApp para ${itemData.customerName}!`);
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSendAll = async () => {
    const all = [...reminders.appointments, ...reminders.queue];
    for (const r of all) {
      await StorageService.mark40MinReminderSent(r.item.id, r.type, organization.id);
      window.open(r.whatsappUrl, '_blank', 'noopener,noreferrer');
    }
    checkReminders();
    setFeedback(`✅ ${all.length} lembretes gerados e abertos no WhatsApp com sucesso!`);
    setTimeout(() => setFeedback(null), 6000);
  };

  if (totalPending === 0) {
    if (compact) return null;
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-3.5 text-xs text-slate-400 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-300 block">Lembretes WhatsApp de 15 Minutos</span>
            <span className="text-[11px] text-slate-500">
              Nenhum cliente no raio de 15 minutos neste momento • Monitoramento automático ativo
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 font-semibold">
          0 pendentes
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/40 p-4 sm:p-5 text-xs shadow-xl space-y-3 relative overflow-hidden">
      {/* Feedback Toast */}
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-2 animate-fade-in shadow-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-white text-sm sm:text-base tracking-tight">
                Lembretes de 15 Minutos (Evitar Atrasos)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase animate-pulse">
                {totalPending} {totalPending === 1 ? 'Pendente' : 'Pendentes'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                ⚡ Piloto Automático Ativo
              </span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
              O Piloto Automático avisa os clientes com 15 min de antecedência sozinho. Você também pode disparar manualmente abaixo se desejar abrir no WhatsApp Web.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalPending > 1 && (
            <button
              onClick={handleSendAll}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer"
              title="Abrir todos no WhatsApp"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Enviar Todos</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isExpanded ? 'Recolher' : 'Expandir'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* List of Pending Reminders */}
      {isExpanded && (
        <div className="space-y-2.5 pt-1">
          {/* Appointments */}
          {reminders.appointments.map((r) => (
            <div
              key={r.item.id}
              className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:border-amber-500/40 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 font-bold">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{r.item.customerName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Horário Marcado
                    </span>
                    <span className="font-mono text-amber-300 text-xs font-bold">
                      {r.item.time} ({r.minutesUntil <= 0 ? 'Agora' : `em ~${r.minutesUntil} min`})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{r.item.serviceName}</span>
                    <span>•</span>
                    <span>Profissional: <strong className="text-slate-300">{r.item.professionalName}</strong></span>
                    <span>•</span>
                    <span className="font-mono text-slate-300">{r.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewItem({
                      id: r.item.id,
                      type: 'APPOINTMENT',
                      customerName: r.item.customerName,
                      phone: r.phone,
                      text: r.whatsappText,
                      url: r.whatsappUrl,
                    })
                  }
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
                  title="Ver mensagem antes de enviar"
                >
                  Ver Texto
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendReminder({
                      id: r.item.id,
                      type: 'APPOINTMENT',
                      customerName: r.item.customerName,
                      whatsappUrl: r.whatsappUrl,
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer transform active:scale-95"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Disparar WhatsApp</span>
                </button>
              </div>
            </div>
          ))}

          {/* Queue Items */}
          {reminders.queue.map((r) => (
            <div
              key={r.item.id}
              className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:border-amber-500/40 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 font-bold font-mono">
                  #{r.item.ticketNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{r.item.customerName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Fila de Espera
                    </span>
                    <span className="font-mono text-amber-300 text-xs font-bold">
                      Previsão: ~{r.minutesUntil} min
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{r.item.serviceName}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-300">{r.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewItem({
                      id: r.item.id,
                      type: 'QUEUE',
                      customerName: r.item.customerName,
                      phone: r.phone,
                      text: r.whatsappText,
                      url: r.whatsappUrl,
                    })
                  }
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
                >
                  Ver Texto
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendReminder({
                      id: r.item.id,
                      type: 'QUEUE',
                      customerName: r.item.customerName,
                      whatsappUrl: r.whatsappUrl,
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer transform active:scale-95"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Disparar WhatsApp</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Mensagem de Lembrete (15 Minutos)</h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-1">
                Destinatário: <strong className="text-white">{previewItem.customerName}</strong> ({previewItem.phone})
              </span>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {previewItem.text}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(previewItem.text);
                  setFeedback('Texto copiado para a área de transferência!');
                  setTimeout(() => setFeedback(null), 3000);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
              >
                Copiar Texto
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSendReminder({
                    id: previewItem.id,
                    type: previewItem.type,
                    customerName: previewItem.customerName,
                    whatsappUrl: previewItem.url,
                  });
                  setPreviewItem(null);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Abrir WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
