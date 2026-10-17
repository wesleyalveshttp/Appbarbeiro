import React, { useState, useEffect } from 'react';
import {
  Clock,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Share2,
  QrCode,
  ArrowRight,
  UserCheck,
  Armchair,
  Volume2,
  LogOut,
  Bell,
  BellRing,
  Vibrate,
  Smartphone,
  Sparkles,
  RefreshCw,
  Send,
  HelpCircle,
  ShieldCheck,
  User
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { NotificationService, PushPermissionState } from '../../services/notificationService';
import { Organization, WaitingQueueItem, Service, Professional } from '../../types';
import { QRCodeModal } from '../common/QRCodeModal';
import { getPublicBaseUrl } from '../../utils/publicUrl';

interface PublicQueueProps {
  slug: string;
  onBackToHome: () => void;
  onNavigateToBooking: (slug: string) => void;
}

export const PublicQueue: React.FC<PublicQueueProps> = ({
  slug,
  onBackToHome,
  onNavigateToBooking,
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [queue, setQueue] = useState<WaitingQueueItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // My Ticket (stored in localStorage for persistent client tracking)
  const [myTicketId, setMyTicketId] = useState<string | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [preferredProfId, setPreferredProfId] = useState('');
  const [notes, setNotes] = useState('');

  // Notification & Audio/Vibration State
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default');
  const [testNotificationFeedback, setTestNotificationFeedback] = useState<string | null>(null);
  const [hasPlayedChime, setHasPlayedChime] = useState(false);

  // Tolerance countdown for called client
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [showQR, setShowQR] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [orgNotFound, setOrgNotFound] = useState(false);

  const loadData = async () => {
    if (!slug) {
      setOrgNotFound(true);
      setIsLoading(false);
      return;
    }
    try {
      // 1. Authoritative fetch of establishment, services, professionals, and queue
      const data = await StorageService.fetchPublicEstablishment(slug);
      if (data && data.organization) {
        setOrganization(data.organization);
        setOrgNotFound(false);
        setServices(data.services || []);
        setProfessionals(data.professionals || []);
        setQueue(data.queue || []);
        if (!selectedServiceId && data.services?.length > 0) {
          setSelectedServiceId(data.services[0].id);
        }
      } else {
        // Fallback to local storage if present
        const localOrg = StorageService.getOrganizationBySlug(slug);
        if (localOrg) {
          setOrganization(localOrg);
          setOrgNotFound(false);
          const srvs = StorageService.getServices(localOrg.id).filter(s => s.isActive);
          const profs = StorageService.getProfessionals(localOrg.id).filter(p => p.isActive);
          setServices(srvs);
          setProfessionals(profs);
          const q = await StorageService.fetchQueue(localOrg.id);
          setQueue(q || []);
          if (!selectedServiceId && srvs.length > 0) setSelectedServiceId(srvs[0].id);
        } else {
          setOrgNotFound(true);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados da fila pública:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check permission state
    setPermissionState(NotificationService.getPermissionStatus());

    // Restore my ticket if active in localStorage or via URL param (?ticket=id)
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlTicket = urlParams?.get('ticket') || urlParams?.get('token');
    const savedTicket = urlTicket || localStorage.getItem(`barberos_queue_ticket_${slug}`);
    if (savedTicket) {
      setMyTicketId(savedTicket);
      localStorage.setItem(`barberos_queue_ticket_${slug}`, savedTicket);
    }

    loadData();

    // 3s interval polling to ensure client sees realtime updates
    const interval = setInterval(loadData, 3000);

    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [slug]);

  // Find My Item
  const myQueueItem = queue.find(q => q.id === myTicketId);
  const isCurrentlyInQueue =
    !!myQueueItem &&
    myQueueItem.status !== 'FINALIZADO' &&
    myQueueItem.status !== 'CANCELADO' &&
    myQueueItem.status !== 'DESISTIU' &&
    myQueueItem.status !== 'NAO_COMPARECEU';

  // Calculate my position among active waiting items
  const activeWaitingList = queue.filter(
    q =>
      q.status === 'AGUARDANDO' ||
      q.status === 'PROXIMO' ||
      q.status === 'CHAMADO' ||
      q.status === 'A_CAMINHO' ||
      q.status === 'PEDIU_TOLERANCIA'
  );
  const myPositionIndex = myQueueItem ? activeWaitingList.findIndex(q => q.id === myQueueItem.id) : -1;
  const peopleAhead = myPositionIndex > 0 ? myPositionIndex : 0;
  const estimatedTime = myQueueItem ? myQueueItem.estimatedWaitMinutes : (peopleAhead + 1) * 20;

  // Approximate forecast clock time (e.g. "17:45")
  const forecastTimeStr = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + estimatedTime);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  // Sound & Vibration alert when status changes to PROXIMO or CHAMADO
  useEffect(() => {
    if (myQueueItem && (myQueueItem.status === 'CHAMADO' || myQueueItem.status === 'PROXIMO') && !hasPlayedChime) {
      if (myQueueItem.status === 'CHAMADO') {
        NotificationService.playSound('CALLED');
        NotificationService.vibrate([400, 150, 400, 150, 800, 200, 800]);
      } else {
        NotificationService.playSound('NEXT');
        NotificationService.vibrate([300, 150, 300, 150, 300]);
      }
      setHasPlayedChime(true);
    }
  }, [myQueueItem?.status, hasPlayedChime]);

  // Tolerance countdown timer when called
  useEffect(() => {
    if (!myQueueItem?.calledToleranceExpiresAt) {
      setSecondsRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const expiry = new Date(myQueueItem.calledToleranceExpiresAt!).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setSecondsRemaining(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [myQueueItem?.calledToleranceExpiresAt]);

  const handleRequestNotificationPermission = async () => {
    if (!organization) return;
    const perm = await NotificationService.requestPermission();
    setPermissionState(perm);
    if (perm === 'granted') {
      const subResult = await NotificationService.subscribeToRemotePush({
        organizationId: organization.id,
        queueItemId: myTicketId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      });

      NotificationService.playSound('NEXT');
      NotificationService.vibrate([200, 100, 200]);
      if (subResult.success) {
        setTestNotificationFeedback('✅ Notificações push ativadas com sucesso no aparelho! Seu celular irá vibrar e tocar mesmo em segundo plano.');
      } else {
        setTestNotificationFeedback('Permissão concedida no navegador. Alertas ao vivo com som e vibração ativos.');
      }
      setTimeout(() => setTestNotificationFeedback(null), 6000);
    }
  };

  const handleTestNotification = async () => {
    setTestNotificationFeedback('Disparando alerta de teste via servidor push...');
    NotificationService.playSound('CALLED');
    NotificationService.vibrate([400, 150, 400, 150, 800]);

    const testRes = await NotificationService.sendTestPush();
    if (testRes.success) {
      setTestNotificationFeedback(`✅ Alerta de teste enviado pelo servidor (Status: ${testRes.status})! Verifique a vibração e notificação do aparelho.`);
    } else {
      // Fallback direct notification
      await NotificationService.dispatchNotification({
        title: '✂️ Teste de Notificação — BarberOS',
        body: 'Seu celular está configurado! Alertas com som e vibração habilitados.',
        type: 'CALLED',
      });
      setTestNotificationFeedback('Teste concluído no navegador! Permissões de áudio e vibração verificadas.');
    }
    setTimeout(() => setTestNotificationFeedback(null), 6000);
  };

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    if (!customerName.trim() || !selectedServiceId) return;

    // Auto-request notifications if default
    let pushSub: any = undefined;
    if (NotificationService.isSupported()) {
      try {
        const perm = await NotificationService.requestPermission();
        setPermissionState(perm);
        if (perm === 'granted') {
          const subRes = await NotificationService.subscribeToRemotePush({
            organizationId: organization.id,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
          });
          if (subRes.success && subRes.subscription) {
            pushSub = subRes.subscription;
          }
        }
      } catch (err) {
        console.warn('Push subscription during join warning:', err);
      }
    }

    const newItem = await StorageService.joinQueue({
      organizationId: organization.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '(Celular Web)',
      serviceId: selectedServiceId,
      preferredProfessionalId: preferredProfId || undefined,
      notes: notes.trim() || undefined,
      notificationToken: NotificationService.getDeviceToken(),
      subscription: pushSub,
    });

    setMyTicketId(newItem.id);
    localStorage.setItem(`barberos_queue_ticket_${slug}`, newItem.id);
    setHasPlayedChime(false);
    loadData();
  };

  const handleLeaveQueue = async () => {
    if (!myQueueItem) return;
    if (confirm('Tem certeza que deseja sair da fila virtual de espera?')) {
      await StorageService.cancelQueueItem(myQueueItem.id, 'Cliente desistiu pelo celular');
      localStorage.removeItem(`barberos_queue_ticket_${slug}`);
      setMyTicketId(null);
      loadData();
    }
  };

  const handleRespondCalled = async (response: 'A_CAMINHO' | 'PEDIU_TOLERANCIA' | 'NAO_PODE') => {
    if (!myQueueItem) return;
    await StorageService.respondCalledQueueItem(myQueueItem.id, response);
    loadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="text-xs text-slate-400 font-medium">Carregando fila virtual...</p>
      </div>
    );
  }

  if (orgNotFound || !organization) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Barbearia Não Encontrada</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              O link <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-400 font-mono">/fila/{slug}</code> não corresponde a nenhum estabelecimento cadastrado.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Verifique se o link ou QR Code foi compartilhado corretamente pelo responsável.
            </p>
          </div>
          <button
            onClick={onBackToHome}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <span>Voltar para a Página Inicial</span>
          </button>
        </div>
      </div>
    );
  }

  const origin = getPublicBaseUrl(organization);
  const queueUrl = `${origin}/fila/${slug}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
            title="Voltar ao início"
          >
            <Scissors className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">{organization.name}</h1>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-semibold text-emerald-400">Fila Virtual Inteligente ao Vivo</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 transition"
            title="Compartilhar QR Code da Fila"
          >
            <QrCode className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">QR Code</span>
          </button>
          <button
            onClick={() => onNavigateToBooking(organization.slug)}
            className="text-xs text-amber-400 hover:underline font-semibold px-2 py-1"
          >
            Agendamento
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-md px-4 pt-5 space-y-5">
        {/* PUSH NOTIFICATION PERMISSION ACTIVATION BANNER (#Requirement 3 & 4) */}
        {permissionState !== 'granted' && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-slate-900 border border-amber-500/40 p-4 text-xs shadow-lg space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Ativar Notificação com Som & Vibração</span>
                <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                  Não dependa de WhatsApp ou SMS. Permita que o próprio app avise e vibre seu celular quando chegar sua vez de cortar!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleRequestNotificationPermission}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 px-3 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
              >
                <Vibrate className="h-3.5 w-3.5" />
                <span>Ativar Alerta no Celular</span>
              </button>
              <button
                onClick={handleTestNotification}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 px-3 text-[11px] font-semibold text-slate-300 transition cursor-pointer"
                title="Testar som e vibração"
              >
                Testar Som
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATION FEEDBACK TOAST */}
        {testNotificationFeedback && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{testNotificationFeedback}</span>
          </div>
        )}

        {/* CASE 1: CLIENT IS ACTIVELY IN QUEUE (#Requirement 2, 3, 7) */}
        {isCurrentlyInQueue && myQueueItem ? (
          <div className="space-y-5">
            {/* ALERT STATE 1: CALLED TO CHAIR ("CHEGOU SUA VEZ") */}
            {(myQueueItem.status === 'CHAMADO' ||
              myQueueItem.status === 'A_CAMINHO' ||
              myQueueItem.status === 'PEDIU_TOLERANCIA') && (
              <div className="rounded-3xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-slate-950 p-6 text-center shadow-2xl space-y-4 border-2 border-emerald-300 animate-pulse">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-emerald-400 font-bold shadow-lg">
                  <Scissors className="h-7 w-7 animate-bounce" />
                </div>

                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider bg-slate-950 text-emerald-300 px-3 py-1 rounded-full">
                    Aviso do Barbeiro
                  </span>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 leading-tight">
                    ✂️ CHEGOU SUA VEZ!
                  </h2>
                  <p className="mt-1 text-xs font-bold text-slate-900 leading-relaxed">
                    Seu barbeiro está pronto para atender você ({myQueueItem.serviceName}). Dirija-se à cadeira agora!
                  </p>
                </div>

                {/* Tolerance Countdown Timer (#Requirement 7) */}
                {secondsRemaining !== null && (
                  <div className="p-3 rounded-2xl bg-slate-950/90 text-white border border-emerald-400/30">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      Tempo de Tolerância para Comparecer:
                    </span>
                    <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                      {Math.floor(secondsRemaining / 60)}:
                      {(secondsRemaining % 60).toString().padStart(2, '0')} min
                    </div>
                    {secondsRemaining === 0 && (
                      <span className="text-[10px] text-rose-400 font-semibold block mt-1">
                        Prazo expirado. Aproxime-se imediatamente para não perder a vez!
                      </span>
                    )}
                  </div>
                )}

                {/* CLIENT INTERACTIVE ACTIONS (#Requirement 7) */}
                <div className="space-y-2 pt-1">
                  {myQueueItem.clientResponse === 'A_CAMINHO' ? (
                    <div className="p-3 rounded-xl bg-slate-950 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 border border-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Você confirmou: A caminho da cadeira!</span>
                    </div>
                  ) : myQueueItem.clientResponse === 'PEDIU_TOLERANCIA' ? (
                    <div className="p-3 rounded-xl bg-slate-950 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 border border-amber-400">
                      <Clock className="h-4 w-4" />
                      <span>Tolerância adicional solicitada (+3 minutos).</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRespondCalled('A_CAMINHO')}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 text-xs shadow-lg transition cursor-pointer"
                      >
                        <UserCheck className="h-4 w-4 text-emerald-400" />
                        <span>Estou indo para o atendimento</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRespondCalled('PEDIU_TOLERANCIA')}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-900 font-bold py-2.5 text-[11px] transition cursor-pointer border border-slate-900"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>Preciso de +3 min</span>
                        </button>

                        <button
                          onClick={() => handleRespondCalled('NAO_PODE')}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white font-bold py-2.5 text-[11px] transition cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Não posso ir</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ALERT STATE 2: NEXT IN LINE ("VOCÊ É O PRÓXIMO") */}
            {myQueueItem.status === 'PROXIMO' && (
              <div className="rounded-3xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 p-6 text-center shadow-2xl space-y-2 border-2 border-amber-300">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-amber-400 font-bold shadow-md">
                  <Clock className="h-5 w-5 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Você é o próximo da fila! 💈</h2>
                <p className="text-xs text-slate-900 font-bold leading-relaxed">
                  Prepare-se para o atendimento! Aproxime-se da barbearia. Faltam cerca de 5 minutos para a chamada.
                </p>
              </div>
            )}

            {/* ALERT STATE 3: ON CHAIR */}
            {myQueueItem.status === 'NA CADEIRA' && (
              <div className="rounded-3xl bg-emerald-600 text-white p-6 text-center shadow-2xl space-y-2">
                <Armchair className="h-8 w-8 mx-auto text-emerald-200" />
                <h2 className="text-2xl font-black">Você está na cadeira!</h2>
                <p className="text-xs text-emerald-100 font-medium">
                  Atendimento em andamento com o barbeiro. Relaxe e aproveite o melhor estilo!
                </p>
              </div>
            )}

            {/* STATUS REASSURANCE WHEN WAITING (#Requirement 1) */}
            {myQueueItem.status === 'AGUARDANDO' && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-200 leading-relaxed flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold mb-0.5">Você está na Fila Virtual:</strong>
                  Fique à vontade para aguardar onde quiser (em casa, no trabalho ou em um café). Seu celular vai vibrar e emitir um sinal sonoro assim que sua vaga se aproximar!
                </div>
              </div>
            )}

            {/* LIVE TICKET CARD (#Requirement 2) */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-center shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Barbearia
                  </span>
                  <span className="text-sm font-bold text-white">{organization.name}</span>
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-slate-800 text-amber-300 font-mono text-xs font-bold border border-slate-700">
                  Senha #{myQueueItem.ticketNumber}
                </div>
              </div>

              {/* Position Counter */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Sua Posição Atual na Fila
                </span>
                <div className="mt-2 text-6xl sm:text-7xl font-black text-white font-mono tracking-tight text-shadow-lg">
                  #{myPositionIndex + 1}º
                </div>
                <span className="text-[11px] text-emerald-400 font-bold block mt-1">
                  {myPositionIndex === 0
                    ? 'Você é o primeiro da fila!'
                    : `${peopleAhead} ${peopleAhead === 1 ? 'pessoa' : 'pessoas'} à sua frente`}
                </span>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-left">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Tempo Estimado</span>
                  <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
                    ~{estimatedTime} min
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Previsão: {forecastTimeStr}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-left">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status do Atendimento</span>
                  <div className="text-sm font-black text-white uppercase mt-1 truncate">
                    {myQueueItem.status === 'PROXIMO'
                      ? 'É o Próximo'
                      : myQueueItem.status === 'CHAMADO'
                      ? 'Chamado!'
                      : myQueueItem.status === 'NA CADEIRA'
                      ? 'Na Cadeira'
                      : 'Aguardando'}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">Ao vivo</span>
                </div>
              </div>

              {/* Ticket Details Summary */}
              <div className="text-left text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-bold text-white">{myQueueItem.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Serviço:</span>
                  <span className="text-slate-200 font-semibold">{myQueueItem.serviceName}</span>
                </div>
                {myQueueItem.preferredProfessionalId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profissional:</span>
                    <span className="text-amber-300 font-medium">
                      {professionals.find(p => p.id === myQueueItem.preferredProfessionalId)?.name || 'Qualquer'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Notificações no Celular:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Vibrate className="h-3 w-3" />
                    <span>Som & Vibração Ativos</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons & Individual Tracking Link */}
              <div className="space-y-2 pt-2">
                {/* Individual Tracking Link Box */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Seu Link Individual de Acompanhamento:</span>
                    <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">Exclusivo</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 bg-slate-900 p-2 rounded-xl border border-slate-800 truncate">
                    {`${origin}/fila/${slug}?ticket=${myQueueItem.id}`}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${origin}/fila/${slug}?ticket=${myQueueItem.id}`;
                        navigator.clipboard.writeText(url);
                        setTestNotificationFeedback('✅ Link individual copiado! Você pode abri-lo em outro aparelho ou navegador.');
                        setTimeout(() => setTestNotificationFeedback(null), 4000);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5 text-amber-400" />
                      <span>Copiar Link</span>
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Acompanhe minha posição na fila da ${organization.name}: ${origin}/fila/${slug}?ticket=${myQueueItem.id}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                <button
                  onClick={handleTestNotification}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 py-2.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  <Bell className="h-3.5 w-3.5 text-amber-400" />
                  <span>Testar Alerta Sonoro & Vibração no Celular</span>
                </button>

                <button
                  onClick={handleLeaveQueue}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-850 py-3 text-xs font-semibold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Desistir e Sair da Fila</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CASE 2: CLIENT NOT IN QUEUE YET -> FAST 1-CLICK JOIN FORM (#Requirement 9) */
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Scissors className="h-3.5 w-3.5" />
                <span>{organization.name}</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Fila Virtual Inteligente</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Entre na fila pelo seu celular e acompanhe sua posição ao vivo. Você não precisa esperar no local: o app apita e vibra seu aparelho quando for sua vez!
              </p>
            </div>

            {/* Queue Live Status Snapshot */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between text-xs shadow-md">
              <div>
                <span className="text-slate-400 font-medium">Pessoas na fila agora:</span>
                <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                  {activeWaitingList.length} {activeWaitingList.length === 1 ? 'pessoa' : 'pessoas'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-medium">Espera aproximada:</span>
                <div className="text-2xl font-black text-slate-200 font-mono mt-0.5">
                  ~{Math.max(10, activeWaitingList.length * 20)} min
                </div>
              </div>
            </div>

            {/* Quick 1-Click Form */}
            <form onSubmit={handleJoinQueue} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Seu Nome *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Pedro Ramos"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Seu Celular / WhatsApp <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                  <Smartphone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Serviço Desejado *
                </label>
                <select
                  required
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-3 text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — R$ {s.price.toFixed(2)} ({s.durationMinutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Profissional de Preferência
                </label>
                <select
                  value={preferredProfId}
                  onChange={(e) => setPreferredProfId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-3 text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Qualquer profissional disponível (Mais Rápido)</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Observação <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Estou no café em frente aguardando"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 py-4 text-xs font-black text-slate-950 shadow-xl shadow-amber-500/25 transition cursor-pointer"
              >
                <span>ENTRAR NA FILA VIRTUAL AGORA</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* QR MODAL */}
      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title="Fila Virtual Inteligente"
        subtitle="Aponte a câmera para entrar na fila pelo celular"
        url={queueUrl}
        establishmentName={organization.name}
      />
    </div>
  );
};
