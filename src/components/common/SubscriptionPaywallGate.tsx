import React, { useState } from 'react';
import {
  Lock,
  Sparkles,
  CreditCard,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Organization } from '../../types';
import { StorageService } from '../../services/storage';
import { SubscriptionCheckoutModal } from '../admin/SubscriptionCheckoutModal';

interface SubscriptionPaywallGateProps {
  organization: Organization;
  featureTitle: string;
  featureDescription?: string;
  onUnlocked?: () => void;
  onBackToDashboard?: () => void;
  children: React.ReactNode;
}

export const SubscriptionPaywallGate: React.FC<SubscriptionPaywallGateProps> = ({
  organization,
  featureTitle,
  featureDescription,
  onUnlocked,
  onBackToDashboard,
  children,
}) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const isProActive = organization.subscription?.status === 'ATIVA';
  const isAwaitingApproval = organization.subscription?.status === 'AGUARDANDO_APROVACAO';

  // If subscription is paid and active, render children directly without gate
  if (isProActive) {
    return <>{children}</>;
  }

  const handleSimulatePayment = () => {
    setIsSimulating(true);
    setTimeout(() => {
      StorageService.activateSubscription(
        organization.id,
        'PIX',
        'Mensalidade BarberOS Pro (R$ 79,90) - Simulação de Desbloqueio 100%'
      );
      setIsSimulating(false);
      if (onUnlocked) onUnlocked();
    }, 500);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-slate-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
        {/* Lock Icon */}
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xl shadow-amber-500/10 mb-2">
          <Lock className="h-8 w-8" />
        </div>

        {/* Title & Badge */}
        <div>
          {isAwaitingApproval ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-3 animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Aguardando Liberação do Dono da SaaS</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Mensalidade de R$ 79,90/mês Necessária</span>
            </div>
          )}

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isAwaitingApproval ? 'Pagamento Enviado para Análise' : 'Desbloqueie 100% do BarberOS'}
          </h2>

          {isAwaitingApproval ? (
            <p className="mt-2 text-sm text-amber-200/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
              Seu comprovante de pagamento de <strong>R$ 79,90</strong> foi enviado para o dono da plataforma SaaS. O administrador está conferindo e liberará seu acesso completo em instantes.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-300">
              Para que o dono da barbearia utilize 100% dos recursos de <strong>{featureTitle}</strong>, é necessário realizar o pagamento mensal de <strong>R$ 79,90</strong>.
            </p>
          )}

          {featureDescription && !isAwaitingApproval && (
            <p className="mt-1 text-xs text-slate-400">{featureDescription}</p>
          )}
        </div>

        {/* Plan Value Box */}
        <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 text-left">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold text-slate-400">Assinatura BarberOS Pro</span>
              <div className="text-2xl font-black text-white font-mono">
                R$ 79,90 <span className="text-xs text-slate-500 font-normal">/ mensal</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 block">✓ 100% Liberado</span>
              <span className="text-[11px] text-slate-500">Sem taxas por corte</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Painel Operacional das Cadeiras</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Fila Digital ao Vivo com QR Code</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Agendamento Online 24h Ilimitado</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Módulo Financeiro & Fechamento de Caixa</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Cálculo Automático de Comissões</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Notificações Automatizadas no WhatsApp</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            <span>Pagar R$ 79,90 via PIX ou Cartão</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={handleSimulatePayment}
            disabled={isSimulating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 px-5 py-3 text-xs font-semibold text-slate-200 transition cursor-pointer"
            title="Simular ativação imediata para testes"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>{isSimulating ? 'Ativando...' : 'Ativar Instantaneamente (Teste)'}</span>
          </button>
        </div>

        {onBackToDashboard && (
          <div>
            <button
              onClick={onBackToDashboard}
              className="text-xs text-slate-500 hover:text-slate-300 underline transition cursor-pointer"
            >
              Voltar ao Dashboard
            </button>
          </div>
        )}
      </div>

      <SubscriptionCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        organization={organization}
        onSuccess={() => {
          setShowCheckout(false);
          if (onUnlocked) onUnlocked();
        }}
      />
    </div>
  );
};
