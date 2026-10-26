import React, { useState, useEffect, useRef } from 'react';
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
  User,
  Users,
  Download,
  ChevronDown,
  ChevronUp,
  MessageCircle
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
const maskCustomerName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***` : parts[0];
  }
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const formatPhoneInput = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

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
  const [myDirectTicketItem, setMyDirectTicketItem] = useState<WaitingQueueItem | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [preferredProfId, setPreferredProfId] = useState('');
  const [notes, setNotes] = useState('');

  // Notification & Audio/Vibration State
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default');
  const [testNotificationFeedback, setTestNotificationFeedback] = useState<string | null>(null);
  const lastAlertedStatusRef = useRef<string | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isVisualVibrating, setIsVisualVibrating] = useState(false);
  const [showQueueList, setShowQueueList] = useState(false);

  useEffect(() => {
    const handleVibrateEvent = () => {
      setIsVisualVibrating(true);
      setTimeout(() => setIsVisualVibrating(false), 2000);
    };

    const handlePushReceived = () => {
      setIsVisualVibrating(true);
      loadData();
      setTimeout(() => setIsVisualVibrating(false), 3000);
    };

    const handlePushClicked = () => {
      setIsVisualVibrating(true);
      loadData();
      setTimeout(() => setIsVisualVibrating(false), 3000);
    };

    window.addEventListener('barberos_vibrate', handleVibrateEvent);
    window.addEventListener('barberos_remote_push_alert', handlePushReceived);
    window.addEventListener('barberos_push_clicked', handlePushClicked);

    return () => {
      window.removeEventListener('barberos_vibrate', handleVibrateEvent);
      window.removeEventListener('barberos_remote_push_alert', handlePushReceived);
      window.removeEventListener('barberos_push_clicked', handlePushClicked);
    };
  }, [slug]);

  const [isLoading, setIsLoading] = useState(true);
  const [orgNotFound, setOrgNotFound] = useState(false);
  const [errorType, setErrorType] = useState<'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!slug) {
      setOrgNotFound(true);
      setErrorType('NOT_FOUND');
      setErrorMessage('Endereço da barbearia não informado.');
      setIsLoading(false);
      return;
    }
    try {
      // Authoritative fetch of establishment, services, professionals, and queue directly from Cloud DB
      const result = await StorageService.fetchPublicEstablishmentFull(slug);
      if (result.status === 'SUCCESS' && result.data?.organization) {
        setOrganization(result.data.organization);
        setOrgNotFound(false);
        setErrorType(null);
        setErrorMessage(null);
        setServices(result.data.services || []);
        setProfessionals(result.data.professionals || []);
        setQueue(result.data.queue || []);
        if (!selectedServiceId && result.data.services?.length > 0) {
          setSelectedServiceId(result.data.services[0].id);
        }
      } else if (result.status === 'NOT_FOUND') {
        setOrgNotFound(true);
        setErrorType('NOT_FOUND');
        setErrorMessage(result.error || 'Estabelecimento não encontrado para este link.');
      } else if (result.status === 'SERVER_ERROR') {
        setErrorType('SERVER_ERROR');
        setErrorMessage(result.error || 'Instabilidade temporária no servidor ou banco de dados.');
      } else if (result.status === 'NETWORK_ERROR') {
        setErrorType('NETWORK_ERROR');
        setErrorMessage(result.error || 'Falha de conexão com a internet. Verifique sua rede e tente novamente.');
      }

      // If customer has a ticket ID, fetch the exact real-time item status directly
      const currentTicketId = myTicketId || localStorage.getItem(`barberos_queue_ticket_${slug}`);
      if (currentTicketId) {
        try {
          const itemRes = await fetch(`/api/queue/item/${encodeURIComponent(currentTicketId)}`);
          if (itemRes.ok) {
            const itemData = await itemRes.json();
            if (itemData?.item) {
              setMyDirectTicketItem(itemData.item);
            }
          }
        } catch (itemErr) {
          console.warn('Personal ticket direct sync warning:', itemErr);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar dados da fila pública:', err);
      setErrorType('NETWORK_ERROR');
      setErrorMessage('Falha ao conectar com o servidor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check permission state
    setPermissionState(NotificationService.getPermissionStatus());

    // Unlock Web Audio API on first user gesture
    const unlock = () => {
      NotificationService.unlockAudio();
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });

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
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [slug]);

  // Find My Item (authoritative resolution from active queue or direct server record)
  const effectiveTicketId = myTicketId || (typeof window !== 'undefined' ? localStorage.getItem(`barberos_queue_ticket_${slug}`) : null);
  const queueItemFromList = queue.find(q => q.id === effectiveTicketId);
  const myQueueItem = queueItemFromList || myDirectTicketItem;

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

  const clientsOnChair = queue.filter(q => q.status === 'NA CADEIRA');
  const totalWaiting = activeWaitingList.length;
  const progressPercent = totalWaiting > 0
    ? Math.min(100, Math.max(10, Math.round(((totalWaiting - peopleAhead) / totalWaiting) * 100)))
    : 100;

  // Approximate forecast clock time (e.g. "17:45")
  const forecastTimeStr = (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + (estimatedTime || 10));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  // Sound, Vibration, and Push alert when status changes to PROXIMO, CHAMADO, or NA CADEIRA
  useEffect(() => {
    if (!myQueueItem) return;
    const currentStatus = myQueueItem.status;

    if (currentStatus !== lastAlertedStatusRef.current) {
      if (currentStatus === 'CHAMADO') {
        NotificationService.startRepeatingAlarm('CALLED', 3500);
        NotificationService.dispatchNotification({
          title: '✂️ O BARBEIRO ESTÁ TE CHAMANDO!',
          body: `Chegou a sua vez (${myQueueItem.serviceName})! Dirija-se à cadeira agora!`,
          type: 'CALLED',
          ticketNumber: myQueueItem.ticketNumber,
        });
        lastAlertedStatusRef.current = 'CHAMADO';
      } else if (currentStatus === 'NA CADEIRA') {
        NotificationService.stopRepeatingAlarm();
        NotificationService.playSound('CALLED');
        NotificationService.vibrate([400, 150, 400]);
        NotificationService.dispatchNotification({
          title: '💈 Você está na cadeira!',
          body: `Seu atendimento de ${myQueueItem.serviceName} começou!`,
          type: 'NEXT',
          ticketNumber: myQueueItem.ticketNumber,
        });
        lastAlertedStatusRef.current = 'NA CADEIRA';
      } else if (currentStatus === 'PROXIMO') {
        NotificationService.stopRepeatingAlarm();
        NotificationService.playSound('NEXT');
        NotificationService.vibrate([350, 150, 350, 150, 350]);
        NotificationService.dispatchNotification({
          title: '💈 Você é o próximo da fila!',
          body: `Prepare-se! Sua senha é #${myQueueItem.ticketNumber}. Faltam poucos minutos.`,
          type: 'NEXT',
          ticketNumber: myQueueItem.ticketNumber,
        });
        lastAlertedStatusRef.current = 'PROXIMO';
      } else {
        NotificationService.stopRepeatingAlarm();
        lastAlertedStatusRef.current = currentStatus;
      }
    }

    return () => {
      if (currentStatus !== 'CHAMADO') {
        NotificationService.stopRepeatingAlarm();
      }
    };
  }, [myQueueItem?.status]);

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
      serviceId: selectedServiceId || (services[0]?.id || ''),
      notificationToken: NotificationService.getDeviceToken(),
      subscription: pushSub,
    });

    setMyTicketId(newItem.id);
    localStorage.setItem(`barberos_queue_ticket_${slug}`, newItem.id);
    lastAlertedStatusRef.current = null;
    loadData();
  };

  const handleLeaveQueue = async () => {
    if (!myQueueItem) return;
    if (confirm('Tem certeza que deseja sair da fila virtual de espera?')) {
      NotificationService.stopRepeatingAlarm();
      await StorageService.cancelQueueItem(myQueueItem.id, 'Cliente desistiu pelo celular');
      localStorage.removeItem(`barberos_queue_ticket_${slug}`);
      setMyTicketId(null);
      setMyDirectTicketItem(null);
      loadData();
    }
  };

  const handleRespondCalled = async (response: 'A_CAMINHO' | 'PEDIU_TOLERANCIA' | 'NAO_PODE') => {
    if (!myQueueItem) return;
    NotificationService.stopRepeatingAlarm();
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

  if (errorType === 'SERVER_ERROR' || errorType === 'NETWORK_ERROR') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mx-auto">
            <RefreshCw className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              {errorType === 'NETWORK_ERROR'
                ? 'Falha de Conexão'
                : errorMessage?.includes('não configurado')
                ? 'Configuração Necessária'
                : errorMessage?.includes('Tabelas')
                ? 'Inicialização do Banco de Dados'
                : 'Aviso do Servidor'}
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {errorMessage || 'Não foi possível carregar as informações da fila no momento.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Seus dados e sua posição na fila continuam preservados no banco de dados.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setIsLoading(true);
                loadData();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Tentar Novamente</span>
            </button>
            <button
              onClick={onBackToHome}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-300 transition cursor-pointer border border-slate-700"
            >
              <span>Voltar para o Início</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (orgNotFound || !organization) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 mx-auto">
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

        {/* 1. PERMANENT BROWSER PUSH NOTIFICATION CARD (#User Request) */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/40 p-4 text-xs shadow-xl space-y-3">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-md ${
              permissionState === 'granted'
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-amber-500 text-slate-950 shadow-amber-500/20 animate-pulse'
            }`}>
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-sm">Notificações Push no Navegador</span>
                {permissionState === 'granted' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Ativas
                  </span>
                ) : permissionState === 'denied' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-bold text-rose-300">
                    <AlertCircle className="h-3 w-3" />
                    Bloqueadas
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                    <Sparkles className="h-3 w-3" />
                    Recomendado
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                Receba avisos instantâneos com som e vibração sobre a fila direto no seu navegador — sem depender de SMS ou WhatsApp!
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-800">
            {permissionState !== 'granted' ? (
              <button
                onClick={handleRequestNotificationPermission}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 px-4 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 transition cursor-pointer active:scale-98"
              >
                <BellRing className="h-4 w-4" />
                <span>Ativar Notificações Push no Navegador</span>
              </button>
            ) : (
              <div className="flex-1 flex items-center gap-2 text-emerald-400 text-xs font-semibold py-1">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Navegador configurado para apitar e vibrar quando for sua vez!</span>
              </div>
            )}

            <button
              onClick={handleTestNotification}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 px-3.5 text-xs font-semibold text-slate-200 transition cursor-pointer shrink-0"
              title="Testar som e vibração no navegador"
            >
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
              <span>Testar Som & Vibração</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION FEEDBACK TOAST */}
        {testNotificationFeedback && (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{testNotificationFeedback}</span>
          </div>
        )}

        {/* 2. FILA DIGITAL EM TEMPO REAL: CHAMADAS AO VIVO NA CADEIRA (#User Request) */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Fila Digital em Tempo Real
                </h3>
                <p className="text-[10px] text-amber-400 font-semibold">
                  Ordem de chegada e chamadas ao vivo
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
              Ao vivo
            </span>
          </div>

          {/* Chamada ao Vivo na Cadeira */}
          {(() => {
            const liveCalled = queue.find(
              q => q.status === 'CHAMADO' || q.status === 'A_CAMINHO' || q.status === 'PEDIU_TOLERANCIA'
            );
            const liveOnChair = queue.find(q => q.status === 'NA CADEIRA');

            if (liveCalled) {
              const isMe = myQueueItem && liveCalled.id === myQueueItem.id;
              return (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/25 via-emerald-500/15 to-slate-950 border-2 border-emerald-400/60 shadow-lg space-y-1.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-black uppercase text-emerald-400 text-[11px] tracking-wide">
                      <Scissors className="h-3.5 w-3.5 animate-bounce" />
                      Chamada ao Vivo na Cadeira
                    </span>
                    <span className="font-mono text-xs font-black text-white bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-400/40">
                      Senha #{liveCalled.ticketNumber}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center justify-between">
                    <span>
                      {isMe ? '👉 VOCÊ ESTÁ SENDO CHAMADO!' : `${maskCustomerName(liveCalled.customerName)}`}
                    </span>
                    <span className="text-xs font-semibold text-emerald-300">
                      {liveCalled.serviceName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {isMe
                      ? 'Dirija-se à cadeira agora! Seu barbeiro está aguardando você.'
                      : 'Cliente chamado para a cadeira. Aproxime-se caso seja você!'}
                  </p>
                </div>
              );
            }

            if (liveOnChair) {
              return (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Armchair className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-200 block text-[11px]">
                        Na Cadeira de Barbeiro: Senha #{liveOnChair.ticketNumber} ({maskCustomerName(liveOnChair.customerName)})
                      </span>
                      <span className="text-[10px] text-slate-400">Atendimento em andamento • {liveOnChair.serviceName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Cortando
                  </span>
                </div>
              );
            }

            return (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center gap-2 text-slate-400">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-[11px]">Barbearia pronta para atendimentos. Aguarde o anúncio da sua senha na tela!</span>
              </div>
            );
          })()}
        </div>

        {/* CASE 0: CLIENT HAIRCUT COMPLETED (#Requirement) */}
        {myQueueItem && myQueueItem.status === 'FINALIZADO' ? (
          <div className="rounded-3xl bg-slate-900 border-2 border-emerald-500/50 p-6 sm:p-8 text-center shadow-2xl space-y-5">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                Atendimento Concluído
              </span>
              <h2 className="mt-3 text-3xl font-black text-white tracking-tight">
                ✂️ Corte Finalizado!
              </h2>
              <p className="mt-1.5 text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Seu atendimento na <strong className="text-white">{organization.name}</strong> foi concluído com sucesso. Obrigado pela preferência e aproveite o novo estilo!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{myQueueItem.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Serviço:</span>
                <span className="text-emerald-400 font-bold">{myQueueItem.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Senha:</span>
                <span className="font-mono text-amber-300 font-bold">#{myQueueItem.ticketNumber}</span>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem(`barberos_queue_ticket_${slug}`);
                setMyTicketId(null);
                setMyDirectTicketItem(null);
                loadData();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 text-xs shadow-lg transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Entrar na Fila Novamente</span>
            </button>
          </div>
        ) : isCurrentlyInQueue && myQueueItem ? (
          <div className="space-y-5">
            {/* ALERT STATE 1: CALLED TO CHAIR ("CHEGOU SUA VEZ") */}
            {(myQueueItem.status === 'CHAMADO' ||
              myQueueItem.status === 'A_CAMINHO' ||
              myQueueItem.status === 'PEDIU_TOLERANCIA') && (
              <div className={`rounded-3xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-slate-950 p-6 text-center shadow-2xl space-y-4 border-2 border-emerald-300 transition-all ${
                isVisualVibrating ? 'ring-8 ring-amber-300 scale-[1.02] animate-bounce' : 'animate-pulse'
              }`}>
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

                  <div className="mt-2 flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        NotificationService.unlockAudio();
                        NotificationService.playSound('CALLED');
                        NotificationService.vibrate([600, 200, 600, 200, 1000]);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 text-amber-300 text-xs font-bold hover:bg-slate-950 transition cursor-pointer shadow-md"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                      <span>Tocar Som da Chamada 🔊</span>
                    </button>
                  </div>
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

            {/* REASSURANCE BANNER WHEN TURN WAS HELD / PRESERVED (#USER REQUIREMENT) */}
            {myQueueItem.notes?.includes('[Vez mantida]') && (
              <div className="rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 p-4 text-xs text-amber-200 leading-relaxed flex items-start gap-3 shadow-lg">
                <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <strong className="text-white block font-bold text-sm">⭐ Sua vez está mantida e garantida!</strong>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    O barbeiro adiantou o próximo cliente enquanto você se aproxima do salão. A sua vaga continua com prioridade total! Assim que você entrar na barbearia, avise o profissional para sentar na cadeira.
                  </p>
                </div>
              </div>
            )}

            {/* STATUS REASSURANCE WHEN WAITING (#Requirement 1) */}
            {myQueueItem.status === 'AGUARDANDO' && !myQueueItem.notes?.includes('[Vez mantida]') && (
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
                  {myQueueItem.status === 'NA CADEIRA' ? 'Situação do Atendimento' : 'Sua Posição Atual na Fila'}
                </span>
                {myQueueItem.status === 'NA CADEIRA' ? (
                  <div className="mt-3 py-2 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-center">
                    <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight flex items-center justify-center gap-2">
                      <Armchair className="h-8 w-8 text-emerald-400 animate-pulse" />
                      <span>NA CADEIRA</span>
                    </div>
                    <span className="text-xs text-emerald-300 font-semibold block mt-1">
                      Você está sendo atendido agora!
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="mt-2 text-6xl sm:text-7xl font-black text-white font-mono tracking-tight text-shadow-lg">
                      #{myPositionIndex + 1}º
                    </div>
                    <span className="text-[11px] text-emerald-400 font-bold block mt-1">
                      {myPositionIndex === 0
                        ? 'Você é o primeiro da fila!'
                        : `${peopleAhead} ${peopleAhead === 1 ? 'pessoa' : 'pessoas'} à sua frente`}
                    </span>
                  </>
                )}
              </div>

              {/* Visual Queue Progress Bar */}
              {myQueueItem.status !== 'NA CADEIRA' && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Progresso da sua vez na fila:</span>
                    <span className="font-mono font-bold text-amber-400">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Entrada na fila</span>
                    <span className="text-amber-300 font-semibold">
                      {peopleAhead === 0 ? 'Você é o próximo!' : `Faltam ${peopleAhead} ${peopleAhead === 1 ? 'pessoa' : 'pessoas'}`}
                    </span>
                    <span>Cadeira</span>
                  </div>
                </div>
              )}

              {/* 4 LIVE QUEUE STATS CARDS (#USER REQUIREMENT) */}
              <div className="grid grid-cols-2 gap-2.5 text-xs text-left">
                {/* 1. Quantas pessoas tem na fila */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    <span>Total na Fila</span>
                  </div>
                  <div className="text-xl font-black text-white font-mono">
                    {totalWaiting} {totalWaiting === 1 ? 'pessoa' : 'pessoas'}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {clientsOnChair.length > 0 ? `${clientsOnChair.length} na cadeira` : 'Aguardando atendimento'}
                  </span>
                </div>

                {/* 2. Quantas faltam para sua vez */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <User className="h-3.5 w-3.5 text-amber-400" />
                    <span>Na Sua Frente</span>
                  </div>
                  <div className="text-xl font-black text-amber-400 font-mono">
                    {peopleAhead === 0 ? '0 (Próximo!)' : `${peopleAhead} ${peopleAhead === 1 ? 'pessoa' : 'pessoas'}`}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold block">
                    {peopleAhead === 0 ? 'Prepare-se para sentar' : `Faltam ${peopleAhead} p/ sua vez`}
                  </span>
                </div>

                {/* 3. Tempo Estimado */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span>Espera Estimada</span>
                  </div>
                  <div className="text-xl font-black text-amber-400 font-mono">
                    ~{estimatedTime} min
                  </div>
                  <span className="text-[10px] text-slate-500 block">Previsão: {forecastTimeStr}</span>
                </div>

                {/* 4. Notificação no Celular */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <BellRing className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Alerta no Celular</span>
                  </div>
                  <div className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Toque & Vibração</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Mesmo com tela desligada</span>
                </div>
              </div>

              {/* ORDEM DE CHEGADA NA FILA EM TEMPO REAL (#User Request) */}
              <div className="border-2 border-slate-800 rounded-2xl bg-slate-950 overflow-hidden text-left shadow-lg">
                <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Ordem de Chegada na Fila</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {activeWaitingList.length} na fila
                  </span>
                </div>

                <div className="p-3 space-y-2 text-xs divide-y divide-slate-850">
                  {activeWaitingList.length === 0 ? (
                    <p className="text-slate-500 text-center py-3 text-[11px]">
                      Nenhum outro cliente aguardando no momento.
                    </p>
                  ) : (
                    activeWaitingList.map((item, idx) => {
                      const isMe = myQueueItem && item.id === myQueueItem.id;
                      const isCalled = item.status === 'CHAMADO' || item.status === 'A_CAMINHO' || item.status === 'PEDIU_TOLERANCIA';
                      const isNext = item.status === 'PROXIMO';

                      return (
                        <div
                          key={item.id}
                          className={`pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-xl transition ${
                            isMe
                              ? 'bg-amber-500/20 border border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                              : isCalled
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`font-mono text-xs font-black w-7 shrink-0 ${
                              isMe ? 'text-amber-300' : 'text-slate-400'
                            }`}>
                              #{idx + 1}º
                            </span>
                            <div className="min-w-0">
                              <span className={`block truncate ${
                                isMe ? 'text-white font-black text-xs' : 'text-slate-200 font-semibold text-xs'
                              }`}>
                                {isMe ? '👉 VOCÊ (Sua Vez)' : maskCustomerName(item.customerName)}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {item.serviceName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-mono text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-bold">
                              Senha #{item.ticketNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              isCalled
                                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                                : isNext
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-850 text-slate-400'
                            }`}>
                              {isCalled ? '🔔 Chamado!' : isNext ? '💈 Próximo' : '⏳ Aguardando'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Ticket Details Summary */}
              <div className="text-left text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-bold text-white">{myQueueItem.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WhatsApp:</span>
                  <span className="text-slate-200 font-mono font-semibold">{myQueueItem.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Corte Desejado:</span>
                  <span className="text-amber-300 font-bold">{myQueueItem.serviceName}</span>
                </div>
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

            {/* Ultra-Simplified 3-Field Form (#USER REQUIREMENT: Só Nome, WhatsApp e Corte Desejado) */}
            <form onSubmit={handleJoinQueue} className="rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base font-black text-white">Preencha seus dados para entrar na fila:</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Simples e rápido! Você será notificado no seu celular quando for sua vez.
                </p>
              </div>

              {/* CAMPO 1: SEU NOME */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1.5">
                  1. Seu Nome *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Como quer ser chamado? Ex: Lucas Silva"
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition"
                  />
                  <User className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
                </div>
              </div>

              {/* CAMPO 2: NÚMERO DE WHATSAPP */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center justify-between">
                  <span>2. Seu WhatsApp *</span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>Aviso no Celular</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(formatPhoneInput(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono transition"
                  />
                  <MessageCircle className="absolute left-3.5 top-3.5 h-5 w-5 text-emerald-400" />
                </div>
              </div>

              {/* CAMPO 3: CORTE DESEJADO */}
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-2 flex items-center justify-between">
                  <span>3. Corte Desejado *</span>
                  <span className="text-[10px] text-slate-400">Toque para selecionar</span>
                </label>

                {services.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                    Corte Padrão da Barbearia
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {services.map((s) => {
                      const isSelected = selectedServiceId === s.id;
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => setSelectedServiceId(s.id)}
                          className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-white shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold transition ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}
                            >
                              <Scissors className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs sm:text-sm block text-white truncate">{s.name}</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Duração: ~{s.durationMinutes || 30} min
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-amber-400 font-mono block">
                              R$ {s.price.toFixed(2)}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">
                                Selecionado ✓
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* BOTÃO GRANDE DE ENTRAR NA FILA */}
              <button
                type="submit"
                disabled={!customerName.trim() || !customerPhone.trim() || !selectedServiceId}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-98"
              >
                <span>ENTRAR NA FILA AGORA</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* ORDEM DE CHEGADA NA FILA EM TEMPO REAL (#User Request) */}
            <div className="border border-slate-800 rounded-3xl bg-slate-900/80 overflow-hidden text-left shadow-xl space-y-0">
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Ordem de Chegada na Fila
                    </h4>
                    <p className="text-[10px] text-slate-400">Atualização em tempo real</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 font-bold">
                  {activeWaitingList.length} aguardando
                </span>
              </div>

              <div className="p-4 space-y-2 text-xs divide-y divide-slate-800/80">
                {activeWaitingList.length === 0 ? (
                  <div className="py-6 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-300">A fila está livre no momento!</p>
                    <p className="text-[11px] text-slate-500">
                      Entre na fila acima para ser o próximo chamado na cadeira.
                    </p>
                  </div>
                ) : (
                  activeWaitingList.map((item, idx) => {
                    const isCalled = item.status === 'CHAMADO' || item.status === 'A_CAMINHO' || item.status === 'PEDIU_TOLERANCIA';
                    const isNext = item.status === 'PROXIMO';

                    return (
                      <div
                        key={item.id}
                        className={`pt-2.5 first:pt-0 flex items-center justify-between gap-2 p-2 rounded-xl transition ${
                          isCalled
                            ? 'bg-emerald-500/10 border border-emerald-400/30'
                            : isNext
                            ? 'bg-amber-500/10 border border-amber-400/30'
                            : 'hover:bg-slate-950/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-xs font-black text-slate-400 w-7 shrink-0">
                            #{idx + 1}º
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate text-slate-200 font-bold text-xs">
                              {maskCustomerName(item.customerName)}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {item.serviceName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-bold">
                            Senha #{item.ticketNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            isCalled
                              ? 'bg-emerald-500 text-slate-950 animate-pulse'
                              : isNext
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isCalled ? '🔔 Chamado' : isNext ? '💈 Próximo' : '⏳ Aguardando'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
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
