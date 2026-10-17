import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Scissors,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Phone,
  RefreshCw
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Professional, Service, Appointment } from '../../types';

interface PublicBookingProps {
  slug: string;
  onNavigateToQueue: (slug: string) => void;
  onBookingSuccess: (token: string) => void;
  onBackToHome: () => void;
}

export const PublicBooking: React.FC<PublicBookingProps> = ({
  slug,
  onNavigateToQueue,
  onBookingSuccess,
  onBackToHome,
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // Wizard state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [orgNotFound, setOrgNotFound] = useState(false);
  const [fetchErrorType, setFetchErrorType] = useState<'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR' | null>(null);
  const [fetchErrorMessage, setFetchErrorMessage] = useState<string | null>(null);

  const fetchOrg = async () => {
    if (!slug) {
      setOrgNotFound(true);
      setFetchErrorType('NOT_FOUND');
      setFetchErrorMessage('Endereço da barbearia não informado.');
      setIsLoading(false);
      return;
    }
    try {
      const result = await StorageService.fetchPublicEstablishmentFull(slug);
      if (result.status === 'SUCCESS' && result.data?.organization) {
        setOrganization(result.data.organization);
        setOrgNotFound(false);
        setFetchErrorType(null);
        setFetchErrorMessage(null);
        const srvs = result.data.services || [];
        const profs = result.data.professionals || [];
        setServices(srvs);
        setProfessionals(profs);
        if (srvs.length > 0) setSelectedService(srvs[0]);
        if (profs.length > 0) setSelectedProfessional(profs[0]);
      } else if (result.status === 'NOT_FOUND') {
        setOrgNotFound(true);
        setFetchErrorType('NOT_FOUND');
        setFetchErrorMessage(result.error || 'Estabelecimento não encontrado.');
      } else if (result.status === 'SERVER_ERROR') {
        setFetchErrorType('SERVER_ERROR');
        setFetchErrorMessage(result.error || 'Instabilidade temporária no servidor ou banco de dados.');
      } else if (result.status === 'NETWORK_ERROR') {
        setFetchErrorType('NETWORK_ERROR');
        setFetchErrorMessage(result.error || 'Falha de conexão com a internet. Verifique sua rede e tente novamente.');
      }
    } catch (err) {
      console.warn('Erro ao carregar dados de agendamento:', err);
      setFetchErrorType('NETWORK_ERROR');
      setFetchErrorMessage('Falha ao conectar com o servidor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="text-xs text-slate-400">Carregando agendamento...</p>
      </div>
    );
  }

  if (fetchErrorType === 'SERVER_ERROR' || fetchErrorType === 'NETWORK_ERROR') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mx-auto">
            <RefreshCw className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              {fetchErrorType === 'NETWORK_ERROR' ? 'Falha de Conexão' : 'Instabilidade Temporária'}
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {fetchErrorMessage || 'Não foi possível carregar a página de agendamento no momento.'}
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setIsLoading(true);
                fetchOrg();
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
              O link de agendamento <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-400 font-mono">/agendar/{slug}</code> não corresponde a nenhum estabelecimento cadastrado.
            </p>
          </div>
          <button
            onClick={onBackToHome}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold text-slate-950 transition cursor-pointer"
          >
            Voltar para a Página Inicial
          </button>
        </div>
      </div>
    );
  }

  // Calculate Available Slots for selected professional and date
  const generateSlots = () => {
    if (!selectedProfessional || !selectedService) return [];
    const slots: { time: string; available: boolean }[] = [];

    for (let hour = 9; hour <= 19; hour++) {
      for (const minute of ['00', '30']) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
        
        // Check lunch pause
        if (hour === 12 && minute === '30') continue;
        if (hour === 13 && minute === '00') continue;

        // Check appointment conflict
        const isConflict = StorageService.checkSlotConflict(
          organization.id,
          selectedProfessional.id,
          selectedDate,
          timeStr,
          selectedService.durationMinutes
        );

        slots.push({
          time: timeStr,
          available: !isConflict,
        });
      }
    }
    return slots;
  };

  const slots = generateSlots();

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
      setErrorMessage('Por favor selecione todos os campos do agendamento.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Informe seu nome e WhatsApp para contato.');
      return;
    }

    try {
      setErrorMessage('');
      const newApt = StorageService.createAppointment({
        organizationId: organization.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        serviceId: selectedService.id,
        professionalId: selectedProfessional.id,
        date: selectedDate,
        time: selectedTime,
        notes: notes.trim() || undefined,
      });

      setCreatedAppointment(newApt);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar agendamento.');
    }
  };

  // Success view
  if (createdAppointment) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center shadow-2xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
              {organization.name}
            </span>
            <h2 className="text-2xl font-black text-white mt-1">Horário Agendado com Sucesso!</h2>
            <p className="mt-2 text-xs text-slate-400">
              Olá, <strong>{createdAppointment.customerName}</strong>! Seu horário está confirmado.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Serviço:</span>
              <span className="font-bold text-slate-200">{createdAppointment.serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Profissional:</span>
              <span className="font-bold text-slate-200">{createdAppointment.professionalName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Data e Hora:</span>
              <span className="font-bold text-amber-400">
                {createdAppointment.date} às {createdAppointment.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Valor Estimado:</span>
              <span className="font-bold text-emerald-400">
                R$ {createdAppointment.servicePrice.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onBookingSuccess(createdAppointment.token)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition"
            >
              <span>Acompanhar Atendimento / Avisar Chegada</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={onBackToHome}
              className="w-full text-xs text-slate-500 hover:text-slate-300 py-1"
            >
              Voltar à página inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{organization.name}</h1>
            <p className="text-[10px] text-slate-400">Agendamento Online 24h</p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToQueue(organization.slug)}
          className="text-xs text-amber-400 hover:underline font-semibold"
        >
          Entrar na Fila de Espera
        </button>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-2xl px-4 pt-6 space-y-6">
        {/* Banner Fila Virtual Sem Espera Física (#UserRequest) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 p-4 text-xs shadow-lg">
          <div>
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Clock className="h-4 w-4" />
              <span>Prefere vir hoje sem agendar? Entre na Fila Virtual!</span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5">
              Você <strong>não precisa ficar esperando na barbearia</strong>! Basta colocar seu Nome e WhatsApp. Nós garantimos seu lugar e o app envia mensagem automática quando for a hora de cortar ou fazer a barba.
            </p>
          </div>
          <button
            onClick={() => onNavigateToQueue(organization.slug)}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shrink-0 transition shadow-md shadow-amber-500/20 cursor-pointer"
          >
            Entrar na Fila Virtual Agora
          </button>
        </div>

        <form onSubmit={handleBookingSubmit} className="space-y-6">
          {/* STEP 1: Escolher Serviço */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                1
              </span>
              Escolha o Serviço
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`cursor-pointer rounded-xl p-3 border transition ${
                    selectedService?.id === srv.id
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold">{srv.name}</span>
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      R$ {srv.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{srv.durationMinutes} minutos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 2: Escolher Profissional */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                2
              </span>
              Escolha o Barbeiro / Profissional
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {professionals.map((prof) => (
                <div
                  key={prof.id}
                  onClick={() => setSelectedProfessional(prof)}
                  className={`cursor-pointer rounded-xl p-3 border transition text-center ${
                    selectedProfessional?.id === prof.id
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <img
                    src={prof.avatarUrl}
                    alt={prof.name}
                    className="mx-auto h-12 w-12 rounded-full object-cover ring-2 ring-slate-800 mb-2"
                  />
                  <div className="text-xs font-bold text-white truncate">{prof.name}</div>
                  <div className="text-[10px] text-amber-400/80 truncate mt-0.5">
                    {prof.specialties[0] || 'Especialista'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 3: Escolher Data & Horário */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                3
              </span>
              Data e Horário
            </h3>

            <div>
              <label className="text-xs text-slate-400">Data do Atendimento:</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime('');
                }}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div className="pt-2">
              <label className="text-xs text-slate-400 block mb-2">
                Horários Disponíveis ({selectedProfessional?.name}):
              </label>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setSelectedTime(s.time)}
                    className={`rounded-lg py-2 text-xs font-mono font-bold transition ${
                      selectedTime === s.time
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                        : s.available
                        ? 'bg-slate-950 text-slate-200 border border-slate-800 hover:border-amber-500/50'
                        : 'bg-slate-900 text-slate-600 line-through cursor-not-allowed border border-transparent'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 4: Informações do Cliente */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                4
              </span>
              Seus Dados (Sem necessidade de cadastro complexo)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Seu Nome *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Seu WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Observações (Opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Prefiro tesoura no topo / primeira vez"
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition"
          >
            <span>Confirmar Agendamento</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
