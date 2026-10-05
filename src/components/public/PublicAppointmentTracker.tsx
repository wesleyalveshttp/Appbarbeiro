import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Scissors,
  CheckCircle2,
  Navigation,
  XCircle,
  RotateCcw,
  Star,
  Send,
  Building2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Appointment, Organization, Review } from '../../types';

interface PublicAppointmentTrackerProps {
  token: string;
  onBackToHome: () => void;
}

export const PublicAppointmentTracker: React.FC<PublicAppointmentTrackerProps> = ({
  token,
  onBackToHome,
}) => {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  // Review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const loadData = () => {
    const apt = StorageService.getAppointmentByToken(token);
    if (apt) {
      setAppointment(apt);
      const org = StorageService.getOrganizationById(apt.organizationId);
      if (org) setOrganization(org);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [token]);

  if (!appointment || !organization) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-400">Agendamento não encontrado.</p>
          <button onClick={onBackToHome} className="mt-4 text-xs text-amber-400 underline">
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  // Action: Estou a caminho (#32)
  const handleImComing = () => {
    StorageService.updateAppointmentStatus(appointment.id, 'A CAMINHO', {
      note: 'Cliente avisou pelo link de acompanhamento que está a caminho',
    });
    loadData();
  };

  // Action: Confirmar Presença (#33)
  const handleConfirmPresence = () => {
    StorageService.updateAppointmentStatus(appointment.id, 'CONFIRMADO');
    loadData();
  };

  // Action: Cancelar (#35)
  const handleCancelAppointment = () => {
    if (confirm('Tem certeza que deseja cancelar seu horário agendado?')) {
      StorageService.updateAppointmentStatus(appointment.id, 'CANCELADO', {
        note: 'Cancelado pelo próprio cliente',
      });
      loadData();
    }
  };

  // Action: Reagendar (#36)
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRescheduleError('');
      StorageService.rescheduleAppointment(appointment.id, newDate, newTime);
      setShowReschedule(false);
      loadData();
    } catch (err: any) {
      setRescheduleError(err.message || 'Horário indisponível');
    }
  };

  // Action: Review (#41)
  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    StorageService.createReview({
      organizationId: organization.id,
      appointmentId: appointment.id,
      customerName: appointment.customerName,
      rating,
      comment: comment.trim(),
      serviceName: appointment.serviceName,
      professionalName: appointment.professionalName,
    });

    setReviewSubmitted(true);
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{organization.name}</h1>
            <p className="text-[10px] text-slate-400">Acompanhamento do Atendimento</p>
          </div>
        </div>

        <button onClick={onBackToHome} className="text-xs text-slate-400 hover:text-white">
          Início
        </button>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-lg px-4 pt-6 space-y-6">
        {/* Status Card */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center shadow-2xl space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-800 font-mono text-xs text-slate-400">
            Senha do Agendamento: #{appointment.id.slice(-6)}
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status do seu Atendimento
            </span>
            <div className="mt-2 text-2xl font-black text-amber-400 tracking-tight flex items-center justify-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  appointment.status === 'NA CADEIRA'
                    ? 'bg-emerald-400 animate-pulse'
                    : appointment.status === 'A CAMINHO'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-blue-400'
                }`}
              />
              <span>{appointment.status}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {appointment.status === 'AGENDADO' && 'Aguardando confirmação de presença.'}
              {appointment.status === 'CONFIRMADO' && 'Seu horário está confirmado pela barbearia!'}
              {appointment.status === 'A CAMINHO' && 'Avisamos o barbeiro que você está chegando!'}
              {appointment.status === 'CHEGOU' && 'Você chegou! Aguarde ser chamado para a cadeira.'}
              {appointment.status === 'NA CADEIRA' && 'Você está sendo atendido agora!'}
              {appointment.status === 'FINALIZADO' && 'Atendimento finalizado com sucesso!'}
              {appointment.status === 'CANCELADO' && 'Este agendamento foi cancelado.'}
            </p>
          </div>

          {/* Quick Details Box */}
          <div className="text-left text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-bold text-white">{appointment.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Serviço:</span>
              <span className="font-bold text-slate-200">{appointment.serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Profissional:</span>
              <span className="font-bold text-slate-200">{appointment.professionalName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Data e Horário:</span>
              <span className="font-bold text-amber-400">
                {appointment.date} às {appointment.time}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-500">Valor Estimado:</span>
              <span className="font-bold text-emerald-400 font-mono">
                R$ {appointment.servicePrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions for Active Appointments */}
          {appointment.status !== 'FINALIZADO' && appointment.status !== 'CANCELADO' && (
            <div className="space-y-2.5 pt-2">
              {/* Botão "Estou a caminho" (#32) */}
              {appointment.status !== 'A CAMINHO' && appointment.status !== 'NA CADEIRA' && (
                <button
                  onClick={handleImComing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold text-slate-950 shadow-md transition"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Estou a Caminho!</span>
                </button>
              )}

              {/* Confirm Presence */}
              {appointment.status === 'AGENDADO' && (
                <button
                  onClick={handleConfirmPresence}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 text-xs font-semibold text-slate-200 transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Confirmar Presença</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowReschedule(true);
                    setNewDate(appointment.date);
                    setNewTime(appointment.time);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 text-xs text-slate-300 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reagendar</span>
                </button>

                <button
                  onClick={handleCancelAppointment}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 text-xs text-rose-400 transition"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          )}

          {/* Endereço do estabelecimento */}
          <div className="pt-3 border-t border-slate-800 text-left text-xs flex items-start gap-2.5 text-slate-400">
            <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Endereço da Barbearia:</span>
              <p className="text-[11px] text-slate-400">
                {organization.address.street}, {organization.address.number} - {organization.address.neighborhood}, {organization.address.city}/{organization.address.state}
              </p>
            </div>
          </div>
        </div>

        {/* Reschedule Modal */}
        {showReschedule && (
          <div className="rounded-3xl bg-slate-900 border border-amber-500/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-400" />
              Reagendar Atendimento
            </h3>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Nova Data:</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Novo Horário:</label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>

              {rescheduleError && (
                <p className="text-xs text-rose-400">{rescheduleError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReschedule(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-2 text-xs text-slate-300"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950"
                >
                  Salvar Reagendamento
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Evaluation / Review Form (#41) */}
        {appointment.status === 'FINALIZADO' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Como foi seu atendimento?</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Avalie o serviço de {appointment.professionalName} na {organization.name}.
              </p>
            </div>

            {reviewSubmitted || appointment.reviewId ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center">
                ✓ Muito obrigado! Sua avaliação foi registrada com sucesso.
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Star selection */}
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 hover:scale-125 transition"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          s <= rating ? 'text-amber-400 fill-current' : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <textarea
                    rows={3}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Conte como foi sua experiência, o corte, o ambiente..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 shadow-md transition"
                >
                  <Send className="h-4 w-4" />
                  <span>Enviar Avaliação</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
