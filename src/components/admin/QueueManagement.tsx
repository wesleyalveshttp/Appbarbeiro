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
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, WaitingQueueItem, Professional, Service } from '../../types';
import { WhatsAppService } from '../../services/whatsapp';
import { QRCodeModal } from '../common/QRCodeModal';

interface QueueManagementProps {
  organization: Organization;
}

export const QueueManagement: React.FC<QueueManagementProps> = ({ organization }) => {
  const [queue, setQueue] = useState<WaitingQueueItem[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>('ALL');

  // Form State for manual entry
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newProfId, setNewProfId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const loadData = () => {
    const q = StorageService.getQueue(organization.id);
    const profs = StorageService.getProfessionals(organization.id);
    const srvs = StorageService.getServices(organization.id);
    setQueue(q);
    setProfessionals(profs);
    setServices(srvs);
    if (!newServiceId && srvs.length > 0) setNewServiceId(srvs[0].id);
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [organization.id]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const queueUrl = `${origin}/fila/${organization.slug}`;

  // Filter items
  const filteredQueue = queue.filter(item => {
    if (selectedProfFilter === 'ALL') return true;
    return item.preferredProfessionalId === selectedProfFilter || item.assignedProfessionalId === selectedProfFilter;
  });

  const waitingItems = filteredQueue.filter(q => q.status === 'AGUARDANDO' || q.status === 'PROXIMO');
  const calledItems = filteredQueue.filter(q => q.status === 'CHAMADO');
  const onChairItems = filteredQueue.filter(q => q.status === 'NA CADEIRA');

  // Add Walk-in Customer
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newServiceId) return;

    StorageService.joinQueue({
      organizationId: organization.id,
      customerName: newName.trim(),
      customerPhone: newPhone.trim(),
      serviceId: newServiceId,
      preferredProfessionalId: newProfId || undefined,
      notes: newNotes.trim() || undefined,
    });

    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setShowAddModal(false);
    loadData();
  };

  // Call Item
  const handleCall = (item: WaitingQueueItem, profId?: string) => {
    const targetProf = profId || item.preferredProfessionalId || professionals[0]?.id;
    if (!targetProf) return;
    StorageService.callQueueCustomer(item.id, targetProf);
    loadData();
  };

  // Send WhatsApp message
  const handleSendWhatsApp = (item: WaitingQueueItem, templateType: 'FILA_ENTRADA' | 'PROXIMO' | 'SUA_VEZ') => {
    const text = WhatsAppService.getMessageText(templateType, {
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      establishmentName: organization.name,
      serviceName: item.serviceName,
      ticketNumber: item.ticketNumber,
      queuePosition: queue.findIndex(q => q.id === item.id) + 1,
      trackingUrl: queueUrl,
    });
    const link = WhatsAppService.getWhatsAppDirectLink(item.customerPhone, text);
    window.open(link, '_blank');
  };

  const calculateMinutesWaiting = (joinedAt: string) => {
    const diff = Date.now() - new Date(joinedAt).getTime();
    return Math.max(1, Math.round(diff / 60000));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Fila de Espera Digital</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Tempo Real
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Controle a fila de clientes avulsos ou sem horário pré-agendado com estimativa ao vivo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 px-3.5 py-2 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <QrCode className="h-4 w-4 text-blue-400" />
            <span>QR Code da Fila</span>
          </button>

          <a
            href={queueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 px-3.5 py-2 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <ExternalLink className="h-4 w-4 text-amber-400" />
            <span>Link Público</span>
          </a>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Adicionar Cliente</span>
          </button>
        </div>
      </div>

      {/* Queue Metrics Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-xs text-slate-400">Aguardando na fila</span>
          <div className="mt-2 text-2xl font-bold text-amber-400">{waitingItems.length}</div>
          <span className="text-[11px] text-slate-500">Estimativa média: ~{waitingItems.length * 20} min</span>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-xs text-slate-400">Chamados agora</span>
          <div className="mt-2 text-2xl font-bold text-blue-400">{calledItems.length}</div>
          <span className="text-[11px] text-slate-500">Aguardando sentar</span>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <span className="text-xs text-slate-400">Na cadeira</span>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{onChairItems.length}</div>
          <span className="text-[11px] text-slate-500">Em atendimento</span>
        </div>
      </div>

      {/* Filter by Professional & Queue Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filtrar por Barbeiro:</span>
          <select
            value={selectedProfFilter}
            onChange={(e) => setSelectedProfFilter(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
          >
            <option value="ALL">Todos os Profissionais (Fila Geral)</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span>Modo atual:</span>
          <strong className="text-amber-400">
            {organization.settings.queueMode === 'SINGLE' ? 'Fila Única Centralizada' : 'Fila por Profissional'}
          </strong>
        </div>
      </div>

      {/* Queue List Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Posições da Fila Atual</h3>
          <span className="text-xs font-mono text-slate-400">{filteredQueue.length} pessoas no total</span>
        </div>

        <div className="overflow-x-auto">
          {filteredQueue.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="mx-auto h-10 w-10 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-300">Fila vazia no momento!</p>
              <p className="text-xs text-slate-500 mt-1">
                Compartilhe o QR Code da fila ou adicione clientes que chegarem à barbearia.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar Cliente
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 uppercase text-[10px] tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Posição & Senha</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Serviço</th>
                  <th className="py-3.5 px-4">Preferência</th>
                  <th className="py-3.5 px-4">Tempo de Espera</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredQueue.map((item, index) => {
                  const preferredProf = professionals.find(p => p.id === item.preferredProfessionalId);
                  const isNext = item.status === 'PROXIMO';
                  const isCalled = item.status === 'CHAMADO';
                  const isOnChair = item.status === 'NA CADEIRA';

                  return (
                    <tr key={item.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500 font-semibold">#{index + 1}</span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              isNext
                                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/30'
                                : isCalled
                                ? 'bg-blue-500 text-white animate-pulse'
                                : isOnChair
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            Senha #{item.ticketNumber}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{item.customerName}</div>
                        <div className="text-[11px] text-slate-400">{item.customerPhone}</div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-200">{item.serviceName}</td>

                      <td className="py-3.5 px-4">
                        {preferredProf ? (
                          <span className="text-amber-300 font-medium">{preferredProf.name}</span>
                        ) : (
                          <span className="text-slate-500">Qualquer barbeiro</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-slate-200">
                          {calculateMinutesWaiting(item.joinedAt)} min
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Estimativa restante: ~{item.estimatedWaitMinutes} min
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            isNext
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isCalled
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : isOnChair
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp quick dispatch */}
                          <button
                            onClick={() =>
                              handleSendWhatsApp(
                                item,
                                isCalled ? 'SUA_VEZ' : isNext ? 'PROXIMO' : 'FILA_ENTRADA'
                              )
                            }
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition"
                            title="Avisar no WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>

                          {item.status === 'AGUARDANDO' || item.status === 'PROXIMO' ? (
                            <button
                              onClick={() => handleCall(item)}
                              className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-950 transition"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              Chamar
                            </button>
                          ) : item.status === 'CHAMADO' ? (
                            <button
                              onClick={() => {
                                StorageService.moveQueueToChair(item.id);
                                loadData();
                              }}
                              className="flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 text-xs font-bold text-slate-950 transition"
                            >
                              <Armchair className="h-3.5 w-3.5" />
                              Cadeira
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                StorageService.finishQueueItem(item.id);
                                loadData();
                              }}
                              className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 transition"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              Concluir
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Remover ${item.customerName} da fila?`)) {
                                StorageService.cancelQueueItem(item.id, 'Cancelado pelo operador');
                                loadData();
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Desistência / Cancelar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD WALK-IN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-400" />
              Adicionar Cliente na Fila
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Insira os dados do cliente que acabou de chegar presencialmente.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">WhatsApp / Telefone *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Serviço Desejado *</label>
                <select
                  required
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - R$ {s.price.toFixed(2)} ({s.durationMinutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Profissional Preferencial (Opcional)
                </label>
                <select
                  value={newProfId}
                  onChange={(e) => setNewProfId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="">Sem preferência (Qualquer barbeiro livre)</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Observações (Opcional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Vai aguardar no café ao lado"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 shadow-md transition"
                >
                  Emitir Senha
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
        title="Fila Digital Exclusiva"
        subtitle="Aponte a câmera para entrar na fila ou acompanhar a posição"
        url={queueUrl}
        establishmentName={organization.name}
      />
    </div>
  );
};
