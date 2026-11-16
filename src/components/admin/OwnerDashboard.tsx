import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Armchair,
  DollarSign,
  Share2,
  QrCode,
  UserPlus,
  Play,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  Scissors,
  Copy,
  Check,
  X
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Appointment, WaitingQueueItem, Professional } from '../../types';
import { QRCodeModal } from '../common/QRCodeModal';
import { getPublicBaseUrl } from '../../utils/publicUrl';

interface OwnerDashboardProps {
  organization: Organization;
  onNavigate: (route: string) => void;
  onOpenNewAppointmentModal: () => void;
  onOpenNewQueueModal: () => void;
  onNavigateToQueue?: (slug: string) => void;
  onNavigateToBooking?: (slug: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  organization,
  onNavigate,
  onOpenNewAppointmentModal,
  onOpenNewQueueModal,
  onNavigateToQueue,
  onNavigateToBooking,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<WaitingQueueItem[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isOpenNow, setIsOpenNow] = useState(organization.settings.isOpenNow);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrType, setQrType] = useState<'booking' | 'queue'>('booking');
  const [copiedLinkType, setCopiedLinkType] = useState<string | null>(null);
  const [callFeedback, setCallFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    const apts = StorageService.getAppointments(organization.id, todayStr);
    const q = StorageService.getQueue(organization.id);
    const profs = StorageService.getProfessionals(organization.id);
    setAppointments(apts);
    setQueue(q);
    setProfessionals(profs);

    await StorageService.fetchQueue(organization.id);
    const updatedQ = StorageService.getQueue(organization.id);
    setQueue(updatedQ);
  };

  useEffect(() => {
    setIsOpenNow(organization.settings.isOpenNow);
  }, [organization.settings.isOpenNow]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [organization.id]);

  const handleToggleOpen = () => {
    const newState = !isOpenNow;
    setIsOpenNow(newState);
    StorageService.updateOrganization(organization.id, {
      settings: {
        ...organization.settings,
        isOpenNow: newState,
      },
    });
  };

  // Metrics
  const todayAppointmentsCount = appointments.length;
  const waitingInQueueCount = queue.filter(q => q.status === 'AGUARDANDO' || q.status === 'PROXIMO').length;
  const onChairCount =
    appointments.filter(a => a.status === 'NA CADEIRA').length +
    queue.filter(q => q.status === 'NA CADEIRA').length;

  const totalChairs = professionals.filter(p => p.isActive !== false).length || professionals.length;
  const allChairsFull = totalChairs > 0 && onChairCount >= totalChairs;

  const chairBadgeMeta = (() => {
    const label = onChairCount === 1 ? '1 cadeira ocupada' : `${onChairCount} cadeiras ocupadas`;
    if (allChairsFull) {
      return {
        label,
        classes: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      };
    }
    if (onChairCount > 0) {
      return {
        label,
        classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      };
    }
    return {
      label,
      classes: 'bg-slate-800 text-slate-300 border-slate-700',
    };
  })();

