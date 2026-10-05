import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Download,
  Plus,
  Calendar,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Transaction, PaymentMethod } from '../../types';

interface FinancialViewProps {
  organization: Organization;
}

export const FinancialView: React.FC<FinancialViewProps> = ({ organization }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<'HOJE' | '7_DIAS' | '30_DIAS' | 'TODOS'>('TODOS');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // Form State for Expense
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Insumos');
  const [expenseAmount, setExpenseAmount] = useState<number>(50);
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('PIX');

  const loadData = () => {
    setTransactions(StorageService.getTransactions(organization.id));
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [organization.id]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterPeriod === 'HOJE') return t.date === todayStr;
    if (filterPeriod === '7_DIAS') {
      const diffDays = (new Date().getTime() - new Date(t.date).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (filterPeriod === '30_DIAS') {
      const diffDays = (new Date().getTime() - new Date(t.date).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30;
    }
    return true;
  });

  // Calculate Metrics
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCommissions = filteredTransactions
    .filter((t) => t.type === 'COMMISSION')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netProfit = totalIncome - totalCommissions - totalExpenses;

  const totalServicesCount = filteredTransactions.filter((t) => t.type === 'INCOME').length;
  const averageTicket = totalServicesCount > 0 ? totalIncome / totalServicesCount : 0;

  // Breakdown by payment method
  const paymentBreakdown = {
    PIX: filteredTransactions.filter((t) => t.type === 'INCOME' && t.paymentMethod === 'PIX').reduce((s, t) => s + t.amount, 0),
    CARTAO_CREDITO: filteredTransactions.filter((t) => t.type === 'INCOME' && t.paymentMethod === 'CARTAO_CREDITO').reduce((s, t) => s + t.amount, 0),
    CARTAO_DEBITO: filteredTransactions.filter((t) => t.type === 'INCOME' && t.paymentMethod === 'CARTAO_DEBITO').reduce((s, t) => s + t.amount, 0),
    DINHEIRO: filteredTransactions.filter((t) => t.type === 'INCOME' && t.paymentMethod === 'DINHEIRO').reduce((s, t) => s + t.amount, 0),
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount) return;

    StorageService.createTransaction({
      organizationId: organization.id,
      type: 'EXPENSE',
      category: expenseCategory,
      description: expenseDesc.trim(),
      amount: -Math.abs(Number(expenseAmount)),
      paymentMethod: expensePaymentMethod,
      date: todayStr,
    });

    setExpenseDesc('');
    setExpenseAmount(50);
    setShowAddExpenseModal(false);
    loadData();
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Forma Pagamento'];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      t.type,
      t.category,
      `"${t.description}"`,
      t.amount.toFixed(2),
      t.paymentMethod || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financeiro-${organization.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Financeiro, Fluxo de Caixa & DRE</h1>
            <p className="mt-1 text-xs text-slate-400">
              Acompanhamento de receitas brutas, comissões devidas, despesas e lucro líquido real.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <Download className="h-4 w-4 text-amber-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 px-4 py-2 text-xs font-bold text-white shadow-md transition"
          >
            <Plus className="h-4 w-4" />
            <span>+ Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
        {[
          { id: 'HOJE', label: 'Hoje' },
          { id: '7_DIAS', label: 'Últimos 7 dias' },
          { id: '30_DIAS', label: 'Últimos 30 dias' },
          { id: 'TODOS', label: 'Todo o Período' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterPeriod(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterPeriod === tab.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4 Financial Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Receita Bruta */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Receita Bruta</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
          </span>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            R$ {totalIncome.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">
            {totalServicesCount} atendimentos realizados
          </span>
        </div>

        {/* Comissões de Barbeiros */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Comissões Equipe</span>
            <ArrowDownRight className="h-4 w-4 text-amber-400" />
          </span>
          <div className="mt-2 text-2xl font-black text-amber-400 font-mono">
            R$ {totalCommissions.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">Rateio individual aos barbeiros</span>
        </div>

        {/* Despesas Operacionais */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Despesas & Insumos</span>
            <ArrowDownRight className="h-4 w-4 text-rose-400" />
          </span>
          <div className="mt-2 text-2xl font-black text-rose-400 font-mono">
            R$ {totalExpenses.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">Gastos lançados no caixa</span>
        </div>

        {/* Lucro Líquido Estimado */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Lucro Líquido Real</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </span>
          <div
            className={`mt-2 text-2xl font-black font-mono ${
              netProfit >= 0 ? 'text-blue-400' : 'text-rose-400'
            }`}
          >
            R$ {netProfit.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">
            Ticket Médio: R$ {averageTicket.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-white mb-3">Distribuição por Forma de Pagamento</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400">PIX Instantâneo</span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-1">
              R$ {paymentBreakdown.PIX.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400">Cartão de Crédito</span>
            <div className="text-base font-bold text-blue-400 font-mono mt-1">
              R$ {paymentBreakdown.CARTAO_CREDITO.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400">Cartão de Débito</span>
            <div className="text-base font-bold text-purple-400 font-mono mt-1">
              R$ {paymentBreakdown.CARTAO_DEBITO.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400">Dinheiro em Espécie</span>
            <div className="text-base font-bold text-amber-400 font-mono mt-1">
              R$ {paymentBreakdown.DINHEIRO.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Extrato de Movimentações</h3>
          <span className="text-xs font-mono text-slate-400">
            {filteredTransactions.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhuma transação encontrada no período selecionado.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 uppercase text-[10px] tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Forma</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 font-mono text-slate-400">{tx.date}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          tx.type === 'INCOME'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : tx.type === 'COMMISSION'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {tx.type === 'INCOME'
                          ? 'Entrada'
                          : tx.type === 'COMMISSION'
                          ? 'Comissão'
                          : 'Despesa'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300">{tx.category}</td>

                    <td className="py-3 px-4 font-medium text-white">{tx.description}</td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">
                      {tx.paymentMethod || '—'}
                    </td>

                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''} R$ {Math.abs(tx.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-rose-400" />
              Lançar Despesa do Estabelecimento
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Registre compras de insumos, manutenção ou custos operacionais.
            </p>

            <form onSubmit={handleAddExpenseSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Descrição do Gasto *</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ex: 5 caixas de lâminas descartáveis"
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Categoria</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Insumos">Insumos & Descartáveis</option>
                    <option value="Produtos de Venda">Produtos de Venda</option>
                    <option value="Aluguel & Contas">Aluguel & Contas</option>
                    <option value="Manutenção">Manutenção de Equipamento</option>
                    <option value="Marketing">Marketing & Anúncios</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Forma de Saída</label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value as PaymentMethod)}
                  className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="DINHEIRO">Dinheiro do Caixa</option>
                </select>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-400 py-2.5 text-xs font-bold text-white shadow-md transition"
                >
                  Confirmar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
