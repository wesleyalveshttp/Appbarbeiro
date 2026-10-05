import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Scissors,
  CheckCircle2,
  ExternalLink,
  Plus,
  RotateCcw,
  Sparkles,
  User
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Appointment, Organization, WaitingQueueItem } from '../../types';

interface ClientPortalProps {
  organization: Organization;
  onNavigateToBooking: (slug: string) => void;
  onNavigateToQueue: (slug: string) => void;
  onOpenAppointmentTracker: (token: string) => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  organization,
  onNavigateToBooking,
  onNavigateToQueue,
  onOpenAppointmentTracker,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<WaitingQueueItem[]>([]);

  const loadData = () => {
    const apts = StorageService.getAppointments(organization.id);
    const q = StorageService.getQueue(organization.id);
    setAppointments(apts);
    setQueue(q);
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [organization.id]);

  // Demo client context (shows upcoming and past appointments for the active organization)
  const upcomingApts = appointments.filter(
    (a) => a.status !== 'FINALIZADO' && a.status !== 'CANCELADO'
  );
  const pastApts = appointments.filter((a) => a.status === 'FINALIZADO');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <User className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              Área do Cliente · {organization.name}
            </span>
            <h1 className="text-xl font-bold text-white mt-0.5">Meus Agendamentos & Fila</h1>
            <p className="text-xs text-slate-400">
              Acompanhe seus horários marcados, posição na fila e histórico de atendimentos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToQueue(organization.slug)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <Clock className="h-4 w-4 text-blue-400" />
            <span>Ver Fila ao Vivo</span>
          </button>

          <button
            onClick={() => onNavigateToBooking(organization.slug)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-400" />
          Próximos Horários Marcados ({upcomingApts.length})
        </h3>

        {upcomingApts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-slate-950 border border-dashed border-slate-850">
            Você não possui nenhum horário futuro agendado no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingApts.map((apt) => (
              <div
                key={apt.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{apt.serviceName}</h4>
                      <p className="text-[11px] text-slate-400">Barbeiro: {apt.professionalName}</p>
                    </div>
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                        apt.status === 'NA CADEIRA'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : apt.status === 'A CAMINHO'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-amber-400 font-mono">
                    {apt.date} às {apt.time}
                  </div>
                </div>

                <button
                  onClick={() => onOpenAppointmentTracker(apt.token)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs text-slate-200 transition font-semibold"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Acompanhar / Avisar que está a caminho</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Appointments History */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          Histórico de Atendimentos Realizados ({pastApts.length})
        </h3>

        <div className="space-y-2">
          {pastApts.map((apt) => (
            <div
              key={apt.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-200">{apt.serviceName}</span>
                <span className="text-[11px] text-slate-500 block">
                  {apt.date} · {apt.professionalName}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-emerald-400">
                  R$ {apt.servicePrice.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block uppercase">
                  {apt.paymentMethod || 'PIX'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