  const todayRevenue =
    appointments
      .filter(a => a.status === 'FINALIZADO')
      .reduce((sum, a) => sum + a.servicePrice, 0) +
    StorageService.getTransactions(organization.id)
      .filter(t => t.date === todayStr && t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

  const origin = getPublicBaseUrl(organization);
  const orgSlug = (organization?.slug || '').trim();
  const bookingUrl = `${origin}/agendar/${orgSlug}`;
  const queueUrl = `${origin}/fila/${orgSlug}`;

  const handleCopyLink = (type: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkType(type);
    setTimeout(() => setCopiedLinkType(null), 2500);
  };

  const handleCallCustomer = async (queueItem: WaitingQueueItem) => {
    const availableProf = professionals.find(p => p.isActive) || professionals[0];
    const profId = availableProf?.id || 'prof-1';
    await StorageService.callQueueCustomer(queueItem.id, profId, organization.id);
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Salutation + Essential Daily Quick Actions */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between rounded-2xl bg-slate-900/95 p-5 sm:p-6 border border-slate-800 shadow-xl">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                isOpenNow ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOpenNow ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{isOpenNow ? 'Estabelecimento Aberto' : 'Atendimento Pausado'}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white truncate">
            Bom dia, {organization.name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
            Acompanhe em tempo real as cadeiras em atendimento, a fila digital e os agendamentos de hoje.
          </p>
        </div>

        {/* Daily-use Quick Actions ONLY: Modo Barbearia, Pausar Atendimento, Compartilhar Links */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition cursor-pointer whitespace-nowrap"
          >
            <Share2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Compartilhar Links</span>
          </button>

          <button
            type="button"
            onClick={handleToggleOpen}
            className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2.5 text-xs font-semibold transition border cursor-pointer whitespace-nowrap ${
              isOpenNow
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isOpenNow ? 'Pausar Atendimento' : 'Abrir Atendimento'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('operacional')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition cursor-pointer whitespace-nowrap"
          >
            <Armchair className="h-3.5 w-3.5 shrink-0" />
            <span>Modo Barbearia</span>
          </button>
        </div>
      </div>

      {/* Live Call Feedback Banner */}
      {callFeedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium ${
            callFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : callFeedback.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{callFeedback.message}</span>
          <button
            type="button"
            onClick={() => setCallFeedback(null)}
            className="p-1 rounded hover:bg-white/10 transition cursor-pointer shrink-0"
            aria-label="Fechar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 4 Main Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          onClick={() => onNavigate('agenda')}
          className="cursor-pointer group rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">Agendamentos hoje</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
              {todayAppointmentsCount}
            </span>
            <span className="text-xs text-slate-500">confirmados</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('fila')}
          className="cursor-pointer group rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 hover:border-amber-500/30 transition"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">Clientes aguardando</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 tabular-nums">
              {waitingInQueueCount}
            </span>
            <span className="text-xs text-amber-400/75">na fila digital</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('operacional')}
          className="cursor-pointer group rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 hover:border-emerald-500/30 transition"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">Na cadeira</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <Armchair className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
              {onChairCount}
            </span>
            <span className="text-xs text-emerald-400/75">em atendimento</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('financeiro')}
          className="cursor-pointer group rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">Faturamento hoje</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xs text-slate-400">R$</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
              {todayRevenue.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Queue & On Chair Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Fila em Tempo Real + Agendamentos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fila em Tempo Real */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Fila Digital em Tempo Real</h3>
                  <p className="text-xs text-slate-400">Ordem de chegada e chamadas ao vivo</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const availableProf = professionals.find(p => p.isActive) || professionals[0];
                    const res = await StorageService.callNextCustomer(organization.id, availableProf?.id);
                    if (res.success && res.item) {
                      setCallFeedback({
                        type: 'success',
                        message: `Cliente ${res.item.customerName} (Senha #${res.item.ticketNumber}) chamado para a cadeira. Alerta sonoro enviado.`,
                      });
                      await loadData();
                    } else {
                      setCallFeedback({
                        type: 'warning',
                        message: res.error || 'Nenhum cliente aguardando na fila.',
                      });
                    }
                    setTimeout(() => setCallFeedback(null), 6000);
                  }}
                  disabled={waitingInQueueCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 transition disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  <Scissors className="h-3.5 w-3.5 shrink-0" />
                  <span>Chamar Próximo</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenNewQueueModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 px-3 py-2 text-xs font-medium text-slate-200 border border-slate-700 transition cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Inserir</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('fila')}
                  className="text-xs text-amber-400 hover:text-amber-300 transition inline-flex items-center gap-1 font-medium px-1.5 py-1 cursor-pointer whitespace-nowrap"
                >
                  Ver Fila <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Queue items list */}
            <div className="mt-4 divide-y divide-slate-800/60">
              {queue.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-400">Nenhum cliente aguardando na fila.</p>
                  <button
                    type="button"
                    onClick={onOpenNewQueueModal}
                    className="mt-3 text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    + Adicionar primeiro cliente
                  </button>
                </div>
              ) : (
                queue.map((item) => {
                  const isNext = item.status === 'PROXIMO';
                  const isCalled = item.status === 'CHAMADO';
                  const isOnChair = item.status === 'NA CADEIRA';
                  const waitMins = Math.max(0, Number(item.estimatedWaitMinutes || 0));

                  return (
                    <div
                      key={item.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group hover:bg-slate-850/50 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold tabular-nums ${
                            isNext
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                              : isCalled
                              ? 'bg-blue-500 text-white'
                              : isOnChair
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{item.ticketNumber}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{item.customerName}</span>
                            {isNext && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Próximo
                              </span>
                            )}
                            {isCalled && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Chamado
                              </span>
                            )}
                            {isOnChair && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Na Cadeira
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 tabular-nums">
                            <span>{item.serviceName}</span>
                            <span aria-hidden="true">·</span>
                            <span>Aguardando há {waitMins} min</span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {item.status === 'AGUARDANDO' || item.status === 'PROXIMO' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await handleCallCustomer(item);
                                setCallFeedback({
                                  type: 'success',
                                  message: `${item.customerName} (Senha #${item.ticketNumber}) chamado. Alerta sonoro e notificação enviados.`,
                                });
                                setTimeout(() => setCallFeedback(null), 5000);
                              }}
                              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition cursor-pointer"
                              title="Chamar cliente para a cadeira"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              <span>Chamar</span>
                            </button>
                            {item.customerPhone && (
                              <a
                                href={StorageService.getWhatsAppCallLink(item.id) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-1.5 text-xs font-semibold text-emerald-400 transition"
                                title="Enviar mensagem no WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                              </a>
                            )}
                          </div>
                        ) : item.status === 'CHAMADO' || item.status === 'A_CAMINHO' || item.status === 'PEDIU_TOLERANCIA' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const prof = professionals[0] || StorageService.getProfessionals(organization.id)[0];
                              await StorageService.moveQueueToChair(item.id, prof?.id, organization.id);
                              setCallFeedback({
                                type: 'success',
                                message: `${item.customerName} sentou na cadeira.`,
                              });
                              await loadData();
                              setTimeout(() => setCallFeedback(null), 5000);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition cursor-pointer shadow-md shadow-emerald-500/20"
                          >
                            <Armchair className="h-3.5 w-3.5" />
                            <span>Sentar na Cadeira</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              StorageService.finishQueueItem(item.id);
                              setCallFeedback({
                                type: 'success',
                                message: `Atendimento de ${item.customerName} concluído.`,
                              });
                              await loadData();
                              setTimeout(() => setCallFeedback(null), 5000);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Concluir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Appointments of Today List Preview */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Próximos Agendamentos de Hoje</h3>
                  <p className="text-xs text-slate-400">Horários agendados pela internet ou recepção</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenNewAppointmentModal}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition cursor-pointer whitespace-nowrap"
              >
                <span>+ Novo Agendamento</span>
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-800/60">
              {appointments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Nenhum agendamento para hoje.
                </div>
              ) : (
                appointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-850/50 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-center font-mono text-xs font-bold bg-slate-800 text-amber-300 px-2.5 py-1.5 rounded-lg shrink-0 tabular-nums">
                        {apt.time}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex flex-wrap items-center gap-2">
                          <span className="truncate">{apt.customerName}</span>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              apt.status === 'NA CADEIRA'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : apt.status === 'A CAMINHO'
                                ? 'bg-amber-500/20 text-amber-300'
                                : apt.status === 'FINALIZADO'
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span>{apt.serviceName}</span>
                          <span aria-hidden="true">·</span>
                          <span>Barbeiro: {apt.professionalName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-slate-300 tabular-nums">R$ {apt.servicePrice}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/atendimento/${apt.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition shrink-0"
                      title="Link do Cliente"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Cadeiras em Atendimento Agora & Links Públicos */}
        <div className="space-y-6">
          {/* Cadeiras Ocupadas / Atendimentos ao Vivo */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Armchair className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Na Cadeira Agora</span>
              </h3>
              <span
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg border tabular-nums whitespace-nowrap ${chairBadgeMeta.classes}`}
              >
                {chairBadgeMeta.label}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {professionals.map((prof) => {
                const currentApt = appointments.find(
                  a => a.professionalId === prof.id && a.status === 'NA CADEIRA'
                );
                const currentQueue = queue.find(
                  q => q.assignedProfessionalId === prof.id && q.status === 'NA CADEIRA'
                );

                const activeOccupant = currentApt
                  ? { name: currentApt.customerName, service: currentApt.serviceName }
                  : currentQueue
                  ? { name: currentQueue.customerName, service: currentQueue.serviceName }
                  : null;

                return (
                  <div
                    key={prof.id}
                    className={`p-3.5 rounded-xl border transition ${
                      activeOccupant
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={prof.avatarUrl}
                          alt={prof.name}
                          className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                        />
                        <span className="text-xs font-semibold text-white truncate">{prof.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${
                          activeOccupant
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {activeOccupant ? 'Em Atendimento' : 'Cadeira Livre'}
                      </span>
                    </div>

                    {activeOccupant ? (
                      <div className="mt-2 text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <div className="font-bold text-slate-200">{activeOccupant.name}</div>
                        <div className="text-[11px] text-slate-400">{activeOccupant.service}</div>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-500 italic">
                        Aguardando próximo cliente...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Public Links & Tools */}
          <div
            id="links-estabelecimento"
            className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Share2 className="h-4 w-4 text-amber-400" />
              <span>Links do seu Estabelecimento</span>
            </h3>

            {/* Agendamento */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200 flex items-center justify-between gap-2">
                <span>Agendamento Online</span>
                <div className="flex items-center gap-2.5">
                  {onNavigateToBooking && (
                    <button
                      type="button"
                      onClick={() => onNavigateToBooking(organization.slug)}
                      className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Testar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyLink('booking', bookingUrl)}
                    className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                  >
                    {copiedLinkType === 'booking' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <p className="text-slate-400 text-[11px] truncate font-mono">{bookingUrl}</p>
            </div>

            {/* Fila */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200 flex items-center justify-between gap-2">
                <span>Link da Fila Digital</span>
                <div className="flex items-center gap-2.5">
                  {onNavigateToQueue && (
                    <button
                      type="button"
                      onClick={() => onNavigateToQueue(organization.slug)}
                      className="text-blue-400 hover:text-blue-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Abrir Fila</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopyLink('queue', queueUrl)}
                    className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                  >
                    {copiedLinkType === 'queue' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <p
                onClick={() => onNavigateToQueue?.(organization.slug)}
                className="text-slate-400 hover:text-blue-400 text-[11px] truncate font-mono cursor-pointer transition"
                title="Clique para abrir a fila"
              >
                {queueUrl}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('qrcodes')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-750 border border-slate-700 transition cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-amber-400" />
                <span>Gerar & Imprimir QR Codes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compartilhar Links Modal (Agendamento + Fila) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Compartilhar Links do Estabelecimento</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Envie o link da fila ou do agendamento para seus clientes ou gere o QR Code para o balcão.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Fechar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Fila Digital */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">Fila Digital ao Vivo</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Tempo Real
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate">{queueUrl}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyLink('modal-queue', queueUrl)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {copiedLinkType === 'modal-queue' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span>{copiedLinkType === 'modal-queue' ? 'Link Copiado' : 'Copiar Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowShareModal(false);
                      setQrType('queue');
                      setShowQR(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Ver QR Code</span>
                  </button>
                </div>
              </div>

              {/* Agendamento Online */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">Agendamento Online</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                    Horários
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate">{bookingUrl}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyLink('modal-booking', bookingUrl)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    {copiedLinkType === 'modal-booking' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span>{copiedLinkType === 'modal-booking' ? 'Link Copiado' : 'Copiar Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowShareModal(false);
                      setQrType('booking');
                      setShowQR(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Ver QR Code</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title={qrType === 'booking' ? 'QR Code de Agendamento' : 'QR Code da Fila Digital'}
        url={qrType === 'booking' ? bookingUrl : queueUrl}
        establishmentName={organization.name}
        onNavigateDirectly={() => {
          if (qrType === 'booking') {
            onNavigateToBooking?.(organization.slug);
          } else {
            onNavigateToQueue?.(organization.slug);
          }
        }}
      />
    </div>
  );
};
