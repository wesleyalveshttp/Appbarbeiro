import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Armchair,
  CheckCircle2,
  Trash2,
  Phone,
  MessageCircle,
  UserPlus,
  Share2,
  QrCode,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Users,
  ChevronRight,
  BellRing,
  Vibrate,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Scissors,
  Check,
  X,
  Timer,
  RefreshCw
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, WaitingQueueItem, Professional, Service } from '../../types';
import { QRCodeModal } from '../common/QRCodeModal';

interface QueueManagementProps {
  organization: Organization;
  onNavigateToQueue?: (slug: string) => void;
}

export const QueueManagement: React.FC<QueueManagementProps> = ({ organization, onNavigateToQueue }) => {
  const [queue, setQueue] = useState<WaitingQueueItem[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>('ALL');

  // Active view tab: 'ACTIVE' (Aguardando / Próximo / Chamados) | 'ON_CHAIR' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CALLED' | 'CHAIR' | 'FINISHED' | 'DROPPED' | 'LOGS'>('ACTIVE');

  // Form State for manual entry
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newProfId, setNewProfId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Call Toast & Push Delivery feedback
  const [callFeedback, setCallFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    customerName?: string;
    pushStatus?: string;
    httpStatus?: number;
    phone?: string;
  } | null>(null);

  // Push Dispatch Logs
  const [pushLogs, setPushLogs] = useState<any[]>([]);

  const loadPushLogs = async () => {
    try {
      const res = await fetch(`/api/push/logs/${organization.id}`);
      if (res.ok) {
        const data = await res.json();
        setPushLogs(data.logs || []);
      }
    } catch {}
  };

  const loadData = async () => {
    // 1. Immediate local render
    const localQ = StorageService.getAllQueueHistory(organization.id);
    const profs = StorageService.getProfessionals(organization.id);
    const srvs = StorageService.getServices(organization.id);
    setQueue(localQ);
    setProfessionals(profs);
    setServices(srvs);
    if (!newServiceId && srvs.length > 0) setNewServiceId(srvs[0].id);
    loadPushLogs();

    // 2. Fetch fresh real-time queue from backend server
    const freshQ = await StorageService.fetchQueue(organization.id);
    if (freshQ && Array.isArray(freshQ)) {
      setQueue(freshQ);
    }
  };

  useEffect(() => {
    loadData();

    // Poll every 3 seconds to guarantee instant multi-device sync
    const interval = setInterval(loadData, 3000);

    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [organization.id]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const orgSlug = (organization?.slug || '').trim();
  const queueUrl = `${origin}/fila/${orgSlug}`;

  // Filter items
  const filteredQueue = queue.filter(item => {
    if (selectedProfFilter === 'ALL') return true;
    return item.preferredProfessionalId === selectedProfFilter || item.assignedProfessionalId === selectedProfFilter;
  });

  const waitingItems = filteredQueue.filter(q => q.status === 'AGUARDANDO' || q.status === 'PROXIMO');
  const nextItem = waitingItems.find(q => q.status === 'PROXIMO') || waitingItems[0];
  const calledItems = filteredQueue.filter(
    q => q.status === 'CHAMADO' || q.status === 'A_CAMINHO' || q.status === 'PEDIU_TOLERANCIA'
  );
  const onChairItems = filteredQueue.filter(q => q.status === 'NA CADEIRA');
  const finishedItems = filteredQueue.filter(q => q.status === 'FINALIZADO');
  const droppedItems = filteredQueue.filter(q => q.status === 'DESISTIU' || q.status === 'CANCELADO' || q.status === 'NAO_COMPARECEU');

  // BIG BUTTON: CHAMAR PRÓXIMO CLIENTE (#Requirement 5 & #Requirement 8 & 9)
  const handleCallNext = async () => {
    const targetProfId = selectedProfFilter !== 'ALL' ? selectedProfFilter : professionals[0]?.id;
    const result = await StorageService.callNextCustomer(organization.id, targetProfId);

    if (result.success && result.item) {
      const push = result.pushResult;
      const isDelivered = push?.status === 'DELIVERED_TO_PUSH_SERVICE';
      const isNoDevice = push?.status === 'NO_DEVICE_REGISTERED';

      setCallFeedback({
        type: isDelivered ? 'success' : isNoDevice ? 'warning' : 'error',
        title: isDelivered
          ? '✂️ Push Entregue aos Servidores (HTTP 201)'
          : isNoDevice
          ? '⚠️ Chamado na Fila (Sem Dispositivo Push Ativo)'
          : '⚠️ Falha no Envio Push Remoto',
        message: isDelivered
          ? `Cliente ${result.item.customerName} (Senha #${result.item.ticketNumber}) chamado! Notificação push enviada com som e vibração para o aparelho.`
          : isNoDevice
          ? `Cliente ${result.item.customerName} (Senha #${result.item.ticketNumber}) chamado na fila, mas NÃO ativou notificações no aparelho. Chame verbalmente ou envie WhatsApp.`
          : `Cliente chamado, mas ocorreu falha no envio do push remoto: ${push?.message || 'Erro'}`,
        customerName: result.item.customerName,
        pushStatus: push?.status,
        httpStatus: push?.httpStatus,
        phone: result.item.customerPhone,
      });
      loadData();
    } else {
      setCallFeedback({
        type: 'error',
        title: 'Nenhum cliente disponível',
        message: result.error || 'Nenhum cliente aguardando na fila no momento.',
      });
    }

    setTimeout(() => setCallFeedback(null), 8000);
  };

  // Specific item call
  const handleCallSpecific = async (item: WaitingQueueItem, profId?: string) => {
    const targetProf = profId || item.preferredProfessionalId || professionals[0]?.id;
    if (!targetProf) return;

    try {
      const res = await StorageService.callQueueCustomer(item.id, targetProf);
      const push = res?.pushResult;
      const isDelivered = push?.status === 'DELIVERED_TO_PUSH_SERVICE';
      const isNoDevice = push?.status === 'NO_DEVICE_REGISTERED';

      setCallFeedback({
        type: isDelivered ? 'success' : isNoDevice ? 'warning' : 'error',
        title: isDelivered
          ? '✂️ Push Entregue com Sucesso (HTTP 201)'
          : isNoDevice
          ? '⚠️ Chamado sem Push Remoto'
          : '⚠️ Erro no Push',
        message: isDelivered
          ? `Notificação push entregue com sucesso ao aparelho de ${item.customerName} (Senha #${item.ticketNumber})!`
          : isNoDevice
          ? `Cliente chamado. Aparelho não possui token de push ativo. Chame pelo nome ou WhatsApp.`
          : `Erro no envio push: ${push?.message || 'Falha'}`,
        customerName: item.customerName,
        pushStatus: push?.status,
        httpStatus: push?.httpStatus,
        phone: item.customerPhone,
      });
      loadData();
    } catch (e: any) {
      setCallFeedback({
        type: 'error',
        title: 'Erro',
        message: e?.message || 'Erro ao chamar cliente.',
      });
    }
    setTimeout(() => setCallFeedback(null), 7000);
  };

  const handleMoveToChair = (item: WaitingQueueItem) => {
    const prof = professionals.find(p => p.id === item.assignedProfessionalId) || professionals[0];
    StorageService.moveQueueToChair(item.id, prof?.id);
    loadData();
  };

  const handleFinish = (item: WaitingQueueItem) => {
    StorageService.finishQueueItem(item.id, 'PIX');
    loadData();
  };

  const handleMarkNoShow = (item: WaitingQueueItem) => {
    if (confirm(`Marcar ${item.customerName} como 'Não Compareceu' e liberar a cadeira?`)) {
      StorageService.markCalledCustomerNoShow(item.id);
      loadData();
    }
  };

  const handleCancel = (item: WaitingQueueItem) => {
    const reason = prompt('Motivo do cancelamento/desistência:', 'Cliente desistiu');
    if (reason !== null) {
      StorageService.cancelQueueItem(item.id, reason);
      loadData();
    }
  };

  // Add Walk-in Customer
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newServiceId) return;

    await StorageService.joinQueue({
      organizationId: organization.id,
      customerName: newName.trim(),
      customerPhone: newPhone.trim() || '(Balcão Presencial)',
      serviceId: newServiceId,
      preferredProfessionalId: newProfId || undefined,
      notes: newNotes.trim() ? `[Presencial] ${newNotes.trim()}` : '[Presencial Balcão]',
    });

    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setShowAddModal(false);
    loadData();
  };

  const calculateMinutesWaiting = (joinedAt: string) => {
    const diff = Date.now() - new Date(joinedAt).getTime();
    return Math.max(1, Math.round(diff / 60000));
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback (#Requirement 8 - Never display misleading success) */}
      {callFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs shadow-xl animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            callFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : callFeedback.type === 'warning'
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {callFeedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : callFeedback.type === 'warning' ? (
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <strong className="text-white font-bold text-xs">{callFeedback.title}</strong>
                {callFeedback.httpStatus && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-900 text-emerald-400 border border-emerald-500/30">
                    HTTP {callFeedback.httpStatus}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">{callFeedback.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {callFeedback.phone && callFeedback.type === 'warning' && (
              <a
                href={`https://wa.me/55${callFeedback.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Olá ${callFeedback.customerName || ''}! Sua vez chegou na barbearia. Pode se aproximar para seu atendimento!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Avisar no WhatsApp</span>
              </a>
            )}
            <button
              onClick={() => setCallFeedback(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* TOP HERO: GIANT "CHAMAR PRÓXIMO CLIENTE" BUTTON (#Requirement 5) */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Fila Virtual Inteligente • Painel Operacional</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Controle da Fila em Tempo Real
            </h2>

            {nextItem ? (
              <div className="flex items-center gap-3 text-xs text-slate-300 pt-1">
                <span className="text-amber-400 font-bold">Próximo a ser chamado:</span>
                <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg">
                  {nextItem.customerName} (#{nextItem.ticketNumber})
                </span>
                <span className="text-slate-400">({nextItem.serviceName})</span>
                <span className="text-slate-500">· Aguardando há {calculateMinutesWaiting(nextItem.joinedAt)} min</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Não há clientes aguardando no momento. Compartilhe o QR Code da fila ou adicione clientes no balcão.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* BIG CALL BUTTON */}
            <button
              onClick={handleCallNext}
              disabled={waitingItems.length === 0}
              className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 px-8 py-5 text-sm sm:text-base font-black text-slate-950 shadow-2xl shadow-amber-500/30 transition-all transform active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ring-4 ring-amber-500/20 animate-pulse hover:animate-none"
            >
              <BellRing className="h-6 w-6 text-slate-950" />
              <span>CHAMAR PRÓXIMO CLIENTE</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-5 py-5 text-xs font-bold text-white transition cursor-pointer"
            >
              <UserPlus className="h-4 w-4 text-amber-400" />
              <span>Adicionar no Balcão</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & STATS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        {/* Category Tabs (#Requirement 6) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ACTIVE'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Aguardando ({waitingItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CALLED')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CALLED'
                ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/40'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>Chamados ({calledItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CHAIR')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CHAIR'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Armchair className="h-3.5 w-3.5" />
            <span>Na Cadeira ({onChairItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('FINISHED')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'FINISHED'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Finalizados ({finishedItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DROPPED')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DROPPED'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <X className="h-3.5 w-3.5" />
            <span>Desistências ({droppedItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'LOGS'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <BellRing className="h-3.5 w-3.5 text-amber-400" />
            <span>Auditoria Push ({pushLogs.length})</span>
          </button>
        </div>

        {/* Professional Filter & Actions */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProfFilter}
            onChange={(e) => setSelectedProfFilter(e.target.value)}
            className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todas as Cadeiras (Geral)</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {onNavigateToQueue && (
            <button
              onClick={() => onNavigateToQueue(organization.slug)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition cursor-pointer"
              title="Abrir a tela da fila virtual do cliente"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Abrir Fila Pública</span>
            </button>
          )}

          <button
            onClick={() => setShowQR(true)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Ver QR Code da Fila"
          >
            <QrCode className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CONTENT LIST */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {/* TAB 1: ACTIVE WAITING ITEMS */}
        {activeTab === 'ACTIVE' && (
          <div className="divide-y divide-slate-800">
            {waitingItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <Clock className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">Nenhum cliente aguardando na fila no momento.</p>
                <p className="text-slate-500 mt-1">
                  Os clientes que entrarem pelo link público ou QR Code aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              waitingItems.map((item, index) => {
                const isNext = item.status === 'PROXIMO' || index === 0;
                const minutesWaiting = calculateMinutesWaiting(item.joinedAt);

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                      isNext ? 'bg-amber-500/5 border-l-4 border-amber-500' : 'hover:bg-slate-850/40'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      {/* Position Badge */}
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-slate-800 border border-slate-700 shrink-0 font-mono">
                        <span className="text-[10px] text-slate-400">Posição</span>
                        <span className="text-base font-black text-amber-400">#{index + 1}º</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.customerName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300 border border-slate-700">
                            Senha #{item.ticketNumber}
                          </span>
                          {isNext && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase animate-pulse">
                              É o Próximo
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>Serviço: <strong className="text-slate-200">{item.serviceName}</strong></span>
                          <span>·</span>
                          <span>Contato: <strong className="text-slate-300 font-mono">{item.customerPhone}</strong></span>
                          <span>·</span>
                          <span>Espera: <strong className="text-amber-300">{minutesWaiting} min</strong></span>
                          {item.notes && (
                            <>
                              <span>·</span>
                              <span className="italic text-slate-400">"{item.notes}"</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleCallSpecific(item)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
                        title="Chamar cliente individualmente"
                      >
                        <BellRing className="h-3.5 w-3.5" />
                        <span>Chamar Agora</span>
                      </button>

                      <button
                        onClick={() => handleCancel(item)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Remover da fila"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: CALLED ITEMS (WITH TOLERANCE COUNTDOWN & CLIENT RESPONSES) */}
        {activeTab === 'CALLED' && (
          <div className="divide-y divide-slate-800">
            {calledItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <BellRing className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">Nenhum cliente chamado aguardando chegada.</p>
              </div>
            ) : (
              calledItems.map((item) => {
                const calledAtDate = item.calledAt ? new Date(item.calledAt) : new Date();
                const minutesSinceCall = Math.max(0, Math.floor((Date.now() - calledAtDate.getTime()) / 60000));

                return (
                  <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-500/5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{item.customerName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300">
                          Senha #{item.ticketNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase animate-pulse">
                          Chamado há {minutesSinceCall} min
                        </span>
                      </div>

                      {/* Client response badge (#Requirement 7) */}
                      <div className="flex items-center gap-2 text-xs">
                        {item.clientResponse === 'A_CAMINHO' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                            <Check className="h-3.5 w-3.5" />
                            <span>Cliente confirmou: Está a caminho!</span>
                          </span>
                        ) : item.clientResponse === 'PEDIU_TOLERANCIA' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Cliente solicitou +3 min de tolerância</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            Aguardando resposta ou chegada do cliente na barbearia...
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>Serviço: <strong className="text-slate-200">{item.serviceName}</strong></span>
                        <span>·</span>
                        <span>Telefone: <strong className="text-slate-300 font-mono">{item.customerPhone}</strong></span>
                      </div>

                      {/* Push Delivery Status Badge (#Requirement 8) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {item.pushDeliveryStatus === 'DELIVERED_TO_PUSH_SERVICE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span>Push Entregue ao Aparelho (HTTP {item.pushHttpStatus || 201})</span>
                          </span>
                        )}
                        {item.pushDeliveryStatus === 'NO_DEVICE_REGISTERED' && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            title="O cliente não ativou notificações push no celular"
                          >
                            <AlertCircle className="h-3 w-3 text-amber-400" />
                            <span>Sem Push Registrado (Avisar Presencial/WhatsApp)</span>
                          </span>
                        )}
                        {item.pushDeliveryStatus === 'PUSH_SERVICE_ERROR' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <AlertCircle className="h-3 w-3 text-rose-400" />
                            <span>Falha no Push Remoto: {item.pushDeliveryMessage || 'Erro'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleMoveToChair(item)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
                      >
                        <Armchair className="h-3.5 w-3.5" />
                        <span>Colocar na Cadeira</span>
                      </button>

                      <button
                        onClick={() => handleMarkNoShow(item)}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                        title="Marcar como não compareceu e liberar cadeira"
                      >
                        <span>Não Compareceu</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: ON CHAIR */}
        {activeTab === 'CHAIR' && (
          <div className="divide-y divide-slate-800">
            {onChairItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <Armchair className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">Nenhum cliente em atendimento na cadeira neste momento.</p>
              </div>
            ) : (
              onChairItems.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.customerName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-300">
                        Senha #{item.ticketNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white uppercase">
                        Em Atendimento
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Serviço: <strong className="text-slate-200">{item.serviceName}</strong> · Iniciado às {item.onChairAt ? new Date(item.onChairAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleFinish(item)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Finalizar Atendimento</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: FINISHED */}
        {activeTab === 'FINISHED' && (
          <div className="divide-y divide-slate-800">
            {finishedItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <CheckCircle2 className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">Nenhum atendimento finalizado hoje ainda.</p>
              </div>
            ) : (
              finishedItems.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">{item.customerName}</span>
                    <span className="text-slate-400 block mt-0.5">
                      {item.serviceName} · Senha #{item.ticketNumber} · Concluído às {item.finishedAt ? new Date(item.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                    Concluído
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 5: DROPPED & NO SHOW */}
        {activeTab === 'DROPPED' && (
          <div className="divide-y divide-slate-800">
            {droppedItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Nenhuma desistência registrada hoje.</p>
              </div>
            ) : (
              droppedItems.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">{item.customerName}</span>
                    <span className="text-slate-400 block mt-0.5">
                      {item.serviceName} · Senha #{item.ticketNumber} · Motivo: {item.notes || 'Desistiu'}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      item.status === 'NAO_COMPARECEU'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.status === 'NAO_COMPARECEU' ? 'Não Compareceu' : 'Desistiu'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 6: PUSH AUDIT & DELIVERY LOGS (#Requirement 8 & 9) */}
        {activeTab === 'LOGS' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-amber-400" />
                  <span>Histórico de Disparos de Notificação Push Remota</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registro em tempo real de todas as notificações enviadas aos celulares dos clientes via Google FCM / Apple APNs.
                </p>
              </div>

              <button
                onClick={loadPushLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                <span>Atualizar Logs</span>
              </button>
            </div>

            {pushLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <BellRing className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">Nenhum disparo registrado ainda.</p>
                <p className="text-slate-500 mt-1">Ao chamar clientes na fila, cada evento de push com status HTTP 201 será auditado aqui.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Horário</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Tipo de Notificação</th>
                      <th className="p-3">Status de Entrega</th>
                      <th className="p-3">Serviço Remoto</th>
                      <th className="p-3">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {pushLogs.map((log: any) => {
                      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--';
                      const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) : '';
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono text-slate-400">
                            {dateStr} {timeStr}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-white">{log.customerName}</span>
                            {log.ticketNumber > 0 && (
                              <span className="ml-1.5 text-[10px] text-amber-400 font-mono">#{log.ticketNumber}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {log.type === 'CALLED' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ✂️ Chegou sua vez!
                              </span>
                            ) : log.type === 'NEXT' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                💈 Você é o próximo
                              </span>
                            ) : log.type === 'STEP_3' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                ⏳ Está chegando sua vez
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                🧪 Teste de Conexão
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {log.status === 'DELIVERED_TO_PUSH_SERVICE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                <span>Entregue (HTTP {log.httpStatus || 201})</span>
                              </span>
                            ) : log.status === 'NO_DEVICE_REGISTERED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertCircle className="h-3 w-3 text-amber-400" />
                                <span>Sem Dispositivo</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <X className="h-3 w-3 text-rose-400" />
                                <span>Falha</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {log.endpointDomain && log.endpointDomain !== 'none'
                              ? log.endpointDomain.includes('google')
                                ? 'Google FCM'
                                : log.endpointDomain.includes('apple')
                                ? 'Apple APNs'
                                : log.endpointDomain
                              : 'Nenhum'}
                          </td>
                          <td className="p-3 text-slate-300 text-[11px] max-w-xs truncate" title={log.message}>
                            {log.message}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: ADD CLIENT MANUALLY (WALK-IN) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-white">Adicionar Cliente no Balcão</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João Victor"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Telefone / WhatsApp (Opcional)</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Serviço *</label>
                <select
                  required
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — R$ {s.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Profissional (Opcional)</label>
                <select
                  value={newProfId}
                  onChange={(e) => setNewProfId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Qualquer barbeiro disponível</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Sentado no sofá da recepção"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-750 py-2.5 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                >
                  Inserir na Fila
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title="Fila Virtual Inteligente"
        subtitle="Aponte a câmera para entrar na fila pelo celular"
        url={queueUrl}
        establishmentName={organization.name}
        onNavigateDirectly={() => onNavigateToQueue?.(organization.slug)}
      />
    </div>
  );
};
