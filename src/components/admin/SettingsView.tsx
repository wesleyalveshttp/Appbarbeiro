import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Clock,
  Shield,
  MessageCircle,
  Save,
  CheckCircle2,
  AlertCircle,
  Palette,
  CreditCard,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization } from '../../types';

interface SettingsViewProps {
  organization: Organization;
  onNavigate?: (route: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ organization, onNavigate }) => {
  const [name, setName] = useState(organization.name);
  const [description, setDescription] = useState(organization.description || '');
  const [phone, setPhone] = useState(organization.phone);
  const [whatsapp, setWhatsapp] = useState(organization.whatsapp);
  const [instagram, setInstagram] = useState(organization.instagram || '');
  
  // Settings
  const [maxLateMinutes, setMaxLateMinutes] = useState(organization.settings.maxLateMinutes);
  const [cancellationHoursLimit, setCancellationHoursLimit] = useState(organization.settings.cancellationHoursLimit);
  const [queueMode, setQueueMode] = useState<'SINGLE' | 'PER_PROFESSIONAL'>(organization.settings.queueMode);
  const [welcomeMessage, setWelcomeMessage] = useState(organization.settings.welcomeMessage);

  // WhatsApp API Settings
  const [whatsappApiConfigured, setWhatsappApiConfigured] = useState(organization.settings.whatsappApiConfigured);
  const [whatsappApiKey, setWhatsappApiKey] = useState(organization.settings.whatsappApiKey || '');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState(organization.settings.whatsappPhoneNumberId || '');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateOrganization(organization.id, {
      name,
      description,
      phone,
      whatsapp,
      instagram,
      settings: {
        ...organization.settings,
        maxLateMinutes: Number(maxLateMinutes),
        cancellationHoursLimit: Number(cancellationHoursLimit),
        queueMode,
        welcomeMessage,
        whatsappApiConfigured,
        whatsappApiKey,
        whatsappPhoneNumberId,
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 border border-slate-700">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Configurações do Estabelecimento</h1>
            <p className="mt-1 text-xs text-slate-400">
              Dados da empresa, regras de cancelamento, tolerância de atraso e integrações.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" />
            Configurações salvas com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dados Básicos */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" />
            Identidade do Salão
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Nome do Estabelecimento</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Instagram</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@seu_perfil"
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Descrição / Apresentação</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Telefone Fixo / Recepção</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">WhatsApp para Notificações</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Políticas de Atendimento e Fila */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            Políticas de Atendimento & Fila Digital
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">
                Tempo Máximo de Atraso (minutos)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={maxLateMinutes}
                onChange={(e) => setMaxLateMinutes(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Após isso o agendamento é marcado como atrasado.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">
                Cancelamento Grátis (horas antes)
              </label>
              <input
                type="number"
                min="0"
                max="48"
                value={cancellationHoursLimit}
                onChange={(e) => setCancellationHoursLimit(Number(e.target.value))}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Limite para o cliente cancelar sem aviso tardio.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Modo de Fila</label>
              <select
                value={queueMode}
                onChange={(e) => setQueueMode(e.target.value as any)}
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white"
              >
                <option value="SINGLE">Fila Geral Única da Barbearia</option>
                <option value="PER_PROFESSIONAL">Fila Individual por Profissional</option>
              </select>
            </div>
          </div>
        </div>

        {/* Integração WhatsApp Oficial (#29) */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              Camada de Integração WhatsApp Business API
            </h3>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                whatsappApiConfigured
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {whatsappApiConfigured ? 'Conectado (API Oficial)' : 'Não Configurado (Envio via Link)'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Conecte sua conta do WhatsApp Business Cloud API (Meta) para envios automáticos em segundo plano.
            Quando não configurado, o sistema utiliza links diretos pré-formatados sem fingir status falso.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Meta Access Token / API Key</label>
              <input
                type="password"
                value={whatsappApiKey}
                onChange={(e) => setWhatsappApiKey(e.target.value)}
                placeholder="EAA..."
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Phone Number ID</label>
              <input
                type="text"
                value={whatsappPhoneNumberId}
                onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                placeholder="10987654321..."
                className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableWA"
              checked={whatsappApiConfigured}
              onChange={(e) => setWhatsappApiConfigured(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
            />
            <label htmlFor="enableWA" className="text-xs text-slate-300 cursor-pointer">
              Ativar envio automático via WhatsApp Cloud API Oficial
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md transition cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>

      {/* Subscription Card Section */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Assinatura BarberOS Pro</h3>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    organization.subscription?.status === 'ATIVA'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : organization.subscription?.status === 'TESTE_GRATIS'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {organization.subscription?.status === 'ATIVA'
                    ? '100% Liberado'
                    : organization.subscription?.status === 'TESTE_GRATIS'
                    ? 'Período de Testes'
                    : 'Aguardando Pagamento'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mensalidade de <strong>R$ 79,90/mês</strong> para uso ilimitado de agendamentos, fila ao vivo, cadeiras e financeiro.
              </p>
            </div>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('assinatura')}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition cursor-pointer shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Gerenciar / Pagar R$ 79,90</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Zero Metrics / Clean Slate Section */}
      <div className="rounded-2xl bg-rose-950/20 border border-rose-500/20 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Zerar Métricas Demo para Primeiro Uso</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Apaga todos os agendamentos, fila de espera, transações de caixa, histórico de clientes e avaliações demo para deixar o app zerado para início real de operação.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm('Tem certeza que deseja zerar todas as métricas, fila, atendimentos e clientes deste salão para o primeiro uso?')) {
                StorageService.resetAllMetrics(organization.id);
                setResetSuccess(true);
                setTimeout(() => setResetSuccess(false), 3500);
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Zerar Todas as Métricas Agora</span>
          </button>
        </div>

        {resetSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Todas as métricas deste estabelecimento foram zeradas com sucesso! O sistema está limpo para primeiro uso.</span>
          </div>
        )}
      </div>
    </div>
  );
};
