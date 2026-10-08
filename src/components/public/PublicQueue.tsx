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
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, WaitingQueueItem, Service, Professional } from '../../types';
import { QRCodeModal } from '../common/QRCodeModal';

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

  const [showQR, setShowQR] = useState(false);
  const [hasPlayedChime, setHasPlayedChime] = useState(false);

  const loadData = () => {
    const org = StorageService.getOrganizationBySlug(slug) || StorageService.getAllOrganizations()[0];
    if (org) {
      setOrganization(org);
      const q = StorageService.getQueue(org.id);
      const srvs = StorageService.getServices(org.id).filter(s => s.isActive);
      const profs = StorageService.getProfessionals(org.id).filter(p => p.isActive);
      setQueue(q);
      setServices(srvs);
      setProfessionals(profs);
      if (!selectedServiceId && srvs.length > 0) setSelectedServiceId(srvs[0].id);
    }
  };

  useEffect(() => {
    // Restore my ticket if active
    const savedTicket = localStorage.getItem(`barberos_queue_ticket_${slug}`);
    if (savedTicket) setMyTicketId(savedTicket);

    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [slug]);

  if (!organization) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <p className="text-slate-400">Estabelecimento não encontrado.</p>
      </div>
    );
  }

  // Find My Item
  const myQueueItem = queue.find(q => q.id === myTicketId);
  const isCurrentlyInQueue = !!myQueueItem && myQueueItem.status !== 'FINALIZADO' && myQueueItem.status !== 'DESISTIU';

  // Calculate my position
  const activeWaitingList = queue.filter(q => q.status === 'AGUARDANDO' || q.status === 'PROXIMO' || q.status === 'CHAMADO');
  const myPositionIndex = myQueueItem ? activeWaitingList.findIndex(q => q.id === myQueueItem.id) : -1;
  const peopleAhead = myPositionIndex > 0 ? myPositionIndex : 0;
  const estimatedTime = (peopleAhead + 1) * 20;

  // Sound chime when called or next
  useEffect(() => {
    if (myQueueItem && (myQueueItem.status === 'PROXIMO' || myQueueItem.status === 'CHAMADO') && !hasPlayedChime) {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
        } catch {}
      }
      setHasPlayedChime(true);
    }
  }, [myQueueItem?.status, hasPlayedChime]);

  const handleJoinQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !selectedServiceId) return;

    const newItem = StorageService.joinQueue({
      organizationId: organization.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      serviceId: selectedServiceId,
      preferredProfessionalId: preferredProfId || undefined,
      notes: notes.trim() || undefined,
    });

    setMyTicketId(newItem.id);
    localStorage.setItem(`barberos_queue_ticket_${slug}`, newItem.id);
    loadData();
  };

  const handleLeaveQueue = () => {
    if (!myQueueItem) return;
    if (confirm('Tem certeza que deseja sair da fila de espera?')) {
      StorageService.cancelQueueItem(myQueueItem.id, 'Cliente desistiu pelo link público');
      localStorage.removeItem(`barberos_queue_ticket_${slug}`);
      setMyTicketId(null);
      loadData();
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const queueUrl = `${origin}/fila/${slug}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{organization.name}</h1>
            <p className="text-[10px] text-slate-400">Fila Digital em Tempo Real</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition"
            title="Compartilhar QR Code"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            onClick={() => onNavigateToBooking(organization.slug)}
            className="text-xs text-amber-400 hover:underline font-semibold"
          >
            Agendar Horário
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-md px-4 pt-6 space-y-6">
        {/* CASE 1: CLIENT IS CURRENTLY IN QUEUE (#16) */}
        {isCurrentlyInQueue && myQueueItem ? (
          <div className="space-y-6">
            {/* Status Alert Header */}
            {myQueueItem.status === 'CHAMADO' ? (
              <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 p-6 text-center shadow-2xl animate-pulse space-y-3">
                <Volume2 className="h-9 w-9 mx-auto" />
                <h2 className="text-2xl font-black">🎉 Chegou a sua vez de cortar / fazer sua barba!</h2>
                <p className="text-xs font-bold text-slate-900 leading-relaxed">
                  O barbeiro já está te aguardando na cadeira! Uma mensagem automática foi disparada para o seu WhatsApp.
                </p>
                <a
                  href={`https://wa.me/55${organization.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Estou a caminho para meu corte/barba na ${organization.name}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 text-emerald-300 text-xs font-bold shadow-md hover:bg-slate-900 transition"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  <span>Responder no WhatsApp da Barbearia</span>
                </a>
              </div>
            ) : myQueueItem.status === 'PROXIMO' ? (
              <div className="rounded-3xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 p-6 text-center shadow-2xl space-y-1">
                <h2 className="text-2xl font-black">Você é o próximo da fila!</h2>
                <p className="text-xs text-slate-900 font-bold">
                  Faltam cerca de 5 minutos! Aproxime-se da barbearia para seu corte ou barba.
                </p>
              </div>
            ) : myQueueItem.status === 'NA CADEIRA' ? (
              <div className="rounded-3xl bg-emerald-500 text-slate-950 p-6 text-center shadow-2xl space-y-1">
                <Armchair className="h-8 w-8 mx-auto" />
                <h2 className="text-2xl font-black">Você está na cadeira!</h2>
                <p className="text-xs font-bold">Atendimento em andamento. Relaxe e aproveite o estilo!</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Lugar Garantido na Fila Virtual
                </div>
                <h2 className="text-2xl font-black text-white">Você está na Fila Virtual</h2>
                <p className="text-xs text-amber-300 font-medium">
                  Não precisa esperar na barbearia! Fique à vontade onde quiser. O app te avisa no WhatsApp quando for sua vez.
                </p>
              </div>
            )}

            {/* Reassuring Virtual Queue Notice */}
            {myQueueItem.status !== 'CHAMADO' && myQueueItem.status !== 'NA CADEIRA' && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Esperando de onde você quiser:</strong>
                  Você não precisa ficar sentado na recepção. Quando chegar o momento de cortar seu cabelo ou fazer sua barba, enviaremos uma mensagem automática no WhatsApp <strong>{myQueueItem.customerPhone}</strong> para você vir!
                </div>
              </div>
            )}

            {/* Position & Ticket Big Card (#16) */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center shadow-2xl space-y-6">
              <div className="inline-block px-4 py-1 rounded-full bg-slate-800 text-amber-300 font-mono text-xs font-bold">
                Sua Senha: #{myQueueItem.ticketNumber}
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Sua Posição Atual
                </span>
                <div className="mt-2 text-6xl font-black text-white font-mono tracking-tight">
                  #{myPositionIndex + 1}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">À sua frente</span>
                  <div className="text-xl font-black text-slate-200 font-mono mt-0.5">
                    {peopleAhead} {peopleAhead === 1 ? 'pessoa' : 'pessoas'}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Tempo Estimado</span>
                  <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
                    ~{estimatedTime} min
                  </div>
                </div>
              </div>

              <div className="text-left text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-white">{myQueueItem.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Serviço:</span>
                  <span className="text-slate-200">{myQueueItem.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-emerald-400 uppercase">{myQueueItem.status}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                *Estimativa aproximada calculada em tempo real com base na rotação das cadeiras.
              </p>

              <button
                onClick={handleLeaveQueue}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 py-3 text-xs font-semibold text-rose-400 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Desistir / Sair da Fila</span>
              </button>
            </div>
          </div>
        ) : (
          /* CASE 2: CLIENT NOT IN QUEUE YET -> FORM TO JOIN (#13) */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Scissors className="h-3.5 w-3.5" />
                <span>{organization.name}</span>
              </div>
              <h2 className="text-2xl font-black text-white">Fila Virtual Inteligente</h2>
              <p className="text-xs text-amber-200/90 font-medium max-w-sm mx-auto leading-relaxed">
                Você <strong>NÃO precisa ficar esperando na barbearia</strong>! Informe seu <strong>Nome e WhatsApp</strong> abaixo para garantir sua vaga. Quando for a sua vez de cortar o cabelo ou fazer a barba, o app enviará automaticamente uma mensagem no seu WhatsApp.
              </p>
            </div>

            {/* Current Queue Status Snapshot */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Pessoas na fila agora:</span>
                <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
                  {activeWaitingList.length} {activeWaitingList.length === 1 ? 'aguardando' : 'aguardando'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Tempo estimado:</span>
                <div className="text-xl font-black text-slate-200 font-mono mt-0.5">
                  ~{Math.max(10, activeWaitingList.length * 20)} min
                </div>
              </div>
            </div>

            <form onSubmit={handleJoinQueue} className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                ✨ <strong>Lugar Garantido:</strong> Só precisamos do seu nome e WhatsApp para te avisar automaticamente quando o barbeiro estiver pronto para te atender!
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Seu Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Pedro Ramos"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Seu Número de WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Enviaremos a mensagem automática neste WhatsApp quando chegar a sua vez.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Serviço Pretendido *</label>
                <select
                  required
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — R$ {s.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Profissional de Preferência (Opcional)
                </label>
                <select
                  value={preferredProfId}
                  onChange={(e) => setPreferredProfId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="">Qualquer profissional disponível (Mais rápido)</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Observação (Opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Estou no café da esquina, aguardando mensagem"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 transition cursor-pointer"
              >
                <span>ENTRAR NA FILA VIRTUAL (GARANTIR LUGAR)</span>
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
        title="Fila de Espera Digital"
        subtitle="Aponte a câmera para entrar na fila"
        url={queueUrl}
        establishmentName={organization.name}
      />
    </div>
  );
};
