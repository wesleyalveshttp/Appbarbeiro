import React, { useState, useEffect } from 'react';
import {
  Armchair,
  Clock,
  UserCheck,
  CheckCircle2,
  Play,
  DollarSign,
  AlertCircle,
  Phone,
  MessageCircle,
  Scissors,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Plus,
  Sparkles,
  FastForward,
  Trash2,
  X
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Appointment, WaitingQueueItem, Professional, PaymentMethod } from '../../types';
import { WhatsAppService } from '../../services/whatsapp';

interface OperationalBoardProps {
  organization: Organization;
  selectedProfessionalId?: string;
  onOpenNewQueueModal: () => void;
  onOpenNewAppointmentModal: () => void;
}

export const OperationalBoard: React.FC<OperationalBoardProps> = ({
  organization,
  selectedProfessionalId,
  onOpenNewQueueModal,
  onOpenNewAppointmentModal,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<WaitingQueueItem[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  
  // Finish Modal State
  const [finishingItem, setFinishingItem] = useState<{
    id: string;
    type: 'APPOINTMENT' | 'QUEUE';
    name: string;
    serviceName: string;
    servicePrice: number;
    professionalName: string;
    professionalId: string;
  } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('PIX');
  const [boardFeedback, setBoardFeedback] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    let apts = StorageService.getAppointments(organization.id, todayStr);
    let q = StorageService.getQueue(organization.id);
    let profs = StorageService.getProfessionals(organization.id);

    if (selectedProfessionalId) {
      apts = apts.filter(a => a.professionalId === selectedProfessionalId);
      profs = profs.filter(p => p.id === selectedProfessionalId);
    }

    setAppointments(apts);
    setQueue(q);
    setProfessionals(profs);

    // Fetch fresh live queue from server
    await StorageService.fetchQueue(organization.id);
    let updatedQ = StorageService.getQueue(organization.id);
    setQueue(updatedQ);
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
  }, [organization.id, selectedProfessionalId]);

  // Unified items
  // AGUARDANDO
  const waitingAppointments = appointments.filter(a => a.status === 'CHEGOU' || a.status === 'AGUARDANDO');
  const waitingQueue = queue.filter(q => q.status === 'AGUARDANDO');
  const eligibleToCall = queue.filter(q => q.status === 'PROXIMO' || q.status === 'AGUARDANDO');

  // PRÓXIMO
  const nextAppointments = appointments.filter(a => a.status === 'CONFIRMADO' || a.status === 'A CAMINHO');
  const nextQueue = queue.filter(
    q => q.status === 'PROXIMO' || q.status === 'CHAMADO' || q.status === 'A_CAMINHO' || q.status === 'PEDIU_TOLERANCIA'
  );

  // NA CADEIRA
  const onChairAppointments = appointments.filter(a => a.status === 'NA CADEIRA');
  const onChairQueue = queue.filter(q => q.status === 'NA CADEIRA');

  // FINALIZADOS
  const finishedAppointments = appointments.filter(a => a.status === 'FINALIZADO');
  const finishedQueue = queue.filter(q => q.status === 'FINALIZADO');

  // Actions
  const handleCallQueueItem = async (item: WaitingQueueItem) => {
    const prof = professionals[0] || StorageService.getProfessionals(organization.id)[0];
    await StorageService.callQueueCustomer(item.id, prof?.id, organization.id);
    setBoardFeedback(`✂️ ${item.customerName} (Senha #${item.ticketNumber}) chamado! Alerta sonoro e push disparado.`);
    await loadData();
    setTimeout(() => setBoardFeedback(null), 5000);
  };

  const handleStartAppointment = async (aptId: string) => {
    StorageService.updateAppointmentStatus(aptId, 'NA CADEIRA');
    setBoardFeedback('💈 Cliente acomodado na cadeira!');
    await loadData();
    setTimeout(() => setBoardFeedback(null), 5000);
  };

  const handleQueueSitOnChair = async (qId: string) => {
    const prof = professionals[0] || StorageService.getProfessionals(organization.id)[0];
    await StorageService.moveQueueToChair(qId, prof?.id, organization.id);
    setBoardFeedback('💈 Cliente acomodado na cadeira com sucesso! Próximo promovido.');
    await loadData();
    setTimeout(() => setBoardFeedback(null), 5000);
  };

  const handleSkipAndCutNext = async (lateItemId: string) => {
    const prof = professionals[0] || StorageService.getProfessionals(organization.id)[0];
    const res = await StorageService.skipAndCallNext(lateItemId, organization.id, 'TO_CHAIR', prof?.id);
    if (res.success) {
      setBoardFeedback('✂️ Próximo cliente acomodado na cadeira! A vez de quem não chegou foi mantida na fila com prioridade.');
      await loadData();
    } else {
      setBoardFeedback(res.error || 'Não há outro cliente aguardando na fila.');
    }
    setTimeout(() => setBoardFeedback(null), 5000);
  };

  const handleMarkQueueNoShow = async (queueId: string, customerName?: string) => {
    try {
      await StorageService.markCalledCustomerNoShow(queueId, organization.id);
      setBoardFeedback(`🚫 ${customerName || 'Cliente'} marcado como não compareceu. Cadeira liberada para o próximo!`);
      await loadData();
    } catch (err: any) {
      console.error('Error marking no show:', err);
    }
    setTimeout(() => setBoardFeedback(null), 5000);
  };

  const handleOpenFinishModal = (item: {
    id: string;
    type: 'APPOINTMENT' | 'QUEUE';
    name: string;
    serviceName: string;
    servicePrice: number;
    professionalName: string;
    professionalId: string;
  }) => {
    setFinishingItem(item);
  };

  const handleConfirmFinish = () => {
    if (!finishingItem) return;
    if (finishingItem.type === 'APPOINTMENT') {
      StorageService.updateAppointmentStatus(finishingItem.id, 'FINALIZADO', {
        paymentMethod: selectedPaymentMethod,
      });
    } else {
      StorageService.finishQueueItem(finishingItem.id, selectedPaymentMethod);
    }
    setFinishingItem(null);
    loadData();
  };

  const calculateMinutesElapsed = (timestampStr?: string) => {
    if (!timestampStr) return 0;
    const diffMs = Date.now() - new Date(timestampStr).getTime();
    return Math.max(1, Math.round(diffMs / 60000));
  };

  return (
    <div className="space-y-4">
      {/* Top Header for Modo Barbearia */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <Armchair className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white uppercase">
                Painel Operacional das Cadeiras
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ao Vivo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Controle rápido de atendimento em 4 colunas — projetado para a rotina diária do barbeiro.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              const res = await StorageService.callNextCustomer(organization.id, selectedProfessionalId);
              if (res.success && res.item) {
                setBoardFeedback(`✂️ Cliente ${res.item.customerName} (Senha #${res.item.ticketNumber}) chamado! Alerta sonoro e push enviado.`);
                await loadData();
              } else {
                setBoardFeedback(res.error || 'Nenhum cliente aguardando na fila.');
              }
              setTimeout(() => setBoardFeedback(null), 5000);
            }}
            disabled={eligibleToCall.length === 0}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition disabled:opacity-40 cursor-pointer"
          >
            <Scissors className="h-4 w-4" />
            <span>CHAMAR PRÓXIMO DA FILA</span>
          </button>

          <button
            onClick={onOpenNewQueueModal}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
          >
            <Plus className="h-4 w-4 text-amber-400" />
            <span>+ Adicionar na Fila</span>
          </button>

          <button
            onClick={onOpenNewAppointmentModal}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
          >
            <Clock className="h-4 w-4" />
            <span>+ Agendamento</span>
          </button>
        </div>
      </div>

      {/* Real-time Feedback Toast */}
      {boardFeedback && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs font-semibold text-amber-300 flex items-center gap-2 shadow-lg animate-fadeIn">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{boardFeedback}</span>
        </div>
      )}

      {/* 4 COLUMNS KANBAN (#10) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ================= COLUMN 1: AGUARDANDO ================= */}
        <div className="flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Aguardando ({waitingAppointments.length + waitingQueue.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Na recepção</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {waitingAppointments.length === 0 && waitingQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                Ninguém aguardando no momento.
              </div>
            ) : (
              <>
                {/* Appointments marked as arrived / waiting */}
                {waitingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="rounded-xl bg-slate-850 border border-slate-750 p-3.5 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">{apt.customerName}</div>
                        <div className="text-[11px] text-amber-400/90">{apt.serviceName}</div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                        {apt.time}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{calculateMinutesElapsed(apt.arrivedAt || apt.createdAt)} min aguardando</span>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => handleStartAppointment(apt.id)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 py-1.5 text-xs font-bold text-slate-950 transition"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Sentar na Cadeira
                      </button>
                    </div>
                  </div>
                ))}

                {/* Queue items waiting */}
                {waitingQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-slate-850 border border-slate-750 p-3.5 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded">
                          #{item.ticketNumber}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{item.customerName}</div>
                          <div className="text-[11px] text-slate-400">{item.serviceName}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkQueueNoShow(item.id, item.customerName)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Não Compareceu / Desistiu"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{calculateMinutesElapsed(item.joinedAt)} min na fila</span>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => handleCallQueueItem(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 py-1.5 text-xs font-bold text-slate-950 transition"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Chamar
                      </button>
                      <button
                        onClick={() => handleQueueSitOnChair(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-1.5 text-xs font-bold text-white transition"
                        title="Atender diretamente na cadeira"
                      >
                        <Armchair className="h-3 w-3" />
                        Cadeira
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ================= COLUMN 2: PRÓXIMO ================= */}
        <div className="flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Próximo ({nextAppointments.length + nextQueue.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Chamando / A caminho</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {nextAppointments.length === 0 && nextQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                Nenhum próximo cliente definido.
              </div>
            ) : (
              <>
                {/* Next from Queue */}
                {nextQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3.5 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-300 bg-slate-900 px-2 py-0.5 rounded">
                          #{item.ticketNumber}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{item.customerName}</div>
                          <div className="text-[11px] text-blue-200">{item.serviceName}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {item.status === 'CHAMADO'
                          ? 'Chamado'
                          : item.status === 'A_CAMINHO'
                          ? 'A Caminho'
                          : item.status === 'PEDIU_TOLERANCIA'
                          ? '+3 min'
                          : 'Próximo'}
                      </span>
                    </div>

                    <div className="pt-2 flex flex-col gap-1.5">
                      <button
                        onClick={() => handleQueueSitOnChair(item.id)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 py-1.5 text-xs font-bold text-slate-950 transition cursor-pointer"
                      >
                        <Armchair className="h-3.5 w-3.5" />
                        <span>Sentar na Cadeira</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSkipAndCutNext(item.id)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-blue-600/90 hover:bg-blue-600 py-1.5 text-xs font-bold text-white transition cursor-pointer"
                          title="Cliente não chegou? Pule e atenda o próximo da fila, mantendo a vez deste cliente intacta!"
                        >
                          <FastForward className="h-3.5 w-3.5" />
                          <span>Pular / Próximo</span>
                        </button>

                        <button
                          onClick={() => handleMarkQueueNoShow(item.id, item.customerName)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                          title="Marcar como não compareceu e retirar da fila"
                        >
                          <span>Não Compareceu</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Next from Appointments */}
                {nextAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="rounded-xl bg-slate-850 border border-slate-750 p-3.5 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">{apt.customerName}</div>
                        <div className="text-[11px] text-slate-400">{apt.serviceName}</div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded">
                        {apt.time}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Profissional: {apt.professionalName}</span>
                      {apt.status === 'A CAMINHO' && (
                        <span className="text-amber-400 font-semibold">A Caminho</span>
                      )}
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => {
                          StorageService.updateAppointmentStatus(apt.id, 'CHEGOU');
                          loadData();
                        }}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-750 hover:bg-slate-700 py-1.5 text-xs text-slate-200 transition"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                        Chegou
                      </button>

                      <button
                        onClick={() => handleStartAppointment(apt.id)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 py-1.5 text-xs font-bold text-slate-950 transition"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Cadeira
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ================= COLUMN 3: NA CADEIRA ================= */}
        <div className="flex flex-col rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Na Cadeira ({onChairAppointments.length + onChairQueue.length})
              </h2>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">Em atendimento</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {onChairAppointments.length === 0 && onChairQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-500/20 p-6 text-center text-xs text-slate-500">
                Nenhuma cadeira ocupada no momento.
              </div>
            ) : (
              <>
                {/* On Chair Appointments */}
                {onChairAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-white">{apt.customerName}</div>
                        <div className="text-xs text-emerald-300 font-medium">{apt.serviceName}</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">
                        R$ {apt.servicePrice}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span>Barbeiro: <strong>{apt.professionalName}</strong></span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        ~{calculateMinutesElapsed(apt.onChairAt)} min
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        handleOpenFinishModal({
                          id: apt.id,
                          type: 'APPOINTMENT',
                          name: apt.customerName,
                          serviceName: apt.serviceName,
                          servicePrice: apt.servicePrice,
                          professionalName: apt.professionalName,
                          professionalId: apt.professionalId,
                        })
                      }
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-emerald-500/20 transition"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Finalizar e Cobrar
                    </button>
                  </div>
                ))}

                {/* On Chair from Queue */}
                {onChairQueue.map((item) => {
                  const prof = professionals.find(p => p.id === item.assignedProfessionalId) || professionals[0];
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-3 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-300 bg-slate-950 px-2 py-0.5 rounded">
                            #{item.ticketNumber}
                          </span>
                          <div>
                            <div className="text-sm font-black text-white">{item.customerName}</div>
                            <div className="text-xs text-emerald-300">{item.serviceName}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <span>Barbeiro: <strong>{prof?.name || 'Profissional'}</strong></span>
                        <span className="text-emerald-400 font-mono font-semibold">
                          ~{calculateMinutesElapsed(item.onChairAt)} min
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          handleOpenFinishModal({
                            id: item.id,
                            type: 'QUEUE',
                            name: item.customerName,
                            serviceName: item.serviceName,
                            servicePrice: 45, // default
                            professionalName: prof?.name || 'Barbeiro',
                            professionalId: prof?.id || 'prof-1',
                          })
                        }
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-xs font-black text-slate-950 shadow-md shadow-emerald-500/20 transition"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Finalizar e Cobrar
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ================= COLUMN 4: FINALIZADOS ================= */}
        <div className="flex flex-col rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Finalizados ({finishedAppointments.length + finishedQueue.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Hoje</span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {finishedAppointments.length === 0 && finishedQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                Nenhum atendimento finalizado hoje.
              </div>
            ) : (
              <>
                {finishedAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">{apt.customerName}</div>
                      <div className="text-[11px] text-slate-500">
                        {apt.serviceName} · {apt.professionalName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400 font-mono">
                        R$ {apt.servicePrice.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase">
                        {apt.paymentMethod || 'PIX'}
                      </div>
                    </div>
                  </div>
                ))}

                {finishedQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">{item.customerName}</div>
                      <div className="text-[11px] text-slate-500">{item.serviceName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400 font-mono">
                        R$ 45,00
                      </div>
                      <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400">
                        Fila
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* FINISH & COLLECT PAYMENT MODAL */}
      {finishingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Finalizar Atendimento
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Confirme a forma de pagamento para liquidar o serviço e calcular a comissão.
            </p>

            <div className="mt-4 rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{finishingItem.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Serviço:</span>
                <span className="text-slate-200">{finishingItem.serviceName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Profissional:</span>
                <span className="text-slate-200">{finishingItem.professionalName}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-xs font-semibold text-slate-300">Valor Total:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  R$ {finishingItem.servicePrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Forma de Pagamento:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'PIX', label: 'PIX Instantâneo' },
                  { id: 'DINHEIRO', label: 'Dinheiro' },
                  { id: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
                  { id: 'CARTAO_DEBITO', label: 'Cartão Débito' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setSelectedPaymentMethod(pm.id as PaymentMethod)}
                    className={`rounded-xl p-2.5 text-xs font-semibold border transition ${
                      selectedPaymentMethod === pm.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setFinishingItem(null)}
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmFinish}
                className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-xs font-bold text-slate-950 shadow-md transition"
              >
                Confirmar e Receber
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
