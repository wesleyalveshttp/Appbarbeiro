import React, { useState } from 'react';
import {
  Building2,
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  Scissors,
  Sparkles,
  MapPin,
  Phone,
  CheckCircle2,
  X
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { EstablishmentType, Organization, WorkingHours } from '../../types';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrg: Organization) => void;
  onOpenLogin?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenLogin,
}) => {
  const [step, setStep] = useState(1);

  // Step 1: Name
  const [name, setName] = useState('');

  // Step 2: Type
  const [type, setType] = useState<EstablishmentType>('Barbearia');

  // Step 3: Address
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');

  // Step 4: Contact & Access
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('123');

  // Step 5: Hours
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('20:00');
  const [hasLunchBreak, setHasLunchBreak] = useState(true);
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('13:00');

  // Step 6: Initial Professional
  const [profName, setProfName] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profCommission, setProfCommission] = useState(40);

  // Step 7: Initial Service
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState(45);
  const [serviceDuration, setServiceDuration] = useState(30);

  if (!isOpen) return null;

  const handleFinish = () => {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const defaultHours: WorkingHours[] = [
      { dayOfWeek: 0, dayName: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '15:00' },
      { dayOfWeek: 1, dayName: 'Segunda-feira', isOpen: true, openTime, closeTime, hasLunchBreak, lunchStart, lunchEnd },
      { dayOfWeek: 2, dayName: 'Terça-feira', isOpen: true, openTime, closeTime, hasLunchBreak, lunchStart, lunchEnd },
      { dayOfWeek: 3, dayName: 'Quarta-feira', isOpen: true, openTime, closeTime, hasLunchBreak, lunchStart, lunchEnd },
      { dayOfWeek: 4, dayName: 'Quinta-feira', isOpen: true, openTime, closeTime, hasLunchBreak, lunchStart, lunchEnd },
      { dayOfWeek: 5, dayName: 'Sexta-feira', isOpen: true, openTime, closeTime, hasLunchBreak, lunchStart, lunchEnd },
      { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '08:30', closeTime: '19:00', hasLunchBreak: false },
    ];

    const newOrg = StorageService.createOrganization({
      name,
      slug: slug || `salao-${Date.now()}`,
      type,
      description: `O melhor em ${type.toLowerCase()} e atendimento personalizado.`,
      phone: phone || whatsapp,
      whatsapp: whatsapp.replace(/\D/g, ''),
      instagram,
      ownerEmail: ownerEmail || `dono@${slug || 'barbearia'}.com.br`,
      ownerPassword: ownerPassword || '123',
      ownerName: name,
      address: {
        cep,
        street,
        number,
        neighborhood,
        city,
        state,
      },
      workingHours: defaultHours,
      settings: {
        maxLateMinutes: 15,
        cancellationHoursLimit: 2,
        queueMode: 'SINGLE',
        autoNotifyAheadCount: 3,
        callToleranceMinutes: 3,
        allowToleranceRequest: true,
        primaryColor: '#f59e0b',
        secondaryColor: '#0f172a',
        welcomeMessage: `Bem-vindo à ${name}! Entre na nossa fila virtual pelo celular ou agende online.`,
        isOpenNow: true,
        whatsappApiConfigured: false,
      },
      planId: 'premium',
    });

    // Create Initial Professional
    const newProf = StorageService.createProfessional({
      organizationId: newOrg.id,
      name: profName || 'Profissional Principal',
      phone: profPhone || whatsapp,
      whatsapp: (profPhone || whatsapp).replace(/\D/g, ''),
      email: `${(profName || 'contato').toLowerCase().replace(/\s+/g, '')}@salao.com`,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      specialties: ['Corte', 'Atendimento'],
      serviceIds: [],
      commissionPercent: Number(profCommission) || 40,
      isActive: true,
      isAvailableToday: true,
      workingDays: [1, 2, 3, 4, 5, 6],
    });

    // Create Initial Service
    const newSrv = StorageService.createService({
      organizationId: newOrg.id,
      name: serviceName || 'Corte Padrão',
      description: 'Atendimento completo com lavagem e finalização.',
      price: Number(servicePrice) || 45,
      durationMinutes: Number(serviceDuration) || 30,
      category: 'Cabelo',
      professionalIds: [newProf.id],
      isActive: true,
    });

    StorageService.updateProfessional(newProf.id, {
      serviceIds: [newSrv.id],
    });

    onSuccess(newOrg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-between pr-8 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-white">Criar Nova Barbearia</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Cadastro Rápido
            </span>
          </div>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
            >
              Já tenho conta (Login)
            </button>
          )}
        </div>

        {/* Stepper Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Passo {step} de 7</span>
            <div className="flex items-center gap-3">
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline text-[11px] cursor-pointer"
                >
                  Já tem conta? Fazer login
                </button>
              )}
              <span className="font-semibold text-amber-400">
                {step === 1 && 'Identidade'}
                {step === 2 && 'Tipo de Salão'}
                {step === 3 && 'Endereço'}
                {step === 4 && 'Contatos'}
                {step === 5 && 'Horários'}
                {step === 6 && 'Profissional'}
                {step === 7 && 'Primeiro Serviço'}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: NOME */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Qual o nome do seu estabelecimento?</h3>
            <p className="text-xs text-slate-400">
              Esse nome aparecerá no seu aplicativo, link de agendamento e QR codes.
            </p>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Barbearia do João ou Studio Bella"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>
        )}

        {/* STEP 2: TIPO */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Qual o segmento do seu negócio?</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                'Barbearia',
                'Salão de beleza',
                'Studio',
                'Cabeleireiro',
                'Unhas',
                'Estética',
                'Outro',
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t as EstablishmentType)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                    type === t
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: ENDEREÇO */}
        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Onde fica localizado?</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">CEP</label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="01310-100"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Número</label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="1420"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400">Rua / Avenida</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Av. Paulista"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bela Vista"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: CONTATO & ACESSO */}
        {step === 4 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Contato e Conta de Acesso</h3>
            <p className="text-xs text-slate-400">
              Defina o WhatsApp do salão e o login e senha que você usará para acessar sua conta.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300">WhatsApp Oficial *</label>
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <div>
                <label className="text-xs font-semibold text-amber-300">E-mail de Login do Dono *</label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="seuemail@barbearia.com"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-300">Senha de Acesso *</label>
                <input
                  type="text"
                  required
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Ex: 123456"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Instagram (Opcional)</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@seuestabelecimento"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* STEP 5: HORÁRIOS */}
        {step === 5 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Horário de Funcionamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300">Abertura</label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Fechamento</label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLunchBreak}
                  onChange={(e) => setHasLunchBreak(e.target.checked)}
                />
                Pausar para almoço/intervalo
              </label>

              {hasLunchBreak && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="time"
                    value={lunchStart}
                    onChange={(e) => setLunchStart(e.target.value)}
                    className="rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                  />
                  <input
                    type="time"
                    value={lunchEnd}
                    onChange={(e) => setLunchEnd(e.target.value)}
                    className="rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: PRIMEIRO PROFISSIONAL */}
        {step === 6 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Cadastre seu primeiro profissional</h3>
            <p className="text-xs text-slate-400">Pode ser você mesmo ou o barbeiro chefe.</p>

            <div>
              <label className="text-xs text-slate-300">Nome do Barbeiro/Profissional</label>
              <input
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                placeholder="Ex: João Barbeiro"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-300">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Comissão (%)</label>
                <input
                  type="number"
                  value={profCommission}
                  onChange={(e) => setProfCommission(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: PRIMEIRO SERVIÇO */}
        {step === 7 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Cadastre seu principal serviço</h3>
            <div>
              <label className="text-xs text-slate-300">Nome do Serviço</label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Ex: Corte Tradicional"
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-300">Preço (R$)</label>
                <input
                  type="number"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Duração (Minutos)</label>
                <input
                  type="number"
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
          ) : (
            <div />
          )}

          {step < 7 ? (
            <button
              type="button"
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md transition disabled:opacity-50"
            >
              <span>Avançar</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-2.5 text-xs font-black text-slate-950 shadow-md transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Concluir e Abrir Estabelecimento!</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
