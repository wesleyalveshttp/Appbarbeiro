import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Armchair,
  DollarSign,
  TrendingUp,
  Share2,
  QrCode,
  UserPlus,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Smartphone,
  Sparkles,
  PhoneCall,
  CreditCard,
  RotateCcw,
  Lock,
  MessageCircle,
  Scissors
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Appointment, WaitingQueueItem, Professional } from '../../types';
import { QRCodeModal } from '../common/QRCodeModal';
import { WhatsAppService } from '../../services/whatsapp';
import { SubscriptionCheckoutModal } from './SubscriptionCheckoutModal';

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
  const [showQR, setShowQR] = useState(false);
  const [qrType, setQrType] = useState<'booking' | 'queue'>('booking');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [copiedLinkType, setCopiedLinkType] = useState<string | null>(null);

  const sub = organization.subscription || {
    status: 'TESTE_GRATIS',
    planName: 'Plano Pro BarberOS',
    priceMonthly: 79.9,
    trialDaysRemaining: 3,
    isPaid: false,
    invoices: []
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    const apts = StorageService.getAppointments(organization.id, todayStr);
    const q = StorageService.getQueue(organization.id);
    const profs = StorageService.getProfessionals(organization.id);
    setAppointments(apts);
    setQueue(q);
    setProfessionals(profs);

    // Fetch fresh live queue from server
    await StorageService.fetchQueue(organization.id);
    const updatedQ = StorageService.getQueue(organization.id);
    setQueue(updatedQ);
  };

  const handleResetMetrics = () => {
    if (confirm('Deseja zerar todas as métricas, fila, atendimentos e clientes deste salão para começar do zero?')) {
      StorageService.resetAllMetrics(organization.id);
      loadData();
    }
  };

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
  const onChairCount = appointments.filter(a => a.status === 'NA CADEIRA').length + queue.filter(q => q.status === 'NA CADEIRA').length;
  
  const todayRevenue = appointments
    .filter(a => a.status === 'FINALIZADO')
    .reduce((sum, a) => sum + a.servicePrice, 0) +
    StorageService.getTransactions(organization.id)
      .filter(t => t.date === todayStr && t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

  // Next customers in line
  const nextInQueue = queue.find(q => q.status === 'PROXIMO') || queue.find(q => q.status === 'AGUARDANDO');

  // Currently on chair
  const onChairAppointments = appointments.filter(a => a.status === 'NA CADEIRA');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const orgSlug = (organization?.slug || StorageService.getAllOrganizations()[0]?.slug || 'barbearia').trim();
  const bookingUrl = `${origin}/agendar/${orgSlug}`;
  const queueUrl = `${origin}/fila/${orgSlug}`;

  const handleCallCustomer = async (queueItem: WaitingQueueItem) => {
    const availableProf = professionals.find(p => p.isActive) || professionals[0];
    if (!availableProf) return;
    await StorageService.callQueueCustomer(queueItem.id, availableProf.id);

    // Automatically trigger WhatsApp direct message link
    const link = StorageService.getWhatsAppCallLink(queueItem.id);
    if (link) {
      window.open(link, '_blank');
    }

    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Subscription Alert Banner if not fully active */}
      {sub.status !== 'ATIVA' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-slate-900 border border-amber-500/40 p-4 text-xs shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Assinatura BarberOS Pro</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500 text-slate-950">
                  R$ 79,90 / mês
                </span>
              </div>
              <p className="text-slate-300 mt-0.5">
                {sub.status === 'TESTE_GRATIS'
                  ? `Seu salão está em período de testes (${sub.trialDaysRemaining || 3} dias restantes). Ative a mensalidade de R$ 79,90 para liberar 100% do app sem interrupções.`
                  : 'Para desbloquear 100% do sistema (fila digital, painel de cadeiras, financeiro e agendamentos), ative sua assinatura mensal.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('assinatura')}
              className="rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
            >
              Ver Detalhes
            </button>
            <button
              onClick={() => setShowCheckoutModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Pagar R$ 79,90 e Liberar 100%</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Banner / Salutation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-850 p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span className={`h-2 w-2 rounded-full ${isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className={isOpenNow ? 'text-emerald-400' : 'text-rose-400'}>
                {isOpenNow ? 'Estabelecimento Aberto' : 'Atendimento Pausado/Fechado'}
              </span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Bom dia, {organization.name} 👋
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
            Acompanhe em tempo real as cadeiras em atendimento, a fila digital e os agendamentos de hoje.
          </p>
        </div>

        {/* Quick actions top right */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <button
            onClick={handleResetMetrics}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3 py-2 text-xs font-medium text-slate-300 hover:text-rose-300 transition"
            title="Limpar e zerar todas as métricas para começar do zero"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>Zerar Métricas</span>
          </button>

          <button
            onClick={handleToggleOpen}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
              isOpenNow
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isOpenNow ? 'Pausar Atendimento' : 'Abrir Atendimento'}
          </button>

          <button
            onClick={() => {
              setQrType('booking');
              setShowQR(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-750 transition"
          >
            <Share2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Compartilhar Agenda</span>
          </button>

          <button
            onClick={() => {
              setQrType('queue');
              setShowQR(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-750 transition"
          >
            <QrCode className="h-3.5 w-3.5 text-blue-400" />
            <span>Link da Fila</span>
          </button>

          <button
            onClick={() => onNavigate('operacional')}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition"
          >
            <Armchair className="h-3.5 w-3.5" />
            <span>Modo Barbearia</span>
          </button>
        </div>
      </div>

      {/* 4 Main Summary Cards (#9) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Agendamentos hoje */}
        <div
          onClick={() => onNavigate('agenda')}
          className="cursor-pointer group rounded-2xl bg-slate-900 border border-slate-800 p-5 hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Agendamentos hoje</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{todayAppointmentsCount}</span>
            <span className="text-xs text-slate-500">confirmados</span>
          </div>
        </div>

        {/* Card 2: Clientes aguardando */}
        <div
          onClick={() => onNavigate('fila')}
          className="cursor-pointer group rounded-2xl bg-slate-900 border border-slate-800 p-5 hover:border-amber-500/30 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Clientes aguardando</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">{waitingInQueueCount}</span>
            <span className="text-xs text-amber-400/70">na fila digital</span>
          </div>
        </div>

        {/* Card 3: Na cadeira */}
        <div
          onClick={() => onNavigate('operacional')}
          className="cursor-pointer group rounded-2xl bg-slate-900 border border-slate-800 p-5 hover:border-emerald-500/30 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Na cadeira</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              <Armchair className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{onChairCount}</span>
            <span className="text-xs text-emerald-400/70">em atendimento</span>
          </div>
        </div>

        {/* Card 4: Faturamento hoje */}
        <div
          onClick={() => onNavigate('financeiro')}
          className="cursor-pointer group rounded-2xl bg-slate-900 border border-slate-800 p-5 hover:border-slate-700 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Faturamento hoje</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xs text-slate-400">R$</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {todayRevenue.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Queue & On Chair Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Fila em Tempo Real + Operacional Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fila em Tempo Real (#9 & #18) */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Fila Digital em Tempo Real</h3>
                  <p className="text-xs text-slate-400">Ordem de chegada e chamadas ao vivo</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const res = await StorageService.callNextCustomer(organization.id);
                    if (res.success && res.item) {
                      loadData();
                    } else {
                      alert(res.error || 'Nenhum cliente aguardando na fila.');
                    }
                  }}
                  disabled={waitingInQueueCount === 0}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition disabled:opacity-40 cursor-pointer"
                >
                  <Scissors className="h-3.5 w-3.5" />
                  <span>CHAMAR PRÓXIMO</span>
                </button>
                <button
                  onClick={onOpenNewQueueModal}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 transition"
                >
                  <UserPlus className="h-3.5 w-3.5 text-amber-400" />
                  <span>+ Inserir</span>
                </button>
                <button
                  onClick={() => onNavigate('fila')}
                  className="text-xs text-amber-400 hover:text-amber-300 transition flex items-center gap-1 font-medium"
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
                    onClick={onOpenNewQueueModal}
                    className="mt-3 text-xs text-amber-400 hover:underline font-semibold"
                  >
                    + Adicionar primeiro cliente
                  </button>
                </div>
              ) : (
                queue.map((item, index) => {
                  const isNext = item.status === 'PROXIMO';
                  const isCalled = item.status === 'CHAMADO';
                  const isOnChair = item.status === 'NA CADEIRA';

                  return (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-850/50 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                            isNext
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                              : isCalled
                              ? 'bg-blue-500 text-white animate-pulse'
                              : isOnChair
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{item.ticketNumber}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
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
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{item.serviceName}</span>
                            <span>·</span>
                            <span>Aguardando há ~{item.estimatedWaitMinutes} min</span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'AGUARDANDO' || item.status === 'PROXIMO' ? (
                          <button
                            onClick={() => handleCallCustomer(item)}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition cursor-pointer"
                            title="Chamar cliente e disparar mensagem WhatsApp"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <MessageCircle className="h-3 w-3 text-slate-950" />
                            <span>Chamar & WhatsApp</span>
                          </button>
                        ) : item.status === 'CHAMADO' ? (
                          <button
                            onClick={() => {
                              StorageService.moveQueueToChair(item.id);
                              loadData();
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                          >
                            <Armchair className="h-3.5 w-3.5" />
                            <span>Sentar na Cadeira</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              StorageService.finishQueueItem(item.id);
                              loadData();
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition"
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
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Próximos Agendamentos de Hoje</h3>
                  <p className="text-xs text-slate-400">Horários agendados pela internet ou recepção</p>
                </div>
              </div>

              <button
                onClick={onOpenNewAppointmentModal}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
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
                    <div className="flex items-center gap-3">
                      <div className="text-center font-mono text-xs font-bold bg-slate-800 text-amber-300 px-2.5 py-1.5 rounded-lg shrink-0">
                        {apt.time}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{apt.customerName}</span>
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
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{apt.serviceName}</span>
                          <span>·</span>
                          <span>Barbeiro: {apt.professionalName}</span>
                          <span>·</span>
                          <span className="font-semibold text-slate-300">R$ {apt.servicePrice}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/atendimento/${apt.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Armchair className="h-4 w-4 text-emerald-400" />
                Na Cadeira Agora
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400">{onChairCount} ocupadas</span>
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
                  ? { name: currentApt.customerName, service: currentApt.serviceName, price: currentApt.servicePrice }
                  : currentQueue
                  ? { name: currentQueue.customerName, service: currentQueue.serviceName, price: 45 }
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
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={prof.avatarUrl}
                          alt={prof.name}
                          className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-700"
                        />
                        <span className="text-xs font-semibold text-white">{prof.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          activeOccupant
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-500'
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
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Share2 className="h-4 w-4 text-amber-400" />
              Links do seu Estabelecimento
            </h3>

            {/* Agendamento */}
            {/* Agendamento */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span>Agendamento Online</span>
                <div className="flex items-center gap-2">
                  {onNavigateToBooking && (
                    <button
                      onClick={() => onNavigateToBooking(organization.slug)}
                      className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Testar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(bookingUrl);
                      setCopiedLinkType('booking');
                      setTimeout(() => setCopiedLinkType(null), 2500);
                    }}
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
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span>Link da Fila Digital</span>
                <div className="flex items-center gap-2">
                  {onNavigateToQueue && (
                    <button
                      onClick={() => onNavigateToQueue(organization.slug)}
                      className="text-blue-400 hover:text-blue-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir Fila
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(queueUrl);
                      setCopiedLinkType('queue');
                      setTimeout(() => setCopiedLinkType(null), 2500);
                    }}
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
                onClick={() => onNavigate('qrcodes')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-750 border border-slate-700 transition cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-amber-400" />
                Gerar & Imprimir QR Codes
              </button>
            </div>
          </div>
        </div>
      </div>

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

      <SubscriptionCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        organization={organization}
        onSuccess={loadData}
      />
    </div>
  );
};
