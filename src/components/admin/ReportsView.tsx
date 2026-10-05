import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Scissors,
  Printer,
  Calendar,
  AlertTriangle,
  Award
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization } from '../../types';

interface ReportsViewProps {
  organization: Organization;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ organization }) => {
  const appointments = StorageService.getAppointments(organization.id);
  const customers = StorageService.getCustomers(organization.id);
  const professionals = StorageService.getProfessionals(organization.id);
  const services = StorageService.getServices(organization.id);
  const queueHistory = StorageService.getAllQueueHistory(organization.id);
  const transactions = StorageService.getTransactions(organization.id);

  // Completed metrics
  const completedApts = appointments.filter((a) => a.status === 'FINALIZADO');
  const cancelledApts = appointments.filter((a) => a.status === 'CANCELADO');
  const noShowApts = appointments.filter((a) => a.status === 'FALTOU');

  const totalGrossRevenue = completedApts.reduce((sum, a) => sum + a.servicePrice, 0) +
    transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);

  // Top services sold
  const serviceSalesMap: Record<string, { name: string; count: number; total: number }> = {};
  completedApts.forEach((a) => {
    if (!serviceSalesMap[a.serviceId]) {
      serviceSalesMap[a.serviceId] = { name: a.serviceName, count: 0, total: 0 };
    }
    serviceSalesMap[a.serviceId].count += 1;
    serviceSalesMap[a.serviceId].total += a.servicePrice;
  });

  const topServices = Object.values(serviceSalesMap).sort((a, b) => b.count - a.count);

  // Professionals performance
  const profPerformance = professionals.map((p) => {
    const profApts = completedApts.filter((a) => a.professionalId === p.id);
    const revenue = profApts.reduce((sum, a) => sum + a.servicePrice, 0);
    const commission = (revenue * p.commissionPercent) / 100;
    return {
      name: p.name,
      completedCount: profApts.length,
      revenue,
      commission,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Average wait time in queue
  const queueWaitTimes = queueHistory.map(q => q.estimatedWaitMinutes);
  const avgWaitTime = queueWaitTimes.length > 0
    ? Math.round(queueWaitTimes.reduce((a, b) => a + b, 0) / queueWaitTimes.length)
    : 18;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Relatórios Gerenciais & Indicadores</h1>
            <p className="mt-1 text-xs text-slate-400">
              Desempenho da equipe, serviços mais lucrativos, taxa de no-show e tempo de espera.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition"
        >
          <Printer className="h-4 w-4 text-amber-400" />
          <span>Imprimir / Salvar PDF</span>
        </button>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Total Faturado</span>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            R$ {totalGrossRevenue.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">Média por atendimento</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Atendimentos Concluídos</span>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {completedApts.length}
          </div>
          <span className="text-[11px] text-emerald-400">Sucesso nos horários</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Tempo Médio na Fila</span>
          <div className="mt-2 text-2xl font-black text-amber-400 font-mono">
            ~{avgWaitTime} min
          </div>
          <span className="text-[11px] text-slate-500">Estimativa calculada</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Faltas & Cancelamentos</span>
          <div className="mt-2 text-2xl font-black text-rose-400 font-mono">
            {cancelledApts.length + noShowApts.length}
          </div>
          <span className="text-[11px] text-slate-500">No-show controlado</span>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Desempenho por Barbeiro */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            Desempenho por Profissional
          </h3>

          <div className="space-y-3">
            {profPerformance.map((prof, i) => (
              <div
                key={prof.name}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-400">#{i + 1}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">{prof.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      {prof.completedCount} atendimentos realizados
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-emerald-400">
                    R$ {prof.revenue.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-amber-400/80">
                    Comissão: R$ {prof.commission.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Serviços Mais Vendidos */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Scissors className="h-4 w-4 text-blue-400" />
            Serviços Mais Populares
          </h3>

          <div className="space-y-3">
            {topServices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Ainda não há dados suficientes de atendimentos finalizados.
              </div>
            ) : (
              topServices.map((srv, i) => (
                <div
                  key={srv.name}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-blue-400">#{i + 1}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{srv.name}</h4>
                      <span className="text-[11px] text-slate-400">
                        {srv.count} vezes realizado
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs font-bold text-emerald-400">
                    R$ {srv.total.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
