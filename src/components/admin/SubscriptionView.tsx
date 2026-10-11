import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Printer,
  ShieldCheck,
  Calendar,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, SubscriptionStatus } from '../../types';
import { SubscriptionCheckoutModal } from './SubscriptionCheckoutModal';

interface SubscriptionViewProps {
  organization: Organization;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ organization }) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [org, setOrg] = useState<Organization>(organization);

  useEffect(() => {
    setOrg(organization);
  }, [organization]);

  useEffect(() => {
    const unsub = StorageService.subscribeToRealtimeEvents((event) => {
      if (event.type === 'SUBSCRIPTION_UPDATED') {
        const updated = StorageService.getOrganizationById(organization.id);
        if (updated) setOrg({ ...updated });
      }
    });
    return unsub;
  }, [organization.id]);

  const sub = org.subscription || {
    status: 'TESTE_GRATIS',
    planName: 'Plano Pro BarberOS',
    priceMonthly: 79.9,
    trialDaysRemaining: 3,
    nextBillingDate: '2026-10-15',
    isPaid: false,
    invoices: [],
  };

  const handleSimulateStatus = (newStatus: SubscriptionStatus) => {
    const updated = StorageService.updateSubscriptionStatus(org.id, newStatus);
    setOrg(updated);
  };

  const handlePaymentSuccess = () => {
    const updated = StorageService.getOrganizationById(org.id);
    if (updated) setOrg(updated);
  };

  const printReceipt = (inv: any) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head>
          <title>Comprovante de Pagamento - BarberOS</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .box { border: 2px solid #0f172a; border-radius: 12px; padding: 24px; max-width: 480px; margin: 0 auto; text-align: left; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .item { display: flex; justify-content: space-between; margin: 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .total { font-size: 18px; font-weight: bold; color: #16a34a; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>Comprovante de Assinatura BarberOS</h1>
            <p><small>Estabelecimento: ${org.name}</small></p>
            <hr/>
            <div class="item"><span>Fatura:</span> <strong>${inv.id}</strong></div>
            <div class="item"><span>Data:</span> <strong>${inv.date}</strong></div>
            <div class="item"><span>Descrição:</span> <strong>${inv.description}</strong></div>
            <div class="item"><span>Forma de Pagamento:</span> <strong>${inv.paymentMethod}</strong></div>
            <div class="item"><span>Status:</span> <strong style="color: green;">PAGO</strong></div>
            <div class="item total"><span>Total:</span> <span>R$ ${inv.amount.toFixed(2)}</span></div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Minha Assinatura & Pagamento</h1>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  sub.status === 'ATIVA'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : sub.status === 'AGUARDANDO_APROVACAO'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    : sub.status === 'TESTE_GRATIS'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {sub.status === 'ATIVA'
                  ? 'Assinatura Ativa (100% Liberado)'
                  : sub.status === 'AGUARDANDO_APROVACAO'
                  ? 'Aguardando Aprovação do Dono da SaaS'
                  : sub.status === 'TESTE_GRATIS'
                  ? `Período de Testes (${sub.trialDaysRemaining || 3} dias)`
                  : 'Aguardando Pagamento'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Gerencie a mensalidade de R$ 79,90 da sua barbearia para manter 100% dos recursos desbloqueados.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCheckout(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition"
        >
          <Sparkles className="h-4 w-4" />
          <span>{sub.status === 'ATIVA' ? 'Renovar Assinatura' : 'Pagar R$ 79,90 e Liberar 100%'}</span>
        </button>
      </div>

      {/* Subscription Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Status Box */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
          <span className="text-xs font-semibold text-slate-400">Plano Selecionado</span>
          <div className="text-2xl font-black text-white">{sub.planName || 'Plano Pro BarberOS'}</div>
          <div className="text-xs text-emerald-400 font-mono font-bold">
            R$ 79,90 <span className="text-slate-500 font-normal">/ mensal</span>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Próxima Cobrança:</span>
            <span className="font-mono text-slate-200 font-semibold">{sub.nextBillingDate || '15/10/2026'}</span>
          </div>
        </div>

        {/* Resources Included */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2 md:col-span-2">
          <span className="text-xs font-semibold text-slate-400">Recursos Inclusos no Valor de R$ 79,90:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Fila Digital ao Vivo Ilimitada</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Painel Operacional das Cadeiras</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Agendamento Online 24/7 sem taxas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Controle Financeiro & Comissões</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Notificações no WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>QR Codes Exclusivos para Impressão</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mercado Pago Integration Status & Real-time Verification */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Gateway de Pagamento: <strong>Mercado Pago Oficial (PIX & Cartão)</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await StorageService.syncWithServer();
              const updated = StorageService.getOrganizationById(org.id);
              if (updated) setOrg({ ...updated });
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
            <span>Sincronizar Status com Servidor</span>
          </button>
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            Histórico de Pagamentos & Recibos
          </h3>
          <span className="text-xs font-mono text-slate-400">{sub.invoices.length} faturas</span>
        </div>

        <div className="overflow-x-auto">
          {sub.invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhuma fatura anterior registrada. Ao realizar o primeiro pagamento de R$ 79,90, o comprovante aparecerá aqui.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 uppercase text-[10px] tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fatura ID</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Forma</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-right">Comprovante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sub.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">{inv.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{inv.date}</td>
                    <td className="py-3 px-4 text-white font-medium">{inv.description}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[10px] uppercase">
                      {inv.paymentMethod}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {inv.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => printReceipt(inv)}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline font-semibold"
                      >
                        <Printer className="h-3 w-3" />
                        Imprimir Recibo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SubscriptionCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        organization={org}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
