import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Phone
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, SaaSPlan, AuditLog } from '../../types';

export const SuperAdminDashboard: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const loadData = () => {
    setOrganizations(StorageService.getAllOrganizations());
    setPlans(StorageService.getPlans());
    setAuditLogs(StorageService.getAuditLogs());
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, []);

  const handleToggleOrg = (orgId: string) => {
    StorageService.toggleOrganizationStatus(orgId);
    loadData();
  };

  const handleUpdatePrice = (planId: string, monthly: number, annual: number) => {
    StorageService.updatePlanPrice(planId, monthly, annual);
    loadData();
  };

  const handleApprovePayment = (orgId: string) => {
    StorageService.approveSubscription(orgId, 'Dono da SaaS');
    loadData();
  };

  const handleRejectPayment = (orgId: string) => {
    if (confirm('Deseja recusar a confirmação de pagamento deste estabelecimento?')) {
      StorageService.rejectSubscription(orgId, 'Comprovante não identificado ou pendente');
      loadData();
    }
  };

  // Metrics
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.isActive).length;
  const pendingApprovals = organizations.filter((o) => o.subscription?.status === 'AGUARDANDO_APROVACAO');
  
  // Calculate SaaS MRR
  const mrr = organizations.reduce((sum, o) => {
    if (o.subscription?.status === 'ATIVA') {
      return sum + (o.subscription.priceMonthly || 79.9);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border border-purple-500/30 p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Painel do Super Administrador (SaaS Master)</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Plataforma Global
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Gerencie todos os salões, controle assinaturas, configure planos e audite operações.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400">MRR da Plataforma (Receita Recorrente)</span>
          <div className="text-2xl font-black text-purple-400 font-mono">
            R$ {mrr.toFixed(2)}/mês
          </div>
        </div>
      </div>

      {/* SaaS Global Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Estabelecimentos Ativos</span>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {activeOrgs} / {totalOrgs}
          </div>
          <span className="text-[11px] text-emerald-400">Contas em operação</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Total de Planos Ativos</span>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {plans.length} planos
          </div>
          <span className="text-[11px] text-slate-400">Gratuito, Pro e Premium</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Gateway de Pagamentos</span>
          <div className="mt-2 text-base font-bold text-amber-400">
            Pronto para Webhooks
          </div>
          <span className="text-[10px] text-slate-500">Stripe / Asaas / MercadoPago</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Logs de Auditoria</span>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {auditLogs.length}
          </div>
          <span className="text-[11px] text-slate-500">Eventos registrados</span>
        </div>
      </div>

      {/* SaaS Owner Payment Approval Queue */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Controle do Dono da SaaS: Liberação de Pagamentos (R$ 79,90)
                </h3>
                {pendingApprovals.length > 0 ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider animate-pulse">
                    {pendingApprovals.length} Aguardando Sua Aprovação
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Sem Pendências
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Você como dono da plataforma confere o comprovante PIX e clica para liberar o acesso 100% da barbearia.
              </p>
            </div>
          </div>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-5 text-center text-xs text-slate-400 space-y-3">
            <Clock className="h-6 w-6 text-slate-500 mx-auto" />
            <p className="font-medium text-slate-300">Nenhum pagamento pendente de liberação no momento.</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Quando o dono de uma barbearia realizar o PIX de R$ 79,90 e enviar o comprovante, a solicitação aparecerá aqui imediatamente com 1 clique para você conferir e liberar o acesso.
            </p>
            {organizations.length > 0 && (
              <button
                onClick={() => {
                  StorageService.requestSubscriptionApproval(
                    organizations[0].id,
                    'Comprovante de pagamento PIX R$ 79,90 enviado para análise do Dono da SaaS (Simulação de Teste)'
                  );
                  loadData();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Simular Envio de Comprovante PIX de {organizations[0].name} (Para Testar Aprovação)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingApprovals.map((org) => (
              <div
                key={org.id}
                className="rounded-xl bg-slate-950 border border-amber-500/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{org.name}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                      Comprovante Enviado
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-emerald-400 font-bold">Valor: R$ 79,90</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">WhatsApp do Dono: <strong className="text-white font-mono">{org.whatsapp}</strong></span>
                    {org.subscription?.paymentProofSentAt && (
                      <>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">Enviado em: {new Date(org.subscription.paymentProofSentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    )}
                  </div>
                  {org.subscription?.paymentProofNote && (
                    <div className="text-[11px] text-amber-200/90 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
                      💬 Mensagem: {org.subscription.paymentProofNote}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`https://wa.me/55${org.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Sou o dono da plataforma BarberOS. Recebi sua solicitação de liberação para a ${org.name}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={() => handleRejectPayment(org.id)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    Recusar
                  </button>

                  <button
                    onClick={() => handleApprovePayment(org.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Aprovar & Liberar 100%</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizations Management Table (#43) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" />
            Estabelecimentos Cadastrados
          </h3>
          <span className="text-xs text-slate-400 font-mono">{organizations.length} salões</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 uppercase text-[10px] tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nome do Salão</th>
                <th className="py-3 px-4">Segmento</th>
                <th className="py-3 px-4">Cidade / UF</th>
                <th className="py-3 px-4">WhatsApp</th>
                <th className="py-3 px-4">Plano</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-850/50 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white text-sm">{org.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">slug: {org.slug}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-300">{org.type}</td>

                  <td className="py-3 px-4 text-slate-400">
                    {org.address.city}/{org.address.state}
                  </td>

                  <td className="py-3 px-4 font-mono">{org.whatsapp}</td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-emerald-400 font-bold">R$ 79,90/mês</span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded w-fit ${
                          org.subscription?.status === 'ATIVA'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : org.subscription?.status === 'TESTE_GRATIS'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {org.subscription?.status || 'TESTE'}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        org.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {org.isActive ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          const newSubStatus = org.subscription?.status === 'ATIVA' ? 'PENDENTE' : 'ATIVA';
                          StorageService.updateSubscriptionStatus(org.id, newSubStatus);
                          loadData();
                        }}
                        className="rounded-lg px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition"
                        title="Alternar Assinatura"
                      >
                        {org.subscription?.status === 'ATIVA' ? 'Suspender Pagto' : 'Aprovar R$ 79,90'}
                      </button>

                      <button
                        onClick={() => handleToggleOrg(org.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          org.isActive
                            ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                        }`}
                      >
                        {org.isActive ? (
                          <>
                            <Lock className="h-3 w-3" />
                            Bloquear
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3" />
                            Desbloquear
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Planos SaaS & Preços (#44) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          Gerenciar Preços dos Planos SaaS
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">{p.name}</h4>
                {p.popular && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Mais Popular
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400">Preço Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={p.priceMonthly}
                    onChange={(e) =>
                      handleUpdatePrice(p.id, Number(e.target.value), p.priceAnnual)
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-xs text-emerald-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400">Preço Anual (R$)</label>
                  <input
                    type="number"
                    step="1"
                    value={p.priceAnnual}
                    onChange={(e) =>
                      handleUpdatePrice(p.id, p.priceMonthly, Number(e.target.value))
                    }
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <ul className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                {p.features.map((f, i) => (
                  <li key={i}>✓ {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Logs Table (#46, #47) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-400" />
          Trilhas de Auditoria do Sistema (Audit Logs)
        </h3>

        <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/80 font-mono text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-bold text-slate-300">{log.userName}:</span>
                <span className="text-slate-400">{log.details}</span>
              </div>
              <span className="text-[10px] text-purple-400">{log.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
