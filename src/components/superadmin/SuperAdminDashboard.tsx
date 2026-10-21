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
  Phone,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
  Database,
  Cloud
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, SaaSPlan, AuditLog } from '../../types';

export const SuperAdminDashboard: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Deletion state
  const [orgToDelete, setOrgToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletedSuccessName, setDeletedSuccessName] = useState<string | null>(null);

  // Super Admin Password state
  const [showChangeAdminPassModal, setShowChangeAdminPassModal] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminPassMessage, setAdminPassMessage] = useState('');

  // Org Credentials Editing Modal
  const [editingCredentials, setEditingCredentials] = useState<{
    id: string;
    name: string;
    email: string;
    password: string;
  } | null>(null);

  // Visible passwords map for establishments table
  const [showPasswordsMap, setShowPasswordsMap] = useState<{ [id: string]: boolean }>({});
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudSyncSuccess, setCloudSyncSuccess] = useState<string | null>(null);
  const [processingOrgId, setProcessingOrgId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 4500);
  };

  const handleManualCloudSync = async () => {
    setCloudSyncing(true);
    setCloudSyncSuccess(null);
    try {
      const res = await fetch('/api/cloud/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setCloudSyncSuccess('Sincronização com o Google Cloud Firestore concluída com sucesso!');
        setTimeout(() => setCloudSyncSuccess(null), 4000);
      }
    } catch {
      setCloudSyncSuccess('Erro de conexão ao sincronizar com o Cloud Firestore.');
      setTimeout(() => setCloudSyncSuccess(null), 4000);
    } finally {
      setCloudSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      await StorageService.syncWithServer();
    } catch {}
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

  const handleToggleOrg = async (orgId: string) => {
    setProcessingOrgId(orgId);
    try {
      const updated = await StorageService.toggleOrganizationStatus(orgId);
      showNotice(
        updated.isActive
          ? `Estabelecimento "${updated.name}" foi DESBLOQUEADO com sucesso!`
          : `Estabelecimento "${updated.name}" foi BLOQUEADO com sucesso!`
      );
      await loadData();
    } catch (err: any) {
      showNotice(err?.message || 'Erro ao alterar status do estabelecimento', 'error');
    } finally {
      setProcessingOrgId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!orgToDelete) return;
    const name = orgToDelete.name;
    const id = orgToDelete.id;
    setIsDeleting(true);
    try {
      await StorageService.deleteOrganization(id);
      setOrgToDelete(null);
      setDeletedSuccessName(name);
      showNotice(`Estabelecimento "${name}" foi excluído definitivamente da plataforma.`);
      setTimeout(() => setDeletedSuccessName(null), 4000);
      await loadData();
    } catch (err: any) {
      showNotice(err?.message || 'Erro ao excluir estabelecimento', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSuperAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword.trim()) return;
    StorageService.updateSuperAdminPassword(newAdminPassword.trim());
    setAdminPassMessage('Senha do Super Admin atualizada com sucesso!');
    setTimeout(() => {
      setAdminPassMessage('');
      setShowChangeAdminPassModal(false);
    }, 1500);
  };

  const handleSaveOrgCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredentials) return;
    StorageService.updateOwnerCredentials(
      editingCredentials.id,
      editingCredentials.email,
      editingCredentials.password
    );
    setEditingCredentials(null);
    loadData();
  };

  const togglePasswordVisibility = (orgId: string) => {
    setShowPasswordsMap((prev) => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  const handleUpdatePrice = (planId: string, monthly: number, annual: number) => {
    StorageService.updatePlanPrice(planId, monthly, annual);
    loadData();
  };

  const handleApprovePayment = async (orgId: string) => {
    setProcessingOrgId(orgId);
    try {
      const updated = await StorageService.approveSubscription(orgId, 'Dono da SaaS');
      showNotice(`🎉 Pagamento de R$ 79,90 da "${updated.name}" foi APROVADO! Acesso 100% liberado.`);
      await loadData();
    } catch (err: any) {
      showNotice(err?.message || 'Erro ao aprovar pagamento', 'error');
    } finally {
      setProcessingOrgId(null);
    }
  };

  const handleRejectPayment = async (orgId: string) => {
    if (confirm('Deseja recusar a confirmação de pagamento deste estabelecimento?')) {
      setProcessingOrgId(orgId);
      try {
        const updated = await StorageService.rejectSubscription(orgId, 'Comprovante não identificado ou pendente');
        showNotice(`Pagamento da "${updated.name}" marcado como pendente.`, 'error');
        await loadData();
      } catch (err: any) {
        showNotice(err?.message || 'Erro ao recusar pagamento', 'error');
      } finally {
        setProcessingOrgId(null);
      }
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

      {/* Realtime Action Toast Notice */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-lg transition-all animate-fadeIn ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-850 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Super Admin Security & Password Card */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-500/40 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Segurança do Super Administrador (Dono da SaaS)</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                admin@barberos.com.br
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina e altere sua senha criada por você para acessar o painel mestre e confirmar pagamentos.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setNewAdminPassword(StorageService.getSuperAdminPassword());
            setShowChangeAdminPassModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Key className="h-4 w-4" />
          <span>Alterar Minha Senha de Super Admin</span>
        </button>
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
                disabled={processingOrgId === organizations[0].id}
                onClick={async () => {
                  setProcessingOrgId(organizations[0].id);
                  try {
                    await StorageService.requestSubscriptionApproval(
                      organizations[0].id,
                      'Comprovante de pagamento PIX R$ 79,90 enviado para análise do Dono da SaaS (Simulação de Teste)'
                    );
                    showNotice(`Comprovante de teste de "${organizations[0].name}" enviado para análise!`);
                    await loadData();
                  } catch (err: any) {
                    showNotice(err?.message || 'Erro ao simular comprovante', 'error');
                  } finally {
                    setProcessingOrgId(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {processingOrgId === organizations[0].id
                    ? 'Enviando...'
                    : `Simular Envio de Comprovante PIX de ${organizations[0].name} (Para Testar Aprovação)`}
                </span>
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
                    disabled={processingOrgId === org.id}
                    onClick={() => handleRejectPayment(org.id)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {processingOrgId === org.id ? 'Aguarde...' : 'Recusar'}
                  </button>

                  <button
                    disabled={processingOrgId === org.id}
                    onClick={() => handleApprovePayment(org.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{processingOrgId === org.id ? 'Aprovando...' : 'Aprovar & Liberar 100%'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizations Management Table (#43) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {deletedSuccessName && (
          <div className="p-3 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Estabelecimento <strong>"{deletedSuccessName}"</strong> foi excluído definitivamente da plataforma.</span>
          </div>
        )}

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
                <th className="py-3 px-4">Conta do Dono (Login / Senha)</th>
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

                  {/* Owner Account Login & Password */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1 max-w-[200px]">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300 truncate" title={org.ownerEmail || `dono@${org.slug}.com.br`}>
                        <span className="text-[10px] text-slate-500">Login:</span>
                        <span className="truncate">{org.ownerEmail || `dono@${org.slug}.com.br`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300">
                        <span className="text-[10px] text-slate-500">Senha:</span>
                        <span>{showPasswordsMap[org.id] ? (org.ownerPassword || '123') : '••••••'}</span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(org.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                          title={showPasswordsMap[org.id] ? "Ocultar Senha" : "Ver Senha"}
                        >
                          {showPasswordsMap[org.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCredentials({
                            id: org.id,
                            name: org.name,
                            email: org.ownerEmail || `dono@${org.slug}.com.br`,
                            password: org.ownerPassword || '123'
                          })}
                          className="text-amber-400 hover:text-amber-300 p-0.5 ml-0.5 cursor-pointer"
                          title="Alterar Login e Senha deste Salão"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>

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
                        disabled={processingOrgId === org.id}
                        onClick={async () => {
                          const newSubStatus = org.subscription?.status === 'ATIVA' ? 'PENDENTE' : 'ATIVA';
                          setProcessingOrgId(org.id);
                          try {
                            const updated = await StorageService.updateSubscriptionStatus(org.id, newSubStatus);
                            showNotice(`Assinatura de "${updated.name}" alterada para ${newSubStatus}!`);
                            await loadData();
                          } catch (err: any) {
                            showNotice(err?.message || 'Erro ao alterar assinatura', 'error');
                          } finally {
                            setProcessingOrgId(null);
                          }
                        }}
                        className="rounded-lg px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition cursor-pointer disabled:opacity-50"
                        title="Alternar Assinatura"
                      >
                        {processingOrgId === org.id
                          ? 'Aguarde...'
                          : org.subscription?.status === 'ATIVA'
                          ? 'Suspender Pagto'
                          : 'Aprovar R$ 79,90'}
                      </button>

                      {/* Bloquear / Desbloquear */}
                      <button
                        disabled={processingOrgId === org.id}
                        onClick={() => handleToggleOrg(org.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                          org.isActive
                            ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                        }`}
                      >
                        {processingOrgId === org.id ? (
                          <span>Atualizando...</span>
                        ) : org.isActive ? (
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

                      {/* Botão Lixeira ao lado do botão Bloquear para Excluir Estabelecimento */}
                      <button
                        disabled={processingOrgId === org.id}
                        onClick={() => setOrgToDelete({ id: org.id, name: org.name })}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                        title="Excluir estabelecimento permanentemente"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Excluir</span>
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

      {/* Cloud Database & Infrastructure Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Banco de Dados em Nuvem (Google Cloud Firestore)</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Conectado & Ativo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Persistência permanente de alta disponibilidade: dados sincronizados na nuvem do Google Cloud.
              </p>
            </div>
          </div>

          <button
            onClick={handleManualCloudSync}
            disabled={cloudSyncing}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 transition shadow-lg shadow-emerald-600/20 cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${cloudSyncing ? 'animate-spin' : ''}`} />
            <span>{cloudSyncing ? 'Sincronizando...' : 'Sincronizar com a Nuvem'}</span>
          </button>
        </div>

        {cloudSyncSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{cloudSyncSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Provedor</span>
            <span className="font-semibold text-slate-200 mt-0.5 block flex items-center gap-1.5">
              <Cloud className="h-3.5 w-3.5 text-blue-400" />
              Google Cloud Firestore
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Projeto Cloud</span>
            <span className="font-mono text-slate-300 mt-0.5 block truncate">
              gen-lang-client-0208879192
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Tolerância a Falhas</span>
            <span className="font-semibold text-emerald-400 mt-0.5 block">
              100% Alta Disponibilidade
            </span>
          </div>
        </div>
      </div>

      {/* MODAL 1: Confirm Permanent Organization Deletion */}
      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/40 p-6 text-slate-100 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Estabelecimento?</h3>
                <p className="text-xs text-rose-300 font-medium">Ação irreversível de exclusão</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              Você está prestes a excluir permanentemente <strong className="text-white">"{orgToDelete.name}"</strong> da plataforma.
              Todos os profissionais cadastrados, histórico de agendamentos, clientes e fila de espera deste salão serão apagados.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrgToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? 'Excluindo definitivamente...' : 'Sim, Excluir Definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Change Super Admin Master Password */}
      {showChangeAdminPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-purple-500/40 p-6 text-slate-100 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowChangeAdminPassModal(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Criar / Alterar Senha do Super Admin</h3>
                <p className="text-xs text-slate-400">Senha mestre do dono da SaaS</p>
              </div>
            </div>

            <form onSubmit={handleSaveSuperAdminPassword} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nova Senha Criada por Você *</label>
                <input
                  type="text"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Digite sua nova senha de administrador"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-purple-300 font-mono focus:border-purple-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Guarde esta senha. Ela será solicitada para acessar o painel global do Super Admin.
                </p>
              </div>

              {adminPassMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{adminPassMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangeAdminPassModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Salvar Nova Senha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Organization Credentials */}
      {editingCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 p-6 text-slate-100 shadow-2xl relative space-y-4">
            <button
              onClick={() => setEditingCredentials(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Editar Login & Senha do Salão</h3>
                <p className="text-xs text-amber-300 truncate max-w-xs">{editingCredentials.name}</p>
              </div>
            </div>

            <form onSubmit={handleSaveOrgCredentials} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">E-mail de Login do Dono *</label>
                <input
                  type="text"
                  required
                  value={editingCredentials.email}
                  onChange={(e) =>
                    setEditingCredentials({ ...editingCredentials, email: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Senha de Acesso *</label>
                <input
                  type="text"
                  required
                  value={editingCredentials.password}
                  onChange={(e) =>
                    setEditingCredentials({ ...editingCredentials, password: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCredentials(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 transition cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Salvar Credenciais</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
