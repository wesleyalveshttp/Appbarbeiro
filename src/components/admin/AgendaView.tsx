import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  Phone,
  Scissors,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Appointment, Professional, Service, AppointmentStatus } from '../../types';
import { WhatsAppReminder40MinCard } from '../common/WhatsAppReminder40MinCard';

interface AgendaViewProps {
  organization: Organization;
  selectedProfessionalId?: string;
  onOpenNewAppointmentModal: () => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  organization,
  selectedProfessionalId,
  onOpenNewAppointmentModal,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>(
    selectedProfessionalId || 'ALL'
  );
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK'>('DAY');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  const loadData = () => {
    const apts = StorageService.getAppointments(organization.id);
    const profs = StorageService.getProfessionals(organization.id);
    const srvs = StorageService.getServices(organization.id);
    setAppointments(apts);
    setProfessionals(profs);
    setServices(srvs);
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [organization.id]);

  // Navigate Date
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter((a) => {
    if (a.date !== selectedDate) return false;
    if (selectedProfFilter !== 'ALL' && a.professionalId !== selectedProfFilter) return false;
    return true;
  });

  // Time slots generation (from 08:00 to 20:00 in 30min steps)
  const timeSlots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 20) timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  const handleStatusChange = (status: AppointmentStatus) => {
    if (!selectedAppointment) return;
    try {
      const updated = StorageService.updateAppointmentStatus(selectedAppointment.id, status);
      setSelectedAppointment(updated);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar');
    }
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    try {
      setRescheduleError('');
      const updated = StorageService.rescheduleAppointment(
        selectedAppointment.id,
        rescheduleDate,
        rescheduleTime
      );
      setSelectedAppointment(updated);
      setIsRescheduling(false);
      loadData();
    } catch (err: any) {
      setRescheduleError(err.message || 'Horário em conflito');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Calendar Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Agenda & Horários</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Gestão Diária
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Controle de agendamentos com validação inteligente contra choque de horários.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker Controls */}
          <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Dia anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 px-2 py-1 focus:outline-hidden cursor-pointer"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Próximo dia"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition"
          >
            Hoje
          </button>

          <button
            onClick={onOpenNewAppointmentModal}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* 40-Minute WhatsApp Client Reminder Warning Card */}
      <WhatsAppReminder40MinCard organization={organization} />

      {/* Filter by Professional Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Filtrar por Profissional:</span>
          <select
            value={selectedProfFilter}
            onChange={(e) => setSelectedProfFilter(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-white focus:outline-hidden"
          >
            <option value="ALL">Todos os Profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          <strong className="text-amber-400 font-mono">{filteredAppointments.length}</strong> agendamentos para esta data
        </div>
      </div>

      {/* Day Timeline Grid */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/60">
          {timeSlots.map((slot) => {
            const slotAppointments = filteredAppointments.filter((a) => a.time === slot);

            return (
              <div
                key={slot}
                className="flex items-start min-h-[58px] hover:bg-slate-850/40 transition group"
              >
                {/* Time Slot Label */}
                <div className="w-20 sm:w-24 shrink-0 py-3.5 px-4 font-mono text-xs font-bold text-slate-400 border-r border-slate-800/80 bg-slate-950/40 text-center">
                  {slot}
                </div>

                {/* Slot Content */}
                <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                  {slotAppointments.length === 0 ? (
                    <div className="text-[11px] text-slate-600 italic px-2">
                      Horário livre
                    </div>
                  ) : (
                    slotAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => setSelectedAppointment(apt)}
                        className={`cursor-pointer rounded-xl p-2.5 flex items-center justify-between gap-3 border shadow-xs transition hover:scale-[1.01] ${
                          apt.status === 'NA CADEIRA'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                            : apt.status === 'A CAMINHO'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : apt.status === 'FINALIZADO'
                            ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                            : apt.status === 'CANCELADO'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 line-through'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{apt.customerName}</div>
                          <div className="text-[10px] opacity-80 flex items-center gap-1.5">
                            <span>{apt.serviceName}</span>
                            <span>·</span>
                            <span>{apt.professionalName}</span>
                            <span>·</span>
                            <span>{apt.durationMinutes} min</span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            apt.status === 'NA CADEIRA'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : apt.status === 'A CAMINHO'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-900/60 text-slate-300'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* APPOINTMENT DETAIL DRAWER / MODAL */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  Detalhes do Agendamento
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {selectedAppointment.customerName}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedAppointment(null);
                  setIsRescheduling(false);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Info Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500">Serviço:</span>
                <p className="font-bold text-slate-200">{selectedAppointment.serviceName}</p>
              </div>
              <div>
                <span className="text-slate-500">Valor & Duração:</span>
                <p className="font-bold text-emerald-400">
                  R$ {selectedAppointment.servicePrice.toFixed(2)} ({selectedAppointment.durationMinutes} min)
                </p>
              </div>
              <div>
                <span className="text-slate-500">Profissional:</span>
                <p className="font-bold text-slate-200">{selectedAppointment.professionalName}</p>
              </div>
              <div>
                <span className="text-slate-500">Data e Horário:</span>
                <p className="font-bold text-amber-400">
                  {selectedAppointment.date} às {selectedAppointment.time}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Telefone / WhatsApp:</span>
                <p className="font-mono text-slate-300">{selectedAppointment.customerPhone}</p>
              </div>
              <div>
                <span className="text-slate-500">Status Atual:</span>
                <p className="font-bold text-slate-100 uppercase">{selectedAppointment.status}</p>
              </div>
            </div>

            {/* Quick 1-Click Fast Actions for Barber */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Ações Rápidas do Barbeiro:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStatusChange('NA CADEIRA')}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                >
                  <Scissors className="h-4 w-4" />
                  <span>SENTAR NA CADEIRA</span>
                </button>
                <button
                  onClick={() => handleStatusChange('FINALIZADO')}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>FINALIZAR CORTE</span>
                </button>
              </div>
            </div>

            {/* Status Transition Actions (#11) */}
            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold text-slate-300">Alterar Status:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'CONFIRMADO', label: 'Confirmado' },
                  { id: 'A CAMINHO', label: 'A Caminho' },
                  { id: 'CHEGOU', label: 'Chegou' },
                  { id: 'NA CADEIRA', label: 'Na Cadeira' },
                  { id: 'FINALIZADO', label: 'Finalizado' },
                  { id: 'FALTOU', label: 'Faltou' },
                  { id: 'CANCELADO', label: 'Cancelar' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleStatusChange(st.id as AppointmentStatus)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                      selectedAppointment.status === st.id
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reschedule Toggle */}
            {!isRescheduling ? (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsRescheduling(true);
                    setRescheduleDate(selectedAppointment.date);
                    setRescheduleTime(selectedAppointment.time);
                  }}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  ↻ Reagendar para outra data/hora
                </button>

                <a
                  href={`/atendimento/${selectedAppointment.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Link de Acompanhamento
                </a>
              </div>
            ) : (
              <form onSubmit={handleRescheduleSubmit} className="mt-4 p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <h4 className="text-xs font-bold text-amber-300">Reagendamento com Verificação de Conflitos:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Nova Data:</label>
                    <input
                      type="date"
                      required
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Novo Horário:</label>
                    <input
                      type="time"
                      required
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {rescheduleError && (
                  <p className="text-xs text-rose-400">{rescheduleError}</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className="flex-1 rounded-lg bg-slate-800 py-1.5 text-xs text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-amber-500 py-1.5 text-xs font-bold text-slate-950"
                  >
                    Salvar Novo Horário
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
