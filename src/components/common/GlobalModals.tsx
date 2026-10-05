import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar, Plus, X, Clock, Scissors } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Professional, Service } from '../../types';

interface GlobalModalsProps {
  organization: Organization;
  isNewAppointmentOpen: boolean;
  onCloseNewAppointment: () => void;
  isNewQueueOpen: boolean;
  onCloseNewQueue: () => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
  organization,
  isNewAppointmentOpen,
  onCloseNewAppointment,
  isNewQueueOpen,
  onCloseNewQueue,
}) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Appointment Form
  const [aptCustomerName, setAptCustomerName] = useState('');
  const [aptCustomerPhone, setAptCustomerPhone] = useState('');
  const [aptServiceId, setAptServiceId] = useState('');
  const [aptProfId, setAptProfId] = useState('');
  const [aptDate, setAptDate] = useState(new Date().toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState('14:00');
  const [aptNotes, setAptNotes] = useState('');
  const [aptError, setAptError] = useState('');

  // Queue Form
  const [qCustomerName, setQCustomerName] = useState('');
  const [qCustomerPhone, setQCustomerPhone] = useState('');
  const [qServiceId, setQServiceId] = useState('');
  const [qProfId, setQProfId] = useState('');
  const [qNotes, setQNotes] = useState('');

  const loadData = () => {
    const p = StorageService.getProfessionals(organization.id).filter(pr => pr.isActive);
    const s = StorageService.getServices(organization.id).filter(sr => sr.isActive);
    setProfessionals(p);
    setServices(s);
    if (!aptServiceId && s.length > 0) setAptServiceId(s[0].id);
    if (!aptProfId && p.length > 0) setAptProfId(p[0].id);
    if (!qServiceId && s.length > 0) setQServiceId(s[0].id);
  };

  useEffect(() => {
    if (isNewAppointmentOpen || isNewQueueOpen) {
      loadData();
    }
  }, [isNewAppointmentOpen, isNewQueueOpen, organization.id]);

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptCustomerName.trim() || !aptCustomerPhone.trim()) return;

    try {
      setAptError('');
      StorageService.createAppointment({
        organizationId: organization.id,
        customerName: aptCustomerName.trim(),
        customerPhone: aptCustomerPhone.trim(),
        serviceId: aptServiceId,
        professionalId: aptProfId,
        date: aptDate,
        time: aptTime,
        notes: aptNotes.trim() || undefined,
      });

      setAptCustomerName('');
      setAptCustomerPhone('');
      setAptNotes('');
      onCloseNewAppointment();
    } catch (err: any) {
      setAptError(err.message || 'Erro ao criar agendamento');
    }
  };

  const handleCreateQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qCustomerName.trim() || !qCustomerPhone.trim()) return;

    StorageService.joinQueue({
      organizationId: organization.id,
      customerName: qCustomerName.trim(),
      customerPhone: qCustomerPhone.trim(),
      serviceId: qServiceId,
      preferredProfessionalId: qProfId || undefined,
      notes: qNotes.trim() || undefined,
    });

    setQCustomerName('');
    setQCustomerPhone('');
    setQNotes('');
    onCloseNewQueue();
  };

  return (
    <>
      {/* NEW APPOINTMENT MODAL */}
      {isNewAppointmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={onCloseNewAppointment}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-400" />
              Novo Agendamento
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Cadastre um horário manualmente para um cliente na recepção.
            </p>

            <form onSubmit={handleCreateAppointment} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={aptCustomerName}
                  onChange={(e) => setAptCustomerName(e.target.value)}
                  placeholder="Ex: João Ferreira"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">WhatsApp / Telefone *</label>
                <input
                  type="text"
                  required
                  value={aptCustomerPhone}
                  onChange={(e) => setAptCustomerPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Serviço *</label>
                  <select
                    required
                    value={aptServiceId}
                    onChange={(e) => setAptServiceId(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (R$ {s.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Profissional *</label>
                  <select
                    required
                    value={aptProfId}
                    onChange={(e) => setAptProfId(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  >
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Data *</label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Horário *</label>
                  <input
                    type="time"
                    required
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Observações (Opcional)</label>
                <input
                  type="text"
                  value={aptNotes}
                  onChange={(e) => setAptNotes(e.target.value)}
                  placeholder="Ex: Corte navalhado na zero"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              {aptError && <p className="text-xs text-rose-400 font-medium">{aptError}</p>}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCloseNewAppointment}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 shadow-md"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW QUEUE CUSTOMER MODAL */}
      {isNewQueueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={onCloseNewQueue}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Adicionar na Fila de Espera
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Emita uma senha para o cliente presencial sem horário marcado.
            </p>

            <form onSubmit={handleCreateQueue} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={qCustomerName}
                  onChange={(e) => setQCustomerName(e.target.value)}
                  placeholder="Ex: Matheus Costa"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">WhatsApp / Telefone *</label>
                <input
                  type="text"
                  required
                  value={qCustomerPhone}
                  onChange={(e) => setQCustomerPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Serviço Pretendido *</label>
                <select
                  required
                  value={qServiceId}
                  onChange={(e) => setQServiceId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (R$ {s.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Preferência de Barbeiro (Opcional)
                </label>
                <select
                  value={qProfId}
                  onChange={(e) => setQProfId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                >
                  <option value="">Sem preferência (Qualquer livre)</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCloseNewQueue}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-750"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 shadow-md"
                >
                  Inserir na Fila
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
